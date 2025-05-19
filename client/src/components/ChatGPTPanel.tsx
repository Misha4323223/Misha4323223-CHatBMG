import { useState } from "react";
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

    if (!chatgptToken.trim()) {
      toast({
        variant: "destructive",
        title: "Требуется Access Token",
        description: "Введите ваш Access Token от OpenAI для использования ChatGPT"
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
          chatgptToken: chatgptToken.trim()
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
          Используйте ваш access_token от OpenAI для общения с ChatGPT
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Access Token */}
        <div className="space-y-2">
          <Label htmlFor="access-token">OpenAI Access Token</Label>
          <Input
            id="access-token"
            type="password"
            placeholder="Введите ваш access_token от chat.openai.com"
            value={chatgptToken}
            onChange={(e) => setChatgptToken(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Ваш токен нигде не сохраняется и используется только для отправки запросов к API
          </p>
        </div>
        
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