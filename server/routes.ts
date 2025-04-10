import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { generateChatResponse } from "./openai";
import { housingConnectKnowledge } from "./knowledge";
import { findBestAnswer } from "./fallbackChat";
import { storage } from "./storage";
import { generateRAGResponse } from "./rag";

// Define validation schema for chat requests
const chatRequestSchema = z.object({
  message: z.string().min(1).max(500),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat endpoint
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const chatSchema = z.object({
        message: z.string().min(1).max(500),
        conversationId: z.string().optional(),
      });
      
      const result = chatSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request",
          errors: result.error.format() 
        });
      }
      
      const { message, conversationId } = result.data;
      
      // Get or create conversation
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        // Create a new conversation if one wasn't provided
        const newConversation = await storage.createConversation({
          id: `conv_${Date.now()}`,
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          userId: 1, // Default user ID for now (would be from auth in production)
        });
        activeConversationId = newConversation.id;
      }
      
      // Store user message
      await storage.createMessage({
        role: "user",
        content: message,
        conversationId: activeConversationId,
      });
      
      try {
        // Try to generate response using RAG first
        try {
          console.log("Attempting to use RAG for answer generation...");
          const ragResponse = await generateRAGResponse(message);
          
          // Store and return the RAG response
          await storage.createMessage({
            role: "assistant",
            content: ragResponse.answer,
            conversationId: activeConversationId,
          });
          
          return res.json({
            answer: ragResponse.answer,
            conversationId: activeConversationId,
            source: "rag",
            contexts: ragResponse.contexts
          });
        } catch (ragError) {
          console.error("RAG generation failed, falling back to standard OpenAI:", ragError);
          
          // Fall back to standard OpenAI if RAG fails
          const chatResponse = await generateChatResponse({
            message,
            knowledgeBase: housingConnectKnowledge,
          });
          
          // If there's an error property but OpenAI still returned a response
          if (chatResponse.error) {
            console.log(`OpenAI error type: ${chatResponse.error}, falling back to local knowledge base`);
            
            // If it's a quota error, use our fallback
            if (chatResponse.error === "quota_exceeded") {
              // Use fallback implementation
              const fallbackAnswer = findBestAnswer(message);
              
              // Store assistant message
              await storage.createMessage({
                role: "assistant",
                content: fallbackAnswer,
                conversationId: activeConversationId,
              });
              
              return res.json({
                answer: fallbackAnswer,
                conversationId: activeConversationId,
                source: "fallback",
                original_error: chatResponse.error
              });
            }
            
            // For other errors, return the OpenAI error response as is
            return res.json({
              ...chatResponse,
              conversationId: activeConversationId
            });
          }
          
          // If no error, store and return the OpenAI response
          await storage.createMessage({
            role: "assistant",
            content: chatResponse.answer,
            conversationId: activeConversationId,
          });
          
          return res.json({
            ...chatResponse,
            conversationId: activeConversationId
          });
        }
      } catch (openaiError) {
        // If OpenAI completely fails, use fallback
        console.error("OpenAI request failed completely, using fallback:", openaiError);
        const fallbackAnswer = findBestAnswer(message);
        
        // Store assistant message
        await storage.createMessage({
          role: "assistant",
          content: fallbackAnswer,
          conversationId: activeConversationId,
        });
        
        return res.json({
          answer: fallbackAnswer,
          conversationId: activeConversationId,
          source: "fallback",
          fallback_reason: "api_failure"
        });
      }
    } catch (error) {
      console.error("Error processing chat request:", error);
      // Last resort fallback - if everything else fails
      try {
        const emergencyAnswer = findBestAnswer(req.body?.message || "");
        return res.json({ 
          answer: emergencyAnswer,
          source: "emergency_fallback",
          error: "server_recovered" 
        });
      } catch (fallbackError) {
        // If even the fallback fails, return a generic error
        return res.status(500).json({ 
          answer: "An error occurred while processing your request. Please try again later.",
          error: "server_error" 
        });
      }
    }
  });

  // Get conversation history
  app.get("/api/conversations/:conversationId", async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      
      if (!conversationId) {
        return res.status(400).json({ message: "Conversation ID is required" });
      }
      
      // Get conversation details
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Get messages for this conversation
      const messages = await storage.getMessages(conversationId);
      
      return res.json({
        conversation,
        messages
      });
    } catch (error) {
      console.error("Error retrieving conversation:", error);
      return res.status(500).json({ message: "An error occurred while retrieving the conversation" });
    }
  });
  
  // Get all conversations for user
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      // In a real app, this would come from auth middleware
      const userId = 1; // Default user for now
      
      const conversations = await storage.getUserConversations(userId);
      
      return res.json({ conversations });
    } catch (error) {
      console.error("Error retrieving conversations:", error);
      return res.status(500).json({ message: "An error occurred while retrieving conversations" });
    }
  });
  
  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
