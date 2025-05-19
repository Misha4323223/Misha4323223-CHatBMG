import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthScreen from "@/pages/AuthScreen";
import Chat from "@/pages/Chat";
import { useEffect } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  
  // Автоматическая аутентификация
  useEffect(() => {
    // Проверяем, есть ли уже токен в localStorage
    let token = localStorage.getItem("access_token");
    
    // Если токена нет, устанавливаем токен из окружения (заполнен в базе данных)
    if (!token) {
      // Используем токен из базы данных (обновляется через server/storage.ts)
      token = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..Zylvl4HBniOcojy8.fQaON0rflnIFzZ-5Yp0AjCuf6gy-w6KJCHRLBvEWW_wHdbIcp9bSgCnge4M_89MKmr0qgN1y-oaamgYbRpCbabCHJAcQHfpTg54nU9ROEVPuUSKQyqek8YPW1hXMAiaNx9h10r_bVEMyalIrrSJtYH2jfIoyjkQW1fCPq-Pt7vew5vS571MWDJxTOsREKdIkXt1z2K18QTLtmLEXJLPYIvmKUEeHlMLA-enZT8hBq9_VYwuAbmEuC8pi7QPvrqdRfmX6gfVYVWXqZ3Zjf3mfCwfy2anQ06l76Sg8rrcDqKSgPldF7ZWVdfoPDdngHRTcxvLqHKb3tc5bat6xOyYWT8wL5L3ckr69FoX2IiMgD8_EOeEXL5NwPA0eXyBvHFp3V9-WI7El061TIrm1Q_dVIw8gnxagFQTjg0oE8UIXRC5W9yYLEg-SQIC7dbpkAf27oKTIB4MqHRXLmvkr0Nx4G2OeIqRtvNncGFDdXx-KLFp6r4gUSrDskzzjdjlnvJXk1vku_lBF0GBXG-yxzFAVHvvMY-oD6EmIlO_W861L_pB_FZphikSYGUXCiDHIekCejdW6CbBr4Q-_mBS4q-keRS2ZgaSnDiF94j8S15OUQovU5dshgqeaKfFmayBBDs2HNhCZxMGqJsCTV-89yvjhmELOOTYs_d6Ss3D4aM5OfFnkcq7I2BOJCmvxJUO1TZ_ZRdDvdU7ZKDoj8WsYebENTsuSVMQi6tBdJGmJsRda_AYxzZNFDboRCNrKzLcFD6kDMlFO_E4oAmgT0XUAdCg9enObjOenxpK512DXynnbuU768MwNDLGMbdtCubFLmINLVftR5mOHsOs3jdGFTY5q9lZRpJb6Kz-51LMMwTNneTyP5M7BoU36KG2Dzfl_zb5jNQWOkzd-ESlPslOrTAFa-YbIZ75XAgLJrXzR31RcfG8b_T9rIBwM21nR1YS6l0BHQDvBuaK2S6OpFBvx94NKBzGZSVrxjvNQDjXTLn_MuYbw-d6-NZ3jFXBwQfZ9GhTAIkm93JbRxDPzjRnXf2-qK9wCe8Bi3qkZWqrHFfQ89pNxkdQRcQ2a7-3tpDFCHiqBqPAFXO-S_4OtWjYYTq9b5YeWZiHyOZFEjQYGGP2yYKrV7FDgUKPTvoIYgKbGSvwAHdjnqmyV7gCXFDIz5aILMqTR9Sn2G97-P2Hg_b9w2X0vkWUcr_XH43Qpo5xkZqpMTVR0Qi44OQahlYztlbzM-uJKYAo7Jm_5aqQprzHCq5txMQUeTECq0EOx0QF4S64HQb6NxJ-nM6RB0-OxJYWj88tNn_pOQdNkHGG25H0-m0-EHCI6m2ZJ_lfLwZHrLnDzTx5A3swYtLh5EqEhHOxoICXKR7pBbFXZKQEDwsHzTkD1FNLdMCCNxUECwqgY2JQ9E4b-4GfdX1hTDBpCTyHzUWtKdXexm_rJ9_kZ-w7hOUTj-LHQ9-7Pn0BIUv_SHrfYUO5WpQPICyJ1_g6lIGgUYlwcSLYnvKFhMT2nZtGGsHIWqHhWMpU9HpIpyIKMDxOdZV_bG0zN70V_o8S9NFZwZYBEqXpQQZ-0xnPCdJCKcFrMuXu6hfKjhOGjWQ8LDxzbzQwgZu32UOgx5j78J-PCXleobT1AuWMjEXY21VRrGT4TxDGlxzQUoaJQ6RZFx6pNPnD4wySUEe-xEyFEuGK1YbJ5j2koFzKjVs7bKY0kHkLSrR6S-DQSs8OPQQtqyQG7wnuTZp4aR8BnZKu09KWVxnZdS_GZ85jNngI8C7gfTUwWU-O9QeOtVZsVWu_LVCnbAlVHpXNn4qgMFNILz5i2uulQvkHGGgUfTQ76vDYiV_i2hNg5TDPYu0fmBKMnZ0HhLmVZrGHB7Zy0j-z1gvIrYlUESGmIpCxrr-8a9ETSbpoxOUNIuMKB_7CQ00_YFzqrWIE8BXZijcCh2VGzESz7fBdDd_N_fZaYs9AxC33cGIKjEhxMaGkOmwqXzySjpYVA8jCl1hfgJSRU8eT1rIVp7OYL3NRl7Oq7cZptMAAY8lfapojBHdKoZcCU9Rw-UvOzNJlLTTQRYrTiwPjMPh3cScuYJaBP5HZz5hq9uCd5lA3U_F54_97W88CwsFtPSf76u0MMqXIsBUXR0w5HQXdW5Zx1fR92CcylCLHLLb2Xiz0Jcm4IbGCwHTEzSOFz9jJhOw_tT1x2CQ4p2eB-l5UcTQ1JOiqPtXUmr_XhTI4-IeOD1sjy7pzfXFYCPaF3a2rN3ZXRM53eY97eJUhbDWhoOBRZxO2H1jB1zjrcP36v-Ck4nYb1YTH0DsBK0r5PB9DYQj0Qzl1_YUy5oWm9E-tQE_VRTqd93h5Yytu69KZL2_K7EFqFFZ4oTkETmGT9Z6qcDL3l9WoQtXm6a0-yWIcLlrLnRkMSBxmw5kn3npdaFgC7S85MxZVCUG4zE38v2i98T4uWAUuMeDdZSdZzxU09BK1QpZRPmVbFGxQIFDLdEwrtprdLn82w7pLVwmQwAJiLPDgCZCFuGfjf0VR2GJZHmMmRKz0QM28IWQXG2jllw-ry4kCfELwXZgBPPdHTALdIfqsROy3_0H4UyIqvKRl6jkVdCZiRXVvFR5eZVmtLtT9lmQ8K7cP9dErnpfVG41wt_W3fYOGNcFHw9QnF-zHXw1ARMmQwZPq20nQaX7uQGwCaWKs5AYEaMceCJjwJBj-tHoZ8E_m1q0u88oVNQC4XfE8PoDLfQQBpLHVdKz2MSNLZT1nZLfVrlwb07jtH5YZ7XisCKVGtf-CG0k72YfzFDlFnL8KbdxVd-YCeBpjHDYB6ajfZzNprAibgCrbcFg8U4J33VrUeOuCIwjNlSK47OJlRAxgcMOGQ.a_dB-Hh_77zY3YdOAO2sGw";
      
      // Сохраняем токен и информацию о пользователе в localStorage
      localStorage.setItem("access_token", token);
      
      // Получаем информацию о пользователе
      fetchUserInfo(token);
    }

    // Перенаправляем на чат, если не на странице чата
    if (location !== "/chat") {
      setLocation("/chat");
    }
  }, [location, setLocation]);
  
  // Функция для получения информации о пользователе
  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        console.error("Failed to fetch user info");
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  return (
    <Switch>
      <Route path="/auth" component={AuthScreen} />
      <Route path="/" component={Chat} />
      <Route path="/chat" component={Chat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
