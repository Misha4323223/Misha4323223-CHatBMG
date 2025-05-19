import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { User, WSEventType } from "@shared/schema";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import ProxyPanel from "@/components/ProxyPanel";
import { useWebSocket } from "@/lib/useWebSocket";
import { useMessages } from "@/lib/useMessages";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MessageWithSender, UserWithInitials } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient } from "@/lib/queryClient";

export default function Chat() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithInitials | null>(null);
  const [connectedStatus, setConnectedStatus] = useState<"connected" | "disconnected">("connected");
  
  // Get current user from localStorage
  const currentUserData = localStorage.getItem("user");
  const currentUser = currentUserData ? JSON.parse(currentUserData) as UserWithInitials : null;
  
  // Get token from localStorage
  const token = localStorage.getItem("access_token");
  
  // Redirect if no token or user data
  useEffect(() => {
    if (!token || !currentUser) {
      setLocation("/");
    }
  }, [token, currentUser, setLocation]);
  
  // Fetch users
  const { data: users = [] } = useQuery<UserWithInitials[]>({
    queryKey: ["/api/users"],
    enabled: !!token,
  });
  
  // Get messages with selected user
  const { messages, sendMessage, addMessage } = useMessages(
    selectedUser ? selectedUser.id : null,
    currentUser ? currentUser.id : null
  );
  
  // WebSocket connection
  const { connectionStatus, sendWSMessage } = useWebSocket({
    url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`,
    onOpen: () => {
      // Authenticate with WS connection
      if (token) {
        sendWSMessage({
          type: WSEventType.AUTH,
          payload: { token }
        });
      }
      setConnectedStatus("connected");
    },
    onMessage: (data) => {
      try {
        const message = JSON.parse(data);
        
        // Handle different message types
        switch (message.type) {
          case WSEventType.MESSAGE:
            addMessage(message.payload);
            break;
          case WSEventType.USER_CONNECTED:
          case WSEventType.USER_DISCONNECTED:
            // Invalidate users query to refresh statuses
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            break;
          case WSEventType.ERROR:
            toast({
              variant: "destructive",
              title: "Error",
              description: message.payload.message || "An error occurred"
            });
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    },
    onClose: () => {
      setConnectedStatus("disconnected");
    },
    onError: () => {
      setConnectedStatus("disconnected");
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to chat server."
      });
    }
  });
  
  // Handle sending messages
  const handleSendMessage = (text: string) => {
    if (!selectedUser || !currentUser) return;
    
    // Send message through WebSocket
    sendWSMessage({
      type: WSEventType.MESSAGE,
      payload: {
        text,
        receiverId: selectedUser.id
      }
    });
    
    // Add to local messages immediately
    const newMessage: MessageWithSender = {
      id: Date.now(),
      senderId: currentUser.id,
      receiverId: selectedUser.id,
      text,
      timestamp: new Date(),
      status: "sent",
      sender: currentUser,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    addMessage(newMessage);
  };
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setLocation("/");
  };
  
  // If no user is selected and there are users available, select the first one
  useEffect(() => {
    if (!selectedUser && users.length > 0 && users[0].id !== currentUser?.id) {
      setSelectedUser(users.find(user => user.id !== currentUser?.id) || null);
    }
  }, [users, selectedUser, currentUser]);
  
  if (!currentUser) return null;
  
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="h-screen flex flex-col bg-neutral-100 text-neutral-900">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 py-3 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-primary">Proxy Chat</h1>
          <div className="ml-3 flex items-center">
            <span className={`status-dot ${connectedStatus === "connected" ? "bg-status-success" : "bg-status-error"} mr-1.5 w-2 h-2 rounded-full inline-block`}></span>
            <span className={`text-sm ${connectedStatus === "connected" ? "text-status-success" : "text-status-error"}`}>
              {connectedStatus === "connected" ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <span className="text-sm mr-3 text-neutral-700">{currentUser.username}</span>
          <button 
            className="text-neutral-700 hover:text-status-error focus:outline-none" 
            onClick={handleLogout}
          >
            <span className="material-icons text-sm">logout</span>
          </button>
        </div>
      </header>
      
      {/* Вкладки */}
      <div className="bg-white border-b border-neutral-200 px-4 py-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="chat">Чат</TabsTrigger>
            <TabsTrigger value="proxy">Прокси</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 h-[calc(100%-100px)] overflow-hidden">
        {activeTab === "chat" ? (
          <>
            <Sidebar 
              users={users.filter(user => user.id !== currentUser.id)}
              currentUser={currentUser}
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
              isOpen={isMobileSidebarOpen}
              onToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            />
            
            <ChatArea 
              messages={messages}
              currentUser={currentUser}
              selectedUser={selectedUser}
              onSendMessage={handleSendMessage}
              onOpenSidebar={() => setIsMobileSidebarOpen(true)}
              connectionStatus={connectedStatus}
            />
          </>
        ) : (
          <div className="flex-1 p-4 overflow-y-auto">
            <ProxyPanel />
          </div>
        )}
      </div>
    </div>
  );
}
