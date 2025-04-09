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
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate response from OpenAI");
  }
}
