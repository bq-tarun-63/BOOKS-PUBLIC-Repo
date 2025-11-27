// import clientPromise from "@/lib/mongoDb/mongodb";
// import { permanentlyDeleteNote } from "@/lib/deleteNote/permanentlyDeleteNote";
// import { OpenAI } from "openai";
// import connectToDatabase from "../lib/mongoDb/mongodb";
// import type { INote } from "../models/types/Note";
// import type { ChatActionResult, ChatContext, ChatIntent } from "./types/chat";
// import type { SearchResult } from "./types/chat";
// import * as PermissionChecker from "../utils/permissionChecker";
// import { contextService } from "./contextService";
// import { NoteService } from "../services/noteService";
// import { findNotesByTitleAndPath } from "../services/noteService";
// import { UserService } from "../services/userService";
// import { VectorService } from "../services/vectorService";
// import { getChatIntentSystemPrompt } from "./llm-training-data/intent-trainingData";
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });
// import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote"
// import { adapterForCreateNote } from "@/lib/adapter/adapterForCreateNote";

// /**
//  * Determine user intent from query
//  * @param query User query string
//  * @returns Structured intent object
//  */
// // import { NoteService } from "./noteService";
// async function ShareNoteWithPermission(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   try {
//     // Get the user object (by email, which is context.userId)
//     const user = await UserService.findUserByEmail(context.userEmail);
//     if (!user || !user._id) {
//       return {
//         success: false,
//         message: "Failed to find user record",
//       };
//     }
//     // Prepare the share body correctly
//     console.log(intent.shareWith, "------>>");
//     const shareBody = {
//       noteId: intent.noteId || context.currentNoteId,
//       sharedWith: intent.shareWith,
//     };
//     // Call NoteService.shareNote
//     const result = await NoteService.shareNote(user._id.toString(), shareBody);
//     return {
//       success: true,
//       message: result.message || "Access granted successfully.",
//     };
//   } catch (error: unknown) {
//     const errorMessage = error instanceof Error ? error.message : "Failed to grant access.";
//     return {
//       success: false,
//       message: errorMessage,
//     };
//   }
// }

// /**
//  * Summarize the content of a note using vector search and OpenAI
//  * @param noteId ID of the note to summarize
//  * @returns Summary of the note content
//  */
// async function summarizeNoteContent(noteId: string): Promise<string> {
//   try {
//     // Get the basic note information first
//     const note = await adapterForGetNote(noteId, true);
//     if (!note) {
//       return "Note not found.";
//     }

//     const noteTitle = note.title || "Unknown";

//     // Get all content chunks from the vector DB with a higher limit to ensure we get full content
//     // Using '*' as query to match all vectors for this note
//     const vectorResults = await VectorService.semanticSearch({ query: "*", filters: { noteId }, limit: 50 });

//     if (!vectorResults || vectorResults.length === 0) {
//       // If we can't find vectors, try to get content directly from the note
//       if (note.contentPath) {
//         try {
//           const content = await NoteService.getNoteContent(note.contentPath);
//           if (content) {
//             return summarizeWithAI(content, noteTitle);
//           }
//         } catch (err) {
//           console.error("Error fetching note content directly:", err);
//         } 
//       }
//       return "No content found for this note.";
//     }

//     // Sort chunks by their index to maintain proper document order
//     vectorResults.sort((a, b) => {
//       const indexA = a.metadata?.chunkIndex || 0;
//       const indexB = b.metadata?.chunkIndex || 0;
//       return indexA - indexB;
//     });

//     // Extract all chunks of text from the results
//     let fullContent = "";

//     // Collect all chunks of text from the results
//     vectorResults.forEach((result) => {
//       if (result.metadata?.chunkText) {
//         fullContent += `${result.metadata.chunkText}\n\n`;
//       }

//       // Get note content from the note object if available and not already added
//       if (!fullContent && result.note?.content) {
//         try {
//           const contentObj =
//             typeof result.note.content === "string" ? JSON.parse(result.note.content) : result.note.content;

//           fullContent += `${JSON.stringify(contentObj)}\n\n`;
//         } catch (_) {
//           // If parsing fails, use the content as is
//           fullContent += `${result.note.content}\n\n`;
//         }
//       }
//     });

//     console.log(fullContent, "fullContent");
//     console.log(noteTitle, "noteTitle");

//     // If we have content, generate a summary
//     if (fullContent.trim()) {
//       return summarizeWithAI(fullContent, noteTitle);
//     }

//     return "No content available to summarize.";
//   } catch (error) {
//     return `Error generating summary: ${error.message || "Unknown error"}`;
//   }
// }

// // Helper function to generate summary using AI
// async function summarizeWithAI(content: string, noteTitle: string): Promise<string> {
//   const response = await openai.chat.completions.create({
//     model: process.env.CHAT_MODEL || "gpt-4",
//     messages: [
//       {
//         role: "system",
//         content: `You are a helpful assistant that summarizes note content. 
//         Create a concise but comprehensive summary of the following note content.
//         Focus on the key points, main ideas, and important details.
//         Format the summary in a clear, readable way with sections if appropriate.
//         Note title: ${noteTitle}`,
//       },
//       {
//         role: "user",
//         content: content.substring(0, 10000), // Limit content length
//       },
//     ],
//     temperature: 0.5,
//   });

//   return response.choices[0]?.message?.content || "Could not generate summary.";
// }

// /**
//  * Calculates Levenshtein distance between two strings
//  * This helps measure how similar two strings are by counting the minimum number of operations
//  * required to transform one string into the other
//  */
// function calculateLevenshteinDistance(a: string, b: string): number {
//   // Simple cases
//   if (!a.length) return b.length;
//   if (!b.length) return a.length;
//   if (a === b) return 0;

//   // Simpler implementation that avoids TypeScript undefined errors
//   // Create two rows for dynamic programming approach
//   let prevRow = Array(a.length + 1).fill(0);
//   let currRow = Array(a.length + 1).fill(0);

//   // Initialize the previous row
//   for (let j = 0; j <= a.length; j++) {
//     prevRow[j] = j;
//   }

//   // Calculate each row
//   for (let i = 1; i <= b.length; i++) {
//     currRow[0] = i;

//     for (let j = 1; j <= a.length; j++) {
//       const cost = a[j - 1] === b[i - 1] ? 0 : 1;

//       currRow[j] = Math.min(
//         prevRow[j] + 1, // deletion
//         currRow[j - 1] + 1, // insertion
//         prevRow[j - 1] + cost, // substitution
//       );
//     }

//     // Swap rows for next iteration
//     [prevRow, currRow] = [currRow, prevRow];
//   }

//   // Final distance is in the last cell of the last calculated row
//   return prevRow[a.length];
// }

// /**
//  * Calculates similarity between two strings as a percentage
//  * 100% means exact match, 0% means completely different
//  */
// function calculateStringSimilarity(a: string, b: string): number {
//   if (!a || !b) return 0;
//   if (a === b) return 100;

