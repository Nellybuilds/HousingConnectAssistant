import { OpenAI } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { housingConnectKnowledge } from './knowledge';
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceEmbeddings } from "./huggingFaceEmbeddings";

/**
 * Initialize the Pinecone client
 */
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY as string,
});

// Constants
const PINECONE_INDEX_NAME = "housing-connect-knowledge";
const EMBEDDING_DIMENSION = 384; // Hugging Face all-MiniLM-L6-v2 dimension

/**
 * Initialize or get an existing Pinecone index
 */
async function getOrCreateIndex() {
  try {
    // Check if our index already exists
    const indexList = await pinecone.listIndexes();
    const indexExists = Object.keys(indexList).some(index => index === PINECONE_INDEX_NAME);
    
    if (!indexExists) {
      console.log(`Creating new Pinecone index: ${PINECONE_INDEX_NAME}`);
      
      // Create the index with OpenAI embedding dimensions
      await pinecone.createIndex({
        name: PINECONE_INDEX_NAME,
        dimension: EMBEDDING_DIMENSION,
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1" // Free tier supported region
          }
        }
      });
      
      // Wait for the index to be ready
      console.log("Waiting for Pinecone index to be ready...");
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    
    return pinecone.Index(PINECONE_INDEX_NAME);
  } catch (error) {
    console.error("Error setting up Pinecone index:", error);
    throw error;
  }
}

/**
 * Initialize embeddings using Hugging Face
 */
const embeddings = new HuggingFaceEmbeddings({
  apiKey: process.env.HUGGINGFACE_API_KEY,
});

/**
 * Split text into chunks for embedding
 */
async function splitTextIntoChunks(text: string) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  
  return await splitter.splitText(text);
}

/**
 * Create documents with metadata from text chunks
 */
function createDocuments(chunks: string[]) {
  return chunks.map((chunk, i) => {
    return new Document({
      pageContent: chunk,
      metadata: {
        source: "housing-connect-knowledge",
        chunk: i,
      },
    });
  });
}

/**
 * Initialize Pinecone with our Housing Connect knowledge base
 */
export async function initializePineconeWithKnowledge() {
  console.log("Initializing Pinecone with Housing Connect knowledge...");
  
  try {
    const index = await getOrCreateIndex();
    
    // Check if data already exists in the index
    console.log("Checking if knowledge base is already loaded...");
    try {
      const stats = await index.describeIndexStats();
      console.log("Index stats:", stats);
      
      if ((stats.totalRecordCount || 0) > 0) {
        console.log("Knowledge base already loaded in Pinecone with", stats.totalRecordCount, "records");
        return;
      }
    } catch (statsError) {
      console.error("Error checking index stats:", statsError);
      console.log("Continuing with knowledge base initialization...");
    }
    
    // Split the knowledge text into chunks
    console.log("Splitting knowledge text into chunks...");
    const chunks = await splitTextIntoChunks(housingConnectKnowledge);
    console.log(`Created ${chunks.length} text chunks`);
    
    // Create documents from chunks
    const documents = createDocuments(chunks);
    
    // Generate embeddings and upsert them to Pinecone
    console.log("Generating embeddings and uploading to Pinecone...");
    
    // Process in smaller batches to avoid rate limits
    const batchSize = 5; // Smaller batch size for reliability
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      try {
        // Generate embeddings for this batch
        console.log(`Generating embeddings for batch ${i / batchSize + 1}/${Math.ceil(documents.length / batchSize)}`);
        const embeddings_batch = await Promise.all(
          batch.map(async (doc, idx) => {
            const embedding = await embeddings.embedQuery(doc.pageContent);
            console.log(`Generated embedding ${idx + 1}/${batch.length} with length:`, embedding.length);
            return {
              id: `housing-connect-${i + idx}`,
              values: embedding,
              metadata: {
                ...doc.metadata,
                text: doc.pageContent,
              },
            };
          })
        );
        
        // Upsert to Pinecone
        console.log(`Upserting batch ${i / batchSize + 1}/${Math.ceil(documents.length / batchSize)} to Pinecone`);
        await index.upsert(embeddings_batch);
        console.log(`Successfully uploaded batch ${i / batchSize + 1}/${Math.ceil(documents.length / batchSize)}`);
        
        // Sleep to avoid rate limits
        if (i + batchSize < documents.length) {
          console.log("Waiting before processing next batch...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (batchError) {
        console.error(`Error processing batch ${i / batchSize + 1}:`, batchError);
        // Continue with next batch
      }
    }
    
    console.log("Finished uploading knowledge to Pinecone");
  } catch (error) {
    console.error("Error initializing Pinecone:", error);
    throw error;
  }
}

/**
 * Query Pinecone for relevant context based on a question
 */
export async function queryPineconeForContext(question: string, topK: number = 3) {
  try {
    const index = await getOrCreateIndex();
    
    // Generate an embedding for the question
    console.log("Generating embedding for question:", question);
    const queryEmbedding = await embeddings.embedQuery(question);
    console.log("Generated embedding of length:", queryEmbedding.length);
    
    // Query Pinecone
    console.log("Querying Pinecone with embedding");
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });
    console.log("Pinecone query response matches:", queryResponse.matches.length);
    
    // Extract and return the relevant context
    const contexts = queryResponse.matches.map(match => {
      return match.metadata?.text || "";
    });
    
    console.log("Retrieved contexts:", contexts.length);
    return contexts.join("\n\n");
  } catch (error) {
    console.error("Error querying Pinecone:", error);
    throw error; // Propagate the error for better debugging
  }
}

/**
 * Generate a RAG-enhanced response using OpenAI
 */
export async function generateRAGResponse(question: string) {
  try {
    // Get relevant context from Pinecone
    const context = await queryPineconeForContext(question);
    
    if (!context) {
      throw new Error("Failed to retrieve context from vector store");
    }
    
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Create a prompt that includes the context
    const prompt = `
Question: ${question}

Context information from Housing Connect knowledge base:
${context}

Instructions: Using the context information provided above, answer the question as accurately and helpfully as possible. Write at a 6th grade reading level using simple words and short sentences. Explain any housing terms in simple language. If the answer cannot be determined from the context, say so clearly. Don't make up information not present in the context.
`;
    
    // Generate response
    const response = await openai.invoke([
      {
        role: "system",
        content: "You are Housing Connect Helper, an AI assistant that provides information about affordable housing. Write at a 6th grade reading level (simple words, short sentences, clear explanations). Avoid complex vocabulary and technical terms. Explain any necessary housing terms in simple language. Your responses should be helpful, accurate, and based on the context provided."
      },
      {
        role: "user",
        content: prompt
      }
    ]);
    
    return {
      answer: response.toString(),
      source: "rag", 
      contexts: [context]
    };
  } catch (error) {
    console.error("Error generating RAG response:", error);
    throw error;
  }
}