import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, RefreshCw, ThumbsUp, ThumbsDown, Image, Code, Search, BrainCog, Lightbulb, Calculator } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  category?: string;
  provider?: string;
  bestProvider?: string;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
}

// Категории сообщений и их иконки
const categoryIcons: Record<string, React.ReactNode> = {
  technical: <Code className="h-4 w-4" />,
  creative: <Lightbulb className="h-4 w-4" />,
  analytical: <BrainCog className="h-4 w-4" />,
  factual: <Search className="h-4 w-4" />,
  current: <RefreshCw className="h-4 w-4" />,
  mathematical: <Calculator className="h-4 w-4" />,
  multimodal: <Image className="h-4 w-4" />,
  general: <BrainCog className="h-4 w-4" />
};

const SmartChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Привет! Я ваш AI-ассистент с интеллектуальной маршрутизацией. Я автоматически направляю ваши вопросы наиболее подходящим AI-провайдерам в зависимости от темы. Задайте любой вопрос, и я постараюсь дать наилучший ответ!',
      sender: 'ai',
      timestamp: new Date(),
      category: 'general',
      provider: 'BOOOMERANGS AI'
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Скролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Обработка отправки сообщения
  const handleSend = async () => {
    if (!inputText.trim() && !imageUrl) return;

    const newUserMessageId = Date.now().toString();
    const userMessage: Message = {
      id: newUserMessageId,
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    // Добавляем сообщение пользователя
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText("");

    // Добавляем временное сообщение для индикации загрузки
    const tempAiMessageId = (Date.now() + 1).toString();
    const tempAiMessage: Message = {
      id: tempAiMessageId,
      text: "...",
      sender: 'ai',
      timestamp: new Date(),
      loading: true
    };

    setMessages(prevMessages => [...prevMessages, tempAiMessage]);
    setIsLoading(true);

    try {
      // Отправляем запрос к умной маршрутизации
      const response = await fetch('/api/smart/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: inputText,
          imageUrl: imageUrl
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Обновляем временное сообщение реальным ответом
      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === tempAiMessageId ? {
          id: tempAiMessageId,
          text: data.response || "Не удалось получить ответ",
          sender: 'ai',
          timestamp: new Date(),
          loading: false,
          category: data.category || "general",
          provider: data.provider || "Unknown",
          bestProvider: data.bestProvider,
          error: !data.success,
          errorMessage: data.error
        } : msg
      ));
    } catch (error) {
      console.error('Ошибка:', error);
      
      // Обновляем временное сообщение с ошибкой
      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === tempAiMessageId ? {
          id: tempAiMessageId,
          text: "Произошла ошибка при получении ответа. Пожалуйста, попробуйте позже.",
          sender: 'ai',
          timestamp: new Date(),
          loading: false,
          error: true,
          errorMessage: error instanceof Error ? error.message : "Неизвестная ошибка"
        } : msg
      ));
    } finally {
      setIsLoading(false);
      setImageUrl(null); // Сбрасываем URL изображения после отправки
    }
  };

  // Обработка нажатия Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Обработка выбора изображения
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Изображение в формате data URL
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Запуск диалогового окна выбора файла
  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Удаление выбранного изображения
  const handleRemoveImage = () => {
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto h-[calc(100vh-8rem)] bg-background rounded-lg shadow-lg border overflow-hidden">
      <div className="p-4 border-b bg-muted/50">
        <h2 className="text-lg font-semibold">Интеллектуальный AI-чат</h2>
        <p className="text-sm text-muted-foreground">Система автоматически направляет вопросы к наиболее подходящим AI-провайдерам</p>
      </div>
      
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className={`${message.sender === 'user' ? 'bg-primary/10' : 'bg-secondary/10'}`}>
                  <AvatarFallback>
                    {message.sender === 'user' ? 'Вы' : 'AI'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col">
                  <div className={`rounded-lg p-4 ${
                    message.loading ? 'bg-muted' :
                    message.error ? 'bg-destructive/10 text-destructive' :
                    message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary/10'
                  }`}>
                    {message.loading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>AI обрабатывает ваш запрос...</span>
                      </div>
                    ) : (
                      <div>
                        {message.text.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            {i < message.text.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {message.sender === 'ai' && !message.loading && !message.error && message.category && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {message.category && (
                        <Badge variant="outline" className="text-xs">
                          {categoryIcons[message.category] || categoryIcons.general}
                          <span className="ml-1">{message.category}</span>
                        </Badge>
                      )}
                      {message.provider && (
                        <Badge variant="secondary" className="text-xs">
                          Провайдер: {message.provider}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <Separator />
      
      {imageUrl && (
        <div className="p-2 flex items-center gap-2 border-t">
          <div className="relative">
            <img src={imageUrl} alt="Selected" className="h-16 w-16 object-cover rounded" />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 w-5 h-5 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
          <span className="text-sm text-muted-foreground">Изображение будет отправлено вместе с сообщением</span>
        </div>
      )}
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleImageButtonClick}
            disabled={isLoading}
          >
            <Image className="h-5 w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            disabled={isLoading}
            className="flex-grow"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || (!inputText.trim() && !imageUrl)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SmartChat;