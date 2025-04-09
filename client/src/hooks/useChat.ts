import { useState } from "react";
import { Message } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer }
      ]);
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
