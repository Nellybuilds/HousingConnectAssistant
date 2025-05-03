import { HuggingFaceEmbeddings } from "../huggingFaceEmbeddings";
import { HousingListing } from "../scrapers/types";

// Initialize embeddings
const embeddings = new HuggingFaceEmbeddings({
  apiKey: process.env.HUGGINGFACE_API_KEY,
});

// Types for extracted parameters
export type HousingSearchParams = {
  income?: number;
  location?: string;
  householdSize?: number;
  unitSizes?: string[];
  requestingListings: boolean;
  rawQuery: string;
};

// Borough names and abbreviations
const boroughKeywords = {
  "manhattan": ["manhattan", "new york", "new york city", "nyc", "downtown", "uptown", "harlem", "soho", "chelsea"],
  "brooklyn": ["brooklyn", "bk", "bed-stuy", "bedford", "williamsburg", "bushwick", "flatbush", "park slope"],
  "bronx": ["bronx", "the bronx"],
  "queens": ["queens", "astoria", "jackson heights", "flushing", "jamaica", "long island city", "lic", "sunnyside"],
  "staten island": ["staten island", "staten"]
};

// Unit size translations
const unitSizeKeywords = {
  "studio": ["studio", "bachelor", "efficiency", "no bedroom"],
  "1br": ["1 bedroom", "one bedroom", "1 br", "1br", "1-bedroom", "one-bedroom"],
  "2br": ["2 bedroom", "two bedroom", "2 br", "2br", "2-bedroom", "two-bedroom"],
  "3br": ["3 bedroom", "three bedroom", "3 br", "3br", "3-bedroom", "three-bedroom"],
  "4br": ["4 bedroom", "four bedroom", "4 br", "4br", "4-bedroom", "four-bedroom"],
};

// Keywords suggesting a housing search
const housingSearchKeywords = [
  "apartment", "housing", "listing", "rent", "apply", "application", 
  "affordable", "where can i find", "looking for", "searching for", 
  "available", "units", "bedroom", "studio", "family", "household", "income"
];

// Keywords suggesting a housing listings request
const listingRequestKeywords = [
  "show me", "list", "apartment", "housing", "available",
  "can i find", "where", "looking for", "searching for",
  "apply", "application", "qualify", "eligibility"
];

// Regex patterns for extracting numeric values
const incomePatterns = [
  /(?:make|earn|income|salary|making|earning|paid|get paid|pay of|annual|yearly)\s+(?:is\s+)?(?:about\s+)?(?:\$|USD\s+)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:k|thousand|k dollars|thousand dollars)?/i,
  /(?:\$|USD\s+)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:k|thousand|k dollars|thousand dollars)?(?:\s+(?:annual|annually|a year|per year|yearly|income|salary))/i,
  /income(?:\s+is)?(?:\s+about)?\s+(?:\$|USD\s+)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:k|thousand|k dollars|thousand dollars)?/i
];

const householdSizePatterns = [
  /(?:family|household|people|persons|member|members|adults|children|kids|us|we|resident|residents)\s+(?:with|of|has|have|having|includes|including|consist|consists|consisting of|size|is|am|are|contain|contains|containing)?\s*(\d+)\s*(?:people|persons|member|members|adult|adults|children|kids|resident|residents|size)?/i,
  /(\d+)\s*(?:people|persons|member|members|adult|adults|children|kids|resident|residents|family|household)\s*(?:size|in size|in my family|in my household|in household|in family)?/i,
  /(?:family|household)\s+(?:of|with|size)\s+(\d+)/i
];

const unitSizePatterns = [
  /(studio|bachelor|efficiency|([0-9]+)[\s-]?(?:br|bed|bedroom|bedrooms))/i
];

/**
 * Detect if a query is asking about housing listings
 */
function isHousingSearchIntent(query: string): boolean {
  // Clean up the query
  const normalizedQuery = query.toLowerCase();
  
  // Check for housing keywords
  return housingSearchKeywords.some(keyword => normalizedQuery.includes(keyword.toLowerCase()));
}

/**
 * Extract income from text
 */
