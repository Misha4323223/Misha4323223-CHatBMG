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
          <div className="message-bubble sent bg-primary text-white p-3 shadow-sm max-w-[80%] rounded-[18px_18px_0_18px] break-words">
            <p>{message.text}</p>
          </div>
          <div className="flex items-center text-xs text-neutral-700">
            <span>{messageTime}</span>
            <span className="material-icons text-xs ml-1 text-status-success">
              {message.status === "read" ? "done_all" : "done"}
            </span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-end mb-4">
      <div className="flex flex-col space-y-1 max-w-[80%]">
        <div className="flex items-end">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-2 flex-shrink-0 mb-1">
            <span>{message.sender.initials}</span>
          </div>
          <div className="message-bubble received bg-white p-3 shadow-sm rounded-[18px_18px_18px_0] break-words">
            <p>{message.text}</p>
          </div>
        </div>
        <span className="text-xs text-neutral-700 ml-10">{messageTime}</span>
      </div>
    </div>
  );
};

export default MessageBubble;
