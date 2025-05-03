import { HfInference } from '@huggingface/inference';
import { HousingListing } from './scrapers/types';
import { parseHousingSearchIntent, filterListingsBySearchParams, formatListingResponse } from './nlp/housingIntentParser';
import * as ConversationManager from './nlp/conversationManager';
import { api as scrapersApi } from './scrapers';

// Initialize HuggingFace client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

interface ChatOptions {
  message: string;
  context: string;
  conversationId?: string;
}

interface ChatResponse {
  answer: string;
  source: string;
  contexts: string[];
  error?: string;
  isListingSearch?: boolean;
}

/**
 * Generate a chat response using Hugging Face LLM
 */
export async function generateHuggingFaceChatResponse({ message, context, conversationId }: ChatOptions): Promise<ChatResponse> {
  try {
    console.log("Processing message:", message);
    
    // If we have a conversation ID, check for housing search intent or follow-ups
    if (conversationId) {
      // First, check if this is a housing search query
      const housingSearchParams = parseHousingSearchIntent(message);
      
      // Get conversation context if it exists
      const conversationContext = conversationId 
        ? ConversationManager.getConversationContext(conversationId)
        : null;
      
      // Process housing search intent
      if (housingSearchParams && housingSearchParams.requestingListings) {
        console.log("Detected housing search intent with params:", housingSearchParams);
        
        // Get listings from our database
        const allListings = scrapersApi.getAllListings();
        console.log(`Retrieved ${allListings.length} listings from database`);
        
        // Filter listings based on search parameters
        const filteredListings = filterListingsBySearchParams(allListings, housingSearchParams);
        console.log(`Filtered to ${filteredListings.length} matching listings`);
        
        // Format response
        const response = formatListingResponse(filteredListings, housingSearchParams);
        
        // Update conversation context
        if (conversationId) {
          ConversationManager.updateWithHousingSearch(conversationId, housingSearchParams, filteredListings);
        }
        
        return {
          answer: response,
          source: "housing_search",
          contexts: [context],
          isListingSearch: true
        };
      }
      
      // Check for follow-up questions about previous housing search
      if (conversationContext && 
          conversationContext.lastSearchResults && 
          conversationContext.lastSearchResults.length > 0) {
        
        // Check if user is asking about a specific listing from previous results
        const listingIndex = ConversationManager.isListingFollowUp(message, conversationContext.lastSearchResults);
        
        if (listingIndex !== null) {
          console.log(`Detected follow-up for listing #${listingIndex + 1}`);
          
          const selectedListing = conversationContext.lastSearchResults[listingIndex];
          
          // Check if this is a rent-specific follow-up
          if (ConversationManager.isRentFollowUp(message)) {
            const rentResponse = ConversationManager.getRentResponse(selectedListing);
            return {
              answer: rentResponse,
              source: "listing_followup_rent",
              contexts: [context]
            };
          }
          
          // Check if this is an eligibility-specific follow-up
          if (ConversationManager.isEligibilityFollowUp(message)) {
            const eligibilityResponse = ConversationManager.getEligibilityResponse(selectedListing);
            return {
              answer: eligibilityResponse,
              source: "listing_followup_eligibility",
              contexts: [context]
            };
          }
          
          // Otherwise, provide general details about the listing
          ConversationManager.updateWithSelectedListing(conversationId, selectedListing, message);
          
          const detailedResponse = `
Here are more details about ${selectedListing.project_name}:

📍 ${selectedListing.address}
🗓️ Application Deadline: ${new Date(selectedListing.application_deadline).toLocaleDateString()}
💰 Income Range: ${selectedListing.ami_range}
   - Minimum Income: ${selectedListing.minimum_income}
   - Maximum Income: ${selectedListing.maximum_income}
🏠 Unit Sizes Available: ${selectedListing.unit_sizes.join(', ')}
${selectedListing.rent_prices.length > 0 ? `💵 Rent Prices: ${selectedListing.rent_prices.join(', ')}` : ''}
${selectedListing.special_requirements.length > 0 ? `📋 Special Requirements: ${selectedListing.special_requirements.join(', ')}` : ''}

${selectedListing.project_description}

You can apply through Housing Connect before the deadline. Would you like to know more about the rent prices or eligibility requirements?
`;
          
          return {
            answer: detailedResponse,
            source: "listing_details",
            contexts: [context]
          };
        }
      }
    }
    
    // Not a housing search or follow-up, use regular RAG with Hugging Face
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
    // Using a much smaller model that fits within the free tier limits
    const response = await hf.textGeneration({
      model: 'google/flan-t5-small',
      inputs: prompt,
      parameters: {
        max_new_tokens: 250,
        temperature: 0.7,
        top_p: 0.95,
        repetition_penalty: 1.2,
      }
    });

    console.log("Generated response with Hugging Face");
    
    // Update conversation with general question
    if (conversationId) {
      ConversationManager.updateWithGeneralQuestion(conversationId, message);
    }
    
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