export interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  conversationId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId?: number;
}

export interface ChatResponse {
  answer: string;
  conversationId?: string;
  sources?: string[];
  contexts?: string[];
  source?: "openai" | "fallback" | "emergency_fallback" | "rag";
  error?: "quota_exceeded" | "network_error" | "api_error" | "server_recovered" | "server_error";
  original_error?: string;
  fallback_reason?: string;
}

export interface ConversationHistoryResponse {
  conversation: Conversation;
  messages: Message[];
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface Feedback {
  id: number;
  messageId: number;
  rating: boolean; // true = thumbs up, false = thumbs down
  createdAt: string;
}
