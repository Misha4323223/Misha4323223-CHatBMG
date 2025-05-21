import { MessageWithSender } from "@shared/schema";

interface MessageBubbleProps {
  message: MessageWithSender;
  isCurrentUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser }) => {
  // Format timestamp
  const messageTime = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  if (isCurrentUser) {
    return (
      <div className="flex items-end justify-end mb-4">
        <div className="flex flex-col space-y-1 items-end">
          <div className="message-bubble sent bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 shadow-md max-w-[80%] rounded-[18px_18px_4px_18px] break-words relative">
            <p className="text-[15px]">{message.text}</p>
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-gradient-to-r from-blue-600 to-indigo-600 transform rotate-45 z-[-1]"></div>
          </div>
          <div className="flex items-center text-xs text-gray-500 pr-2">
            <span>{messageTime}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {message.status === "read" ? 
                <path d="M18 6L9 17l-5-5"/> : 
                <path d="M5 12l5 5L20 7"/>
              }
            </svg>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-end mb-4">
      <div className="flex flex-col space-y-1 max-w-[80%]">
        <div className="flex items-end">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex items-center justify-center mr-2 flex-shrink-0 mb-1 shadow-md">
            <span className="font-medium">{message.sender.initials}</span>
          </div>
          <div className="message-bubble received bg-white p-3 shadow-md rounded-[18px_18px_18px_4px] break-words border border-gray-100 relative">
            <p className="text-[15px] text-gray-800">{message.text}</p>
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-b border-l border-gray-100 transform rotate-45 z-[-1]"></div>
          </div>
        </div>
        <div className="flex items-center">
          <span className="text-xs text-gray-500 ml-10">{messageTime}</span>
          {message.sender.username === "BOOOMERANGS AI" && (
            <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">AI</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
