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

    // Сохраняем текст сообщения перед очисткой
    const messageText = inputText.trim();
    const currentImageUrl = imageUrl;

    const newUserMessageId = Date.now().toString();
    const userMessage: Message = {
      id: newUserMessageId,
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    // Добавляем сообщение пользователя
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText("");
    setImageUrl(null); // Очищаем изображение после отправки

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
          message: messageText,
          imageUrl: currentImageUrl
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
    <div className="flex flex-col w-full mx-auto overflow-hidden
                    h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] xl:h-[650px]
                    max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl
                    bg-gradient-to-br from-gray-900/95 via-black/98 to-gray-900/95
                    backdrop-blur-xl border border-red-600/20 rounded-3xl
                    shadow-[0_8px_25px_rgba(0,0,0,0.3),0_0_20px_rgba(220,38,38,0.2)]
                    relative"
         style={{
           background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%)',
           boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 30px rgba(220, 38, 38, 0.1)'
         }}>
      
      <ScrollArea className="flex-grow p-2 sm:p-3 md:p-4">
        <div className="space-y-2 sm:space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[80%] md:max-w-[75%] 
                               ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className={`h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 flex-shrink-0
                                    ${message.sender === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  <AvatarFallback className="text-xs sm:text-sm text-white">
                    {message.sender === 'user' ? 'U' : 'AI'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col min-w-0 flex-1">
                  <div className={`rounded-2xl p-3 sm:p-4 text-sm sm:text-base break-words transition-all duration-300 ${
                    message.loading ? 'bg-gray-700/80 text-gray-300 backdrop-blur-sm' :
                    message.error ? 'bg-red-900/50 text-red-300 border border-red-500/30' :
                    message.sender === 'user' ? 
                      'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] border border-red-500/30' : 
                      'bg-gradient-to-br from-gray-800/90 to-gray-900/95 text-gray-100 backdrop-blur-sm border border-gray-600/30 hover:shadow-lg hover:scale-[1.02]'
                  }`}
                       style={message.sender === 'user' ? {
                         boxShadow: '0 8px 25px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                       } : {
                         boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                       }}>
                    {message.loading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                        <span className="text-sm">AI думает...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap word-break">
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
                      <Badge variant="secondary" className="text-xs px-1 py-0.5 h-4 bg-gray-700 text-gray-300 border-gray-600">
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
        <div className="p-2 sm:p-3 flex items-center gap-2 border-t border-gray-700 bg-gray-800/50">
          <div className="relative">
            <img src={imageUrl} alt="Selected" className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded-lg" />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <span className="text-sm text-gray-400">Изображение загружено</span>
        </div>
      )}
      
      <div className="p-3 sm:p-4 md:p-5 border-t border-red-600/20 relative overflow-hidden"
           style={{
             background: 'linear-gradient(to top, rgba(10, 10, 10, 0.98) 0%, rgba(10, 10, 10, 0.95) 70%, transparent 100%)',
             backdropFilter: 'blur(25px)',
             boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.3), 0 0 50px rgba(220, 38, 38, 0.05)'
           }}>
        <div className="flex gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImageButtonClick}
            disabled={isLoading}
            className="h-11 w-11 sm:h-12 sm:w-12 p-0 border-gray-600/50 bg-gradient-to-br from-gray-800/90 to-gray-900/95 text-gray-300 hover:bg-gradient-to-br hover:from-gray-700/90 hover:to-gray-800/95 hover:border-red-500/30 transition-all duration-300 flex-shrink-0 rounded-xl backdrop-blur-sm hover:scale-105 hover:shadow-lg"
            style={{
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <Image className="h-5 w-5 sm:h-6 sm:w-6" />
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
            className="flex-grow h-11 sm:h-12 text-sm sm:text-base bg-gradient-to-br from-gray-800/90 to-gray-900/95 border-gray-600/50 text-white placeholder-gray-400 
                       focus:border-red-500/80 focus:ring-2 focus:ring-red-500/20 transition-all duration-300 rounded-xl backdrop-blur-sm
                       hover:border-red-500/50 hover:shadow-lg"
            style={{
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || (!inputText.trim() && !imageUrl)}
            size="sm"
            className="h-11 w-11 sm:h-12 sm:w-12 p-0 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white transition-all duration-300 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl hover:scale-110 hover:rotate-3 active:scale-105"
            style={{
              boxShadow: '0 4px 20px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
            ) : (
              <Send className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SmartChat;