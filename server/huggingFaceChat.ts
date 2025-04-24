import { HfInference } from '@huggingface/inference';

// Initialize HuggingFace client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

interface ChatOptions {
  message: string;
  context: string;
}

interface ChatResponse {
  answer: string;
  source: string;
  contexts: string[];
  error?: string;
}

/**
 * Generate a chat response using Hugging Face LLM
 */
export async function generateHuggingFaceChatResponse({ message, context }: ChatOptions): Promise<ChatResponse> {
  try {
    console.log("Generating response with Hugging Face LLM");
    console.log("Using context:", context.substring(0, 100) + "...");
    
    // Create a prompt with the context and user question
    const prompt = `
You are Housing Connect Helper, an AI assistant that provides information about affordable housing. 
Your task is to provide clear, accurate, and helpful information about Housing Connect.
Write at a 6th grade reading level with simple words and short sentences.
Explain any necessary housing terms in simple language.

Context information from Housing Connect knowledge base:
${context}

Question: ${message}

Please provide a concise and helpful answer based only on the context provided.
If the answer cannot be determined from the context, say so clearly and provide general information that might be helpful.
`;

    // Use Hugging Face to generate a response
    // We're using Meta's Llama 3 model, which is free to use via Hugging Face
    const response = await hf.textGeneration({
      model: 'meta-llama/Meta-Llama-3-8B-Instruct',
      inputs: prompt,
      parameters: {
        max_new_tokens: 250,
        temperature: 0.7,
        top_p: 0.95,
        repetition_penalty: 1.2,
      }
    });

    console.log("Generated response with Hugging Face");
    
    return {
      answer: response.generated_text,
      source: "huggingface_rag",
      contexts: [context]
    };
  } catch (error) {
    console.error("Error generating HuggingFace chat response:", error);
    
    // Return an error response that matches the expected interface
    return {
      answer: "I'm having trouble generating a response at the moment.",
      source: "huggingface_rag_error",
      contexts: [context],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}