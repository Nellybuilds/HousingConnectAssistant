import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_MODEL = "gpt-4o";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-placeholder"  // Will be replaced with actual key from env
});

interface ChatOptions {
  message: string;
  knowledgeBase: string;
}

export async function generateChatResponse({ message, knowledgeBase }: ChatOptions) {
  try {
    const systemPrompt = `
You are a helpful assistant for the Housing Connect platform, providing information about affordable housing.
Your goal is to retrieve information about Housing Connect and answer questions about eligibility, how to use the platform, etc.

Use only the knowledge provided below to answer questions. If the question is not related to Housing Connect or affordable housing,
politely explain that you can only assist with Housing Connect-related questions.

If you don't know the answer based on the provided information, acknowledge that and suggest contacting Housing Connect support directly.

When answering:
- Write at a 6th grade reading level (simple words, short sentences, clear explanations)
- Avoid complex vocabulary and technical terms
- Explain any necessary housing terms in simple language
- Be clear, concise, and helpful
- Use bullet points for lists when appropriate
- Provide specific details from the knowledge base when relevant
- Format your answers for readability

Knowledge:
${knowledgeBase}
`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    return {
      answer: response.choices[0].message.content || "I'm sorry, I don't have an answer for that."
    };
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
    // Handle quota errors specifically
    if (error.code === 'insufficient_quota') {
      return {
        answer: "I'm sorry, but the API quota has been exceeded. Please try again later or contact support to update your API quota.",
        error: "quota_exceeded"
      };
    }
    
    // For network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return {
        answer: "I'm currently experiencing connectivity issues. Please try again in a moment.",
        error: "network_error"
      };
    }
    
    // Default error
    return {
      answer: "I'm sorry, I couldn't process your request at the moment. Please try again later.",
      error: "api_error"
    };
  }
}
