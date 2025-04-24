import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';
import { OpenAI } from "@langchain/openai";
import { housingConnectKnowledge } from './knowledge';
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceEmbeddings } from "./huggingFaceEmbeddings";

// Constants
const WEAVIATE_CLASS_NAME = "HousingConnectKnowledge";

// Initialize embeddings using Hugging Face
const embeddings = new HuggingFaceEmbeddings({
  apiKey: process.env.HUGGINGFACE_API_KEY,
});

// Initialize Weaviate client (local for development or remote for production)
const client = weaviate.client({
  scheme: 'http',
  host: process.env.WEAVIATE_HOST || 'localhost:8080', // Default to local for development
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
            await client.data
              .creator()
              .withClassName(WEAVIATE_CLASS_NAME)
              .withId(`housing-connect-${i + idx}`)
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
        certainty: 0.7,
      })
      .withLimit(topK)
      .do();
    
    // Extract the content from the result
    const items = result?.data?.Get?.[WEAVIATE_CLASS_NAME] || [];
    console.log("Weaviate query returned items:", items.length);
    
    // Extract and return the relevant context
    const contexts = items.map((item: any) => item.content || "");
    
    console.log("Retrieved contexts:", contexts.length);
    return contexts.join("\n\n");
  } catch (error) {
    console.error("Error querying Weaviate:", error);
    throw error;
  }
}

/**
 * Generate a RAG-enhanced response using OpenAI
 */
export async function generateWeaviateRAGResponse(question: string) {
  try {
    // Get relevant context from Weaviate
    const context = await queryWeaviateForContext(question);
    
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
      source: "weaviate_rag", 
      contexts: [context]
    };
  } catch (error) {
    console.error("Error generating Weaviate RAG response:", error);
    throw error;
  }
}