//   const distance = calculateLevenshteinDistance(a.toLowerCase(), b.toLowerCase());
//   const maxLength = Math.max(a.length, b.length);

//   // Convert distance to similarity percentage
//   return Math.round((1 - distance / maxLength) * 100);
// }

// // Add helper for note disambiguation and optimized selection
// type NoteOption = {
//   id: string;
//   title: string;
//   path?: string;
// };

// async function resolveTargetNoteId(
//   intent: ChatIntent,
//   context: ChatContext,
// ): Promise<{ noteId?: string; disambiguationRequired?: boolean; options?: NoteOption[] }> {
//   if (!intent.isDirectReference) {
//     return { noteId: context.currentNoteId };
//   }
//   // Otherwise, search for notes by title/query
//   const searchTitle = intent.title || intent.query;
//   if (!searchTitle) {
//     return { noteId: context.currentNoteId };
//   }
//   const results = await findNotesByTitleAndPath(context.userEmail, searchTitle);
//   if ((results.matches?.length ?? 0) === 1) {
//     return { noteId: results.matches?.[0]?.id };
//   }
//   if ((results.matches?.length ?? 0) > 1) {
//     return { disambiguationRequired: true, options: results.matches };
//   }
//   return { noteId: undefined };
// }

// async function handleSummarizeNote(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   try {
//     const resolved = await resolveTargetNoteId(intent, context);
//     if (resolved.disambiguationRequired) {
//       return {
//         success: false,
//         message: "Multiple notes match your request. Please select one:",
//         data: resolved.options?.map((note) => ({
//           noteId: note.id,
//           title: note.title,
//           score: 1, // Default score for disambiguation
//           preview: "",
//           url: `/notes/${note.id}`,
//         })),
//       };
//     }
//     const targetNoteId = resolved.noteId;
//     if (!targetNoteId) {
//       return {
//         success: false,
//         message: "Could not determine which note to summarize.",
//       };
//     }

//     // Check if the user has access to the note
//     try {
//       const note = await adapterForGetNote(targetNoteId, true);
//       if (!note) {
//         return {
//           success: false,
//           message: "The note does not exist or you don't have access to it",
//         };
//       }

//       // Generate summary
//       const summary = await summarizeNoteContent(targetNoteId);

//       return {
//         success: true,
//         message: `Summary of "${note.title || "Note"}" is ready`,
//         data: {
//           noteId: targetNoteId,
//           title: note.title,
//           summary,
//         },
//       };
//     } catch (error) {
//       return {
//         success: false,
//         message: `Error accessing note: ${error.message || error}`,
//       };
//     }
//   } catch (error) {
//     return {
//       success: false,
//       message: `Failed to summarize note: ${error.message || error}`,
//     };
//   }
// }

// async function handleCreateNote(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   try {
//     console.log("handleCreateNote--------------------------------", intent, context, "3---------------------");
//     console.log(intent.isParentIdRequired, "isParentIdRequired", "4---------------------");
//     console.log(context.userEmail, "context.userEmail", "4---------------------");
//     let parentId: string | null = null;
//     if (intent.isParentIdRequired) {
//       parentId = intent.parentId || context.currentNoteId || null;
//       // Validate parentId: if not a valid ObjectId, try to resolve by title
//       console.log(parentId, "parentId", "4---------------------");
//       const { isValidObjectId, findNotesByTitleAndPath } = await import("../services/noteService");
//       if (parentId && !isValidObjectId(parentId)) {
//         // Resolve user email to MongoDB ObjectId
//         const user = await UserService.findUserByEmail(context.userEmail);
//         if (!user || !user._id) {
//           return {
//             success: false,
//             message: "Failed to find user record for note lookup",
//           };
//         }
//         const userId = user._id.toString();
//         const results = await findNotesByTitleAndPath(userId, parentId);
//         if (results && Array.isArray(results.matches) && typeof results.matches !== "undefined") {
//           const matches = results.matches;
//           if (Array.isArray(matches) && matches.length === 1 && matches[0] && matches[0].id) {
//             parentId = matches[0].id;
//           } else if (Array.isArray(matches) && matches.length > 1) {
//             return {
//               success: false,
//               message: `Multiple notes found with the title '${parentId}'. Please specify a unique note.`,
//               // This is a generic array for disambiguation UI, not a SearchResult
//               data: { options: matches.map((n) => ({ id: n.id, title: n.title, path: n.path })) } as Record<
//                 string,
//                 unknown
//               >,
//             };
//           } else {
//             return {
//               success: false,
//               message: `No note found with the title '${parentId}'.`,
//             };
//           }
//         }
//       }
//     }

//     // if (!parentId) {
//     //   return {
//     //     success: false,
//     //     message: "Cannot create note: No parent note specified and not currently in a note.",
//     //   };
//     // }

//     // Get the actual user ID from the email address
//     console.log(context.userEmail, "context.userEmail", "4---------------------");
//     let userObjectId: string;
//     try {
//       const user = await UserService.findUserByEmail(context.userEmail);
//       if (!user || !user._id) {
//         return {
//           success: false,
//           message: "Failed to find user record",
//         };
//       }
//       userObjectId = user._id.toString();
//     } catch (error) {
//       return {
//         success: false,
//         message: "Failed to authenticate user",
//       };
//     }

//     // Generate a new noteId (ObjectId hex string)
//     const noteId =
//       typeof globalThis.crypto !== "undefined" && globalThis.crypto.randomUUID
//         ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 24)
//         : (Date.now().toString(16) + Math.random().toString(16).slice(2, 10)).slice(0, 24);
//     console.log(parentId, "parentId", "5---------------------");
//     const newNote = await adapterForCreateNote(
//       noteId,
//       intent.title || "New Note",
//       userObjectId, // Use the real user ID instead of email
//       context.userEmail, // Pass email as userEmail parameter
//       context.userName || "", // Pass userName
//       parentId, // Will be null for root-level notes
//       "", // TODO: Add icon support if needed
//       intent.isPublic,
//       intent.isRestrictedPage,
//       undefined, // parentNote
//       undefined, // organizationDomain
//       undefined, // workspaceId
//       undefined, // databaseViewId
//       undefined, // propId
//       undefined, // prop_value
//       undefined, // databaseNoteId
//       undefined, // workAreaId
//       false, // isTemplate
//     );

//     let newNoteId: string | undefined = undefined;
//     if (newNote && typeof newNote === "object") {
//       if ("_id" in newNote && newNote._id) {
//         newNoteId = newNote._id.toString();
//       } else if ("child" in newNote && newNote.child && newNote.child._id) {
//         newNoteId = newNote.child._id.toString();
//       }
//     }
//     if (!newNoteId) {
//       return {
//         success: false,
//         message: "Failed to determine new note ID after creation.",
//       };
//     }

//     // Update context to new note
//     await contextService.updateContext(context.userEmail, {
//       currentNoteId: newNoteId,
//     });

//     // Generate appropriate success message
//     let successMessage = `Created note "${intent.title || "New Note"}"`;
//     if (parentId) {
//       successMessage += " as a child note";
//     } else {
//       successMessage += " at the root level";
//     }

