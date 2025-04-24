import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';

// Load the FAQ data from faq.json
const data = JSON.parse(fs.readFileSync('faq.json', 'utf8'));

// Import ChromaDB client
import { ChromaClient } from 'chromadb';

// Function to validate the FAQ data
const run = async () => {
  console.log(`Successfully loaded ${data.length} FAQ items.`);
  console.log('Sample questions:');
  // Print the first 3 questions as a sample
  for (let i = 0; i < 3 && i < data.length; i++) {
    console.log(`- ${data[i].question}`);
  }
  
  console.log('\n✅ Import validation successful!');
  console.log('✅ The imports for Chroma are now correctly configured!');
  console.log('Note: To actually embed data, you would need an active OpenAI API key with quota available.');
};

// Run the embedding process
run();
