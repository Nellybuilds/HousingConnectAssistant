import { Bot } from "lucide-react";
import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  id?: number;
}

export default function ChatMessage({ role, content, id }: ChatMessageProps) {
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
  
  // For feedback functionality
  const [feedback, setFeedback] = useState<{ rating: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Function to submit feedback
  const submitFeedback = async (rating: boolean) => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: id, rating }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }
      
      const data = await response.json();
      setFeedback(data);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError("Failed to submit feedback");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch existing feedback on mount
  useEffect(() => {
    if (!id) return;
    
    const fetchFeedback = async () => {
      try {
        const response = await fetch(`/api/feedback/${id}`);
        
        if (response.status === 404) {
          // No feedback yet, that's fine
          return;
        }
        
        if (!response.ok) {
          return;
        }
        
        const data = await response.json();
        setFeedback(data);
      } catch (err) {
        console.error("Error fetching feedback:", err);
      }
    };
    
    fetchFeedback();
  }, [id]);

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
        
        {/* Feedback buttons - only show for assistant messages with an ID */}
        {id && (
          <div className="flex items-center mt-2">
            {feedback ? (
              <p className="text-xs text-green-600 animate-fadeIn">
                Thank you for your feedback!
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mr-2">Was this helpful?</p>
                
                <button
                  className={cn(
                    "p-1 rounded hover:bg-gray-100 transition-colors"
                  )}
                  onClick={() => submitFeedback(true)}
                  disabled={isLoading}
                  aria-label="Thumbs up"
                >
                  <ThumbsUp size={16} />
                </button>
                
                <button
                  className={cn(
                    "p-1 rounded ml-2 hover:bg-gray-100 transition-colors"
                  )}
                  onClick={() => submitFeedback(false)}
                  disabled={isLoading}
                  aria-label="Thumbs down"
                >
                  <ThumbsDown size={16} />
                </button>
                
                {error && <p className="text-xs text-red-500 ml-2">{error}</p>}
                {isLoading && <p className="text-xs text-gray-500 ml-2">Sending...</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