//     // Add visibility info to success message
//     if (intent.isPublic) {
//       successMessage += " (public";
//       if (intent.isRestrictedPage) {
//         successMessage += ", restricted)";
//       } else {
//         successMessage += ")";
//       }
//     } else {
//       successMessage += " (private)";
//     }

//     return {
//       success: true,
//       message: successMessage,
//       createdNoteId: newNoteId,
//       navigationUrl: `/notes/${newNoteId}`,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: `Failed to create note: ${error.message || error}`,
//     };
//   }
// }

// async function handleNavigation(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   try {
//     let targetNoteId = intent.noteId;
//     let noteTitle = "";
//     const searchQuery = intent.title || intent.query || "";

//     // If navigation target is a title or path, search for it
//     if (!targetNoteId && (intent.title || intent.query)) {
//       console.log(`Searching for note with query: "${searchQuery}"`);

//       // First try direct title match if we have a title in the intent
//       if (intent.title || searchQuery) {
//         try {
//           const client = await connectToDatabase();
//           const db = client.db();
//           const notesCollection = db.collection("notes");

//           // Prepare the search term and clean it up
//           const searchTerm = (intent.title || searchQuery || "").trim();
//           // Create a normalized version for better matching (remove hyphens, etc.)
//           const normalizedSearchTerm = searchTerm.replace(/[-_]/g, " ").toLowerCase();

//           console.log(`Searching for note with normalized term: "${normalizedSearchTerm}"`);

//           // Look for exact title match first
//           const exactNote = await notesCollection.findOne({ title: searchTerm });
//           if (exactNote) {
//             console.log(`Found exact title match: ${exactNote.title} (${exactNote._id})`);
//             targetNoteId = exactNote._id.toString();
//             noteTitle = exactNote.title;
//           } else {
//             // Try case-insensitive match
//             const caseInsensitiveNote = await notesCollection.findOne({
//               title: { $regex: new RegExp(`^${searchTerm}$`, "i") },
//             });
//             if (caseInsensitiveNote) {
//               console.log(
//                 `Found case-insensitive title match: ${caseInsensitiveNote.title} (${caseInsensitiveNote._id})`,
//               );
//               targetNoteId = caseInsensitiveNote._id.toString();
//               noteTitle = caseInsensitiveNote.title;
//             } else {
//               // Try partial match with the search term appearing anywhere in the title
//               if (searchTerm) {
//                 const partialMatch = await notesCollection.findOne({
//                   title: { $regex: new RegExp(searchTerm, "i") },
//                 });
//                 if (partialMatch) {
//                   console.log(
//                     `Found partial title match: "${searchTerm}" in "${partialMatch.title}" (${partialMatch._id})`,
//                   );
//                   targetNoteId = partialMatch._id.toString();
//                   noteTitle = partialMatch.title;
//                 }
//               }

//               // General fuzzy matching approach
//               if (!targetNoteId) {
//                 // 1. Try tokenization approach - break the search term into tokens and find notes containing those tokens
//                 const tokens = normalizedSearchTerm.split(/\s+/).filter((token) => token.length > 1);
//                 if (tokens.length > 0) {
//                   // Create an aggregation pipeline to find the best matches
//                   const fuzzyMatches = await notesCollection
//                     .aggregate([
//                       // First stage: find notes containing any of the tokens
//                       {
//                         $match: {
//                           title: {
//                             $regex: tokens.map((token) => `(?=.*${token})`).join("|"),
//                             $options: "i",
//                           },
//                         },
//                       },
//                       // Second stage: project a score based on how many tokens match
//                       {
//                         $addFields: {
//                           score: {
//                             $sum: tokens.map((token) => ({
//                               $cond: [
//                                 { $regexMatch: { input: { $toLower: "$title" }, regex: token, options: "i" } },
//                                 1,
//                                 0,
//                               ],
//                             })),
//                           },
//                         },
//                       },
//                       // Sort by score (highest first) and limit to 3 results
//                       { $sort: { score: -1 } },
//                       { $limit: 3 },
//                     ])
//                     .toArray();

//                   if (fuzzyMatches.length > 0 && fuzzyMatches[0]) {
//                     const bestMatch = fuzzyMatches[0];
//                     if (bestMatch._id && bestMatch.title !== undefined) {
//                       console.log(
//                         `Found fuzzy token match: "${normalizedSearchTerm}" matched "${bestMatch.title}" with score ${bestMatch.score || 0}/${tokens.length} (${bestMatch._id})`,
//                       );
//                       targetNoteId = bestMatch._id.toString();
//                       noteTitle = bestMatch.title;
//                     }
//                   }
//                 }
//               }

//               // 2. Try pattern-based approach for note titles with separators/formatting variations
//               if (!targetNoteId) {
//                 // Replace any separators (-, _, space) with a flexible regex pattern that matches any separator
//                 const flexPattern = normalizedSearchTerm
//                   .replace(/\s+/g, "\\s*[-_\\s]*\\s*") // Replace spaces with flexible separator pattern
//                   .replace(/[-_]/g, "\\s*[-_\\s]*\\s*"); // Replace existing separators with flexible pattern

//                 try {
//                   const patternMatch = await notesCollection.findOne({
//                     title: { $regex: new RegExp(flexPattern, "i") },
//                   });

//                   if (patternMatch) {
//                     console.log(
//                       `Found pattern match: "${normalizedSearchTerm}" (pattern: ${flexPattern}) matched "${patternMatch.title}" (${patternMatch._id})`,
//                     );
//                     targetNoteId = patternMatch._id.toString();
//                     noteTitle = patternMatch.title;
//                   }
//                 } catch (err) {
//                   // In case the regex pattern is invalid, log but continue
//                   console.error("Error with flexible pattern match:", err);
//                 }
//               }

//               // Try matching with words in the title (for multi-word titles)
//               if (!targetNoteId && searchTerm) {
//                 const words = searchTerm.split(/\s+/).filter((w) => w.length > 2);
//                 if (words.length > 0) {
//                   // Changed from > 1 to > 0 to match even single words
//                   // Create a regex that matches any of the words in the search term
//                   const wordRegex = new RegExp(words.join("|"), "i");
//                   const wordMatch = await notesCollection.findOne({
//                     title: { $regex: wordRegex },
//                   });
//                   if (wordMatch) {
//                     console.log(
//                       `Found word match in title: "${searchTerm}" matched "${wordMatch.title}" (${wordMatch._id})`,
//                     );
//                     targetNoteId = wordMatch._id.toString();
//                     noteTitle = wordMatch.title;
//                   }
//                 }
//               }
//             }
//           }
//         } catch (err) {
//           console.error("Error searching for note by title:", err);
//         }
//       }

//       // If direct title match failed, try fetching potential matches and ranking by string similarity
//       if (!targetNoteId) {
//         // Fetch potential candidates with broader search criteria
//         try {
//           const client = await connectToDatabase();
//           const db = client.db();
//           const notesCollection = db.collection("notes");

