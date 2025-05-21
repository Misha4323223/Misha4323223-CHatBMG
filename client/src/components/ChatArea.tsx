import { useState, useRef, useEffect } from "react";
import { MessageWithSender, UserWithInitials } from "@shared/schema";
import MessageBubble from "@/components/MessageBubble";
import BooomerangsLogo from "@/components/BooomerangsLogo";
import { AlertCircle } from "lucide-react";

interface ChatAreaProps {
  messages: MessageWithSender[];
  currentUser: UserWithInitials;
  selectedUser: UserWithInitials | null;
  onSendMessage: (text: string) => void;
  onOpenSidebar: () => void;
  connectionStatus: "connected" | "disconnected";
}

const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  currentUser,
  selectedUser,
  onSendMessage,
  onOpenSidebar,
  connectionStatus
}) => {
  const [newMessage, setNewMessage] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMessage.trim() && selectedUser) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };
  
  // If no user is selected, show a welcome screen with logo
  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6"
        style={{
          background: 'radial-gradient(circle at center, rgba(219, 234, 254, 0.5) 0%, rgba(224, 231, 255, 0.2) 70%)'
        }}>
        <div className="text-center max-w-md p-10 rounded-3xl bg-white shadow-xl"
            style={{borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.15)'}}>
          <div className="mb-8">
            <BooomerangsLogo size={140} className="mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-3 leading-tight"
              style={{
                backgroundImage: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent'
              }}>
              BOOOMERANGS AI
            </h1>
            <p className="text-gray-600 mb-8 text-lg">
              Бесплатный доступ к возможностям искусственного интеллекта без платных API ключей
            </p>
          </div>
          
          <div className="py-3 px-5 bg-blue-50 rounded-xl inline-flex items-center"
            style={{border: '1px solid rgba(59, 130, 246, 0.2)'}}>
            <span className="flex items-center text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Выберите пользователя из списка слева, чтобы начать общение
            </span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-100 p-4 flex items-center shadow-sm" 
           style={{background: 'linear-gradient(135deg, rgba(219, 234, 254, 0.8), rgba(224, 231, 255, 0.8))'}}>
        <div className="lg:hidden mr-3">
          <button 
            className="p-1.5 rounded-full bg-white text-blue-600 hover:text-blue-800 focus:outline-none transition-colors shadow-sm border border-blue-100" 
            onClick={onOpenSidebar}
            style={{boxShadow: '0 2px 5px -1px rgba(59, 130, 246, 0.15)'}}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center justify-between flex-1">
          <div className="flex items-center">
            <div 
              className="w-11 h-11 rounded-full text-white flex items-center justify-center mr-3 flex-shrink-0" 
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)', 
                boxShadow: '0 4px 10px -2px rgba(59, 130, 246, 0.3)'
              }}
            >
              <span className="font-medium text-lg">{selectedUser.initials}</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-800 text-lg">{selectedUser.username}</h2>
              <div className="flex items-center text-sm text-gray-600">
                <div className="relative flex items-center">
                  <span 
                    className={`w-2.5 h-2.5 rounded-full inline-block mr-1.5 ${selectedUser.isOnline ? '' : 'bg-gray-400'}`}
                    style={selectedUser.isOnline ? {background: '#10b981', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)'} : {}}
                  ></span>
                  <span>{selectedUser.isOnline ? 'В сети' : 'Не в сети'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center bg-white py-2 px-4 rounded-full shadow-sm border border-blue-50">
            <BooomerangsLogo size={26} className="mr-2" />
            <span 
              className="font-medium bg-clip-text text-transparent" 
              style={{background: 'linear-gradient(to right, #3b82f6, #6366f1)'}}
            >
              BOOOMERANGS AI
            </span>
          </div>
        </div>
      </div>
      
      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-4">
          {/* System Message - Chat Started */}
          {messages.length === 0 && (
            <div className="flex justify-center">
              <div className="bg-white px-6 py-3 rounded-full text-sm text-gray-700 shadow-sm border border-gray-100">
                <span className="text-blue-600 font-medium">BOOOMERANGS AI</span> готов к диалогу с {selectedUser.username}
              </div>
            </div>
          )}
          
          {/* Messages */}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isCurrentUser={message.senderId === currentUser.id}
            />
          ))}
        </div>
      </div>
      
      {/* Message Input Area */}
      <div className="border-t border-gray-100 p-4 bg-white" style={{boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'}}>
        {connectionStatus === "disconnected" && (
          <div className="mb-3 p-3 rounded-xl text-sm flex items-center" 
               style={{background: 'rgba(248, 113, 113, 0.1)', color: '#ef4444', border: '1px solid rgba(248, 113, 113, 0.2)'}}>
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>Соединение потеряно. Переподключение...</span>
          </div>
        )}
        
        <div className="flex items-center">
          <div className="hidden sm:flex mr-3">
            <BooomerangsLogo size={32} />
          </div>
          <form onSubmit={handleSubmit} className="flex-1 flex items-center space-x-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                className="w-full px-5 py-3.5 border border-gray-200 rounded-xl bg-white text-gray-800"
                style={{
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease'
                }}
                placeholder="Введите сообщение..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={connectionStatus === "disconnected"}
              />
            </div>
            <button 
              type="submit" 
              className="p-3.5 text-white rounded-xl disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                boxShadow: '0 4px 10px -2px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s ease',
                transform: newMessage.trim() ? 'scale(1)' : 'scale(0.98)'
              }}
              disabled={connectionStatus === "disconnected" || !newMessage.trim()}
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
};

export default ChatArea;
