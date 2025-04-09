import { OpenAI } from "openai";

// Define types for our API route
type APIResponse = Response;
interface APIRequest extends Request {
  json: () => Promise<any>;
}
type APIRoute = (context: { request: APIRequest }) => Promise<APIResponse>;

// 1. 🧠 Create your OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 2. 📖 Mock knowledge base (your bot's little book)
const knowledgeBase = [
  {
    question: "How do I apply for housing?",
    answer: "You can apply by visiting https://housingconnect.nyc.gov and creating an account. Follow the instructions to apply for available listings.",
  },
  {
    question: "What documents do I need?",
    answer: "You'll typically need photo ID, proof of income, and documents that show your household size. Specific listings may require more.",
  },
  {
    question: "How long does it take to hear back?",
    answer: "It can take several months after you apply to receive any updates. Make sure your contact info is correct in your Housing Connect account.",
  },
  {
    question: "What is Housing Connect?",
    answer: "Housing Connect is a platform that helps individuals and families find and apply for affordable housing opportunities in one place. It simplifies the process by allowing users to create a single profile that can be used to apply to multiple housing developments."
  },
  {
    question: "Am I eligible for affordable housing?",
    answer: "Eligibility depends on factors like your income, household size, and specific development requirements. Typically, households must earn between 30% and 165% of Area Median Income (AMI) to qualify for different housing options."
  },
  {
    question: "Is there an application fee?",
    answer: "There is no fee to create a Housing Connect profile. Some developments may have application fees, but many affordable housing options have no application fees."
  },
  {
    question: "How many housing options can I apply for?",
    answer: "You can apply to as many housing options as you qualify for through Housing Connect."
  }
];

/**
 * Find the best answer from the knowledge base using string matching
 */
function findBestAnswer(userQuestion: string) {
  const lowerQ = userQuestion.toLowerCase();
  
  // Simple exact keyword matching first
  for (const entry of knowledgeBase) {
    if (lowerQ.includes(entry.question.toLowerCase())) {
      return entry.answer;
    }
  }

  // More flexible matching using keywords
  const keywordMatches = knowledgeBase.map(entry => {
    const questionWords = entry.question.toLowerCase().split(/\s+/);
    const matchCount = questionWords.filter(word => 
      word.length > 3 && lowerQ.includes(word)
    ).length;
    
    return {
      entry,
      matchCount,
      matchRatio: matchCount / questionWords.length
    };
  });

  // Find best match with at least some matching keywords
  const bestMatch = keywordMatches.reduce((best, current) => {
    return (current.matchRatio > best.matchRatio) ? current : best;
  }, { matchRatio: 0, entry: null as any });

  if (bestMatch.matchRatio >= 0.3 && bestMatch.entry) {
    return bestMatch.entry.answer;
  }

  return "I don't have specific information about that. Please ask about Housing Connect applications, eligibility, required documents, or application timelines.";
}

/**
 * Try to use OpenAI to answer the question, fall back to local knowledge base if it fails
 */
async function getAnswer(userQuestion: string) {
  try {
    // Try OpenAI first if API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant for the Housing Connect platform, providing information about affordable housing.
              Your goal is to retrieve information about Housing Connect and answer questions about eligibility, how to use the platform, etc.
              
              Keep answers brief, clear, and helpful. Use bullet points for lists when appropriate.
              If you don't know the answer, acknowledge that and suggest contacting Housing Connect support directly.`
            },
            { role: "user", content: userQuestion }
          ],
          temperature: 0.7,
          max_tokens: 300,
        });
        
        return {
          answer: response.choices[0].message.content || "I'm sorry, I don't have an answer for that.",
          source: "openai"
        };
      } catch (error) {
        console.error("OpenAI error:", error);
        // Fall back to local knowledge base
        return {
          answer: findBestAnswer(userQuestion),
          source: "local",
          fallback: true
        };
      }
    } else {
      // No API key, use local knowledge base
      return {
        answer: findBestAnswer(userQuestion),
        source: "local"
      };
    }
  } catch (error) {
    console.error("Error getting answer:", error);
    return {
      answer: "I'm sorry, I couldn't process your request. Please try again later.",
      error: true
    };
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { message } = await request.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({
          answer: "Please provide a question."
        }),
        { status: 400 }
      );
    }
    
    const response = await getAnswer(message);
    
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({
        answer: "An error occurred while processing your request.",
        error: true
      }),
      { status: 500 }
    );
  }
}