//           // Get up to 10 notes to compare with string similarity
//           const candidateNotes = await notesCollection.find({}).limit(30).toArray();

//           if (candidateNotes.length > 0) {
//             // Calculate similarity scores for each candidate
//             const scoredCandidates = candidateNotes.map((note) => {
//               const title = note.title || "";
//               const similarity = calculateStringSimilarity(searchQuery, title);
//               return { note, similarity };
//             });

//             // Sort by similarity score (highest first)
//             scoredCandidates.sort((a, b) => b.similarity - a.similarity);

//             // If we have any candidates and the best match has at least 60% similarity, use it
//             if (scoredCandidates.length > 0) {
//               const bestCandidate = scoredCandidates[0];

//               if (bestCandidate && bestCandidate.similarity >= 60 && bestCandidate.note) {
//                 const bestMatch = bestCandidate.note;
//                 if (bestMatch._id) {
//                   targetNoteId = bestMatch._id.toString();
//                   noteTitle = bestMatch.title || "Unknown Title";
//                   console.log(
//                     `Found string similarity match: "${searchQuery}" matched "${noteTitle}" with ${bestCandidate.similarity}% similarity`,
//                   );
//                 }
//               } else if (bestCandidate?.note) {
//                 const title = bestCandidate.note.title || "Unknown";
//                 console.log(
//                   `No good similarity matches found. Best was "${title}" with only ${bestCandidate.similarity}% similarity`,
//                 );
//               }
//             }
//           }
//         } catch (err) {
//           console.error("Error calculating string similarities:", err);
//         }
//       }

//       // Fall back to semantic search if string similarity didn't find a match
//       if (!targetNoteId) {
//         const searchResults = await VectorService.semanticSearch({ query: searchQuery });
//         console.log("Semantic search results:", JSON.stringify(searchResults.slice(0, 3)));

//         // Accept semantic search results with a lower threshold for navigation (minimum 0.35)
//         // Navigation should be more lenient than search as users often have approximate note names
//         if (searchResults.length > 0 && searchResults[0].score >= 0.35) {
//           targetNoteId = searchResults[0].id || searchResults[0].noteId;
//           noteTitle = searchResults[0].note?.title || "Untitled Note";
//           console.log(`Selected noteId from semantic search: ${targetNoteId} with score ${searchResults[0].score}`);
//         } else if (searchResults.length > 0) {
//           console.log(
//             `Rejecting semantic search result with low score: ${searchResults[0].score} - "${searchResults[0].note?.title}"`,
//           );
//         }
//       }
//     }

//     if (!targetNoteId) {
//       const requestedTitle = intent.title || searchQuery;
//       return {
//         success: false,
//         message: `Could not find a note matching "${requestedTitle}". Please check the note title and try again.`,
//       };
//     }

//     // Check if note exists and user has access
//     try {
//       const note: INote | null = await adapterForGetNote(targetNoteId, true);
//       if (!note) {
//         return {
//           success: false,
//           message: "The note does not exist or you don't have access to it",
//         };
//       }
//       console.log(`Successfully found note: ${note.title} (${targetNoteId})`);
//       noteTitle = note.title;
//     } catch (error) {
//       console.error(`Error accessing note ${targetNoteId}:`, error);
//       return {
//         success: false,
//         message: `Error accessing note: ${error.message || error}`,
//       };
//     }

//     // Update context
//     await contextService.updateContext(context.userEmail, {
//       currentNoteId: targetNoteId,
//     });

//     // Add to recent notes
//     await contextService.addToRecentNotes(context.userEmail, targetNoteId);

//     const navigationUrl = `/notes/${targetNoteId}`;
//     console.log(`Navigation URL set to: ${navigationUrl}`);

//     return {
//       success: true,
//       message: `Navigated to note "${noteTitle}" successfully`,
//       navigationUrl: navigationUrl,
//       noteTitle: noteTitle,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: `Navigation failed: ${error.message || error}`,
//     };
//   }
// }

// /**
//  * Extracts author name from search query using various patterns
//  */
// function extractAuthorFromQuery(query: string | undefined): string | null {
//   if (!query) return null;

//   // First group for single word usernames
//   const singleWordPatterns = [
//     /by\s+([\w\.]+)\b/i, // "by username"
//     /authored\s+by\s+([\w\.]+)\b/i, // "authored by username"
//     /created\s+by\s+([\w\.]+)\b/i, // "created by username"
//     /written\s+by\s+([\w\.]+)\b/i, // "written by username"
//     /from\s+([\w\.]+)\b/i, // "from username"
//     /([\w\.]+)'s\s+notes/i, // "username's notes"
//     /notes\s+by\s+([\w\.]+)\b/i, // "notes by username"
//     /notes\s+created\s+by\s+([\w\.]+)\b/i, // "notes created by username"
//     /notes\s+from\s+([\w\.]+)\b/i, // "notes from username"
//   ];

//   // Second group for two-word name patterns (first & last name)
//   const multiWordPatterns = [
//     /by\s+([\w\.]+\s+[\w\.]+)\b/i, // "by first last"
//     /authored\s+by\s+([\w\.]+\s+[\w\.]+)\b/i, // "authored by first last"
//     /created\s+by\s+([\w\.]+\s+[\w\.]+)\b/i, // "created by first last"
//     /written\s+by\s+([\w\.]+\s+[\w\.]+)\b/i, // "written by first last"
//     /from\s+([\w\.]+\s+[\w\.]+)\b/i, // "from first last"
//     /notes\s+by\s+([\w\.]+\s+[\w\.]+)\b/i, // "notes by first last"
//     /notes\s+created\s+by\s+([\w\.]+\s+[\w\.]+)\b/i, // "notes created by first last"
//     /notes\s+from\s+([\w\.]+\s+[\w\.]+)\b/i, // "notes from first last"
//   ];

//   // Combine both pattern groups - try multi-word patterns first
//   const authorSearchPatterns = [...multiWordPatterns, ...singleWordPatterns];

//   // Extract author name from query if it matches author search patterns
//   for (const pattern of authorSearchPatterns) {
//     const match = query.match(pattern);
//     if (match?.[1]) {
//       const authorName = match[1].toLowerCase();
//       console.log(`Detected author search for: ${authorName}`);
//       return authorName;
//     }
//   }

//   return null;
// }

// /**
//  * Finds a user by partial name or email with enhanced matching
//  */
// async function findUserByNameOrEmailPart(authorName: string): Promise<{ email: string; name?: string } | null> {
//   try {
//     const client = await connectToDatabase();
//     const db = client.db();
//     const usersCollection = db.collection("users");

//     console.log(`Searching for user matching: "${authorName}"`);

//     // Split the author name into parts (for handling names with spaces)
//     const nameParts = authorName.split(/\s+/);
//     const escapedAuthorName = authorName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escape regex special chars

