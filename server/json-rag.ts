import { Pinecone } from "@pinecone-database/pinecone";
import fs from "fs";
import path from "path";
import { generateEmbedding, generateRAGResponse as generateGoogleRAGResponse } from './vertex-ai';

// Configuration
const INDEX_NAME = "housing-connect-index";
const EMBEDDING_DIMENSION = 768; // Google embedding dimensions
const BATCH_SIZE = 10; // Process in smaller batches to avoid rate limits and timeouts

// Import OpenAI is removed since we're using Google Vertex AI

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY as string,
});

/**
 * Get or create a Pinecone index
 */
async function getOrCreateIndex() {
  try {
    // List existing indexes to check if our index exists
    try {
      const indexes = await pinecone.listIndexes();
      
      // Check if our index exists
      let indexExists = false;
      const indexList = Object.entries(indexes || {});
      for (const [name, _details] of indexList) {
        if (name === INDEX_NAME) {
          console.log(`Pinecone index '${INDEX_NAME}' already exists`);
          indexExists = true;
          break;
        }
      }
      
      // If index doesn't exist, create it
      if (!indexExists) {
        console.log(`Creating new Pinecone index: ${INDEX_NAME}`);
        
        try {
          // Create a new index
          await pinecone.createIndex({
            name: INDEX_NAME,
            dimension: EMBEDDING_DIMENSION,
            metric: "cosine",
            spec: { 
              serverless: { 
                cloud: "aws", 
                region: "us-east-1" // Use us-east-1 for free tier compatibility
              } 
            }
          });
          
          // Wait briefly for the index to begin initialization
          console.log("Waiting briefly for Pinecone index to start initialization...");
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (createError: any) {
          // Handle case where index might have been created in another process
          if (createError.message && createError.message.includes("ALREADY_EXISTS")) {
            console.log(`Index already exists (created by another process)`);
          } else {
            throw createError;
          }
        }
      }
    } catch (listError: any) {
      console.error("Error checking existing indexes:", listError.message || listError);
      // Continue anyway, attempt to use the index regardless
    }
    
    // Try to get the index regardless of whether we created it or not
    console.log(`Connecting to index '${INDEX_NAME}'...`);
    return pinecone.Index(INDEX_NAME);
  } catch (error: any) {
    console.error("Error getting or creating index:", error.message || error);
    throw error;
  }
}

/**
 * Load JSON data from a file
 */
export async function loadJsonData(filePath: string) {
  try {
    const fullPath = path.resolve(filePath);
    console.log(`Loading JSON data from: ${fullPath}`);
    
    const fileData = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(fileData);
  } catch (error: any) {
    console.error(`Error loading JSON data: ${error.message || 'Unknown error'}`);
    throw error;
  }
}

/**
 * Process and upload JSON data to Pinecone
 */
export async function uploadJsonToPinecone(jsonData: any[], textField: string) {
  console.log(`Processing ${jsonData.length} JSON records for vector indexing...`);
  
  try {
    const index = await getOrCreateIndex();
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < jsonData.length; i += BATCH_SIZE) {
      const batch = jsonData.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(jsonData.length/BATCH_SIZE)}`);
      
      // Generate embeddings for this batch
      const embedBatch = await Promise.all(
        batch.map(async (item, idx) => {
          // For Housing Connect data, we want to embed both the question and answer
          // but prioritize the question for search
          const textToEmbed = item[textField] || "";
          const answerText = item.answer || "";
          const categoryText = item.category || "";
          
          // Create a combined text that gives more weight to the question
          const combinedText = `${textToEmbed} ${textToEmbed} ${answerText}`;
          
          // Generate embedding using Google Vertex AI
          const embedding = await generateEmbedding(combinedText);
          
          // Return vector record with full metadata
          return {
            id: `json-${i + idx}`,
            values: embedding,
            metadata: {
              ...item,
              originalText: textToEmbed,
              answerText: answerText,
              category: categoryText,
              displayText: `Q: ${textToEmbed}\nA: ${answerText}`
            }
          };
        })
      );
      
      // Upsert vectors to Pinecone
      await index.upsert(embedBatch);
      console.log(`Uploaded batch ${Math.floor(i/BATCH_SIZE) + 1}`);
      
      // Small delay to avoid rate limits
      if (i + BATCH_SIZE < jsonData.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log("Successfully uploaded all JSON data to Pinecone vector store!");
    return true;
  } catch (error: any) {
    console.error("Error uploading JSON data to Pinecone:", error.message || error);
    return false;
  }
}

/**
 * Query Pinecone for relevant context based on a question
 */
export async function queryForContext(question: string, topK: number = 5) {
  try {
    const index = await getOrCreateIndex();
    
    // Generate embedding for the question using Google Vertex AI
    const queryEmbedding = await generateEmbedding(question);
    
    // Query Pinecone
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });
    
    // Extract relevant context with score
    const results = queryResponse.matches.map(match => ({
      text: match.metadata?.originalText || "",
      score: match.score,
      metadata: match.metadata
    }));
    
    return results;
  } catch (error) {
    console.error("Error querying vector store:", error);
    return [];
  }
}

/**
 * Generate a RAG-enhanced response using OpenAI
 */
export async function generateResponse(question: string) {
  try {
    // Get relevant contexts
    const contextResults = await queryForContext(question);
    
    if (!contextResults || contextResults.length === 0) {
      return {
        answer: "I couldn't find relevant information to answer your question accurately.",
        source: "rag-no-context",
      };
    }
    
    // Format contexts
    const formattedContext = contextResults
      .map(item => {
        const metadata = item.metadata || {};
        // Format as Q&A pairs for better context understanding
        return `QUESTION: ${metadata.question || item.text}
ANSWER: ${metadata.answer || ""}
CATEGORY: ${metadata.category || "General"}`;
      })
      .join("\n\n");
    
    // Use Google Vertex AI to generate the response with the context
    const response = await generateGoogleRAGResponse(question, contextResults);
    
    // Create formatted context pairs for the response
    const formattedContexts = contextResults.map(result => {
      const metadata = result.metadata || {};
      return {
        question: metadata.question || result.text,
        answer: metadata.answer || "",
        category: metadata.category || "General",
        score: result.score
      };
    });
    
    return {
      answer: response.answer || "I don't have enough information to answer that.",
      source: "json-rag", 
      contexts: formattedContexts
    };
  } catch (error) {
    console.error("Error generating RAG response:", error);
    throw error;
  }
}

/**
 * Initialize vector store with JSON data
 * @param jsonPath Path to the JSON file
 * @param textField The field in each JSON object that contains the text to embed
 */
export async function initializeWithJsonData(jsonPath: string, textField: string) {
  try {
    console.log(`Initializing vector store with JSON data from ${jsonPath}`);
    
    // Load JSON data
    const jsonData = await loadJsonData(jsonPath);
    
    if (!Array.isArray(jsonData)) {
      throw new Error("JSON data must be an array of objects");
    }
    
    // Upload to Pinecone
    const success = await uploadJsonToPinecone(jsonData, textField);
    
    if (success) {
      console.log("✅ Vector store successfully initialized with JSON data");
      return true;
    } else {
      console.error("❌ Failed to initialize vector store with JSON data");
      return false;
    }
  } catch (error) {
    console.error("Error initializing vector store:", error);
    return false;
  }
}