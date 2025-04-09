import { useRef, useEffect } from "react";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import ChatSuggestions from "./ChatSuggestions";
import { useChat } from "@/hooks/useChat";
import { WELCOME_MESSAGE } from "@/lib/constants";

export default function ChatInterface() {
  const { 
    messages, 
    isTyping, 
    sendMessage,
    askSuggestedQuestion 
  } = useChat();
  
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Chat messages container */}
      <div 
        ref={chatMessagesRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-4 chat-height"
      >
        <div className="flex flex-col max-w-3xl mx-auto space-y-4 pb-4">
          {/* Welcome message */}
          <ChatMessage 
            role="assistant"
            content={WELCOME_MESSAGE}
          />
          
          {/* Suggested questions - only show initially */}
          {messages.length === 0 && (
            <ChatSuggestions onSelectQuestion={askSuggestedQuestion} />
          )}
          
          {/* Conversation messages */}
          {messages.map((message, index) => (
            <ChatMessage 
              key={index}
              role={message.role}
              content={message.content}
            />
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-2">
                <i className="ri-robot-line text-primary-600"></i>
              </div>
              <div className="bg-white rounded-lg rounded-tl-none shadow-sm px-4 py-3 flex items-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Chat input area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSendMessage={sendMessage} />
          <div className="mt-2 text-xs text-gray-500 text-center">
            Housing Connect Helper provides information based on available data. For official decisions, please contact the Housing Connect office.
          </div>
        </div>
      </div>
    </div>
  );
}
