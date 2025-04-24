import { pinecone } from "../lib/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/community/vectorstores/pinecone";
import * as fs from "fs";

// Load your JSON/text file
const rawData = fs.readFileSync("data/housingconnect.json", "utf-8");
const housingDocs = JSON.parse(rawData).map((item: any) => ({
  pageContent: item.text,
  metadata: { source: item.source || "manual" },
}));

const run = async () => {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY!,
  });

  const pineconeIndex = pinecone.Index("housing-connect");

  await PineconeStore.fromDocuments(housingDocs, embeddings, {
    pineconeIndex,
    namespace: "housing-info",
  });

  console.log("✅ Data embedded and sent to Pinecone!");
};

run().catch(console.error);
