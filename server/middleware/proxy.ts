import { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Function to setup proxy middleware
export function setupProxyMiddleware(app: Express) {
  // Получаем переменные окружения
  const proxyApiKey = process.env.PROXY_API_KEY || "";
  const proxyServiceUrl = process.env.PROXY_SERVICE_URL || "https://api.example.com";

  if (!proxyApiKey) {
    console.warn("WARNING: PROXY_API_KEY not set in .env file");
  }

  // Middleware для маршрута конфигурации прокси
  app.get("/api/proxy/config", async (req: Request, res: Response) => {
    try {
      // Проверяем аутентификацию
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const token = authHeader.split(" ")[1];
      const user = await storage.getUserByToken(token);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Отправляем конфигурацию прокси (но не сам API ключ)
      return res.status(200).json({
        proxyEnabled: !!proxyApiKey,
        proxyServiceUrl: proxyServiceUrl,
        userAuthorized: true
      });
    } catch (error) {
      console.error("Proxy config error:", error);
      return res.status(500).json({ message: "Server error getting proxy configuration" });
    }
  });

  // Middleware для обработки запросов прокси
  app.use("/proxy/*", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Проверяем аутентификацию пользователя
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required for proxy" });
      }
      
      const token = authHeader.split(" ")[1];
      const user = await storage.getUserByToken(token);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid token for proxy request" });
      }
      
      // Проверяем наличие API ключа
      if (!proxyApiKey) {
        return res.status(503).json({ message: "Proxy service is not configured" });
      }
      
      // Извлекаем целевой URL из пути запроса
      const targetPath = req.path.replace("/proxy/", "");
      
      if (!targetPath) {
        return res.status(400).json({ message: "No target URL specified" });
      }
      
      // Декодируем URL, если он закодирован
      const decodedPath = decodeURIComponent(targetPath);
      
      // Строим полный целевой URL
      let targetUrl = decodedPath;
      if (!decodedPath.startsWith("http")) {
        // Если путь не содержит протокол, проверяем конфигурацию
        if (decodedPath.startsWith("/")) {
          // Это относительный путь, добавляем его к базовому URL
          targetUrl = `${proxyServiceUrl}${decodedPath}`;
        } else {
          // Это хост без протокола
          targetUrl = `https://${decodedPath}`;
        }
      }
      
      console.log(`Proxying request to: ${targetUrl}`);
      
      // Переадресуем запрос к целевому URL
      try {
        const headers: Record<string, string> = {};
        
        // Копируем соответствующие заголовки из исходного запроса
        const headersToCopy = [
          "accept",
          "content-type",
          "user-agent"
        ];
        
        headersToCopy.forEach(header => {
          if (req.headers[header]) {
            headers[header] = req.headers[header] as string;
          }
        });
        
        // Добавляем заголовки для идентификации прокси-запросов
        headers["x-proxy-user"] = user.username;
        headers["x-proxy-api-key"] = proxyApiKey;
        
        // Добавляем настоящий access token в заголовок авторизации
        const accessToken = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..WSPdVer7UIOfHz3M.xNBgDvKZANnlb5JJ8fj1MAEbQQHMImSdI4_kj0_ynPwRmEorpNoZR1mRe3sHcM7C6nCwfWfYvd0v_xzddMZ9L2KlN0FZgqWetnGAIzgoB8jWQxxDOGa5xLJm5D9UvwsN6NPr6RsjLo1pgeGCyXLIuX0DJCn36ncLHzbLEm8YEknEa9ZQU43C1iS6Il60Ynp8K4NJfVlvPtyUjVvX4B4bXfksdKMd7BCAapivBXocUn9Jqfa9y4GBWtv3vW89YJ-Jyc4Vlk9WxGEEmrkEzdOTdC-tItAwiBr-ioSTQs9dmZb2kHPSmE2qk7mmQajCWyUcWaUSUUyMvLYr-fEraZKRujHWnMC20PyABAMmI4X5W2Ka6xaKRjuR89ge2XIBA6q5AoIXpElZZGtooWIenXBPFcZ7Qzh6ft5D3barnK2rjzivF22tGIb0EIC3u9ptc0iOEdC4eshM2St7f3sumrs_MkWWyFHDs9VIaIoxpAo7B8muhXXhgTLv1euqAD2AGXcFe-LISWj1V3Pt9iPQ3JXt_TxgLUiqrSM2pzjcCsFIHZdGz7H2uBgN7MgEjQky65AVyUnSvvhFKOk8Zf6R33fQqGw3H0X60lPpz3ep6ui5EObk8cIRA4T24WqunIw00lketfWoQBfJQxsGWj54lsE73pmy1TASd376oGy45MhWmVaHt6Nr-ye-uXrNhdajibt_COMmdYyXbOhQLktnABdEBkj5FFOkOP9FIrjr9ly4dRndA5QZanPN-XD4anEvK0xz0lIwQhNDr4cm5DnOxDhDBMW5kHfWR1bEVqORkGdRitIlLnc4cUMBWElhYz3e6KjS__aUaxjv3tubarfufwAYpQNCVWrMEafjhVr6LnhkMxEI3rKN7GzkUMgZQ1VqxEciYHQPSa3ffkgxqo6Gc53FaCLo2i5vCFDgcfvJBc1Epur6uyFTXE_1i9VrPyUf-oqBbLd2RUsN9DJdbGsf9LX1Mw855BRzMFBb7hdpshi5ZwxhO8-aexBFdY9ULm6K5fYFvt1Ee_8dVckoYTS1vM6ei4ZzO2FfaOEvd8d9HefI4HrID-SD0D5kT9cnqo4srhJSFp7rlV88UU_pF8Fi-aOGiLWddTz4dSWHgIVGDKxkIr8TRIeq3BLXQhFvuWmFnoThf0IOOkQwFmSXqk7Mpfg6fsxStz-_pAofsWpb76PhL1iOBtW-XW98lnt6JoE895CrNLwAQ6TMGsXLR6UaUgIEpxQueb7bilueCssHIvMbCVScV6yLMq_A0a7q9PdkhzqZlN3XVRFyIVZgN7Nag0KM1jiMwvqdqxeg2XcKT9mpMgSuKDome2f1bG7-s7E6RqMlXGENzF3YEuFew-c_FBM4gOaAB8LACPqu5_wtBbwIuy3H7uYjsdJZlhuLrrUM446gGWuUyAFHygztVwFLCTgEjNnrRSg3nKs9BRmeJuTVPParV5wEJl19HwI2FRDD5cC2g8bmX3wu-tu1cEK80N6nUDSgFGqYwfkuGPrkL4VG15KwMluUKU5sNfY8iycoZ5u6zw1Cjuanvg86uO_R0lK6nWuxL76o9hemCTdaPPmthaIaMVJvic-oSR0DVaBoOBTifPEeLc9Xlj2AtFyXKmToZmo72pnCzZIWwpHMqM7r6h1vxReY39mPVD_9qL4_gFDqeNGTpPn56XpPQg9_AbKMxVjIIvFN2UTPfWKO4l4yhgs7Xu5_cxk__7daTGaeArxJzRO_9kBTf2xjRi_W46l-sWZqjLUxFsuzwqPvtazsmhM9rvxGvqN56z5hTvahU6ME0ahdEEO1ZEfbDEt0CjECi_B_qxet05jFmwQBKKwOdod92ytoNH2fldwROL-ntE6X90L4ZnHiBkGoc8e9A_KOzllgRSIp9t5szWwuIBw11lLGK08c3flRgOuPHVa4Ei5zOwsO50KrT6N2FjGOZniNT5QG9N1JCQiQMepPQFSW7jd5gbGFhMoya4W8P1g0phk0ldzOx2gdG2QxO0JCPzgAEBZ-2Nxpw01HaB04nj5iep_BuVXkVv5hQ1oK7ug1OP2YGOFGSIyVex94sQHqIOLdJJTvREsg3LEIX4c7p14z3SMvYF7IxWdjXcgWD4lMVJ4MIL5h4quTti1CSaD6Y9EqnAoJewxPNU-Px86g9NrgN8lvKU7Up8g2WD2r5jYZHJUmtcpT0nyn_IDQHxjh08G2M5uV70ZzUNJd66v0yZ7GclNUP7nMI6ZaN9eH1Oh5-ZhdkjIHchamPPaBck2T0M8USQwEg2Zx_RU3LG3eadrDK1qfzmnosZRHn_V0uU-Uk6te7YZ-4rbgBLJHd8y3kj6UhvFHaUQ2hkzFXb99EC8fn8AYdvOmTaqNRBky4b-7ljNbcK687O4nC5u1EemPXRkCJfOuqoCDbLsWmygj5R_sKVY8O0CWdTYBnuyF7kw7Mqh80r9U_jWcWbvGRtR36iKGjtFFhLD29xpmnJQyubJzSHOkIr4vyeByZY4tnR2og2hWU3_u86F2AZC3pPlyfofssjQikFSo_mDhHKh7cG9ynoY83E30JhVhiZBbMtbKp7oROlz3vTvBe2I4UbV0ZGjCQrMI8C5yu4E2-3ih7H25hfV2xl6CQBxr24LfrukaepITJ5jdtCpyA1GDnWn81CjPZGgD4McklOXVwTcu5PXDBOQnbSpS5pfmFpOJSMeI-MpsKEh8w7mtJoX4dxRMCmgCUYsKn1ntZOy3AsZOsmAclLNVw3oU7_UJAugDAbDizkou3s-NhPqiKpFcJBKwNDe7j5k5M3preQRK3R4hVeIQ2wXU-FDgoWpKQ-PyLtQxAvixa8H2KxN61an5IqdJL5ktidEhozlOd2fDqeyM0dkTbprC0O5w-ZsAWeuxfDN4h581Tw-S35OkBCFPirsOGru3zr7P5zzMR31Sd8oRSlOprrSy3voC2ZH3cCKFEkHqh2Qa-lcQOW50NXsKNhVXxmcNi7tNeTHMI_Oc2rS8y__-r0iYaMPpcc0BIeqUD1eKQksLwZ9RlovcN8-niqlN6sfnIwXyBAVmMlp4koS4zKte5mBu5NjkMD5tek24ApF_P5sd6slY95mZ7Uigpa_SOkpQErlxnt-L-wNbeAdDpgoLqXo44Av5P6YAhOqE0DLdj8ay54PEXTLNnpMSi6Y8f30oAfVIJJZKwPVOaHFAhSqLf_VNDE66EwfA0TDiliWobB0HyTSjUCGedOI6STNbR3lP_4MVFasQjlCZOeWs88SIAkBHt-QzyUY5Yzv_WGe4JGduUbDXgFNTbMVcZNdcJZLKRTW7w8metFcrnr9vssy1_myYBcnR00fePkqDowB885zR6uBjd1HtgYPNYFxz68qWzfQ8Zk5RASsmogbQEn4UfyXr7A5cWZ5Kb6GUsgvUCzAHoYyR3TBZk46FL1btnx6FgNIK9bfZ8r4TjUGnSDCC3NEmCZ2eTY4IX8j0Rzqu_jjxR0B8V7-AlF1rlwpe5rMv41Mp8M4wcfnaDwbjB8i6tetDQBIQNwv8Gih2LAwQrtAmHGKU6YoODRgppqW4AaqwlKCeOX6LhcGxPMYPeQaz2i-hBqp-s2J-wBg.ygyprmD4_68TSiFTvsWLRQ";
        headers["Authorization"] = `Bearer ${accessToken}`;
        
        // Делаем запрос к целевому ресурсу
        const response = await fetch(targetUrl, {
          method: req.method,
          headers,
          body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
        });
        
        // Получаем данные ответа
        const contentType = response.headers.get("content-type") || "";
        let data;
        
        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        
        // Пересылаем ответ
        res.status(response.status);
        
        // Копируем соответствующие заголовки из ответа
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        
        res.send(data);
      } catch (error) {
        console.error("Proxy request error:", error);
        return res.status(502).json({ 
          message: "Failed to proxy request to target", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    } catch (error) {
      console.error("Proxy middleware error:", error);
      return res.status(500).json({ message: "Server error in proxy middleware" });
    }
  });
}
