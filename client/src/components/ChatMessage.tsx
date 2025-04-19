import { Bot } from "lucide-react";
import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  id?: number;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  // Function to format message with HTML elements for lists and paragraphs
  const formatMessage = (text: string) => {
    if (!text) return "";
    
    // Handle lists (lines starting with • or *)
    const withLists = text.replace(
      /^[•*]\s*(.+)$/gm, 
      '<li class="ml-4">$1</li>'
    );
    
    // Handle numbered lists (lines starting with number.)
    const withNumberedLists = withLists.replace(
      /^(\d+)\.\s*(.+)$/gm,
      '<li class="ml-4">$2</li>'
    );

    // Wrap adjacent list items in ul tags
    const withListWraps = withNumberedLists
      .replace(/<li class="ml-4">/g, '|||<li class="ml-4">')
      .split('|||')
      .map(segment => {
        if (segment.includes('<li')) {
          return `<ul class="mt-2 space-y-1 list-disc list-inside text-gray-800">${segment}</ul>`;
        }
        return segment;
      })
      .join('');
    
    // Handle paragraphs (double line breaks)
    const withParagraphs = withListWraps.replace(
      /\n\n/g, 
      '</p><p class="mt-2 text-gray-800">'
    );
    
    // Handle single line breaks
    const withLineBreaks = withParagraphs.replace(/\n/g, '<br>');
    
    return withLineBreaks;
  };

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-white rounded-lg rounded-tr-none shadow-sm p-4 max-w-[85%]">
          <p>{content}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-2">
        <Bot className="h-4 w-4 text-primary-600" />
      </div>
      <div className="bg-white rounded-lg rounded-tl-none shadow-sm p-4 max-w-[85%]">
        <p 
          className="text-gray-800"
          dangerouslySetInnerHTML={{ __html: formatMessage(content) }}
        />
      </div>
    </div>
  );
}
