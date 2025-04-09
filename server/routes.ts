import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { generateChatResponse } from "./openai";
import { housingConnectKnowledge } from "./knowledge";
import { findBestAnswer } from "./fallbackChat";

// Define validation schema for chat requests
const chatRequestSchema = z.object({
  message: z.string().min(1).max(500),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat endpoint
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const result = chatRequestSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request",
          errors: result.error.format() 
        });
      }
      
      const { message } = result.data;
      
      try {
        // Try to generate response using OpenAI first
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
            return res.json({
              answer: fallbackAnswer,
              source: "fallback",
              original_error: chatResponse.error
            });
          }
          
          // For other errors, return the OpenAI error response as is
          return res.json(chatResponse);
        }
        
        // If no error, return the OpenAI response
        return res.json(chatResponse);
      } catch (openaiError) {
        // If OpenAI completely fails, use fallback
        console.error("OpenAI request failed completely, using fallback:", openaiError);
        const fallbackAnswer = findBestAnswer(message);
        return res.json({
          answer: fallbackAnswer,
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

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