//     // Create a dynamic search condition
//     interface SearchCondition {
//       email?: { $regex: string; $options: string };
//       name?: { $regex: string; $options: string };
//     }
//     const searchConditions: SearchCondition[] = [];

//     // 1. Direct match on full name/email - higher priority
//     searchConditions.push({ email: { $regex: `^${escapedAuthorName}$`, $options: "i" } }); // Exact email match
//     searchConditions.push({ name: { $regex: `^${escapedAuthorName}$`, $options: "i" } }); // Exact name match

//     // 2. Partial matches - lower priority
//     searchConditions.push({ email: { $regex: escapedAuthorName, $options: "i" } }); // Email contains
//     searchConditions.push({ name: { $regex: escapedAuthorName, $options: "i" } }); // Name contains

//     // 3. Match on email username part (before @)
//     searchConditions.push({ email: { $regex: `^${escapedAuthorName}.*@`, $options: "i" } }); // Starts with
//     searchConditions.push({ email: { $regex: `.*${escapedAuthorName}.*@`, $options: "i" } }); // Contains

//     // 4. For common email username patterns (with or without dots)
//     // Handle cases like looking for "atharv" when email is "atharv.mahajan@betaque.com"
//     searchConditions.push({ email: { $regex: `^${escapedAuthorName}\\..*@`, $options: "i" } }); // atharv.something@

//     // Handle cases like looking for "mahajan" when email is "atharv.mahajan@betaque.com"
//     searchConditions.push({ email: { $regex: `\\.${escapedAuthorName}@`, $options: "i" } }); // something.mahajan@

//     // Handle cases where dots might be replaced with underscores
//     searchConditions.push({ email: { $regex: `${escapedAuthorName}_`, $options: "i" } }); // atharv_something
//     searchConditions.push({ email: { $regex: `_${escapedAuthorName}`, $options: "i" } }); // something_atharv

//     // 5. For multi-word names, try different combinations
//     if (nameParts.length > 1) {
//       // Try each part individually with word boundaries for better accuracy
//       for (const part of nameParts) {
//         if (part.length > 2) {
//           // Skip very short parts
//           const escapedPart = part.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
//           searchConditions.push({ email: { $regex: escapedPart, $options: "i" } });
//           searchConditions.push({ name: { $regex: `\\b${escapedPart}\\b`, $options: "i" } }); // Match whole words
//         }
//       }

//       // Try parts in reverse order (last name first)
//       const reversedName = [...nameParts]
//         .reverse()
//         .map((part) => part.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"))
//         .join(" ");
//       searchConditions.push({ name: { $regex: reversedName, $options: "i" } });
//     }

//     // First try to find an exact or very close match with high confidence
//     let userMatch = await usersCollection.findOne({
//       $or: searchConditions.slice(0, 4), // Try exact matches first
//     });

//     // If no exact match, try all search conditions
//     if (!userMatch) {
//       userMatch = await usersCollection.findOne({
//         $or: searchConditions,
//       });
//     }

//     if (userMatch?.email) {
//       console.log(`Found matching user: ${userMatch?.name || "Unknown"} with email: ${userMatch.email}`);
//       return {
//         email: userMatch.email,
//         name: userMatch.name,
//       };
//     }

//     // If still not found, try a more aggressive approach with aggregation to find closest matches
//     console.log(`No direct match found for "${authorName}". Trying fuzzy matching.`);

//     // Use aggregation to find and score potential matches
//     const fuzzyMatches = await usersCollection
//       .aggregate([
//         {
//           $project: {
//             email: 1,
//             name: 1,
//             score: {
//               $add: [
//                 // Score based on email similarity
//                 {
//                   $cond: [
//                     { $regexMatch: { input: "$email", regex: escapedAuthorName, options: "i" } },
//                     10, // Higher score for email matches
//                     0,
//                   ],
//                 },
//                 // Score based on name similarity
//                 {
//                   $cond: [
//                     { $regexMatch: { input: { $ifNull: ["$name", ""] }, regex: escapedAuthorName, options: "i" } },
//                     5, // Lower score for name matches
//                     0,
//                   ],
//                 },
//               ],
//             },
//           },
//         },
//         { $match: { score: { $gt: 0 } } }, // Only keep matches with some score
//         { $sort: { score: -1 } }, // Sort by score descending
//         { $limit: 1 }, // Get best match
//       ])
//       .toArray();

//     if (fuzzyMatches.length > 0 && fuzzyMatches[0]?.email) {
//       const bestMatch = fuzzyMatches[0];
//       if (bestMatch?.email) {
//         console.log(`Found best fuzzy match: ${bestMatch.name || "Unknown"} with email: ${bestMatch.email}`);
//         return {
//           email: bestMatch.email,
//           name: bestMatch.name,
//         };
//       }
//     }

//     console.log(`No user found matching "${authorName}" after all matching attempts.`);
//     return null;
//   } catch (error) {
//     console.error("Error finding user:", error);
//     return null;
//   }
// }

// /**
//  * Define a type for note search results
//  */
// interface NoteSearchResult {
//   id?: string;
//   noteId?: string;
//   score?: number;
//   note?: {
//     title?: string;
//     content?: string;
//     userEmail?: string;
//     [key: string]: unknown;
//   };
//   metadata?: Record<string, unknown>;
//   [key: string]: unknown;
// }

// /**
//  * Determines if a user has access to a specific note
//  * @param userEmail Current user's email
//  * @param note The note to check access for
//  * @returns boolean indicating if user has access
//  */
// function userHasNoteAccess(
//   userEmail: string,
//   note: {
//     userEmail?: string;
//     isPublicNote?: boolean;
//     isPublic?: boolean; // Added to handle vector DB results
//     isRestrictedPage?: boolean;
//     sharedWith?: Array<{ email: string; access?: string }>;
//     [key: string]: unknown;
//   },
// ): boolean {
//   if (!note) return false;

//   // Case 1: User is the note owner
//   if (note.userEmail === userEmail) {
//     return true;
//   }

//   // Case 2: Note is public and not restricted
//   // Check both isPublicNote (from DB) and isPublic (from vector)
//   const isPublic = note.isPublicNote === true || note.isPublic === true;
//   if (isPublic && note.isRestrictedPage !== true) {
//     return true;
//   }

//   // Case 3: Note is public but restricted - check if user has explicit access
//   if (isPublic && note.isRestrictedPage === true) {
//     // If explicitly shared with this user - allow
//     if (Array.isArray(note.sharedWith) && note.sharedWith.some((share) => share.email === userEmail)) {
//       return true;
//     }
//     // Otherwise restricted public notes are not accessible
//     return false;
//   }

//   // Case 4: Private note - check if explicitly shared with user
//   if (Array.isArray(note.sharedWith) && note.sharedWith.some((share) => share.email === userEmail)) {
//     return true;
//   }

//   // Default: no access
//   return false;
// }

// /**
//  * Filter search results to ensure they match the specified userEmail
//  * and that the current user has proper access permissions
//  */
// function filterResultsByUserEmail(
//   results: NoteSearchResult[],
//   userEmail?: string,
//   currentUserEmail?: string,
// ): NoteSearchResult[] {
//   if (!results || (Array.isArray(results) && results.length === 0)) {
//     return results;
//   }

