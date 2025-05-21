import { useState, useRef, useEffect } from "react";
import { MessageWithSender, UserWithInitials } from "@shared/schema";
import MessageBubble from "@/components/MessageBubble";
import { AlertCircle } from "lucide-react";

// Встроенный компонент логотипа BOOOMERANGS
const BooomerangsLogo = ({ size = 32, className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <div 
        className="absolute inset-0 rounded-full bg-white border-4 border-blue-500"
        style={{ width: size, height: size }}
      ></div>
      <div className="text-blue-600 font-bold" style={{ fontSize: size/4 }}>B</div>
    </div>
  );
};

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
      <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 items-center justify-center text-gray-700 p-6">
        <div className="text-center max-w-md">
          <BooomerangsLogo size={128} className="mx-auto mb-6" />
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700 mb-3">BOOOMERANGS AI</h1>
          <p className="text-gray-600 mb-8">Бесплатный доступ к возможностям искусственного интеллекта без платных API ключей</p>
          <div className="flex items-center justify-center">
            <span className="flex items-center text-blue-600">
              <span className="mr-2">👈</span> Выберите пользователя из списка слева, чтобы начать общение
            </span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center shadow-sm">
        <div className="lg:hidden mr-3">
          <button 
            className="p-1 text-blue-600 hover:text-blue-800 focus:outline-none transition-colors" 
            onClick={onOpenSidebar}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center justify-between flex-1">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center mr-3 flex-shrink-0 shadow-md">
              <span className="font-medium">{selectedUser.initials}</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{selectedUser.username}</h2>
              <div className="flex items-center text-sm text-gray-600">
                <span className={`status-dot ${selectedUser.isOnline ? 'bg-green-500' : 'bg-gray-500'} mr-1.5 w-2 h-2 rounded-full inline-block`}></span>
                <span>{selectedUser.isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center">
            <BooomerangsLogo size={32} className="mr-2" />
            <span className="text-sm font-medium text-blue-600">BOOOMERANGS AI</span>
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
      <div className="border-t border-gray-200 p-4 bg-white shadow-sm">
        {connectionStatus === "disconnected" && (
          <div className="mb-3 bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>Соединение потеряно. Переподключение...</span>
          </div>
        )}
        
        <div className="flex items-center">
          <div className="hidden sm:flex mr-3">
            <BooomerangsLogo size={28} />
          </div>
          <form onSubmit={handleSubmit} className="flex-1 flex items-center space-x-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800"
                placeholder="Введите сообщение..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={connectionStatus === "disconnected"}
              />
            </div>
            <button 
              type="submit" 
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm transform hover:scale-[1.02] active:scale-[0.98] duration-200 disabled:opacity-50"
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
