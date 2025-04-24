import fs from 'fs';
import path from 'path';

/**
 * This module provides direct JSON search capabilities using keyword matching
 * as a fallback when Pinecone/embedding services aren't available
 */

// Configuration
const DEFAULT_JSON_PATH = path.join(process.cwd(), 'data', 'housing_connect_dataset.json');
// If the file doesn't exist, check in attached_assets directory
const ATTACHED_ASSETS_PATH = path.join(process.cwd(), 'attached_assets', 'housing_connect_dataset.json');
const MAX_RESULTS = 5;

// In-memory cache of the JSON data
let jsonDataCache: any[] | null = null;

/**
 * Load JSON data from file
 */
export async function loadJsonData(filePath: string = DEFAULT_JSON_PATH): Promise<any[]> {
  try {
    // Return from cache if available
    if (jsonDataCache) {
      return jsonDataCache;
    }
    
    let data;
    
    try {
      // Try to load from the primary path
      console.log(`Attempting to load JSON data from: ${filePath}`);
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (primaryPathError) {
      // If that fails, try the attached assets path
      console.log(`Primary path failed, trying attached assets path: ${ATTACHED_ASSETS_PATH}`);
      data = JSON.parse(fs.readFileSync(ATTACHED_ASSETS_PATH, 'utf8'));
      console.log("Successfully loaded data from attached assets path");
    }
    
    if (!Array.isArray(data)) {
      throw new Error('JSON data is not an array');
    }
    
    console.log(`Loaded ${data.length} JSON records for search`);
    
    // Cache the data for future calls
    jsonDataCache = data;
    return data;
  } catch (error: any) {
    console.error(`Error loading JSON data: ${error.message}`);
    return [];
  }
}

/**
 * Calculate a simple similarity score between two strings
 * based on word overlap and exact matches
 */
function calculateSimilarity(query: string, text: string): number {
  if (!query || !text) return 0;
  
  // Normalize text
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedText = text.toLowerCase().trim();
  
  // Exact match gets highest score
  if (normalizedText === normalizedQuery) {
    return 1.0;
  }
  
  // If text contains the entire query as a substring, high score
  if (normalizedText.includes(normalizedQuery)) {
    return 0.9;
  }
  
  // Split into words and remove duplicates
  const queryWords = Array.from(new Set(normalizedQuery.split(/\s+/)));
  const textWords = Array.from(new Set(normalizedText.split(/\s+/)));
  
  // Calculate word overlap
  let matchCount = 0;
  for (const word of queryWords) {
    if (word.length <= 2) continue; // Skip short words
    if (textWords.includes(word)) {
      matchCount++;
    }
  }
  
  // Calculate similarity score based on percentage of matching words
  const overlapScore = queryWords.length > 0 ? matchCount / queryWords.length : 0;
  
  // Check for partial word matches too
  let partialMatchScore = 0;
  for (const qWord of queryWords) {
    if (qWord.length <= 3) continue; // Skip very short words for partial matching
    
    for (const tWord of textWords) {
      if (tWord.includes(qWord) || qWord.includes(tWord)) {
        partialMatchScore += 0.5; // Partial matches count less
        break;
      }
    }
  }
  
  // Normalize partial match score
  partialMatchScore = queryWords.length > 0 ? partialMatchScore / queryWords.length : 0;
  
  // Combine scores with more weight on full word matches
  const combinedScore = (overlapScore * 0.7) + (partialMatchScore * 0.3);
  
  return combinedScore;
}

/**
 * Search the JSON data for relevant entries based on a question
 */
export async function searchJsonData(
  question: string, 
  jsonPath: string = DEFAULT_JSON_PATH
): Promise<any[]> {
  try {
    // Load the data (or get from cache)
    const jsonData = await loadJsonData(jsonPath);
    
    if (jsonData.length === 0) {
      console.warn('No JSON data available for search');
      return [];
    }
    
    // Score each item in the JSON data
    const scoredResults = jsonData.map(item => {
      // Check both question and answer fields for matches
      const questionSimilarity = calculateSimilarity(question, item.question || '');
      const answerSimilarity = calculateSimilarity(question, item.answer || '');
      
      // Prioritize matches in question field but still consider answer field
      const combinedScore = (questionSimilarity * 0.7) + (answerSimilarity * 0.3);
      
      return {
        ...item,
        score: combinedScore
      };
    });
    
    // Sort by score and take top results
    const results = scoredResults
      .filter(item => item.score > 0.1) // Filter out very low-score matches
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
    
    return results;
  } catch (error: any) {
    console.error(`Error searching JSON data: ${error.message}`);
    return [];
  }
}

/**
 * Generate a response using the best matches from direct JSON search
 */
export async function generateDirectJsonResponse(question: string): Promise<{
  answer: string;
  source: string;
  contexts?: any[];
}> {
  try {
    const results = await searchJsonData(question);
    
    if (results.length === 0) {
      return {
        answer: "I don't have enough information to answer that question accurately.",
        source: "direct-json-no-results"
      };
    }
    
    // Use the top result directly
    const bestMatch = results[0];
    
    // Format the response
    const formattedResponse = bestMatch.answer || "I don't have a specific answer for that.";
    
    // Format contexts for display
    const formattedContexts = results.map(result => ({
      question: result.question || "",
      answer: result.answer || "",
      category: result.category || "General",
      score: result.score
    }));
    
    return {
      answer: formattedResponse,
      source: "direct-json",
      contexts: formattedContexts
    };
  } catch (error: any) {
    console.error(`Error generating direct JSON response: ${error.message}`);
    return {
      answer: "I'm having trouble processing your question right now. Please try again later.",
      source: "direct-json-error"
    };
  }
}