//   // Step 1: Filter by author if specified
//   let filteredResults = results;
//   if (userEmail) {
//     filteredResults = results.filter((item) => item.note?.userEmail === userEmail);
//   }

//   // Step 2: Filter by access permissions for current user
//   if (currentUserEmail) {
//     filteredResults = filteredResults.filter((item) => {
//       // Skip items without a note object
//       if (!item.note) return false;

//       return userHasNoteAccess(currentUserEmail, item.note);
//     });
//   }

//   return filteredResults;
// }

// /**
//  * Format search results for response
//  */
// function formatSearchResults(
//   results: NoteSearchResult[],
//   filters: { userEmail?: string; [key: string]: unknown } = {},
//   authorName: string | null = null,
// ): ChatActionResult {
//   if (!results || (Array.isArray(results) && results.length === 0)) {
//     let message = "No matching notes found";

//     if (filters?.userEmail && typeof filters.userEmail === "string") {
//       const emailParts = filters.userEmail.split("@");
//       const usernamePart = emailParts[0] || "";
//       message = `No matching notes found ${authorName ? `created by ${authorName}` : `by user ${usernamePart}`}`;
//     }

//     return {
//       success: true,
//       message,
//       data: [],
//     };
//   }

//   // Format results for display
//   const formattedResults = results.map((result) => {
//     const noteId = result.id || result.noteId || "";
//     return {
//       noteId,
//       title: result.note?.title || "Untitled Note",
//       score: result.score || 0,
//       preview: result.note?.content?.substring(0, 150) || "No preview available",
//       url: `/notes/${noteId}`,
//     };
//   });

//   // Enhance message for author searches
//   let message = `Found ${results.length} notes`;
//   if (filters?.userEmail && typeof filters.userEmail === "string") {
//     const emailParts = filters.userEmail.split("@");
//     const usernamePart = emailParts[0] || "";
//     message = `Found ${results.length} notes ${authorName ? `created by ${authorName}` : `by user ${usernamePart}`}`;
//   }

//   return {
//     success: true,
//     message,
//     data: formattedResults,
//   };
// }

// /**
//  * Main search handler - now more modular
//  */
// async function handleSearch(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   try {
//     // Check if this is a summarization request disguised as a search
//     const summarizeKeywords = ["summarize", "summary", "summarization", "recap", "overview", "tldr"];
//     const isSummarizeRequest =
//       intent.query && summarizeKeywords.some((keyword) => intent.query?.toLowerCase().includes(keyword));

//     if (isSummarizeRequest) {
//       // Convert to a summarize intent and handle it
//       const summarizeIntent: ChatIntent = {
//         ...intent,
//         type: "summarize_note",
//         action: "summarize",
//       };
//       return await handleSummarizeNote(summarizeIntent, context);
//     }

//     // STEP 1: Extract author name if present in query
//     const authorName = extractAuthorFromQuery(intent.query);

//     // STEP 2: Handle author search in filters or query
//     // Case 1: Partial name in filters.userEmail (not a valid email)
//     if (intent.filters?.userEmail && !intent.filters.userEmail.includes("@")) {
//       const userFromFilter = await findUserByNameOrEmailPart(intent.filters.userEmail);
//       if (userFromFilter?.email) {
//         // Replace with full email
//         intent.filters.userEmail = userFromFilter.email;
//       } else {
//         // No matching user found - remove invalid filter
//         // Create a new filters object without the userEmail property
//         intent.filters = Object.fromEntries(Object.entries(intent.filters).filter(([key]) => key !== "userEmail"));
//       }
//     }

//     // Case 2: Author name in query but no filter set
//     if (authorName && !intent.filters?.userEmail) {
//       const user = await findUserByNameOrEmailPart(authorName);
//       if (user?.email) {
//         // Update filters with the complete user email
//         intent.filters = {
//           ...intent.filters,
//           userEmail: user.email,
//         };
//       }
//     }

//     // STEP 3: Perform search with appropriate filters
//     let results = await VectorService.semanticSearch({ query: intent.query || "", filters: intent.filters });

//     // STEP 4: Apply post-filtering for access control
//     // We pass:
//     // - The results
//     // - The author email filter (if any) - to filter by specific author's notes
//     // - The current user's email - to apply access control based on permissions
//     results = filterResultsByUserEmail(
//       results,
//       intent.filters?.userEmail,
//       context.userEmail, // Current user's email for access control
//     );

//     // Results have been filtered and are ready for formatting

//     // STEP 5: Format and return results
//     return formatSearchResults(results, intent.filters, authorName);
//   } catch (error) {
//     console.error("Search error:", error);
//     return {
//       success: false,
//       message: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
//     };
//   }
// }

// async function handlePermissionCheck(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   const permissions = PermissionChecker.formatPermissionsSummary(context.userPermissions);
//   return {
//     success: true,
//     message: `Your current permissions:\n${permissions}`,
//     data: context.userPermissions,
//   };
// }

// async function handleVisibilityChange(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   try {
//     console.log("handleVisibilityChange--------------------------------", intent, context, "3---------------------");
//     const resolved = await resolveTargetNoteId(intent, context);
//     if (resolved.disambiguationRequired) {
//       return {
//         success: false,
//         message: "Multiple notes match your request. Please select one:",
//         data: resolved.options?.map((note) => ({
//           noteId: note.id,
//           title: note.title,
//           score: 1, // Default score for disambiguation
//           preview: "",
//           url: `/notes/${note.id}`,
//         })),
//       };
//     }
//     const noteId = resolved.noteId;
//     if (!noteId) {
//       return {
//         success: false,
//         message: "No note specified for visibility change",
//       };
//     }
//     const isPublic = intent.action === "set_public";
//     const isRestricted = intent.isRestrictedPage === true;
//     console.log("isPublic", isPublic, "isRestricted", isRestricted);
//     const note: INote | null = await NoteService.updateIsPublicNote(noteId, isPublic, isRestricted);
//     if (!note) {
//       return {
//         success: false,
//         message: "Failed to change note visibility",
//       };
//     }
//     return {
//       success: true,
//       message: `Note is now ${isPublic ? "public" : "private"}`,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: `Failed to change visibility: ${error.message || error}`,
//     };
//   }
// }

// async function handleDeleteNote(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   try {
//     console.log("handleDeleteNote--------------------------------", intent, context, "3---------------------");
//     // First try to resolve the note if we have a title
//     let noteId = intent.noteId;
//     console.log("noteId in delete handle", noteId);
//     if (!noteId && intent.title) {
//       const resolved = await resolveTargetNoteId(intent, context);
//       if (resolved.disambiguationRequired) {
//         return {
//           success: false,
//           message: "Multiple notes found with this title. Please specify which one to delete:",
//           data: resolved.options?.map((note) => ({
//             noteId: note.id,
//             title: note.title,
//             score: 1,
//             preview: note.path,
//             url: `/notes/${note.id}`,
//           })) as SearchResult[],
//         };
//       }
//       noteId = resolved.noteId;
//     }

