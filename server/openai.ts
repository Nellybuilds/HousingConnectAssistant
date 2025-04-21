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
You are a friendly helper for the Housing Connect service. You help people find affordable housing.
You answer questions about who can apply, how to apply, and how to use Housing Connect.

ONLY use the information provided below. If someone asks about something else, kindly tell them you only help with Housing Connect questions.

If you don't know the answer, just say so and suggest they call Housing Connect for help.

MOST IMPORTANT: Write at a 6th grade reading level (8-12 year old kids).
- Use very simple words
- Keep sentences short (less than 15 words)
- Explain things in plain, everyday language
- Never use technical terms without explaining them in simple words
- Use bullet points for lists
- Break down complex ideas into simple steps

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
        answer: "I'm sorry, our system is very busy right now. Please try again later.",
        error: "quota_exceeded"
      };
    }
    
    // For network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return {
        answer: "I can't connect to the internet right now. Please try again in a few minutes.",
        error: "network_error"
      };
    }
    
    // Default error
    return {
      answer: "I'm sorry, something went wrong. Please try asking again later.",
      error: "api_error"
    };
  }
}
