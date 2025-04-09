import { useState } from "react";
import { Message } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ERROR_MESSAGE } from "@/lib/constants";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  const sendChatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", { message });
      return response.json();
    },
    onSuccess: (data) => {
      // Handle the response
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer }
      ]);
      
      // Show toast for API errors if they exist
      if (data.error) {
        let title = "Error";
        let description = ERROR_MESSAGE;
        
        if (data.error === "quota_exceeded") {
          title = "API Quota Exceeded";
          description = "The OpenAI API quota has been exceeded. Please try again later.";
        } else if (data.error === "network_error") {
          title = "Network Error";
          description = "There was an issue connecting to the AI service. Please check your internet connection.";
        }
        
        toast({
          variant: "destructive",
          title,
          description
        });
      }
      
      setIsTyping(false);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get a response. Please try again."
      });
      setIsTyping(false);
    }
  });

  const sendMessage = (message: string) => {
    // Don't send empty messages
    if (!message.trim()) return;
    
    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      { role: "user", content: message }
    ]);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Send message to server
    sendChatMutation.mutate(message);
  };

  const askSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  return {
    messages,
    isTyping,
    sendMessage,
    askSuggestedQuestion
  };
}
