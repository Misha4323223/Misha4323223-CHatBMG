import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, RefreshCw, ThumbsUp, ThumbsDown, Image, Code, Search, BrainCog, Lightbulb, Calculator, X, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

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
  const [messages, setMessages] = useState<Message[]>([]);
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
  const { toast } = useToast();
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Ошибка загрузки",
          description: "Размер файла не должен превышать 5 МБ",
          variant: "destructive"
        });
        return;
      }
      
      try {
        // Создаем FormData для отправки файла
        const formData = new FormData();
        formData.append('image', file);
        
        // Отправляем запрос на загрузку
        const response = await fetch('/api/upload/file', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке файла');
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Устанавливаем URL загруженного изображения
          setImageUrl(data.imageUrl);
          toast({
            title: "Изображение загружено",
            description: "Изображение успешно загружено",
          });
        } else {
          throw new Error(data.error || 'Ошибка при загрузке');
        }
      } catch (error) {
        console.error('Ошибка загрузки изображения:', error);
        toast({
          title: "Ошибка загрузки",
          description: error instanceof Error ? error.message : "Не удалось загрузить изображение",
          variant: "destructive"
        });
        
        // Сбрасываем input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
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
    <div className="flex flex-col w-full max-w-4xl mx-auto h-[70px] bg-gray-900 text-white rounded-lg shadow-lg border border-gray-700 overflow-hidden">
      {/* Убрали заголовок для большей компактности */}
      
      <ScrollArea className="flex-grow p-1">
        <div className="space-y-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-1 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className={`h-4 w-4 ${message.sender === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  <AvatarFallback className="text-xs text-white">
                    {message.sender === 'user' ? 'U' : 'AI'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col">
                  <div className={`rounded p-1 text-xs ${
                    message.loading ? 'bg-gray-700 text-gray-300' :
                    message.error ? 'bg-red-900/50 text-red-300' :
                    message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
                  }`}>
                    {message.loading ? (
                      <div className="flex items-center space-x-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs">AI думает...</span>
                      </div>
                    ) : (
                      <div className="text-xs">
                        {message.text.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            {i < message.text.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {message.sender === 'ai' && !message.loading && !message.error && message.provider && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs h-4 px-1 bg-gray-700 text-gray-300 border-gray-600">
                        {message.provider}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400 mt-0.5">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t border-gray-700"></div>
      
      {imageUrl && (
        <div className="p-1 flex items-center gap-1 border-t border-gray-700">
          <div className="relative">
            <img src={imageUrl} alt="Selected" className="h-8 w-8 object-cover rounded" />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 w-3 h-3 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
          <span className="text-xs text-gray-400">Изображение</span>
        </div>
      )}
      
      <div className="p-1 border-t border-gray-700">
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImageButtonClick}
            disabled={isLoading}
            className="h-6 w-6 p-0 border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
          >
            <Image className="h-2 w-2" />
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
            placeholder="Сообщение..."
            disabled={isLoading}
            className="flex-grow h-6 text-xs bg-gray-800 border-gray-600 text-white placeholder-gray-400"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || (!inputText.trim() && !imageUrl)}
            size="sm"
            className="h-6 w-6 p-0 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <Loader2 className="h-2 w-2 animate-spin" />
            ) : (
              <Send className="h-2 w-2" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SmartChat;