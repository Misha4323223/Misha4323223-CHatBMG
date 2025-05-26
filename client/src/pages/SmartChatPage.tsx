import React from "react";
import SmartChat from "@/components/SmartChat";

const SmartChatPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Adaptive container with responsive padding */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
        
        {/* Header - premium gradient design */}
        <div className="relative mb-3 sm:mb-4 rounded-xl overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-purple-800/30 backdrop-blur-sm"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/10 to-blue-500/10"></div>
          
          {/* Content */}
          <div className="relative flex items-center justify-start gap-3 sm:gap-4 p-4 sm:p-5 lg:p-6">
            {/* Logo with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full blur-lg opacity-30 animate-pulse"></div>
              <img 
                src="/booomerangs-logo.jpg" 
                alt="BOOOMERANGS" 
                className="relative h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 xl:h-16 xl:w-16 object-contain rounded-full shadow-lg ring-2 ring-purple-400/50"
              />
            </div>
            
            {/* Title with gradient text */}
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-300 bg-clip-text text-transparent">
                BOOOMERANGS AI
              </h1>
              <p className="text-xs sm:text-sm text-purple-300/80 font-medium mt-1">
                Мощная AI платформа для бизнеса
              </p>
            </div>
          </div>
          
          {/* Animated border */}
          <div className="absolute inset-0 rounded-xl border border-gradient-to-r from-purple-500/30 via-blue-500/30 to-purple-500/30"></div>
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