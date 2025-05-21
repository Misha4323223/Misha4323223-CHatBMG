import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

// Extend the auth schema for the form
const formSchema = authSchema.extend({});

export default function AuthScreen() {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form setup with validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth", { token: values.token });
      const data = await response.json();
      
      // Store token and user info in local storage
      localStorage.setItem("access_token", values.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Show success toast
      toast({
        title: "Authentication successful",
        description: "Welcome to Proxy Chat!",
      });
      
      // Redirect to chat page
      setLocation("/chat");
    } catch (error) {
      console.error("Authentication error:", error);
      
      // Show error toast
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Invalid access token. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
      <Card className="w-full max-w-md p-8 bg-white rounded-lg shadow-2xl border border-gray-200">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img src="/images/booomerangs-logo.svg" alt="BOOOMERANGS" className="h-32 w-auto" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">BOOOMERANGS</h1>
          <p className="text-gray-600 mt-2">Бесплатный доступ к AI без платных API ключей</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">ACCESS TOKEN</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Введите свой токен доступа"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs mt-1 text-red-500" />
                </FormItem>
              )}
            />
            
            {form.formState.errors.root && (
              <div className="bg-status-error bg-opacity-10 text-status-error p-3 rounded-md text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>{form.formState.errors.root.message}</span>
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg transform hover:scale-[1.02] active:scale-[0.98] duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </span>
                  Подключение...
                </>
              ) : (
                "Войти в чат"
              )}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}
