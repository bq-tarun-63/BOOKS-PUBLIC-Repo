import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import connectToDatabase from "../lib/mongoDb/mongodb";
import { NoteService } from "./noteService";
import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote"

// Track the index dimension for vector resizing
const indexDimension = 1536; // Default for OpenAI embeddings

// Define metadata types
export interface NoteMetadata {
  noteId: string;
  title?: string;
  contentPath?: string;
  userId?: string;
  userEmail?: string;
  parentId?: string; // Removed null type to match Pinecone's requirements
  isPublic?: boolean;
  updatedAt?: string;
  noteType?: string;
  chunkIndex?: number;
  totalChunks?: number;
  chunkText?: string;
}

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

// Initialize embedding model
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
  dimensions: 1536,
});

// Get Pinecone index
const getIndex = () => {
  const indexName = process.env.PINECONE_INDEX || "notes-index";
  return pinecone.index(indexName);
};

/**
 * Split text into chunks for more effective embedding
 * Improved chunking with better semantic cohesion and overlap
 * @param text Content to split
 * @param options Chunking options
 * @returns Array of text chunks
 */
export function splitIntoChunks(
  text: string,
  options = {
    chunkSize: 500,
    chunkOverlap: 50,
    preserveSentences: true,
  },
): string[] {
  if (!text) return [];

  const { chunkSize, chunkOverlap, preserveSentences } = options;

  // First, split by paragraphs to maintain some document structure
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  // Next, identify sentences within paragraphs (if preserveSentences is true)
  const sentenceRegex = /[.!?]+\s+/g;
  const chunks: string[] = [];

  let currentChunk = "";
  let currentSize = 0;

  for (const paragraph of paragraphs) {
    // If a single paragraph is already bigger than the chunk size
    // and preserveSentences is true, we'll try to split by sentences
    if (preserveSentences && paragraph.length > chunkSize) {
      // Split paragraph into sentences
      let lastIndex = 0;
      const sentences: string[] = [];
      let match: RegExpExecArray | null = null;
      while (true) {
        match = sentenceRegex.exec(paragraph);
        if (match === null) break;

        sentences.push(paragraph.substring(lastIndex, match.index + match[0].length));
        lastIndex = match.index + match[0].length;
      }

      // Add the last part if there's any remaining text
      if (lastIndex < paragraph.length) {
        sentences.push(paragraph.substring(lastIndex));
      }

      // Process each sentence
      for (const sentence of sentences) {
        // If adding this sentence would exceed the chunk size, save current chunk and start a new one
        if (currentSize + sentence.length > chunkSize && currentSize > 0) {
          chunks.push(currentChunk);

          // Start a new chunk with overlap from the previous one
          const words = currentChunk.split(" ");
          const overlapWords = words.slice(Math.max(0, words.length - chunkOverlap / 10));
          currentChunk = `${overlapWords.join(" ")} ${sentence}`;
          currentSize = currentChunk.length;
        } else {
          // Add sentence to current chunk
          currentChunk += (currentSize > 0 ? " " : "") + sentence;
          currentSize += sentence.length;
        }
      }
    } else {
      // If adding this paragraph would exceed the chunk size, save current chunk and start a new one
      if (currentSize + paragraph.length > chunkSize && currentSize > 0) {
        chunks.push(currentChunk);

        // Start a new chunk with overlap from the previous one
        const words = currentChunk.split(" ");
        const overlapWords = words.slice(Math.max(0, words.length - chunkOverlap / 10));
        const overlap = overlapWords.join(" ");

        currentChunk = overlap + (overlap ? " " : "") + paragraph;
        currentSize = currentChunk.length;
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentSize > 0 ? "\n\n" : "") + paragraph;
        currentSize += paragraph.length + (currentSize > 0 ? 2 : 0); // Account for newlines
      }
    }

    // If the current chunk is getting too large, save it
    if (currentSize >= chunkSize) {
      chunks.push(currentChunk);
      currentChunk = "";
      currentSize = 0;
    }
  }

  // Add the final chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Generate embeddings for text
 * @param text Text to generate embedding for
 * @returns Vector embedding
 */
