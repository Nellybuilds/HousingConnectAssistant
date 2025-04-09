import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { generateChatResponse } from "./openai";
import { housingConnectKnowledge } from "./knowledge";

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
      
      // Generate response using OpenAI
      const chatResponse = await generateChatResponse({
        message,
        knowledgeBase: housingConnectKnowledge,
      });
      
      // If there's an error property, we still return 200 with the error info in the response
      // This allows the client to handle different types of errors gracefully
      return res.json(chatResponse);
    } catch (error) {
      console.error("Error processing chat request:", error);
      // Generic server error that wasn't caught in the OpenAI handler
      return res.status(500).json({ 
        answer: "An error occurred while processing your request. Please try again later.",
        error: "server_error" 
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
