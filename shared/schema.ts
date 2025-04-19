import { pgTable, text, serial, integer, boolean, jsonb, timestamp, uuid, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

// Conversations schema to group messages
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(), // UUID
  title: text("title").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  id: true,
  title: true,
  userId: true,
});

// Message schema for chatbot conversations
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  conversationId: text("conversation_id").references(() => conversations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  role: true,
  content: true,
  conversationId: true,
});

// Define relations between tables
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

// Feedback schema for message ratings
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id).notNull(),
  rating: boolean("rating").notNull(), // true = thumbs up, false = thumbs down
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).pick({
  messageId: true,
  rating: true,
});

// Define relations for feedback
export const feedbackRelations = relations(feedback, ({ one }) => ({
  message: one(messages, {
    fields: [feedback.messageId],
    references: [messages.id],
  }),
}));

// Update message relations to include feedback


// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
