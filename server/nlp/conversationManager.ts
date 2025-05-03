import { HousingListing } from "../scrapers/types";
import { HousingSearchParams } from "./housingIntentParser";

// Types for conversation state tracking
export type ConversationContext = {
  searchParams?: HousingSearchParams;
  lastSearchResults?: HousingListing[];
  selectedListing?: HousingListing;
  lastQuestion?: string;
  questionHistory: string[];
  activeIntent?: string;
};

// Intent types for the conversation
export enum ConversationIntent {
  HOUSING_SEARCH = "housing_search",
  LISTING_DETAILS = "listing_details",
  FOLLOW_UP = "follow_up",
  GENERAL = "general"
}

// Map of conversation IDs to their context
const conversationContexts = new Map<string, ConversationContext>();

/**
 * Initialize a new conversation context
 */
export function initializeConversation(conversationId: string): ConversationContext {
  const newContext: ConversationContext = {
    questionHistory: []
  };
  
  conversationContexts.set(conversationId, newContext);
  return newContext;
}

/**
 * Get conversation context, create if it doesn't exist
 */
export function getConversationContext(conversationId: string): ConversationContext {
  if (!conversationContexts.has(conversationId)) {
    return initializeConversation(conversationId);
  }
  
  // We know this exists because we just checked with has()
  const context = conversationContexts.get(conversationId);
  if (!context) {
    return initializeConversation(conversationId);
  }
  
  return context;
}

/**
 * Update conversation with housing search parameters and results
 */
export function updateWithHousingSearch(
  conversationId: string,
  params: HousingSearchParams,
  results: HousingListing[]
): void {
  const context = getConversationContext(conversationId);
  
  context.searchParams = params;
  context.lastSearchResults = results;
  context.activeIntent = ConversationIntent.HOUSING_SEARCH;
  context.questionHistory.push(params.rawQuery);
  
  conversationContexts.set(conversationId, context);
}

/**
 * Update conversation with selected listing for details
 */
export function updateWithSelectedListing(
  conversationId: string,
  listing: HousingListing,
  question: string
): void {
  const context = getConversationContext(conversationId);
  
  context.selectedListing = listing;
  context.lastQuestion = question;
  context.activeIntent = ConversationIntent.LISTING_DETAILS;
  context.questionHistory.push(question);
  
  conversationContexts.set(conversationId, context);
}

/**
 * Update conversation with general question
 */
export function updateWithGeneralQuestion(
  conversationId: string,
  question: string
): void {
  const context = getConversationContext(conversationId);
  
  context.lastQuestion = question;
  context.activeIntent = ConversationIntent.GENERAL;
  context.questionHistory.push(question);
  
  conversationContexts.set(conversationId, context);
}

/**
 * Check if this is a follow-up question about a specific listing
 */
export function isListingFollowUp(question: string, lastResults: HousingListing[]): number | null {
  const normalizedQuestion = question.toLowerCase();
  
  // Check for direct references to listings by number
  const numberMatch = normalizedQuestion.match(/(?:apartment|listing|property|option|number)\s*(?:#|number|no\.?|)?\s*([1-3])/i);
  if (numberMatch && numberMatch[1]) {
    const listingNumber = parseInt(numberMatch[1]);
    if (listingNumber >= 1 && listingNumber <= lastResults.length) {
      return listingNumber - 1; // Convert to 0-based index
    }
  }
  
  // Check for property name mentions from search results
  for (let i = 0; i < lastResults.length && i < 3; i++) {
    const listing = lastResults[i];
    // Check if property name is mentioned
    if (normalizedQuestion.includes(listing.project_name.toLowerCase())) {
      return i;
    }
    
    // Check if address is mentioned (simplified)
    const addressParts = listing.address.split(',')[0].toLowerCase();
    if (normalizedQuestion.includes(addressParts)) {
      return i;
    }
  }
  
  // Common follow-up questions about first result when not specified
  const firstResultKeywords = ["tell me more", "more about that", "first one", "first apartment"];
  if (firstResultKeywords.some(keyword => normalizedQuestion.includes(keyword))) {
    return 0; // First result
  }
  
  return null;
}

/**
 * Check if a question is a followup about rent for a specific listing
 */
export function isRentFollowUp(question: string): boolean {
  const normalizedQuestion = question.toLowerCase();
  const rentKeywords = ["rent", "rental", "price", "cost", "how much", "monthly", "payment"];
  
  return rentKeywords.some(keyword => normalizedQuestion.includes(keyword));
}

/**
 * Check if a question is about eligibility for a specific listing
 */
export function isEligibilityFollowUp(question: string): boolean {
  const normalizedQuestion = question.toLowerCase();
  const eligibilityKeywords = ["eligible", "eligibility", "qualify", "qualified", "requirements", "required", "who can apply"];
  
  return eligibilityKeywords.some(keyword => normalizedQuestion.includes(keyword));
}

/**
 * Clear conversation context
 */
export function clearConversationContext(conversationId: string): void {
  conversationContexts.delete(conversationId);
}

/**
 * Get response for a rent follow-up question on a specific listing
 */
export function getRentResponse(listing: HousingListing): string {
  // If we have rent prices in the listing
  if (listing.rent_prices && listing.rent_prices.length > 0) {
    const rentByUnitSize = listing.unit_sizes.map((size, index) => {
      const rent = index < listing.rent_prices.length ? listing.rent_prices[index] : "N/A";
      return `${size}: ${rent}`;
    }).join(", ");
    
    return `The rent for ${listing.project_name} varies by unit size: ${rentByUnitSize}. Remember that affordable housing rents are based on income limits, and you'll need to qualify based on the income requirements.`;
  } else {
    // Generic response if rent prices aren't available
    return `The exact rent for ${listing.project_name} depends on your income and household size. Generally, affordable housing aims to keep rent at no more than 30% of your income. You'll need to apply and provide income documentation to get your specific rent amount.`;
  }
}

/**
 * Get response for an eligibility follow-up question on a specific listing
 */
export function getEligibilityResponse(listing: HousingListing): string {
  let response = `To be eligible for ${listing.project_name}, your household income needs to be between ${listing.minimum_income} and ${listing.maximum_income} per year, which falls in the ${listing.ami_range} range.`;
  
  if (listing.special_requirements && listing.special_requirements.length > 0) {
    response += ` This building also has special requirements: ${listing.special_requirements.join(", ")}.`;
  }
  
  response += " When you apply, you'll need to provide proof of income, ID for all household members, and other documentation showing you meet the requirements.";
  
  return response;
}