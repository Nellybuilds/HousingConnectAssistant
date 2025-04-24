import { HfInference } from '@huggingface/inference';

// Model parameters
const DEFAULT_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'; // 384 dimensions
const DEFAULT_BATCH_SIZE = 32;

/**
 * Simple class for generating embeddings using Hugging Face models.
 * This is a simplified version that doesn't extend LangChain's Embeddings class to avoid type issues
 */
export class HuggingFaceEmbeddings {
  private client: HfInference;
  private model: string;
  private batchSize: number;

  constructor(config: {
    apiKey?: string;
    model?: string;
    batchSize?: number;
  } = {}) {
    const apiKey = config.apiKey || process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Hugging Face API key is required. Pass as apiKey or set environment variable HUGGINGFACE_API_KEY.'
      );
    }
    
    this.client = new HfInference(apiKey);
    this.model = config.model || DEFAULT_MODEL;
    this.batchSize = config.batchSize || DEFAULT_BATCH_SIZE;
  }

  /**
   * Generate embeddings for a batch of texts
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    // Process in batches to avoid overloading the API
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchPromises = batch.map((text) => this.embedQuery(text));
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);
    }
    
    return embeddings;
  }

  /**
   * Generate embedding for a single text
   */
  async embedQuery(text: string): Promise<number[]> {
    try {
      const response = await this.client.featureExtraction({
        model: this.model,
        inputs: text,
      });
      
      // The response will be an array of numbers (the embedding)
      if (Array.isArray(response)) {
        return response as number[];
      } else if (typeof response === 'number') {
        return [response];
      } else {
        console.warn('Unexpected response type from Hugging Face API:', typeof response);
        return [];
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error calling Hugging Face API:', errorMessage);
      throw new Error(`Failed to generate embedding: ${errorMessage}`);
    }
  }
}