import React from "react";
import SmartChat from "@/components/SmartChat";

const SmartChatPage: React.FC = () => {
  return (
    <div className="min-h-screen text-white relative overflow-hidden"
         style={{
           background: 'radial-gradient(ellipse at top, #1a0a0a 0%, #0a0a0a 50%, #000000 100%)',
         }}>
      {/* Анимированный фон с частицами */}
      <div className="absolute inset-0 pointer-events-none"
           style={{
             background: `
               radial-gradient(circle at 20% 80%, rgba(220, 38, 38, 0.1) 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)
             `,
             animation: 'backgroundShift 20s ease-in-out infinite'
           }} />
      
      {/* Adaptive container with responsive padding */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4 relative z-10"
           style={{
             background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.03) 0%, rgba(26, 10, 10, 0.03) 50%, rgba(10, 10, 10, 0.03) 100%)'
           }}>
        
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
          <SmartChat key={Date.now()} />
        </div>
      </div>
    </div>
  );
};

export default SmartChatPage;