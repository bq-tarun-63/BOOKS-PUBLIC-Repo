import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";


// Utility: Sync markdown to vector DB (frontend)
export async function syncMarkdownToVectorDB({
    noteId,
    markdown,
    metadata,
  }: {
    noteId: string;
    markdown: string;
    metadata: Record<string, any>;
  }) {
    // 1. Generate embedding for each chunk
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "", dangerouslyAllowBrowser: true });
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" });
    const index = pinecone.index(process.env.PINECONE_INDEX || "notes-index");
  
    // Split markdown into chunks (simple split by paragraphs, can be improved)
    const paragraphs = markdown.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const chunkSize = 500;
    const chunks: string[] = [];
    let current = "";
    for (const para of paragraphs) {
      if ((current + para).length > chunkSize && current.length > 0) {
        chunks.push(current);
        current = para;
      } else {
        current += (current ? "\n\n" : "") + para;
      }
    }
    if (current) chunks.push(current);
  
    // Delete existing vectors for this note
    try {
      await index.deleteMany({ filter: { noteId } });
    } catch (e) {
      // ignore if not found
    }
  
    // Generate embeddings and upsert
    const vectors = await Promise.all(
      chunks.map(async (chunk, i) => {
        const embedding = await openai.embeddings.create({
          model: "text-embedding-3-small", // outputs 1024-dim vectors
          input: chunk,
        });
  
        const embeddingData = embedding.data?.[0]?.embedding;
        if (!embeddingData) throw new Error("No embedding returned from OpenAI API");
  
        return {
          id: `${noteId}-chunk-${i}`,
          values: embeddingData,
          metadata: {
            ...metadata,
            noteId,
            chunkIndex: i,
            totalChunks: chunks.length,
            chunkText: chunk.substring(0, 100),
          },
        };
      }),
    );
    if (vectors.length > 0) {
      await index.upsert(vectors);
    }
  }
  