import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function SimpleChatGPT() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  
  // При загрузке получаем токен из localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const handleSendToChatGPT = async () => {
    if (!message.trim()) {
      toast({
        variant: "destructive",
        title: "Необходимо сообщение",
        description: "Введите сообщение для отправки в ChatGPT"
      });
      return;
    }

    if (!token) {
      toast({
        variant: "destructive",
        title: "Токен не найден",
        description: "Обновите страницу или введите токен вручную"
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      // Формируем запрос напрямую к ChatGPT API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: message }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Ошибка API: ${response.status} ${
            errorData.error?.message || "Неизвестная ошибка"
          }`
        );
      }

      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        setResponse(data.choices[0].message.content);
      } else {
        setResponse("Получен пустой ответ от ChatGPT");
      }

      toast({
        title: "Ответ получен",
        description: "ChatGPT успешно ответил на ваш запрос"
      });
    } catch (error) {
      console.error("Ошибка при запросе к ChatGPT:", error);
      
      setResponse(`Ошибка: ${error instanceof Error ? error.message : "Не удалось получить ответ"}`);
      
      toast({
        variant: "destructive",
        title: "Ошибка запроса",
        description: error instanceof Error ? error.message : "Не удалось получить ответ"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>ChatGPT Прокси</CardTitle>
          <CardDescription>
            Отправляйте запросы к ChatGPT через безопасный прокси-сервер
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="font-medium">Ваше сообщение</label>
            <Textarea
              placeholder="Введите ваше сообщение для ChatGPT"
              className="min-h-[120px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          
          <Button
            onClick={handleSendToChatGPT}
            disabled={isLoading || !message.trim()}
            className="w-full"
          >
            {isLoading ? "Отправка..." : "Отправить в ChatGPT"}
          </Button>
          
          {response && (
            <div className="mt-6 space-y-2">
              <label className="font-medium">Ответ от ChatGPT:</label>
              <div className="p-4 bg-gray-50 rounded-md border whitespace-pre-wrap">
                {response}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}