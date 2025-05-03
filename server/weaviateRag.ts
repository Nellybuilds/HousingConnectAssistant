import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';
import { housingConnectKnowledge } from './knowledge';
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceEmbeddings } from "./huggingFaceEmbeddings";
import { generateHuggingFaceChatResponse } from "./huggingFaceChat";
import { findBestAnswer } from "./fallbackChat";
import crypto from 'crypto';

// Constants
const WEAVIATE_CLASS_NAME = "HousingConnectKnowledge";

// Initialize embeddings using Hugging Face
const embeddings = new HuggingFaceEmbeddings({
  apiKey: process.env.HUGGINGFACE_API_KEY,
});

// Initialize Weaviate client using cloud service
const client = weaviate.client({
  scheme: process.env.WEAVIATE_SCHEME || 'https',
  host: process.env.WEAVIATE_HOST || 'cluster1.weaviate-dev.network',
  apiKey: new ApiKey(process.env.WEAVIATE_API_KEY || ''),
  headers: { 'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY || '' },
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
 * Initialize Weaviate schema if it doesn't exist
 */
async function initializeWeaviateSchema() {
  try {
    // Check if class already exists
    const classObj = await client.schema.classGetter()
      .withClassName(WEAVIATE_CLASS_NAME)
      .do();
    
    console.log(`Weaviate class ${WEAVIATE_CLASS_NAME} already exists`);
    return classObj;
  } catch (error) {
    // Class doesn't exist, create it
    console.log(`Creating Weaviate class ${WEAVIATE_CLASS_NAME}`);
    
    const classObj = {
      class: WEAVIATE_CLASS_NAME,
      vectorizer: "none", // We'll provide our own vectors
      properties: [
        {
          dataType: ["text"],
          name: "content",
          description: "The text content from housing connect knowledge base",
        },
        {
          dataType: ["text"],
          name: "source",
          description: "Source of the content",
        },
        {
          dataType: ["number"],
          name: "chunkIndex",
          description: "Index of the chunk in the document",
        },
      ],
    };
    
    try {
      await client.schema.classCreator().withClass(classObj).do();
      console.log(`Created Weaviate class ${WEAVIATE_CLASS_NAME}`);
      return classObj;
    } catch (createError) {
      console.error("Error creating Weaviate class:", createError);
      throw createError;
    }
  }
}

/**
 * Initialize Weaviate with our Housing Connect knowledge base
 */
export async function initializeWeaviateWithKnowledge() {
  console.log("Initializing Weaviate with Housing Connect knowledge...");
  
  try {
    // Initialize schema
    await initializeWeaviateSchema();
    
    // Check if data already exists
    const countResult = await client.graphql
      .aggregate()
      .withClassName(WEAVIATE_CLASS_NAME)
      .withFields('meta { count }')
      .do();
    
    const count = countResult?.data?.Aggregate?.[WEAVIATE_CLASS_NAME]?.[0]?.meta?.count || 0;
    
    if (count > 0) {
      console.log(`Knowledge base already loaded in Weaviate with ${count} records`);
      return;
    }
    
    // Split the knowledge text into chunks
    console.log("Splitting knowledge text into chunks...");
    const chunks = await splitTextIntoChunks(housingConnectKnowledge);
    console.log(`Created ${chunks.length} text chunks`);
    
    // Create documents from chunks
    const documents = createDocuments(chunks);
    
    // Generate embeddings and import to Weaviate
    console.log("Generating embeddings and uploading to Weaviate...");
    
    // Process in smaller batches to avoid rate limits
    const batchSize = 5; // Smaller batch size for reliability
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      try {
        // Generate embeddings for this batch
        console.log(`Generating embeddings for batch ${i / batchSize + 1}/${Math.ceil(documents.length / batchSize)}`);
        
        // Process each document individually for better error handling
        for (let idx = 0; idx < batch.length; idx++) {
          const doc = batch[idx];
          try {
            const embedding = await embeddings.embedQuery(doc.pageContent);
            console.log(`Generated embedding ${idx + 1}/${batch.length} with length:`, embedding.length);
            
            // Import to Weaviate one at a time
            console.log(`Importing object ${i + idx + 1}/${documents.length} to Weaviate`);
            // Generate a valid UUID v4 for Weaviate
            const uuid = crypto.randomUUID();
            
            await client.data
              .creator()
              .withClassName(WEAVIATE_CLASS_NAME)
              .withId(uuid)
              .withProperties({
                content: doc.pageContent,
                source: doc.metadata.source,
                chunkIndex: doc.metadata.chunk,
              })
              .withVector(embedding)
              .do();
              
            console.log(`Successfully imported object ${i + idx + 1}/${documents.length}`);
          } catch (objError) {
            console.error(`Error processing object ${i + idx + 1}:`, objError);
            // Continue with next object
          }
        }
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
    
    console.log("Finished uploading knowledge to Weaviate");
  } catch (error) {
    console.error("Error initializing Weaviate:", error);
    throw error;
  }
}

/**
 * Query Weaviate for relevant context based on a question
 */
export async function queryWeaviateForContext(question: string, topK: number = 3) {
  try {
    // Generate an embedding for the question
    console.log("Generating embedding for question:", question);
    const queryEmbedding = await embeddings.embedQuery(question);
    console.log("Generated embedding of length:", queryEmbedding.length);
    
    // Query Weaviate using vector search
    console.log("Querying Weaviate with embedding");
    const result = await client.graphql
      .get()
      .withClassName(WEAVIATE_CLASS_NAME)
      .withFields('content source chunkIndex')
      .withNearVector({
        vector: queryEmbedding,
        certainty: 0.5, // Lower certainty threshold to return more results
      })
      .withLimit(topK)
      .do();
    
    // Extract the content from the result
    const items = result?.data?.Get?.[WEAVIATE_CLASS_NAME] || [];
    console.log("Weaviate query returned items:", items.length);
    
    // Extract and return the relevant context
    const contexts = items.map((item: any) => item.content || "");
    
    console.log("Retrieved contexts:", contexts.length);
    
    // If no items found, use some base knowledge as fallback
    if (contexts.length === 0) {
      console.log("No relevant contexts found in Weaviate, using generic Housing Connect knowledge");
      return "Housing Connect is a platform to help you find and apply for affordable housing in one place. It simplifies the application process by allowing users to create a single profile that can be used to apply to multiple housing developments. The platform is designed to make affordable housing more accessible to everyone.";
    }
    
    return contexts.join("\n\n");
  } catch (error) {
    console.error("Error querying Weaviate:", error);
    throw error;
  }
}

/**
 * Generate a RAG-enhanced response using Hugging Face
 */
export async function generateWeaviateRAGResponse(question: string, conversationId?: string) {
  try {
    let context = "Housing Connect is a platform to help you find and apply for affordable housing in one place.";
    
    // Use a try/catch separately for the context to prevent crashes
    try {
      // Get relevant context from Weaviate using simple keyword matching
      // This avoids complex vector operations that might cause memory issues
      if (!question.toLowerCase().includes("apartment") && 
          !question.toLowerCase().includes("housing") &&
          !question.toLowerCase().includes("listing")) {
        // Only query Weaviate for non-housing-specific questions
        // For housing questions we'll rely on our simplified search
        context = await queryWeaviateForContext(question);
      }
    } catch (contextError) {
      console.error("Error getting context, using fallback:", contextError);
      // Use fallback context
      context = "Housing Connect is NYC's housing lottery system that helps people find and apply for affordable rental and homeownership opportunities. To qualify for affordable housing, your income needs to be in a specific range for each development. Housing developments may have additional requirements.";
    }
    
    // Use Hugging Face to generate a response with conversation context
    // Our simplified approach should avoid the memory issues
    const response = await generateHuggingFaceChatResponse({
      message: question,
      context: context,
      conversationId: conversationId 
    });
    
    return {
      answer: response.answer,
      source: response.source || "weaviate_simplified_rag", 
      contexts: [context],
      error: response.error, // Pass along any error
      isListingSearch: response.isListingSearch
    };
  } catch (error) {
    console.error("Error generating simplified RAG response:", error);
    
    // Use direct fallback keyword matching as a last resort
    try {
      const fallbackAnswer = findBestAnswer(question);
      return {
        answer: fallbackAnswer,
        source: "fallback_simplified",
        contexts: [],
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } catch (fallbackError) {
      console.error("Even fallback failed:", fallbackError);
      return {
        answer: "I'm having trouble accessing information at the moment. Could you try asking in a different way?",
        source: "fallback_error",
        contexts: [],
        error: "Multiple fallback failures"
      };
    }
  }
}