function extractIncome(text: string): number | undefined {
  const normalizedText = text.toLowerCase();
  
  for (const pattern of incomePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      // Remove commas, then parse
      let incomeStr = match[1].replace(/,/g, '');
      let income = parseFloat(incomeStr);
      
      // Check if this might be in thousands (k)
      if (match[0].toLowerCase().includes('k') || 
          match[0].toLowerCase().includes('thousand')) {
        income = income * 1000;
      }
      
      // If income is unrealistically low for NYC, assume it's monthly and convert to annual
      if (income > 0 && income < 1000) {
        income = income * 12;
      }
      
      return income;
    }
  }
  
  return undefined;
}

/**
 * Extract household size from text
 */
function extractHouseholdSize(text: string): number | undefined {
  const normalizedText = text.toLowerCase();
  
  for (const pattern of householdSizePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const size = parseInt(match[1]);
      
      // Validate: household size should be between 1 and 10
      if (size >= 1 && size <= 10) {
        return size;
      }
    }
  }
  
  return undefined;
}

/**
 * Extract unit sizes from text
 */
function extractUnitSizes(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const foundSizes: string[] = [];
  
  // Check specific patterns first
  for (const pattern of unitSizePatterns) {
    // Using exec instead of matchAll for better compatibility
    let match;
    while ((match = pattern.exec(normalizedText)) !== null) {
      if (match[1]) {
        const sizeText = match[1].toLowerCase();
        
        if (sizeText.includes('studio') || sizeText.includes('bachelor') || sizeText.includes('efficiency')) {
          foundSizes.push('studio');
        } else if (match[2]) {
          // This matched a number + bedroom pattern
          const num = match[2];
          foundSizes.push(`${num}br`);
        }
      }
    }
  }
  
  // Also check against known keywords
  for (const [size, keywords] of Object.entries(unitSizeKeywords)) {
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword)) {
        foundSizes.push(size);
        break;
      }
    }
  }
  
  // Remove duplicates and return
  return foundSizes.filter((size, index) => foundSizes.indexOf(size) === index);
}

/**
 * Extract borough/location from text
 */
function extractLocation(text: string): string | undefined {
  const normalizedText = text.toLowerCase();
  
  for (const [borough, keywords] of Object.entries(boroughKeywords)) {
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        return borough;
      }
    }
  }
  
  return undefined;
}

/**
 * Detect if a query is specifically requesting listings
 */
function isRequestingListings(query: string): boolean {
  const normalizedQuery = query.toLowerCase();
  
  return listingRequestKeywords.some(keyword => normalizedQuery.includes(keyword.toLowerCase()));
}

/**
 * Main function to parse housing search intent and extract parameters
 */
export function parseHousingSearchIntent(query: string): HousingSearchParams | null {
  // First, check if this is a housing-related query
  if (!isHousingSearchIntent(query)) {
    return null;
  }
  
  // Extract parameters
  const income = extractIncome(query);
  const location = extractLocation(query);
  const householdSize = extractHouseholdSize(query);
  const unitSizes = extractUnitSizes(query);
  const requestingListings = isRequestingListings(query);
  
  return {
    income,
    location,
    householdSize,
    unitSizes: unitSizes.length > 0 ? unitSizes : undefined,
    requestingListings,
    rawQuery: query
  };
}

/**
 * Filter housing listings based on extracted search parameters
 */
