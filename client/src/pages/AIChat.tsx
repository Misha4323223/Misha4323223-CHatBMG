import { useState, useRef, useEffect } from "react";
import BooomerangsLogo from "@/components/BooomerangsLogo";

// Тип данных для сообщений
interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  model?: string;
  provider?: string;
  time: string;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Автоматическая прокрутка вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Функция для отправки сообщения к AI провайдеру
  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!newMessage.trim()) return;
    
    // Добавляем сообщение пользователя
    const userMessage: Message = {
      id: Date.now(),
      text: newMessage,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    setIsLoading(true);
    
    try {
      // Отправляем запрос к API с автоматическим выбором провайдера
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Добавляем ответ от AI с информацией о провайдере
        const aiMessage: Message = {
          id: Date.now() + 1,
          text: data.response,
          sender: "ai",
          model: data.model || "Unknown",
          provider: data.provider || "Unknown",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Обработка ошибки
        const errorMessage: Message = {
          id: Date.now() + 1,
          text: "Извините, произошла ошибка при получении ответа. Пожалуйста, попробуйте еще раз.",
          sender: "ai",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      // Обработка ошибки
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "Произошла ошибка при обращении к серверу. Пожалуйста, проверьте соединение и попробуйте еще раз.",
        sender: "ai",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Заголовок */}
      <header className="p-4 border-b shadow-sm" 
              style={{background: 'linear-gradient(135deg, rgba(219, 234, 254, 0.8), rgba(224, 231, 255, 0.8))'}}>
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BooomerangsLogo size={36} />
            <h1 className="text-xl font-bold bg-clip-text text-transparent" 
                style={{background: 'linear-gradient(to right, #3b82f6, #6366f1)'}}>
              BOOOMERANGS AI ЧАТБОТ
            </h1>
          </div>
          <div className="bg-white py-1.5 px-3 rounded-full shadow-sm border border-blue-50 text-sm">
            <span className="font-medium text-blue-700">Доступ без API ключей</span>
          </div>
        </div>
      </header>
      
      {/* Основная область чата */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-4xl">
          {/* Приветственное сообщение, если нет сообщений */}
          {messages.length === 0 && (
            <div className="text-center p-10 rounded-3xl bg-white shadow-xl mb-6"
                style={{borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.15)'}}>
              <BooomerangsLogo size={86} className="mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-3 bg-clip-text text-transparent"
                  style={{background: 'linear-gradient(135deg, #3b82f6, #6366f1)'}}>
                Добро пожаловать в BOOOMERANGS AI!
              </h2>
              <p className="text-gray-600 mb-4">
                Задайте любой вопрос и получите ответ от AI без необходимости платных API ключей.
                Система автоматически выберет наилучший доступный провайдер для вашего запроса.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <div className="py-2 px-4 bg-blue-50 rounded-xl flex items-center"
                    style={{border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                  <span className="text-lg mr-2">🧠</span>
                  <span className="text-blue-700">DeepInfra</span>
                </div>
                <div className="py-2 px-4 bg-blue-50 rounded-xl flex items-center"
                    style={{border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                  <span className="text-lg mr-2">🤖</span>
                  <span className="text-blue-700">Claude</span>
                </div>
                <div className="py-2 px-4 bg-blue-50 rounded-xl flex items-center"
                    style={{border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                  <span className="text-lg mr-2">💬</span>
                  <span className="text-blue-700">ChatFree</span>
                </div>
                <div className="py-2 px-4 bg-blue-50 rounded-xl flex items-center"
                    style={{border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                  <span className="text-lg mr-2">👨‍💻</span>
                  <span className="text-blue-700">DeepSpeek</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Все ответы генерируются через бесплатные API без необходимости оплаты или регистрации
              </p>
            </div>
          )}
          
          {/* Сообщения */}
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : ""}`}>
                {message.sender === "ai" && (
                  <div 
                    className="w-8 h-8 rounded-full text-white flex items-center justify-center mr-2 flex-shrink-0 mb-1"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                      boxShadow: '0 4px 10px -2px rgba(99, 102, 241, 0.3)'
                    }}
                  >
                    B
                  </div>
                )}
                
                <div className={`max-w-[80%] flex flex-col ${message.sender === "user" ? "items-end" : ""}`}>
                  {message.sender === "user" ? (
                    <div 
                      className="p-3 break-words text-white relative"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        borderRadius: '18px 18px 4px 18px',
                        boxShadow: '0 4px 15px -3px rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      <p className="text-[15px] whitespace-pre-wrap">{message.text}</p>
                      <div 
                        className="absolute w-3 h-3 transform rotate-45 z-[-1]"
                        style={{
                          bottom: '-5px',
                          right: '-2px',
                          background: '#6366f1'
                        }}
                      ></div>
                    </div>
                  ) : (
                    <div 
                      className="p-3 break-words relative bg-white"
                      style={{
                        borderRadius: '18px 18px 18px 4px',
                        boxShadow: '0 4px 15px -5px rgba(0, 0, 0, 0.1)',
                        border: '1px solid rgba(243, 244, 246, 1)'
                      }}
                    >
                      <p className="text-[15px] text-gray-800 whitespace-pre-wrap">{message.text}</p>
                      <div 
                        className="absolute w-3 h-3 transform rotate-45 z-[-1]"
                        style={{
                          bottom: '-5px',
                          left: '-2px',
                          background: 'white',
                          borderBottom: '1px solid rgba(243, 244, 246, 1)',
                          borderLeft: '1px solid rgba(243, 244, 246, 1)'
                        }}
                      ></div>
                    </div>
                  )}
                  
                  <div className={`flex items-center text-xs text-gray-500 mt-1 ${message.sender === "user" ? "justify-end" : ""}`}>
                    <span>{message.time}</span>
                    {message.provider && (
                      <span 
                        className="ml-2 px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          fontWeight: '500'
                        }}
                      >
                        {message.model}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Индикатор загрузки */}
            {isLoading && (
              <div className="flex items-center">
                <div 
                  className="w-8 h-8 rounded-full text-white flex items-center justify-center mr-2 flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    boxShadow: '0 4px 10px -2px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  B
                </div>
                <div className="p-3 bg-white rounded-xl shadow-sm" style={{borderRadius: '18px 18px 18px 4px'}}>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{animationDelay: '0s'}}></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 rounded-full bg-blue-700 animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      
      {/* Форма отправки сообщения */}
      <div className="border-t border-gray-100 p-4 bg-white" style={{boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'}}>
        <div className="container mx-auto max-w-4xl">
          <form onSubmit={sendMessage} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full px-5 py-3.5 border border-gray-200 rounded-xl bg-white text-gray-800"
                style={{
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease'
                }}
                placeholder="Введите сообщение..." 
                disabled={isLoading}
              />
            </div>
            <button 
              type="submit" 
              className="p-3.5 text-white rounded-xl disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                boxShadow: '0 4px 10px -2px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s ease',
                transform: newMessage.trim() && !isLoading ? 'scale(1)' : 'scale(0.98)'
              }}
              disabled={isLoading || !newMessage.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}