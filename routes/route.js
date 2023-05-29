// route.js

import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import { OpenAI } from "langchain/llms/openai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

dotenv.config();

const router = express.Router();

const run = async () => {
  const model = new OpenAI({
    temperature: 0,
  });

  let vectorStore;
  let scriptFromFrontend = "";

  /* Split the text into chunks */
  const createDocuments = async (text) => {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
    });
    return await textSplitter.createDocuments([text]);
  };

  /* Create the vectorstore */
  const createVectorStore = async (docs) => {
    return await HNSWLib.fromDocuments(
      docs,
      new OpenAIEmbeddings({
        modelName: "text-embedding-ada-002",
      })
    );
  };

  /* Create the chain */
  const createChain = (vectorStore) => {
    return ConversationalRetrievalQAChain.fromLLM(
      model,
      vectorStore.asRetriever()
    );
  };

  /* POST route to accept the script from the frontend */
  router.post("/script", async (req, res) => {
    const { script } = req.body;
    scriptFromFrontend = script;

    res.json({ message: "Script received successfully." });
  });

  /* GET route to retrieve the summary and actor list */
  router.get("/summary", async (req, res) => {
    const question =
      "Your task is to summarize the TV script I give you and extract the names of all actors and use bullet points to list them. Pick a good emoji to represent each actor.";

    let text;
    if (scriptFromFrontend) {
      text = scriptFromFrontend;
    } else {
      // Load from file if script.txt exists
      if (fs.existsSync("script.txt")) {
        text = fs.readFileSync("script.txt", "utf8");
      } else {
        return res.status(400).json({ error: "No script provided." });
      }
    }

    const docs = await createDocuments(text);
    vectorStore = await createVectorStore(docs);
    const chain = createChain(vectorStore);

    const chainRes = await chain.call({ question, chat_history: [], text });

    // Extract the relevant information from the response
    const summary = chainRes.text;
    const actorNames = extractActorNames(summary);
    const actorList = actorNames.map((name) => `- ${name}`);

    // Send the response
    res.json({
      summary,
      actorList,
    });
  });

  /* Helper function to extract actor names from the summary */
  function extractActorNames(summary) {
    return ["Actor 1", "Actor 2", "Actor 3"];
  }
};

run();

export default router;
