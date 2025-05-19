import { useState, useRef, useEffect } from "react";
import { MessageWithSender, UserWithInitials } from "@shared/schema";
import MessageBubble from "@/components/MessageBubble";
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
  
  // If no user is selected, show a message
  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col bg-white items-center justify-center text-neutral-700">
        <p>Select a user to start chatting</p>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="border-b border-neutral-200 p-4 flex items-center">
        <div className="lg:hidden mr-3">
          <button 
            className="p-1 text-neutral-700 hover:text-primary focus:outline-none" 
            onClick={onOpenSidebar}
          >
            <span className="material-icons">menu</span>
          </button>
        </div>
        
        <div className="flex items-center flex-1">
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center mr-3 flex-shrink-0">
            <span>{selectedUser.initials}</span>
          </div>
          <div>
            <h2 className="font-semibold">{selectedUser.username}</h2>
            <div className="flex items-center text-sm text-neutral-700">
              <span className={`status-dot ${selectedUser.isOnline ? 'bg-status-success' : 'bg-neutral-700'} mr-1.5 w-2 h-2 rounded-full inline-block`}></span>
              <span>{selectedUser.isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-neutral-100">
        <div className="space-y-4">
          {/* System Message - Chat Started */}
          {messages.length === 0 && (
            <div className="flex justify-center">
              <div className="bg-white px-4 py-2 rounded-full text-sm text-neutral-700 shadow-sm">
                Chat started with {selectedUser.username}
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
      <div className="border-t border-neutral-200 p-3 bg-white">
        {connectionStatus === "disconnected" && (
          <div className="mb-2 bg-status-error bg-opacity-10 text-status-error p-2 rounded-md text-sm flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>Connection lost. Reconnecting...</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input 
            type="text" 
            className="flex-1 px-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Type a message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={connectionStatus === "disconnected"}
          />
          <button 
            type="submit" 
            className="bg-primary p-2 rounded-md text-white hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
            disabled={connectionStatus === "disconnected" || !newMessage.trim()}
          >
            <span className="material-icons">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