//     // If we still don't have a noteId, return error
//     if (!noteId) {
//       return { success: false, message: "No noteId provided for deletion." };
//     }

//     await permanentlyDeleteNote(noteId);

//     return {
//       success: true,
//       message: `Note ${intent.title ? `'${intent.title}' ` : ""}deleted successfully`,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: `Failed to delete note: ${error.message || error}`,
//     };
//   }
// }

// async function getContextualInformation(context: ChatContext): Promise<string> {
//   const info: string[] = [];

//   if (context.userName) {
//     info.push(`User name: ${context.userName}`);
//   }

//   if (context.currentNoteId) {
//     try {
//       const note = await adapterForGetNote(context.currentNoteId, true);
//       info.push(`User is currently viewing note: ${note?.title || context.currentNoteId}`);
//       info.push(`Current path: ${context.currentNotePath}`);

//       if (note) {
//         if (note.isPublic) {
//           info.push("This is a public note");
//         }
//         if (note.isRestrictedPage) {
//           info.push("This is a restricted page");
//         }
//       }
//     } catch (error) {
//       info.push(`User is viewing note ID: ${context.currentNoteId}`);
//       info.push(`Current path: ${context.currentNotePath}`);
//     }
//   }

//   if (context.recentNotes.length > 0) {
//     const recentNoteTitles = await Promise.all(
//       context.recentNotes.slice(0, 3).map(async (noteId) => {
//         try {
//           const note = await adapterForGetNote(noteId, true);
//           return note?.title || noteId;
//         } catch {
//           return noteId;
//         }
//       }),
//     );
//     info.push(`Recent notes: ${recentNoteTitles.join(", ")}`);
//   }

//   if (context.navigationHistory.length > 1) {
//     info.push(`Navigation history: ${context.navigationHistory.slice(0, 5).join(" → ")}`);
//   }

//   return info.join("\n");
// }

// async function handlePublishNote(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   try {
//     const noteId = intent.noteId || context.currentNoteId;
//     if (!noteId) {
//       return {
//         success: false,
//         message: "Could not determine which note to publish.",
//       };
//     }

//     // ✅ Fetch the note from MongoDB
//     const note = await adapterForGetNote(noteId, false);

//     // ✅ Create or update the published version
//     const publishedNote = await NoteService.createOrUpdatePublishedNote(noteId, note);
//     return {
//       success: true,
//       message: `Note "${publishedNote.title}" published successfully.`,
//     };
//   } catch (error) {
//     console.error("Error in publishNote:", error);
//     return {
//       success: false,
//       message: "Server error while publishing the note.",
//     };
//   }
// }

// async function handleEditNote(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   try {
//     if (!intent.noteId) {
//       return { success: false, message: "No noteId provided for edit." };
//     }
//     // Only update fields that are provided
//     let updatedNote: INote | undefined;
//     type IntentWithIcon = ChatIntent & { icon?: string };
//     const intentWithIcon = intent as IntentWithIcon;

//     if (typeof intentWithIcon.icon !== "undefined") {
//       updatedNote = await NoteService.updateNote(
//         intent.noteId,
//         intent.title || "",
//         "System",
//         intent.parentId,
//         intentWithIcon.icon,
//       );
//     } else {
//       updatedNote = await NoteService.updateNote(intent.noteId, intent.title || "", "System", intent.parentId);
//     }
//     return {
//       success: true,
//       message: `Note updated successfully${intent.title ? `: ${intent.title}` : ""}`,
//       data: updatedNote as unknown as Record<string, unknown>,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: `Failed to update note: ${error.message || error}`,
//     };
//   }
// }

// /**
//  * Resolves and enriches note references in an intent before execution
//  */
// async function centralizeNoteContext(
//   intent: ChatIntent,
//   context: ChatContext,
//   previousResults: ChatActionResult[] = [],
// ): Promise<ChatIntent> {
//   try {
//     const enrichedIntent = { ...intent };
//     console.log("INPUT INTENT -------->>>", enrichedIntent);
//     // Case 1: If useCurrentNoteOnly is true, use current context

//     console.log("CHECKING REFS -------->>>");
//     // Case 2: Handle references to previous action results
//     if (typeof enrichedIntent.noteId === "string" && enrichedIntent.noteId.startsWith("$ref:")) {
//       const index = Number.parseInt(enrichedIntent.noteId.match(/\[(\d+)\]/)?.[1] || "0");
//       console.log("REF RESOLUTION -------->>>", {
//         from: enrichedIntent.noteId,
//         resolvedTo: previousResults[index]?.createdNoteId,
//       });
//       const result = previousResults[index];
//       if (result?.createdNoteId) {
//         enrichedIntent.noteId = result.createdNoteId;
//       }
//     }

//     console.log("MONGO CONNECTION -------->>>");
//     // Connect to MongoDB
//     const client = await clientPromise();
//     const db = client.db();
//     const notesCollection = db.collection<INote>("notes");
//     console.log("context.userEmail", context.userEmail);
//     // Get user's MongoDB ID from their email
//     const user = await UserService.findUserByEmail(context.userEmail);
//     if (!user?._id) {
//       throw new Error("User not found");
//     }
//     const userObjectId = user._id;
//     console.log("userObjectId", userObjectId);
//     console.log("USER ID -------->>>", userObjectId);

//     // Case 3: Resolve noteId by referenceNoteTitle if provided
//     if (!enrichedIntent.noteId && enrichedIntent.referenceNoteTitle) {
//       console.log("SEARCHING BY REFERENCE TITLE -------->>>", enrichedIntent.referenceNoteTitle);
//       console.log("SEARCH PARAMS -------->>>", {
//         title: enrichedIntent.referenceNoteTitle,
//         userEmail: context.userEmail,
//         userObjectId: userObjectId.toString(),
//       });
//       const notes = await notesCollection
//         .find({
//           title: enrichedIntent.referenceNoteTitle,
//           $or: [
//             { userId: userObjectId, userEmail: context.userEmail },
//             { sharedWith: { $elemMatch: { email: context.userEmail } } },
//             { isPublicNote: true },
//           ],
//         })
//         .toArray();

//       console.log("QUERY RESULTS -------->>>", {
//         count: notes.length,
//         notes: notes.map((n) => ({
//           id: n._id,
//           title: n.title,
//           userEmail: n.userEmail,
//           sharedWith: n.sharedWith,
//         })),
//       });

//       if (notes.length === 1) {
//         const note = notes[0];
//         if (!note || !note._id) {
//           throw new Error("Invalid note found: missing _id");
//         }
//         enrichedIntent.noteId = note._id.toString();
//         console.log("RESOLVED NOTE ID -------->>>", enrichedIntent.noteId);
//       } else if (notes.length > 1) {
//         throw new Error(
//           `Multiple notes found with title '${enrichedIntent.referenceNoteTitle}'. Please be more specific.`,
//         );
//       }
//     }

