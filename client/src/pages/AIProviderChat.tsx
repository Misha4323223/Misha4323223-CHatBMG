import React from 'react';
import AIProvider from '@/components/AIProvider';

const AIProviderChat: React.FC = () => {
  return (
    <div className="flex flex-col h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
        BOOOMERANGS AI Чат
      </h1>
      
      <div className="flex-1 max-w-5xl mx-auto w-full">
        <AIProvider />
      </div>
    </div>
  );
};

export default AIProviderChat;