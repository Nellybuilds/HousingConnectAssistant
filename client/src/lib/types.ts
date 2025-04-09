export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  answer: string;
  sources?: string[];
  error?: "quota_exceeded" | "network_error" | "api_error";
}
