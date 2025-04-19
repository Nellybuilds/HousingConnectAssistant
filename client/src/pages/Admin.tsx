import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, CalendarDays, MessageCircle, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  positivePercentage: number;
}

interface FeedbackItem {
  id: number;
  messageId: number;
  rating: boolean;
  createdAt: string;
  message: {
    id: number;
    role: string;
    content: string;
    conversationId: string;
    createdAt: string;
  } | null;
  conversationTitle: string | null;
}

interface FeedbackResponse {
  feedback: FeedbackItem[];
  stats: FeedbackStats;
}

export default function Admin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "positive" | "negative">("all");
  
  // Fetch feedback data
  const { data, isLoading, error } = useQuery<FeedbackResponse>({
    queryKey: ['/api/admin/feedback'],
    refetchOnWindowFocus: false,
  });
  
  // Filter feedback based on search term and filter selection
  const filteredFeedback = data?.feedback.filter(item => {
    // Filter by feedback type
    if (feedbackFilter === "positive" && !item.rating) return false;
    if (feedbackFilter === "negative" && item.rating) return false;
    
    // Search in message content
    if (searchTerm && item.message) {
      return item.message.content.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return true;
  }) || [];
  
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  
  // Get percentage value for progress bar
  const positivePercentage = data?.stats.positivePercentage || 0;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Feedback Analytics</h1>
      
      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Total Feedback</h3>
            <p className="text-2xl font-bold">{data.stats.total}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Positive Feedback</h3>
            <p className="text-2xl font-bold text-green-600">{data.stats.positive}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Negative Feedback</h3>
            <p className="text-2xl font-bold text-red-600">{data.stats.negative}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-gray-500 text-sm">Positive Rate</h3>
            <p className="text-2xl font-bold">{data.stats.positivePercentage}%</p>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className="bg-green-600 h-2.5 rounded-full" 
                style={{width: `${positivePercentage}%`}}
              ></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search message content..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 rounded-md border ${
                feedbackFilter === "all" 
                  ? "bg-primary text-white" 
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setFeedbackFilter("all")}
            >
              All
            </button>
            <button
              className={`px-4 py-2 rounded-md border ${
                feedbackFilter === "positive" 
                  ? "bg-green-600 text-white" 
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setFeedbackFilter("positive")}
            >
              <ThumbsUp className="h-4 w-4 inline mr-2" />
              Positive
            </button>
            <button
              className={`px-4 py-2 rounded-md border ${
                feedbackFilter === "negative" 
                  ? "bg-red-600 text-white" 
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => setFeedbackFilter("negative")}
            >
              <ThumbsDown className="h-4 w-4 inline mr-2" />
              Negative
            </button>
          </div>
        </div>
      </div>
      
      {/* Loading and Error States */}
      {isLoading && (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto"></div>
          </div>
          <p className="text-gray-500 mt-4">Loading feedback data...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
          <p>Error loading feedback data. Please try again later.</p>
        </div>
      )}
      
      {/* Feedback List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {filteredFeedback.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-500">No feedback matches your criteria.</p>
            </div>
          ) : (
            filteredFeedback.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    {item.rating ? (
                      <div className="bg-green-100 p-2 rounded-full">
                        <ThumbsUp className="h-5 w-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="bg-red-100 p-2 rounded-full">
                        <ThumbsDown className="h-5 w-5 text-red-600" />
                      </div>
                    )}
                    <div className="ml-3">
                      <p className="text-sm text-gray-500">
                        <CalendarDays className="h-4 w-4 inline mr-1" />
                        {formatDate(item.createdAt)}
                      </p>
                      {item.conversationTitle && (
                        <p className="text-sm font-medium">
                          <MessageCircle className="h-4 w-4 inline mr-1" />
                          {item.conversationTitle}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">ID: {item.messageId}</span>
                </div>
                
                {item.message ? (
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="text-gray-700">{item.message.content}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Message content not available</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}