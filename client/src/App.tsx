import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthScreen from "@/pages/AuthScreen";
import BooomerangsAuth from "@/pages/BooomerangsAuth";
import Chat from "@/pages/Chat";
import AIChat from "@/pages/AIChat";
import AIProviderChat from "@/pages/AIProviderChat";
import ImageGeneratorSimple from "@/pages/ImageGeneratorSimple";
import { useEffect } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  
  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    
    // Страницы, доступные без аутентификации
    const publicPages = ["/", "/image-generator"];
    const isPublicPage = publicPages.includes(location);
    
    // If no token and not on public page, redirect to auth
    if (!token && !isPublicPage) {
      setLocation("/");
    }
    
    // If token and on auth page, redirect to chat
    if (token && location === "/") {
      setLocation("/chat");
    }
  }, [location, setLocation]);

  return (
    <Switch>
      <Route path="/" component={AuthScreen} />
      <Route path="/new-auth" component={BooomerangsAuth} />
      <Route path="/chat" component={Chat} />
      <Route path="/ai-chat" component={AIChat} />
      <Route path="/provider" component={AIProviderChat} />
      <Route path="/image-generator" component={ImageGeneratorSimple} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
