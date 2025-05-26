import React from "react";
import SmartChat from "@/components/SmartChat";

const SmartChatPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Adaptive container with responsive padding */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
        
        {/* Header - responsive logo and title */}
        <div className="flex items-center justify-start gap-3 sm:gap-4 mb-3 sm:mb-4">
          <img 
            src="/booomerangs-logo.jpg" 
            alt="BOOOMERANGS" 
            className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 xl:h-16 xl:w-16 object-contain"
          />
          <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold">BOOOMERANGS AI</h1>
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