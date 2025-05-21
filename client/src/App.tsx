import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthScreen from "@/pages/AuthScreen";
import Chat from "@/pages/Chat";
import { useEffect } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  
  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    
    // If no token and not on auth page, redirect to auth
    if (!token && location !== "/") {
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
      <Route path="/chat" component={Chat} />
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
