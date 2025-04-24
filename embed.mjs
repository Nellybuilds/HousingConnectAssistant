import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

import { Chroma } from 'langchain/vectorstores';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

// Load the FAQ data from faqs.json
const data = JSON.parse(fs.readFileSync('faqs.json', 'utf8'));

// Function to embed the FAQ data
const run = async () => {
  const vectorStore = await Chroma.fromTexts(
    data.map((d) => d.question), // Extract the questions for embedding
    data.map((d) => ({ id: d.id, answer: d.answer })), // Keep the answer for later retrieval
    new OpenAIEmbeddings() // Use OpenAI's model to convert text into vectors
  );

  // Save the vector store for later use
  await vectorStore.save('./chroma');
  console.log('✅ FAQ data embedded and saved to Chroma!');
};

// Run the embedding process
run();
