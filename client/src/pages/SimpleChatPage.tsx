import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Plus, MessageSquare, Image as ImageIcon, User, Bot, Menu, Settings, History, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  provider?: string;
  model?: string;
  imageUrl?: string;
}

interface ChatSession {
  id: number;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const SimpleChatPage: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const userId = 'anna'; // Используем фиксированного пользователя

  // Получение списка сессий
  const { data: sessions = [] } = useQuery<ChatSession[]>({
    queryKey: ['/api/chat/sessions'],
    queryFn: async () => {
      const response = await fetch('/api/chat/sessions');
      const data = await response.json();
      return data.sessions || [];
    }
  });

  // Получение сообщений текущей сессии
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/chat/sessions', currentSessionId, 'messages'],
    queryFn: async () => {
      if (!currentSessionId) return [];
      const response = await fetch(`/api/chat/sessions/${currentSessionId}/messages`);
      const data = await response.json();
      return data.messages || [];
    },
    enabled: !!currentSessionId
  });

  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Выбираем первую сессию при загрузке
  useEffect(() => {
    if (sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  // Мутация для создания новой сессии
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: 'Новый чат'
        })
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions'] });
      setCurrentSessionId(data.session.id);
    }
  });

  // Мутация для отправки сообщения
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, sessionId }: { message: string; sessionId: number }) => {
      const isImageRequest = /создай|нарисуй|сгенерируй|изображение|картинку|рисунок/i.test(message);
      
      // Сначала сохраняем сообщение пользователя
      await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          sender: 'user',
          userId
        })
      });

      if (isImageRequest) {
        // Генерация изображения
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: message, style: 'realistic' })
        });
        const data = await response.json();
        
        if (data.success) {
          // Сохраняем ответ с изображением
          await fetch(`/api/chat/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `Создал изображение: "${message}"`,
              sender: 'ai',
              userId,
              provider: data.provider,
              imageUrl: data.imageUrl
            })
          });
        }
        return data;
      } else {
        // Стриминг чат через EventSource
        console.log('💾 Сохраняем сообщение в сессию', sessionId, { content: message, sender: 'user', provider: null });
        
        // Создаем EventSource для стриминга
        const eventSource = new EventSource(`/api/streaming/chat?message=${encodeURIComponent(message)}&sessionId=${sessionId}`);
        let fullResponse = '';
        
        const streamPromise = new Promise((resolve, reject) => {
          eventSource.onmessage = (event) => {
            console.log('📡 Получены данные стриминга:', event.data);
            try {
              const data = JSON.parse(event.data);
              console.log('🔍 Обработка данных:', data);
              
              if (data.type === 'chunk') {
                fullResponse += data.content;
              } else if (data.type === 'complete') {
                eventSource.close();
                resolve({ success: true, response: fullResponse, provider: data.provider });
              } else if (data.type === 'error') {
                eventSource.close();
                console.log('❌ Ошибка стриминга, переключаемся на обычный запрос');
                reject(new Error('Streaming failed'));
              }
            } catch (err) {
              console.error('Ошибка парсинга:', err);
            }
          };
          
          eventSource.onerror = () => {
            console.log('🔄 Стриминг не отвечает, переключаемся на обычный запрос...');
            eventSource.close();
            reject(new Error('Streaming timeout'));
          };
          
          // Таймаут для стриминга
          setTimeout(() => {
            if (eventSource.readyState !== EventSource.CLOSED) {
              eventSource.close();
              reject(new Error('Streaming timeout'));
            }
          }, 15000);
        });
        
        try {
          const data = await streamPromise;
          return data;
        } catch (streamError) {
          // Fallback на обычный запрос если стриминг не работает
          console.error('Fallback request error:', streamError);
          const response = await fetch('/api/ai/smart-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, userId, sessionId })
          });
          const data = await response.json();
        
          if (data.success) {
            // Сохраняем ответ AI
            await fetch(`/api/chat/sessions/${sessionId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: data.response,
                sender: 'ai',
                userId,
                provider: data.provider,
                model: data.model
              })
            });
          }
          return data;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions', currentSessionId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions'] });
    }
  });

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    const message = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      await sendMessageMutation.mutateAsync({ message, sessionId: currentSessionId });
    } catch (error) {
      console.error('Error sending message:', error);
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
    createSessionMutation.mutate();
  };

  // Мутация для удаления сессии
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions'] });
      if (sessions.length > 1) {
        const remainingSessions = sessions.filter(s => s.id !== currentSessionId);
        setCurrentSessionId(remainingSessions[0]?.id || null);
      } else {
        setCurrentSessionId(null);
      }
    }
  });

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Боковая панель */}
      <div className={`${showSidebar ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden bg-gray-900 text-white flex-shrink-0`}>
        <div className="p-4">
          <button 
            onClick={startNewConversation}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-600 rounded-md hover:bg-gray-800 transition-colors"
            disabled={createSessionMutation.isPending}
          >
            <Plus className="w-4 h-4" />
            Новый чат
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2">
          {sessions.map((session) => (
            <div key={session.id} className="group relative">
              <button
                onClick={() => setCurrentSessionId(session.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md mb-1 hover:bg-gray-800 transition-colors ${
                  currentSessionId === session.id ? 'bg-gray-800' : ''
                }`}
              >
                <div className="truncate">{session.title}</div>
                <div className="text-xs text-gray-400 truncate">
                  {new Date(session.updatedAt).toLocaleDateString()}
                </div>
              </button>
              
              <button
                onClick={() => deleteSessionMutation.mutate(session.id)}
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                disabled={deleteSessionMutation.isPending}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Основная область */}
      <div className="flex-1 flex flex-col">
        {/* Шапка */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-medium">ChatGPT</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={startNewConversation}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={createSessionMutation.isPending}
            >
              <Plus className="w-4 h-4" />
              Новый чат
            </button>
          </div>
        </div>

        {/* Область сообщений */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
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
                      
                      {/* Изображение если есть - проверяем и поле imageUrl и поле content на наличие URL */}
                      {(message.imageUrl || message.content?.includes('/generated-images/')) && (
                        <div className="mt-3">
                          <img 
                            src={message.imageUrl || message.content.match(/\/generated-images\/[^\s]+/)?.[0]} 
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
        <div className="border-t border-gray-200 px-4 py-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-3 bg-white border border-gray-300 rounded-xl p-3 shadow-sm">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Сообщение ChatGPT..."
                className="flex-1 border-0 resize-none focus:ring-0 focus:outline-none text-sm p-0 min-h-[20px] max-h-[200px]"
                rows={1}
                disabled={isLoading || !currentSessionId}
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
                  disabled={isLoading || !input.trim() || !currentSessionId}
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