export async function generateEmbedding(text: string) {
  try {
    const embedding = await embeddings.embedQuery(text);
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// Helper function to convert null values to empty strings in metadata
function sanitizeMetadata(metadata: NoteMetadata): NoteMetadata {
  const sanitized = { ...metadata };
  for (const key in sanitized) {
    if (sanitized[key] === null || sanitized[key] === undefined) {
      sanitized[key] = "";
    }
  }
  return sanitized;
}

/**
 * Sync note content to vector database
 * @param noteId Note ID
 * @param content Note content
 * @param metadata Note metadata
 */
export async function syncToVectorDB({
  noteId,
  content,
  metadata,
}: {
  noteId: string;
  content: string;
  metadata: NoteMetadata;
}) {
  try {
    const index = getIndex();

    // First, delete any existing vectors for this note
    await deleteFromVectorDB({ noteId });

    // Split content into chunks
    const contentObj = typeof content === "string" ? JSON.parse(content) : content;
    const textContent = JSON.stringify(contentObj);
    const chunks = splitIntoChunks(textContent);

    // If parentId is not included in metadata, try to get it
    if (!("parentId" in metadata)) {
      try {
        const note = await adapterForGetNote({ id: noteId, includeContent: false });
        metadata.parentId = note.parentId || ""; // Convert null to empty string
      } catch (err) {
        console.warn(`Could not retrieve parentId for note ${noteId}`);
        metadata.parentId = ""; // Set default empty string on error
      }
    }

    // Sanitize metadata to convert null values to empty strings
    const sanitizedMetadata = sanitizeMetadata(metadata);

    // Process each chunk
    const vectors = await Promise.all(
      chunks.map(async (chunk, i) => {
        const chunkId = `${noteId}-chunk-${i}`;
        const embedding = await generateEmbedding(chunk);

        return {
          id: chunkId,
          values: embedding,
          metadata: {
            ...sanitizedMetadata,
            noteId: noteId,
            chunkIndex: i,
            totalChunks: chunks.length,
            chunkText: chunk.substring(0, 100), // Store preview of the chunk text
          },
        };
      }),
    );

    // Insert all vectors
    if (vectors.length > 0) {
      await index.upsert(vectors);
      console.log(`Synced ${vectors.length} chunks for note ${noteId}`);
    }
  } catch (error) {
    console.error("Error syncing to vector DB:", error);
    throw error;
  }
}

/**
 * Search vector database for similar content
 * @param query Search query
 * @param filters Metadata filters
 * @param limit Max results to return
 * @returns Search results
 */
export async function semanticSearch({
  query,
  filters = {},
  limit = 100,
}: {
  query: string;
  filters?: Partial<NoteMetadata>;
  limit?: number;
}) {
  try {
    const index = getIndex();

    // Special case: If query is "*", we want all chunks for a specific noteId
    // This is used for summarization where we need all content chunks
    if (query === "*" && filters.noteId) {
      // In this case, we're not doing a semantic search but fetching all vectors for a noteId
      const results = await index.query({
        vector: Array(indexDimension).fill(0), // Dummy vector
        filter: filters,
        topK: limit,
        includeMetadata: true,
        includeValues: false,
      });

      // Don't group by noteId in this case as we want all chunks
      const allChunks =
        results.matches?.map((match) => ({
          id: match.id,
          noteId: match.metadata?.noteId,
          score: match.score || 0,
          metadata: match.metadata,
        })) || [];

      // Fetch the full note content once for reference
      let noteContent;
      if (allChunks.length > 0 && allChunks[0]?.noteId) {
        try {
          const noteId = String(allChunks[0].noteId); // Ensure it's a string
          noteContent = await adapterForGetNote({ id: noteId, includeContent: true });
        } catch (err) {
          console.error(`Error fetching note ${allChunks[0].noteId}:`, err);
        }
      }

      // Add the note content to each chunk result
      const enhancedResults = allChunks.map((chunk) => ({
        ...chunk,
        note: noteContent,
      }));

      return enhancedResults;
    }

    // Normal semantic search path
    const queryEmbedding = await generateEmbedding(query);
    const chunkKeyword = filters.chunkText;
    if (chunkKeyword) {
      delete filters.chunkText;
    }


    const results = await index.query({
      vector: queryEmbedding,
      filter: filters,
      topK: limit,
      includeMetadata: true,
      includeValues: false,
    });

    let finalMatches = results.matches;
    if (chunkKeyword) {
      const keywordLower = chunkKeyword.toLowerCase();
      finalMatches = finalMatches?.filter((m) => {
        const chunkText = m.metadata?.chunkText;
        return (
          typeof chunkText === "string" &&
          chunkText.toLowerCase().includes(keywordLower)
        );
      });
    }
    
    // Group by noteId and get unique notes
    const noteMap = new Map();
    finalMatches?.forEach((match) => {
      if (!match.metadata || match.score === undefined) return;

      const noteId = match.metadata.noteId;
      if (!noteMap.has(noteId) || match.score > noteMap.get(noteId).score) {
        noteMap.set(noteId, {
          noteId,
          score: match.score,
          metadata: match.metadata,
        });
      }
    });

    // Fetch full note content for top results
    const enhancedResults = await Promise.all(
      Array.from(noteMap.values()).map(async (result) => {
        try {
          const note = await adapterForGetNote({ id: result.noteId, includeContent: false });
          return {
            ...result,
            note,
          };
        } catch (err) {
          console.error(`Error fetching note ${result.noteId}:`, err);
          return result; // Return without note content
        }
      }),
    );

    return enhancedResults;
  } catch (error) {
    console.error("Error searching vector DB:", error);
    throw error;
  }
}

/**
 * Delete note vectors from vector DB
 * @param noteId Note ID
 */
export async function deleteFromVectorDB({ noteId }: { noteId: string }) {
  try {
    const index = getIndex();

    // Find all vectors for this note
    const results = await index.query({
      vector: Array(1536).fill(0), // Dummy vector
      filter: { noteId },
      topK: 100,
      includeMetadata: false,
      includeValues: false,
    });

    // Delete all found vectors
    if (results.matches && results.matches.length > 0) {
      const ids = results.matches.map((match) => match.id);
      await index.deleteMany(ids);
      console.log(`Deleted ${ids.length} vectors for note ${noteId}`);
    }
  } catch (error) {
    console.error("Error deleting from vector DB:", error);
    // Don't throw error as this is cleanup
  }
}

/**
 * Index all existing notes in vector DB
 */
export async function indexAllNotes() {
  try {
    const client = await connectToDatabase();
    const db = client.db();
    const notesCollection = db.collection("notes");

    // Get all notes
    const notes = await notesCollection.find({}).toArray();
    console.log(`Indexing ${notes.length} notes...`);

    // Process each note
    let processed = 0;
    for (const note of notes) {
      try {
        // Get content
        const content = await NoteService.getNoteContent(note.contentPath);
        if (!content) continue;

        // Create metadata
        const metadata = {
          noteId: note._id.toString(),
          title: note.title,
          contentPath: note.contentPath,
          userId: note.userId.toString(),
          userEmail: note.userEmail,
          parentId: note.parentId,
          isPublic: note.isPublicNote,
          updatedAt: note.updatedAt.toISOString(),
          noteType: note.noteType,
        };

        // Sync to vector DB
        await syncToVectorDB({
          noteId: note._id.toString(),
          content,
          metadata,
        });
        processed++;

        // Log progress every 10 notes
        if (processed % 10 === 0) {
          console.log(`Processed ${processed}/${notes.length} notes`);
        }
      } catch (err) {
        console.error(`Error indexing note ${note._id}:`, err);
        // continue;
      }
    }

    console.log(`Indexing complete. Successfully indexed ${processed}/${notes.length} notes.`);
  } catch (error) {
    console.error("Error indexing all notes:", error);
    throw error;
  }
}

/**
 * Find child notes for a given parent
 * @param parentId Parent note ID
 * @param limit Max results to return
 * @returns Search results
 */
export async function findChildNotes({
  parentId,
  limit = 10,
}: {
  parentId: string;
  limit?: number;
}) {
  try {
    const index = getIndex();

    // Use dummy vector with filter to find notes with matching parentId
    const results = await index.query({
      vector: Array(1536).fill(0), // Dummy vector
      filter: { parentId },
      topK: limit,
      includeMetadata: true,
      includeValues: false,
    });

    // Group by noteId and get unique notes
    const noteMap = new Map();
    results.matches?.forEach((match) => {
      if (!match.metadata) return;

      const noteId = match.metadata.noteId;
      if (!noteMap.has(noteId)) {
        noteMap.set(noteId, {
          noteId,
          metadata: match.metadata,
        });
      }
    });

    // Fetch full note content for results
    const enhancedResults = await Promise.all(
      Array.from(noteMap.values()).map(async (result) => {
        try {
          const note = await adapterForGetNote({ id: result.noteId, includeContent: true });
          return {
            ...result,
            note,
          };
        } catch (err) {
          console.error(`Error fetching note ${result.noteId}:`, err);
          return result; // Return without note content
        }
      }),
    );

    return enhancedResults;
  } catch (error) {
    console.error("Error finding child notes:", error);
    throw error;
  }
}

export const VectorService = {
  indexAllNotes,
  syncToVectorDB,
  deleteFromVectorDB,
  semanticSearch,
  findChildNotes,
};
