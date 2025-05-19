import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

interface ProxyConfig {
  proxyEnabled: boolean;
  proxyServiceUrl: string;
  userAuthorized: boolean;
}

const ProxyPanel = () => {
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [requestBody, setRequestBody] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Запрос конфигурации прокси
  const { data: proxyConfig, isLoading: isConfigLoading } = useQuery<ProxyConfig>({
    queryKey: ["/api/proxy/config"],
    retry: 1
  });

  // Обработка запроса через прокси
  const handleProxyRequest = async () => {
    if (!url.trim()) {
      toast({
        variant: "destructive",
        title: "Необходим URL",
        description: "Введите URL для отправки запроса через прокси"
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      // Формируем путь для прокси-запроса
      let proxyUrl = url.trim();
      
      // Если URL не начинается с http/https, добавляем https://
      if (!proxyUrl.startsWith("http://") && !proxyUrl.startsWith("https://")) {
        proxyUrl = `https://${proxyUrl}`;
      }
      
      // Кодируем URL для использования в пути прокси
      const encodedUrl = encodeURIComponent(proxyUrl);
      const proxyPath = `/proxy/${encodedUrl}`;
      
      // Выполняем запрос через прокси
      const res = await apiRequest(
        method,
        proxyPath,
        method !== "GET" && requestBody ? JSON.parse(requestBody) : undefined
      );
      
      // Обрабатываем ответ
      const contentType = res.headers.get("content-type") || "";
      let data;
      
      if (contentType.includes("application/json")) {
        data = await res.json();
        setResponse(JSON.stringify(data, null, 2));
      } else {
        data = await res.text();
        setResponse(data);
      }
      
      toast({
        title: "Запрос успешно выполнен",
        description: `Статус: ${res.status} ${res.statusText}`
      });
    } catch (error) {
      console.error("Ошибка прокси-запроса:", error);
      
      toast({
        variant: "destructive",
        title: "Ошибка запроса",
        description: error instanceof Error ? error.message : "Не удалось выполнить запрос через прокси"
      });
      
      setResponse(error instanceof Error ? error.message : "Ошибка запроса");
    } finally {
      setIsLoading(false);
    }
  };

  // Если прокси не настроен
  if (!isConfigLoading && proxyConfig && !proxyConfig.proxyEnabled) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Прокси-сервер</CardTitle>
          <CardDescription>Прокси-сервер не настроен</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-700">
            Для использования прокси-сервера администратору необходимо установить переменную окружения PROXY_API_KEY в файле .env
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Прокси-сервер</CardTitle>
        <CardDescription>
          Отправка запросов через прокси-сервер с использованием вашего токена
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="request" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="request">Запрос</TabsTrigger>
            <TabsTrigger value="response">Ответ</TabsTrigger>
          </TabsList>
          
          <TabsContent value="request" className="space-y-4">
            {/* Форма запроса */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="url">URL или адрес ресурса</Label>
                <Input
                  id="url"
                  placeholder="Введите URL (например, api.example.com/data)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="method">Метод</Label>
                <select
                  id="method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              
              {method !== "GET" && (
                <div>
                  <Label htmlFor="body">Тело запроса (JSON)</Label>
                  <textarea
                    id="body"
                    placeholder='{"key": "value"}'
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1 min-h-[120px]"
                  />
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="response">
            <div className="space-y-4">
              <Label>Ответ</Label>
              <div className="w-full p-4 bg-neutral-100 rounded-md min-h-[200px] max-h-[400px] overflow-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : response ? (
                  <pre className="whitespace-pre-wrap break-all">{response}</pre>
                ) : (
                  <div className="text-neutral-500 text-center mt-8">
                    Отправьте запрос, чтобы увидеть ответ
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleProxyRequest} 
          disabled={isLoading || !url.trim()}
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </span>
              Отправка...
            </>
          ) : (
            "Отправить запрос"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProxyPanel;