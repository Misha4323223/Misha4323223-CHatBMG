import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import BooomerangsLogo from './BooomerangsLogo';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  model?: string;
  provider?: string;
  time: string;
}

const AIProvider: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState('AItianhu');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now(),
      text: newMessage,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.text,
          provider: provider === 'auto' ? null : provider
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const aiMessage: Message = {
          id: Date.now() + 1,
          text: data.response,
          sender: 'ai',
          model: data.model || 'AI',
          provider: data.provider || 'Unknown',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось получить ответ от AI',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Ошибка соединения',
        description: 'Не удалось подключиться к API',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center">
          <BooomerangsLogo size={36} className="mr-3" />
          <div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              BOOOMERANGS AI
            </h2>
            <p className="text-sm text-gray-600">Бесплатный доступ к AI без платных API ключей</p>
          </div>
        </div>
        
        <select
          className="px-3 py-2 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="AItianhu">Qwen AI</option>
          <option value="Phind">Phind AI</option>
          <option value="HuggingChat">HuggingChat</option>
          <option value="auto">Автовыбор</option>
        </select>
      </div>
      
      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto" style={{ background: "radial-gradient(circle at center, rgba(243, 244, 246, 0.6) 0%, rgba(249, 250, 251, 0.9) 100%)" }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white p-6 rounded-2xl shadow-lg max-w-md text-center">
              <BooomerangsLogo size={64} className="mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Добро пожаловать в BOOOMERANGS AI!
              </h3>
              <p className="text-gray-600 mb-4">
                Задайте любой вопрос и получите ответ от искусственного интеллекта без платных API ключей.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : ''}`}
              >
                {message.sender === 'ai' && (
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
                
                {message.sender === 'user' ? (
                  <div className="flex flex-col items-end space-y-1 max-w-[80%]">
                    <div className="message-bubble sent p-3 text-white text-[15px]">
                      <p className="whitespace-pre-wrap">{message.text}</p>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 pr-2 mt-1">
                      <span>{message.time}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 ml-1 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-1 max-w-[80%]">
                    <div className="message-bubble received p-3 text-[15px] text-gray-800">
                      <p className="whitespace-pre-wrap">{message.text}</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500">{message.time}</span>
                      {message.model && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                          {message.model}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex items-center justify-center mr-2">
                  B
                </div>
                <div className="bg-white p-3 rounded-lg rounded-bl-none inline-flex space-x-1 items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-700 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Введите ваш вопрос..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            disabled={isLoading || !newMessage.trim()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIProvider;