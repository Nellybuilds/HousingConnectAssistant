import { initializeWithJsonData, loadJsonData, uploadJsonToPinecone } from './json-rag';
import path from 'path';

/**
 * This script imports a subset of the JSON data to the vector store for testing
 */

// Configuration
const JSON_FILE = 'housing_connect_dataset.json'; // The Housing Connect dataset
const TEXT_FIELD = 'question';     // The question field will be used for the primary search
const SUBSET_SIZE = 30;            // Number of records to process (limit for testing)

// Execute import
async function main() {
  try {
    const jsonPath = path.join(process.cwd(), 'data', JSON_FILE);
    
    console.log('Starting JSON subset import process...');
    console.log(`JSON file: ${jsonPath}`);
    console.log(`Text field: ${TEXT_FIELD}`);
    console.log(`Subset size: ${SUBSET_SIZE}`);
    
    // Load all data but only process a subset
    const allData = await loadJsonData(jsonPath);
    
    if (!Array.isArray(allData)) {
      throw new Error("JSON data must be an array of objects");
    }
    
    // Take just the first SUBSET_SIZE elements 
    const subsetData = allData.slice(0, SUBSET_SIZE);
    console.log(`Processing ${subsetData.length} records out of ${allData.length} total`);
    
    // Upload the subset to Pinecone
    const success = await uploadJsonToPinecone(subsetData, TEXT_FIELD);
    
    if (success) {
      console.log('✅ JSON data subset successfully imported to vector store!');
    } else {
      console.error('❌ Failed to import JSON data subset to vector store');
    }
  } catch (error) {
    console.error('Error running import:', error);
  }
}

// Run the script
main();