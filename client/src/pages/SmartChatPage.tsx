import React from "react";
import SmartChat from "@/components/SmartChat";

const SmartChatPage: React.FC = () => {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-2">Умный AI-чат BOOOMERANGS</h1>
      <p className="text-muted-foreground mb-6">
        Новая версия AI-чата с интеллектуальным выбором провайдера. Система автоматически направляет
        ваши вопросы к наиболее подходящим AI-моделям в зависимости от темы запроса.
      </p>
      
      <SmartChat />
    </div>
  );
};

export default SmartChatPage;