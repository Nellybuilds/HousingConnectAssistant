import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Feedback } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FeedbackButtonsProps {
  messageId: number;
}

export default function FeedbackButtons({ messageId }: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing feedback for this message
  useEffect(() => {
    if (!messageId) return;

    const fetchFeedback = async () => {
      try {
        const response = await fetch(`/api/feedback/${messageId}`);
        
        if (response.status === 404) {
          // No feedback yet, that's fine
          return;
        }
        
        if (!response.ok) {
          throw new Error("Failed to fetch feedback");
        }
        
        const data = await response.json();
        setFeedback(data);
      } catch (err) {
        console.error("Error fetching feedback:", err);
        // Don't show error to user for fetch operation
      }
    };

    fetchFeedback();
  }, [messageId]);

  const submitFeedback = async (rating: boolean) => {
    if (!messageId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }
      
      const data = await response.json();
      setFeedback(data);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center mt-2">
      <p className="text-xs text-gray-500 mr-2">Was this helpful?</p>
      
      <button
        className={cn(
          "p-1 rounded hover:bg-gray-100 transition-colors",
          feedback?.rating === true && "bg-green-100 hover:bg-green-100 text-green-600"
        )}
        onClick={() => submitFeedback(true)}
        disabled={isLoading}
        aria-label="Thumbs up"
      >
        <ThumbsUp size={16} />
      </button>
      
      <button
        className={cn(
          "p-1 rounded ml-2 hover:bg-gray-100 transition-colors",
          feedback?.rating === false && "bg-red-100 hover:bg-red-100 text-red-600"
        )}
        onClick={() => submitFeedback(false)}
        disabled={isLoading}
        aria-label="Thumbs down"
      >
        <ThumbsDown size={16} />
      </button>
      
      {error && <p className="text-xs text-red-500 ml-2">{error}</p>}
    </div>
  );
}