export function filterListingsBySearchParams(
  listings: HousingListing[],
  params: HousingSearchParams
): HousingListing[] {
  let filtered = [...listings];
  
  // Filter by location (borough)
  if (params.location) {
    filtered = filtered.filter(listing => {
      const locationLower = params.location ? params.location.toLowerCase() : '';
      return listing.address.toLowerCase().includes(locationLower);
    });
  }
  
  // Filter by income - check if it's within the min/max range
  if (params.income !== undefined) {
    filtered = filtered.filter(listing => {
      // Parse minimum income (remove $ and commas)
      const minIncomeStr = listing.minimum_income.replace(/[$,]/g, '');
      const minIncome = parseFloat(minIncomeStr);
      
      // Parse maximum income (remove $ and commas)
      const maxIncomeStr = listing.maximum_income.replace(/[$,]/g, '');
      const maxIncome = parseFloat(maxIncomeStr);
      
      // Check if user's income is within the range
      const userIncome = params.income !== undefined ? params.income : 0;
      return (!isNaN(minIncome) && !isNaN(maxIncome) && 
              userIncome >= minIncome && 
              userIncome <= maxIncome);
    });
  }
  
  // Filter by unit size
  if (params.unitSizes && params.unitSizes.length > 0) {
    filtered = filtered.filter(listing => {
      // Type assertion here since we already checked length > 0
      const unitSizes = params.unitSizes as string[];
      return unitSizes.some(size => 
        listing.unit_sizes.some(listingSize => 
          listingSize.toLowerCase().includes(size.toLowerCase())
        )
      );
    });
  }
  
  // Filter by household size (heuristic - larger household needs more bedrooms)
  if (params.householdSize !== undefined) {
    filtered = filtered.filter(listing => {
      // Determine appropriate unit size for household
      let appropriateSizes: string[] = [];
      const householdSize = params.householdSize as number;
      
      if (householdSize === 1) {
        appropriateSizes = ['Studio', 'studio', '1BR', '1br', '1 BR', 'one bedroom'];
      } else if (householdSize === 2) {
        appropriateSizes = ['1BR', '1br', '1 BR', 'one bedroom', '2BR', '2br', '2 BR', 'two bedroom'];
      } else if (householdSize === 3) {
        appropriateSizes = ['2BR', '2br', '2 BR', 'two bedroom', '3BR', '3br', '3 BR', 'three bedroom'];
      } else if (householdSize === 4) {
        appropriateSizes = ['2BR', '2br', '2 BR', 'two bedroom', '3BR', '3br', '3 BR', 'three bedroom', '4BR', '4br', '4 BR', 'four bedroom'];
      } else if (householdSize > 4) {
        appropriateSizes = ['3BR', '3br', '3 BR', 'three bedroom', '4BR', '4br', '4 BR', 'four bedroom'];
      }
      
      return listing.unit_sizes.some(size => 
        appropriateSizes.some(appropriateSize => 
          size.toLowerCase().includes(appropriateSize.toLowerCase())
        )
      );
    });
  }
  
  // Filter for open listings only
  const today = new Date();
  filtered = filtered.filter(listing => {
    try {
      const deadline = new Date(listing.application_deadline);
      return deadline > today;
    } catch (error) {
      return true; // Include if date can't be parsed
    }
  });
  
  return filtered;
}

/**
 * Format a housing listing response for chat
 */
export function formatListingResponse(listings: HousingListing[], params: HousingSearchParams): string {
  if (listings.length === 0) {
    return `I couldn't find any housing options matching your criteria. Would you like to try with different requirements?`;
  }
  
  // Create introduction based on search parameters
  let intro = "Here are some housing options";
  const criteria: string[] = [];
  
  if (params.location) {
    criteria.push(`in ${params.location}`);
  }
  
  if (params.income) {
    criteria.push(`for your income of $${params.income.toLocaleString()}`);
  }
  
  if (params.householdSize) {
    criteria.push(`for a household of ${params.householdSize} ${params.householdSize === 1 ? 'person' : 'people'}`);
  }
  
  if (params.unitSizes && params.unitSizes.length > 0) {
    const sizeNames = params.unitSizes.map(size => {
      if (size === 'studio') return 'Studio';
      return `${size.toUpperCase().replace('BR', ' bedroom')}`;
    });
    
    criteria.push(`with ${sizeNames.join(' or ')} units`);
  }
  
  if (criteria.length > 0) {
    intro += " " + criteria.join(' ');
  }
  
  intro += ":\n\n";
  
  // Limit to 3 results for readability
  const displayListings = listings.slice(0, 3);
  
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
  
  // Add footer with count info
  if (listings.length > 3) {
    response += `\n\nI found ${listings.length} matching options in total. Would you like to see more, or should I tell you about a specific property?`;
  } else {
    response += `\n\nDo you want to know more about any of these properties?`;
  }
  
  return response;
}