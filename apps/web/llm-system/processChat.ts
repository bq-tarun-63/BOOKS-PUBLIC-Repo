// import type { ChatActionResult, ChatMessage } from "./types/chat";
// import * as PermissionChecker from "../utils/permissionChecker";
// import {
//   determineIntent,
//   executeAction,
//   getContextualInformation,
// } from "./chatService";
// import { openai } from "./chatService";
// import { contextService } from "./contextService";
// import { getActionResultsSystemPrompt } from "@/llm-system/llm-training-data/resultant-trainingData";
// export async function processChat(
//   query: string,
//   history: ChatMessage[],
//   userEmail: string,
//   currentNoteId?: string,
//   userInfo?: { name?: string; [key: string]: unknown },
// ): Promise<{ response: string; actions: ChatActionResult[] }> {
//   try {
//     // Initialize or get context

//     const context = await contextService.initializeContext(
//       userEmail,
//       currentNoteId,
//       userInfo?.name,
//     );

//     // Add user info to context if provided
//     if (userInfo) {
//       context.userName = userInfo.name || context.userName;
//     }

//     // Determine intent with context
//     const intents = await determineIntent(query, context);

//     // Execute action if needed
//     const results: ChatActionResult[] = [];
//     for (const intent of intents) {
//       const result = await executeAction(intent, context);

//       results.push(result);
//       // Optionally: handle noteRef/result injection here
//     }

//     // Get context for response (including recent notes, current location, etc.)
//     const contextInfo = await getContextualInformation(context);

//     // Generate response with full context
//     // Compose a summary message from all results with full content for summaries
//     const summary = results
//       .map((r, i) => {
//         // For summarize_note actions, include the actual summary content
//         if (r.data && typeof r.data === "object" && "summary" in r.data) {
//           return `Action ${i + 1}: ${r.message}\n\n${r.data.summary}`;
//         }
//         return `Action ${i + 1}: ${r.message}`;
//       })
//       .join("\n\n");
   
//     const messages: ChatMessage[] = [
//       {
//         role: "system",
//         content: getActionResultsSystemPrompt({context,  summary,contextInfo}),
//       },
//       ...history.slice(-5),
//       { role: "user", content: query },
//     ];

//     const response = await openai.chat.completions.create({
//       model: process.env.CHAT_MODEL || "gpt-4",
//       messages,
//       temperature: 0.1,
//     });

//     const assistantResponse =
//       response.choices[0]?.message?.content ||
//       "I couldn't process your request.";

//     return {
//       response: assistantResponse,
//       actions: results,
//     };
//   } catch (error) {
//     console.error("Error in processChat:", error);
//     return {
//       response:
//         "I encountered an error processing your request. Please try again.",
//       actions: [],
//     };
//   }
// }
