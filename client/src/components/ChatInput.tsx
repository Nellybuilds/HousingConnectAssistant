import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      
      if (scrollHeight > 200) {
        textareaRef.current.style.height = '200px';
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.height = `${scrollHeight}px`;
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input flex items-end gap-2">
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:bg-white dark:focus-within:bg-gray-600 transition-all border border-gray-200 dark:border-gray-600">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type your question here..."
          className="block w-full px-3 py-2.5 text-sm bg-transparent border-0 focus:ring-0 resize-none focus:outline-none placeholder-gray-500 dark:placeholder-gray-400 text-gray-800 dark:text-gray-200"
        />
      </div>
      <button
        type="submit"
        disabled={message.trim() === ""}
        className="flex-shrink-0 bg-primary hover:bg-primary/90 text-white rounded-full w-10 h-10 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-900 transition-colors disabled:opacity-50"
      >
        <Send className="h-5 w-5" />
      </button>
    </form>
  );
}
