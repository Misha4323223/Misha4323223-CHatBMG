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

export default function BooomerangsAuth() {
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
        title: "Авторизация успешна",
        description: "Добро пожаловать в BOOOMERANGS AI!",
      });
      
      // Redirect to chat page
      setLocation("/chat");
    } catch (error) {
      console.error("Authentication error:", error);
      
      // Show error toast
      toast({
        variant: "destructive",
        title: "Ошибка авторизации",
        description: error instanceof Error ? error.message : "Неверный токен доступа. Пожалуйста, попробуйте снова.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e40af, #3b82f6, #4f46e5)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '28rem',
        padding: '2.5rem',
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Декоративный элемент */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, #3b82f6, #4f46e5)',
          opacity: 0.1
        }}></div>
        
        <div style={{textAlign: 'center', marginBottom: '2rem', position: 'relative'}}>
          {/* Логотип */}
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1.25rem'}}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'white',
              border: '4px solid #3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#3b82f6',
              boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)'
            }}>B</div>
          </div>
          
          {/* Заголовок */}
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            position: 'relative'
          }}>
            <span style={{
              background: 'linear-gradient(to right, #3b82f6, #4f46e5)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>BOOOMERANGS</span>
          </h1>
          
          {/* Подзаголовок */}
          <p style={{
            color: '#6b7280', 
            marginBottom: '2rem',
            fontSize: '0.95rem'
          }}>
            Бесплатный доступ к AI без платных API ключей
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#4b5563',
                    marginBottom: '0.5rem',
                    display: 'block'
                  }}>ACCESS TOKEN</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Введите свой токен доступа"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        outline: 'none',
                        fontSize: '1rem',
                        color: '#1f2937',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage style={{color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem'}} />
                </FormItem>
              )}
            />
            
            {form.formState.errors.root && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle style={{width: '1rem', height: '1rem'}} />
                <span>{form.formState.errors.root.message}</span>
              </div>
            )}
            
            <Button
              type="submit"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: 500,
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                background: isLoading ? '#93c5fd' : 'linear-gradient(to right, #3b82f6, #4f46e5)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)'
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: 'white',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <style>
                    {`
                      @keyframes spin {
                        to { transform: rotate(360deg); }
                      }
                    `}
                  </style>
                  Подключение...
                </>
              ) : (
                "Войти в чат"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}