//     // Case 4: Handle parentId resolution (for create_note actions)
//     if (enrichedIntent.type === "create_note" && !enrichedIntent.parentId && enrichedIntent.referenceNoteTitle) {
//       console.log("SEARCHING PARENT -------->>>", enrichedIntent.referenceNoteTitle);
//       console.log("PARENT SEARCH PARAMS -------->>>", {
//         title: enrichedIntent.referenceNoteTitle,
//         userEmail: context.userEmail,
//         userObjectId: userObjectId.toString(),
//       });
//       const parentNotes = await notesCollection
//         .find({
//           title: enrichedIntent.referenceNoteTitle,
//           $or: [
//             { userId: userObjectId, userEmail: context.userEmail },
//             { sharedWith: { $elemMatch: { email: context.userEmail } } },
//             { isPublicNote: true },
//           ],
//         })
//         .toArray();

//       console.log(
//         "FOUND PARENTS -------->>>",
//         parentNotes.map((n) => ({ id: n._id, title: n.title })),
//       );
//       console.log("PARENT QUERY RESULTS -------->>>", {
//         count: parentNotes.length,
//         notes: parentNotes.map((n) => ({
//           id: n._id,
//           title: n.title,
//           userEmail: n.userEmail,
//           sharedWith: n.sharedWith,
//         })),
//       });

//       if (parentNotes.length === 1) {
//         const parentNote = parentNotes[0];
//         if (!parentNote || !parentNote._id) {
//           throw new Error("Invalid parent note found: missing _id");
//         }
//         enrichedIntent.parentId = parentNote._id.toString();
//         console.log("RESOLVED PARENT ID -------->>>", enrichedIntent.parentId);
//       } else if (parentNotes.length > 1) {
//         throw new Error(
//           `Multiple potential parent notes found with title '${enrichedIntent.referenceNoteTitle}'. Please be more specific.`,
//         );
//       }
//     }

//     console.log("FINAL INTENT -------->>>", enrichedIntent);
//     return enrichedIntent;
//   } catch (error) {
//     throw new Error(`Failed to resolve note context: ${error.message}`);
//   }
// }

// export { getContextualInformation };
// export { openai };

// export const ChatService = {
//   determineIntent,
// };

// export async function determineIntent(query: string, context: ChatContext): Promise<ChatIntent[]> {
//   try {
//     const response = await openai.chat.completions.create({
//       model: process.env.COMPLETION_MODEL || "gpt-4",
//       temperature: 0.1,
//       messages: [
//         {
//           role: "system",
//           content: getChatIntentSystemPrompt(context),
//         },
//         {
//           role: "user",
//           content: query,
//         },
//       ],
//     });
//     const content = response.choices[0]?.message?.content || "[]";

//     try {
//       const intents = JSON.parse(content) as ChatIntent[];
     

//       return Array.isArray(intents) ? intents : [intents];
//     } catch (e) {
//       // Failed to parse intent JSON
//       return [{ type: "general_query", query }];
//     }
//   } catch (error) {
//     // Error determining intent
//     return [{ type: "general_query", query }];
//   }
// }

// /**
//  * Handle adding content to a note using the generate API
//  * @param intent The chat intent containing note info and content prompt
//  * @param context The user's chat context
//  */
// async function handleAddContent(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   try {
//     // Resolve target note
//     const resolved = await resolveTargetNoteId(intent, context);
//     if (resolved.disambiguationRequired) {
//       return {
//         success: false,
//         message: "Multiple notes match your request. Please select one:",
//         data: resolved.options?.map((note) => ({
//           noteId: note.id,
//           title: note.title,
//           score: 1, // Default score for disambiguation
//           preview: "",
//           url: `/notes/${note.id}`,
//         })),
//       };
//     }

//     // Use either the resolved note ID or the current note ID
//     const noteId = resolved.noteId || context.currentNoteId;
//     if (!noteId) {
//       return {
//         success: false,
//         message: "Could not determine which note to add content to. Please specify a note or navigate to a note first.",
//       };
//     }

//     // Check user has permission to edit the note
//     const note = await adapterForGetNote(noteId, true);
//     if (!note) {
//       return {
//         success: false,
//         message: "The note does not exist or you don't have access to it",
//       };
//     }

//     // Generate AI content using the generate API
//     // We're not making the API call here - we'll return the necessary info
//     // for the front-end to make the call and confirm with the user

//     // Get the prompt from any available field
//     let promptText = intent.prompt || intent.query || intent.chunkText;

//     // If no prompt is found but there's a filter with chunkText, use that
//     if (!promptText && intent.filters?.chunkText) {
//       promptText = intent.filters.chunkText;
//     }

//     // Final fallback to make sure we have some content to generate
//     if (!promptText) {
//       promptText = `Content about ${note.title}`;
//     }

//     return {
//       success: true,
//       message: "Content ready to be added",
//       data: {
//         noteId: noteId,
//         title: note.title || "Untitled Note",
//         prompt: promptText,
//         requiresConfirmation: true,
//       },
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: `Failed to add content: ${error.message || error}`,
//     };
//   }
// }

// export async function executeAction(intent: ChatIntent, context: ChatContext): Promise<ChatActionResult> {
//   if (!context) {
//     return { success: false, message: "Context not available" };
//   }

//   // Check permissions for the action
//   // const permissionCheck = await PermissionChecker.canPerformAction(
//   //   context.userId || "",
//   //   intent.action || "",
//   //   intent.noteId || context.currentNoteId || "",
//   // );
//   // console.log(permissionCheck, "permissionCheck->>>********************");
//   // if (!permissionCheck.allowed) {
//   //   return {
//   //     success: false,
//   //     message: permissionCheck.reason || "Permission denied",
//   //   };
//   // }
//   // console.log(permissionCheck.allowed, "permissionCheck");

//   switch (intent.action) {
//     case "create":
//       return await handleCreateNote(intent, context);

//     // Accept both 'navigate_to' and 'navigate' for backward compatibility
//     case "navigate_to":
//     case "navigate":
//       return await handleNavigation(intent, context);

//     case "search":
//       return await handleSearch(intent, context);

//     case "check_access":
//       return await handlePermissionCheck(intent, context);

//     case "share_note":
//       return await ShareNoteWithPermission(intent, context);
//     // Remove 'grant_access' as it is not in allowed action types

//     case "set_public":
//       return await handleVisibilityChange({ ...intent, isPublic: true }, context);
//     case "set_private":
//       return await handleVisibilityChange({ ...intent, isPublic: false }, context);

//     case "summarize":
//       return await handleSummarizeNote(intent, context);

//     case "delete_note":
//       return await handleDeleteNote(intent, context);

//     case "edit_note":
//       return await handleEditNote(intent, context);

//     case "publish_note":
//       return await handlePublishNote(intent, context);

//     case "add_content":
//       return await handleAddContent(intent, context);

//     default:
//       return { success: true, message: "Action not implemented yet" };
//   }
// }
