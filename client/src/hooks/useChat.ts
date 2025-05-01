import { useState, useEffect } from "react";
import { Message, Conversation, ConversationHistoryResponse } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ERROR_MESSAGE, WELCOME_MESSAGE } from "@/lib/constants";

export function useChat(initialConversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(initialConversationId);
  const { toast } = useToast();

  // Load conversation history if we have a conversation ID
  const { data: conversationData, isLoading: isLoadingConversation } = useQuery({
    queryKey: ['/api/conversations', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return null;
      const response = await apiRequest("GET", `/api/conversations/${activeConversationId}`);
      return response.json() as Promise<ConversationHistoryResponse>;
    },
    enabled: !!activeConversationId, // Only run the query if we have a conversation ID
  });

  // Load conversations list
  const { data: conversationsData } = useQuery({
    queryKey: ['/api/conversations'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/conversations");
      return response.json();
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: false, // Don't refetch when window is focused
  });

  // Set initial messages from conversation history
  useEffect(() => {
    if (conversationData?.messages) {
      setMessages(conversationData.messages);
    } else if (!activeConversationId && !messages.length) {
      // If no conversation ID and no messages, add welcome message
      setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
    }
  }, [conversationData, activeConversationId]);

  const sendChatMutation = useMutation({
    mutationFn: async ({ message, conversationId }: { message: string, conversationId?: string }) => {
      const response = await apiRequest("POST", "/api/chat", { 
        message,
        conversationId
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Set or update conversation ID
      if (data.conversationId) {
        setActiveConversationId(data.conversationId);
      }
      
      // Get the latest messages from the API to ensure we have IDs for feedback
      if (data.conversationId) {
        // Refresh the messages to get the latest with IDs
        fetch(`/api/conversations/${data.conversationId}`)
          .then(response => response.json())
          .then(convData => {
            if (convData.messages && convData.messages.length > 0) {
              console.log("Refreshed messages with IDs:", convData.messages);
              setMessages(convData.messages);
            } else {
              // Fallback in case refresh fails
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.answer, conversationId: data.conversationId }
              ]);
            }
          })
          .catch(err => {
            console.error("Error refreshing messages:", err);
            // Fallback to just adding the message without an ID
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: data.answer, conversationId: data.conversationId }
            ]);
          });
      } else {
        // Just add the message without refreshing if no conversation ID
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer }
        ]);
      }
      
      // Show toast for API errors if they exist
      if (data.error) {
        let title = "Error";
        let description = ERROR_MESSAGE;
        
        if (data.error === "quota_exceeded") {
          title = "API Quota Exceeded";
          description = "The OpenAI API quota has been exceeded. Using local fallback.";
        } else if (data.error === "network_error") {
          title = "Network Error";
          description = "There was an issue connecting to the AI service. Using local fallback.";
        } else if (data.error === "server_recovered") {
          title = "Recovery Mode";
          description = "The server encountered an error but was able to recover.";
        }
        
        toast({
          variant: data.error === "server_recovered" ? "default" : "destructive",
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
      { 
        role: "user", 
        content: message, 
        conversationId: activeConversationId 
      }
    ]);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Send message to server
    sendChatMutation.mutate({ 
      message,
      conversationId: activeConversationId
    });
  };

  const askSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const loadConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const startNewConversation = () => {
    setActiveConversationId(undefined);
    setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
  };

  return {
    messages,
    isTyping,
    sendMessage,
    askSuggestedQuestion,
    activeConversationId,
    loadConversation,
    startNewConversation,
    conversations: conversationsData?.conversations || [],
    isLoadingConversation
  };
}
