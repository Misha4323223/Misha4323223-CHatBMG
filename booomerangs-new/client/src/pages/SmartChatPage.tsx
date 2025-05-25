import React from "react";
import SmartChat from "@/components/SmartChat";

const SmartChatPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Adaptive container with responsive padding */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
        
        {/* Header - responsive logo and title */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <img 
            src="/booomerangs-logo.jpg" 
            alt="BOOOMERANGS" 
            className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 object-contain"
          />
          <h1 className="text-sm sm:text-lg lg:text-xl font-bold">BOOOMERANGS AI</h1>
        </div>
        
        {/* Chat container with full responsive layout */}
        <div className="w-full">
          <SmartChat />
        </div>
      </div>
    </div>
  );
};

export default SmartChatPage;