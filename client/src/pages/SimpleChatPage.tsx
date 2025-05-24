import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Plus, MessageSquare, Image as ImageIcon, User, Bot } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  provider?: string;
  model?: string;
  imageUrl?: string;
}

const SimpleChatPage: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Проверяем, запрашивает ли пользователь генерацию изображения
      const isImageRequest = /создай|нарисуй|сгенерируй|изображение|картинку|рисунок/i.test(currentInput);
      
      if (isImageRequest) {
        // Генерация изображения
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: currentInput,
            style: 'realistic'
          }),
        });

        const data = await response.json();

        if (data.success) {
          const aiMessage: Message = {
            id: Date.now().toString(),
            content: `Создал изображение по запросу: "${currentInput}"`,
            sender: 'ai',
            timestamp: new Date(),
            provider: data.provider,
            imageUrl: data.imageUrl
          };
          setMessages(prev => [...prev, aiMessage]);
        } else {
          throw new Error(data.error || 'Ошибка генерации изображения');
        }
      } else {
        // Обычный текстовый чат
        const response = await fetch('/api/ai/smart-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentInput,
            userId: 'anna'
          }),
        });

        const data = await response.json();

        if (data.success) {
          const aiMessage: Message = {
            id: Date.now().toString(),
            content: data.response,
            sender: 'ai',
            timestamp: new Date(),
            provider: data.provider,
            model: data.model
          };
          setMessages(prev => [...prev, aiMessage]);
        } else {
          throw new Error(data.error || 'Ошибка получения ответа');
        }
      }
    } catch (err) {
      console.error('Error:', err);
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `Произошла ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`,
        sender: 'ai',
        timestamp: new Date(),
        provider: 'System'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="chatgpt-container min-h-screen flex flex-col">
      {/* Шапка */}
      <div className="chatgpt-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="chatgpt-title">ChatGPT</h1>
        </div>
        <button 
          onClick={startNewConversation}
          className="chatgpt-button"
        >
          <Plus className="chatgpt-icon" />
          Новый чат
        </button>
      </div>

      {/* Область сообщений */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-8 h-8 text-gray-400 mb-4" />
              <h2 className="text-xl font-medium text-gray-700 mb-2">Как дела?</h2>
              <p className="text-sm text-gray-500">Начните новый разговор</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  {/* Аватар */}
                  <div className="flex-shrink-0">
                    {message.sender === 'user' ? (
                      <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-green-500 rounded-sm flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Контент сообщения */}
                  <div className="flex-1 min-w-0">
                    <div className="prose prose-sm max-w-none">
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">
                        {message.content}
                      </div>
                      
                      {/* Изображение если есть */}
                      {message.imageUrl && (
                        <div className="mt-3">
                          <img 
                            src={message.imageUrl} 
                            alt="Сгенерированное изображение"
                            className="max-w-md rounded-lg border border-gray-200 shadow-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Информация о провайдере */}
                      {message.sender === 'ai' && message.provider && (
                        <div className="text-xs text-gray-500 mt-2">
                          {message.provider} {message.model ? `• ${message.model}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Индикатор загрузки */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-sm flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Поле ввода */}
        <div className="border-t border-gray-200 px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-3 bg-white border border-gray-300 rounded-xl p-3 shadow-sm">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Сообщение ChatGPT"
                className="flex-1 border-0 resize-none focus:ring-0 focus:outline-none text-sm p-0 min-h-[20px] max-h-[200px]"
                rows={1}
                disabled={isLoading}
              />
              
              <div className="flex items-center gap-2">
                <button
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Прикрепить изображение"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  className="p-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-2">
              ChatGPT может делать ошибки. Проверяйте важную информацию.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleChatPage;