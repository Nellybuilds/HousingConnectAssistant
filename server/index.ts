import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { initializePineconeWithKnowledge } from "./rag";

// Initialize a default user if no users exist
async function initializeDefaultUser() {
  try {
    // Check if any users exist
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length === 0) {
      // Create a default user
      log("Creating default user");
      await storage.createUser({
        username: "default",
        email: "user@example.com",
        password: "hashed_password", // In a real app, this would be hashed
      });
      log("Default user created");
    } else {
      log(`Found ${existingUsers.length} existing users`);
    }
  } catch (error) {
    console.error("Error initializing default user:", error);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database with default user if needed
  await initializeDefaultUser();
  
  // Initialize Pinecone with Housing Connect knowledge
  try {
    log("Starting Pinecone knowledge base initialization...");
    await initializePineconeWithKnowledge();
    log("Pinecone knowledge base initialized successfully");
  } catch (error) {
    console.error("Error initializing Pinecone knowledge base:", error);
    log("Failed to initialize Pinecone knowledge base. Continuing with fallback system.");
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
