import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChatGPTPanel() {
  const [message, setMessage] = useState("");
  const [chatgptToken, setChatgptToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Автоматически установить токен из localStorage
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setChatgptToken(token);
    }
  }, []);

  // Функция для вызова ChatGPT через прокси-сервер
  const handleSendToChatGPT = async () => {
    if (!message.trim()) {
      toast({
        variant: "destructive",
        title: "Необходимо сообщение",
        description: "Введите сообщение для отправки в ChatGPT"
      });
      return;
    }

    // Используем токен из localStorage, если он не установлен вручную
    const token = chatgptToken.trim() || localStorage.getItem("access_token");
    
    if (!token) {
      toast({
        variant: "destructive",
        title: "Требуется Access Token",
        description: "Не найден токен доступа. Пожалуйста, войдите в систему заново."
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      // Отправляем запрос через наш прокси-сервер
      const res = await apiRequest(
        "POST",
        "/api/chatgpt",
        {
          message: message.trim(),
          chatgptToken: token
        }
      );

      // Обрабатываем ответ
      const data = await res.json();
      
      if (data.choices && data.choices.length > 0) {
        const responseText = data.choices[0].message.content;
        setResponse(responseText);
      } else {
        setResponse("Получен пустой ответ от ChatGPT");
      }

      toast({
        title: "Ответ получен",
        description: "ChatGPT успешно ответил на ваш запрос"
      });
    } catch (error) {
      console.error("Ошибка при запросе к ChatGPT:", error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Не удалось получить ответ от ChatGPT";
      
      setResponse(`Ошибка: ${errorMessage}`);
      
      toast({
        variant: "destructive",
        title: "Ошибка запроса",
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>ChatGPT</CardTitle>
        <CardDescription>
          Отправляйте запросы к ChatGPT через безопасный прокси-сервер
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        
        {/* Сообщение */}
        <div className="space-y-2">
          <Label htmlFor="message">Сообщение</Label>
          <Textarea
            id="message"
            placeholder="Введите ваше сообщение для ChatGPT"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        
        {/* Кнопка отправки */}
        <Button 
          onClick={handleSendToChatGPT} 
          disabled={isLoading || !message.trim() || !chatgptToken.trim()}
          className="w-full"
        >
          {isLoading ? "Отправка..." : "Отправить в ChatGPT"}
        </Button>
        
        {/* Ответ */}
        {response && (
          <div className="mt-4 space-y-2">
            <Label>Ответ от ChatGPT</Label>
            <div className="p-4 rounded-md border bg-slate-50 min-h-[100px] whitespace-pre-wrap">
              {response}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}