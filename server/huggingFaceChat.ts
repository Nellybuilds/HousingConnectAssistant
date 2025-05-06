import { HfInference } from '@huggingface/inference';
import { HousingListing } from './scrapers/types';
import { parseHousingSearchIntent, filterListingsBySearchParams, formatListingResponse, type HousingSearchParams } from './nlp/housingIntentParser';
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
    console.log("Processing message:", message.substring(0, 100) + (message.length > 100 ? "..." : ""));
    
    // Check if this is a housing-related query using simple keyword matching
    // This should avoid the memory issues with the embeddings
    const housingKeywords = ["apartment", "housing", "listing", "application", "affordable", "income", "bedroom", "studio", "family"];
    const isHousingRelated = housingKeywords.some(kw => message.toLowerCase().includes(kw));
    
    // Check if it's a definitional question about Housing Connect or a general question
    const isDefinitionalQuestion = 
      message.toLowerCase().startsWith("what is") || 
      message.toLowerCase().startsWith("what's") || 
      message.toLowerCase().startsWith("tell me about") ||
      message.toLowerCase().startsWith("explain") ||
      message.toLowerCase().includes("what does housing connect");
      
    // If it's a housing search query (but not a definitional question), use direct matching
    if (isHousingRelated && !isDefinitionalQuestion && conversationId) {
      console.log("Housing search query detected, using direct matching");
      
      // Extract location (borough) if mentioned
      const boroughKeywords = {
        "manhattan": ["manhattan", "new york city", "nyc"],
        "brooklyn": ["brooklyn", "bk"],
        "bronx": ["bronx", "the bronx"],
        "queens": ["queens"],
        "staten island": ["staten island", "staten"]
      };
      
      let location = null;
      for (const [borough, keywords] of Object.entries(boroughKeywords)) {
        if (keywords.some(kw => message.toLowerCase().includes(kw.toLowerCase()))) {
          location = borough;
          break;
        }
      }
      
      // Extract bedroom/unit size first (so we don't confuse it with income)
      let unitSize = null;
      if (message.toLowerCase().includes("studio")) {
        unitSize = "studio";
      } else {
        const bedroomMatch = message.match(/(\d+)[\s-]?(?:br|bed|bedroom|bedrooms)/i);
        if (bedroomMatch) {
          unitSize = `${bedroomMatch[1]}br`;
        }
      }
      
      // Extract income if mentioned - make sure we avoid bedroom numbers
      let income = null;
      // Look for patterns like $50,000 or 50k or 50 thousand
      const incomeMatch = message.match(/\$?\s*(\d{1,3}(,\d{3})*|\d{4,})(\s*k|\s+thousand|\s+dollars|\s+a\s+year|\s+per\s+year|\s+annually)?/i);
      if (incomeMatch && incomeMatch.index !== undefined) {
        // Skip if this is likely part of a bedroom reference
        const prefixCheck1 = message.substring(Math.max(0, incomeMatch.index - 10), incomeMatch.index);
        const prefixCheck2 = message.substring(Math.max(0, incomeMatch.index - 5), incomeMatch.index);
        
        if (!prefixCheck1.includes("bedroom") && !prefixCheck2.includes("br")) {
          let incomeValue = parseFloat(incomeMatch[1].replace(/,/g, ''));
          // Only consider values that could realistically be income (greater than 10000)
          if (incomeValue >= 10000 || 
              (incomeMatch[3] && (incomeMatch[3].includes('k') || incomeMatch[3].includes('thousand')))) {
            if (incomeMatch[3] && (incomeMatch[3].includes('k') || incomeMatch[3].includes('thousand'))) {
              incomeValue = incomeValue * 1000;
            }
            income = incomeValue;
          }
        }
      }
      
      // Extract household size if mentioned
      let householdSize = null;
      const householdMatch = message.match(/family\s+of\s+(\d+)|(\d+)\s+person|(\d+)\s+people|household\s+of\s+(\d+)/i);
      if (householdMatch) {
        const sizeMatch = householdMatch[1] || householdMatch[2] || householdMatch[3] || householdMatch[4];
        if (sizeMatch) {
          householdSize = parseInt(sizeMatch);
        }
      }
      
      console.log("Extracted parameters:", { location, income, unitSize, householdSize });
      
      // Get listings from database
      const allListings = scrapersApi.getAllListings();
      console.log(`Retrieved ${allListings.length} listings from database`);
      
      // Filter listings manually based on extracted parameters
      let filteredListings = [...allListings];
      
      // Filter by location if specified
      if (location) {
        console.log(`Filtering by location: '${location}'`);
        
        // Log addresses before filtering
        console.log("Addresses before location filtering:");
        filteredListings.forEach(listing => {
          console.log(`- ${listing.address}`);
        });
        
        filteredListings = filteredListings.filter(listing => {
          // First check the address field
          const matchesAddress = listing.address.toLowerCase().includes(location.toLowerCase());
          
          // For 'Bronx', also check the borough field if address doesn't match
          // (Sometimes address might say "New York" but it's in the Bronx borough)
          const isBronxSearch = location.toLowerCase() === 'bronx' || location.toLowerCase() === 'the bronx';
          const matchesSpecialCase = isBronxSearch && listing.project_name.includes('Bronx');
          
          const matches = matchesAddress || matchesSpecialCase;
          
          console.log(`Location check for '${listing.project_name}': address=${matchesAddress}, special=${matchesSpecialCase}, final=${matches}`);
          
          return matches;
        });
      }
      
      // Filter by income if specified
      if (income) {
        filteredListings = filteredListings.filter(listing => {
          try {
            const minIncome = parseFloat(listing.minimum_income.replace(/[$,]/g, ''));
            const maxIncome = parseFloat(listing.maximum_income.replace(/[$,]/g, ''));
            return !isNaN(minIncome) && !isNaN(maxIncome) && 
                   income >= minIncome && income <= maxIncome;
          } catch (e) {
            return true; // Include if there's an error parsing
          }
        });
      }
      
      // Filter by unit size if specified
      if (unitSize) {
        console.log("Filtering by unit size:", unitSize);
        
        // DEBUG: Let's see all units sizes before filtering
        for (const listing of filteredListings) {
          console.log(`Listing '${listing.project_name}' has units: ${listing.unit_sizes.join(', ')}`);
        }
        
        filteredListings = filteredListings.filter(listing => {
          // More flexible matching for unit sizes
          const matched = listing.unit_sizes.some(size => {
            const sizeClean = size.toLowerCase().trim();
            const unitSizeClean = unitSize.toLowerCase().trim();
            
            console.log(`Comparing '${sizeClean}' with requested '${unitSizeClean}'`);
            
            // Direct match (e.g., "2BR" matches "2br")
            if (sizeClean === unitSizeClean) {
              console.log("  ✓ Direct match");
              return true;
            }
            
            // Partial match cases
            if (unitSizeClean === "2br" && sizeClean === "2br") {
              console.log("  ✓ Perfect match for 2BR");
              return true;
            }
            
            // If looking for a 2br, also match various formats like "2 bedroom", "2-bedroom", "two bedroom"
            if (unitSizeClean.endsWith('br')) {
              const numBedrooms = unitSizeClean.replace('br', '');
              const matchesOtherFormat = 
                sizeClean.includes(numBedrooms + ' bed') || 
                sizeClean.includes(numBedrooms + '-bed') ||
                sizeClean.includes(numBedrooms + 'bed');
              
              if (matchesOtherFormat) {
                console.log(`  ✓ Format match: '${numBedrooms}' bedroom`);
                return true;
              }
            }
            
            console.log("  ✗ No match");
            return false;
          });
          
          if (matched) {
            console.log(`✓ Listing '${listing.project_name}' MATCHES unit size criteria`);
          } else {
            console.log(`✗ Listing '${listing.project_name}' does NOT match unit size criteria`);
          }
          
          return matched;
        });
      }
      
      // Filter for open listings only (deadline in future)
      const today = new Date();
      console.log("Deadline filtering, today is:", today.toISOString());
      
      // Only log the first few listings for debugging
      for (let i = 0; i < Math.min(filteredListings.length, 3); i++) {
        const listing = filteredListings[i];
        const deadline = new Date(listing.application_deadline);
        console.log(`Sample listing '${listing.project_name}' deadline: ${listing.application_deadline}, valid: ${deadline > today}`);
      }
      
      // Restore deadline filtering with proper logging
      filteredListings = filteredListings.filter(listing => {
        try {
          const deadline = new Date(listing.application_deadline);
          const isValid = deadline > today;
          // Only log rejects for debugging
          if (!isValid) {
            console.log(`Filtering out '${listing.project_name}' with deadline: ${deadline.toISOString()}`);
          }
          return isValid;
        } catch (e) {
          console.log(`Error parsing deadline for '${listing.project_name}':`, e);
          return true; // Include if date can't be parsed
        }
      });
      
      console.log(`Filtered to ${filteredListings.length} matching listings`);
      
      // Format a simplified response
      if (filteredListings.length === 0) {
        return {
          answer: "I couldn't find any housing options matching your criteria. Would you like to try with different requirements?",
          source: "housing_search_simplified",
          contexts: [context],
          isListingSearch: true
        };
      }
      
      // Limit to 3 results for readability
      const displayListings = filteredListings.slice(0, 3);
      
      // Build response text
      let intro = "Here are some housing options";
      if (location) intro += ` in ${location}`;
      if (income) intro += ` for your income of $${income.toLocaleString()}`;
      if (householdSize) intro += ` for a household of ${householdSize} ${householdSize === 1 ? 'person' : 'people'}`;
      if (unitSize) {
        const sizeText = unitSize === 'studio' ? 'Studio' : `${unitSize.toUpperCase().replace('BR', ' bedroom')}`;
        intro += ` with ${sizeText} units`;
      }
      intro += ":\n\n";
      
      // Format each listing
      const listingsText = displayListings.map((listing, index) => {
        // Format the link to Housing Connect - using main website URL to avoid broken links with placeholder IDs
        let applicationLinkText = '';
        // Instead of using potentially invalid deep links with lottery IDs, link to the main site
        applicationLinkText = `🔗 Apply at: https://housingconnect.nyc.gov/ (search for "${listing.project_name}")`;

        return `${index + 1}. ${listing.project_name}
   📍 ${listing.address}
   🗓️ Application Deadline: ${new Date(listing.application_deadline).toLocaleDateString()}
   💰 Income Range: ${listing.ami_range} (Min: ${listing.minimum_income}, Max: ${listing.maximum_income})
   🏠 Unit Sizes: ${listing.unit_sizes.join(', ')}
   ${listing.special_requirements.length > 0 ? `📋 Requirements: ${listing.special_requirements.join(', ')}` : ''}
   ${applicationLinkText}`;
      }).join('\n\n');
      
      let response = intro + listingsText;
      
      // Add footer
      if (filteredListings.length > 3) {
        response += `\n\nI found ${filteredListings.length} matching options in total. You can ask me for more details about any specific property.`;
      } else {
        response += `\n\nDo you want to know more about any of these properties?`;
      }
      
      // Store context for follow-ups
      if (conversationId) {
        try {
          // Create a properly typed search params object for the conversation manager
          const searchParams: HousingSearchParams = {
            income: income !== null ? income : undefined,
            location: location !== null ? location : undefined,
            householdSize: householdSize !== null ? householdSize : undefined,
            unitSizes: unitSize !== null ? [unitSize] : undefined,
            requestingListings: true,
            rawQuery: message
          };
          
          ConversationManager.updateWithHousingSearch(conversationId, searchParams, filteredListings);
        } catch (e) {
          console.error("Error storing conversation context:", e);
        }
      }
      
      return {
        answer: response,
        source: "housing_search_simplified",
        contexts: [context],
        isListingSearch: true
      };
    }
    
    // Not a housing search or follow-up, use regular RAG with Hugging Face
    console.log("Generating response with Hugging Face LLM");
    console.log("Using context:", context.substring(0, 100) + "...");
    
    // Create a prompt with the context and user question
    const prompt = `
You are Housing Connect Helper, an AI assistant that provides information about affordable rental housing in NYC. 
Your task is to provide clear, accurate, and helpful information about Housing Connect's rental apartment listings and application process.
Write at a 6th grade reading level with simple words and short sentences.
Explain any necessary housing terms in simple language.
Focus ONLY on rental housing, not homeownership programs.

Context information from Housing Connect knowledge base:
${context}

Question: ${message}

Please provide a concise and helpful answer based only on the context provided.
If the answer cannot be determined from the context, say so clearly and provide general information that might be helpful.
Focus on affordable rental housing information only.
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