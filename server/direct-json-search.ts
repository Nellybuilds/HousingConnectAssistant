import fs from 'fs';
import path from 'path';
import { housingConnectKnowledge } from './knowledge';

/**
 * This module provides direct JSON search capabilities using keyword matching
 * as a primary search method and fallback when vector search services aren't available
 */

// Configuration
const DEFAULT_JSON_PATH = path.join(process.cwd(), 'data', 'housing_connect_dataset.json');
// If the file doesn't exist, check in attached_assets directory
const ATTACHED_ASSETS_PATH = path.join(process.cwd(), 'attached_assets', 'housing_connect_dataset.json');
const MAX_RESULTS = 5;

// In-memory cache of the JSON data
let jsonDataCache: any[] | null = null;

// Generate additional JSON entries from the knowledge base
function generateEntriesFromKnowledge(): any[] {
  // Split the knowledge base into sections/paragraphs
  const sections = housingConnectKnowledge
    .split('\n\n')
    .filter(section => section.trim().length > 30);
  
  // Convert sections into question-answer pairs
  const entries = sections.map((section, index) => {
    // Extract a title/question from the first line or generate one
    const lines = section.split('\n');
    let question = lines[0].trim();
    
    // If the first line doesn't end with a question mark, make it a generic question
    if (!question.endsWith('?')) {
      question = `What information is available about ${question.toLowerCase()}?`;
    }
    
    return {
      id: `kb_${index}`,
      category: 'Knowledge Base',
      question: question,
      answer: section.trim(),
      source: 'housing_connect_knowledge'
    };
  });
  
  console.log(`Generated ${entries.length} additional entries from knowledge base`);
  return entries;
}

/**
 * Load JSON data from file
 */
export async function loadJsonData(filePath: string = DEFAULT_JSON_PATH): Promise<any[]> {
  try {
    // Return from cache if available
    if (jsonDataCache) {
      return jsonDataCache;
    }
    
    let jsonData: any[] = [];
    
    // First, try to load from file system
    try {
      // Try to load from the primary path
      console.log(`Attempting to load JSON data from: ${filePath}`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (!Array.isArray(data)) {
        console.warn('JSON data is not an array, skipping file');
      } else {
        jsonData = data;
        console.log(`Successfully loaded ${jsonData.length} records from file`);
      }
    } catch (primaryPathError) {
      // If that fails, try the attached assets path
      try {
        console.log(`Primary path failed, trying attached assets path: ${ATTACHED_ASSETS_PATH}`);
        const data = JSON.parse(fs.readFileSync(ATTACHED_ASSETS_PATH, 'utf8'));
        
        if (!Array.isArray(data)) {
          console.warn('JSON data from attached assets is not an array, skipping');
        } else {
          jsonData = data;
          console.log(`Successfully loaded ${jsonData.length} records from attached assets`);
        }
      } catch (attachedPathError) {
        console.warn('Could not load JSON data from either path');
      }
    }
    
    // Next, generate entries from the knowledge base
    const knowledgeEntries = generateEntriesFromKnowledge();
    
    // Combine data from both sources
    const combinedData = [...jsonData, ...knowledgeEntries];
    
    if (combinedData.length === 0) {
      console.warn('No data available from any source');
      return [];
    }
    
    console.log(`Combined data contains ${combinedData.length} total records for search`);
    
    // Cache the combined data for future calls
    jsonDataCache = combinedData;
    return combinedData;
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
  
  // Normalize text - remove punctuation and convert to lowercase
  const normalizedQuery = query.toLowerCase().trim().replace(/[.,?!;:'"()]/g, '');
  const normalizedText = text.toLowerCase().trim().replace(/[.,?!;:'"()]/g, '');
  
  // Exact match gets highest score
  if (normalizedText === normalizedQuery) {
    return 1.0;
  }
  
  // Check for housing-specific keywords
  const housingKeywords = ['housing', 'connect', 'apply', 'application', 'income', 'ami', 'household', 'apartment', 'eligibility'];
  const queryHasHousingKeywords = housingKeywords.some(keyword => normalizedQuery.includes(keyword));
  const textHasHousingKeywords = housingKeywords.some(keyword => normalizedText.includes(keyword));
  
  // Boost score if both query and text contain housing keywords
  const keywordBoost = queryHasHousingKeywords && textHasHousingKeywords ? 0.2 : 0;
  
  // If text contains the entire query as a substring, high score
  if (normalizedText.includes(normalizedQuery)) {
    return 0.9 + keywordBoost;
  }
  
  // If query contains text as a substring, good score
  if (normalizedQuery.includes(normalizedText)) {
    return 0.8 + keywordBoost;
  }
  
  // Split into words and remove duplicates and stop words
  const stopWords = ['the', 'and', 'is', 'in', 'to', 'of', 'for', 'a', 'with', 'as', 'an', 'by'];
  const queryWords = Array.from(
    new Set(normalizedQuery.split(/\s+/).filter(word => !stopWords.includes(word)))
  );
  const textWords = Array.from(
    new Set(normalizedText.split(/\s+/).filter(word => !stopWords.includes(word)))
  );
  
  // Calculate word overlap
  let matchCount = 0;
  let importantWordCount = 0;
  
  for (const word of queryWords) {
    if (word.length <= 2) continue; // Skip short words
    
    // Consider longer words more important
    const isImportantWord = word.length > 4 || housingKeywords.includes(word);
    if (isImportantWord) importantWordCount++;
    
    if (textWords.includes(word)) {
      matchCount++;
      if (isImportantWord) matchCount += 0.5; // Extra weight for important words
    }
  }
  
  // Calculate similarity score based on percentage of matching words
  const overlapScore = queryWords.length > 0 ? matchCount / (queryWords.length + importantWordCount * 0.5) : 0;
  
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
  const combinedScore = (overlapScore * 0.6) + (partialMatchScore * 0.2) + keywordBoost;
  
  return Math.min(1.0, combinedScore); // Cap at 1.0
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
      .filter(item => item.score > 0.05) // Use a lower threshold to catch more potential matches
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
      
    console.log(`Found ${results.length} matches with scores:`, results.map(r => ({ question: r.question, score: r.score })));
    
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