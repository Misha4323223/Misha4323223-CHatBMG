import React from "react";
import SmartChat from "@/components/SmartChat";

const SmartChatPage: React.FC = () => {
  return (
    <div className="container py-2">
      <div className="flex items-center gap-2 mb-2">
        <img 
          src="/booomerangs-logo.jpg" 
          alt="BOOOMERANGS" 
          className="h-6 w-6 object-contain"
        />
        <h1 className="text-lg font-bold">BOOOMERANGS AI</h1>
      </div>
      
      <SmartChat />
    </div>
  );
};

export default SmartChatPage;