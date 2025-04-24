import { initializeWithJsonData } from './json-rag';
import path from 'path';

/**
 * This script imports JSON data to the vector store
 * 
 * Usage: 
 * - Place your JSON file in the /data directory
 * - Update the file name and text field below
 * - Run: npx tsx server/import-json.ts
 */

// Configuration
const JSON_FILE = 'your-data.json'; // Update this with your JSON file name
const TEXT_FIELD = 'text';          // Update this with the field that contains the text to embed

// Execute import
async function main() {
  try {
    const jsonPath = path.join(process.cwd(), 'data', JSON_FILE);
    
    console.log('Starting JSON import process...');
    console.log(`JSON file: ${jsonPath}`);
    console.log(`Text field: ${TEXT_FIELD}`);
    
    const success = await initializeWithJsonData(jsonPath, TEXT_FIELD);
    
    if (success) {
      console.log('✅ JSON data successfully imported to vector store!');
    } else {
      console.error('❌ Failed to import JSON data to vector store');
    }
  } catch (error) {
    console.error('Error running import:', error);
  }
}

// Run the script
main();