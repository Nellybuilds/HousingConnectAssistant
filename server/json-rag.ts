import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

// Configuration
const INDEX_NAME = "housing-connect-index";
const EMBEDDING_DIMENSION = 1536; // OpenAI dimensions
const BATCH_SIZE = 20; // Process in batches to avoid rate limits

/**
 * Initialize OpenAI and Pinecone clients
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-ada-002",
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY as string,
});

/**
 * Get or create a Pinecone index
 */
async function getOrCreateIndex() {
  try {
    // List existing indexes
    const indexes = await pinecone.listIndexes();
    
    // Check if our index exists
    let indexExists = false;
    const indexList = Object.entries(indexes || {});
    for (const [name, _details] of indexList) {
      if (name === INDEX_NAME) {
        indexExists = true;
        break;
      }
    }
    
    if (!indexExists) {
      console.log(`Creating new Pinecone index: ${INDEX_NAME}`);
      
      // Create a new index
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: EMBEDDING_DIMENSION,
        metric: "cosine",
        spec: { 
          serverless: { 
            cloud: "aws", 
            region: "us-west-2" 
          } 
        }
      });
      
      // Wait for the index to be ready
      console.log("Waiting for Pinecone index to initialize...");
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    // Get the index
    return pinecone.Index(INDEX_NAME);
  } catch (error) {
    console.error("Error getting or creating index:", error);
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
          // Extract the text to embed
          const textToEmbed = item[textField] || JSON.stringify(item);
          
          // Generate embedding
          const embedding = await embeddings.embedQuery(textToEmbed);
          
          // Return vector record
          return {
            id: `json-${i + idx}`,
            values: embedding,
            metadata: {
              ...item,
              originalText: textToEmbed
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
    
    // Generate embedding for the question
    const queryEmbedding = await embeddings.embedQuery(question);
    
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
      .map(item => item.text)
      .join("\n\n");
    
    // Create a prompt that includes the context
    const prompt = `
Question: ${question}

Context information:
${formattedContext}

Instructions: Using the context information provided above, answer the question as accurately and helpfully as possible. Write at a 6th grade reading level using simple words and short sentences. Explain any housing terms in simple language. If the answer cannot be determined from the context, say so clearly. Don't make up information not present in the context.
`;
    
    // Generate response
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        {
          role: "system",
          content: "You are Housing Connect Helper, an AI assistant that provides information about affordable housing. Write at a 6th grade reading level (simple words, short sentences, clear explanations). Avoid complex vocabulary and technical terms. Explain any necessary housing terms in simple language. Your responses should be helpful, accurate, and based on the context provided."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    
    return {
      answer: response.choices[0].message.content || "I don't have enough information to answer that.",
      source: "json-rag", 
      contexts: contextResults.map(r => r.text)
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