// import { type NextRequest, NextResponse } from "next/server";
// import { processChat } from "../../../llm-system/processChat";
// import { contextService } from "../../../llm-system/contextService";
// import { getAuthenticatedUser, isAuthError } from "@/lib/utils/auth";

// export async function POST(req: NextRequest) {
//   try {
//     const auth = await getAuthenticatedUser();
//     if (isAuthError(auth)) {
//       return NextResponse.json({ error: auth.error }, { status: auth.status });
//     }
//     const { user, session } = auth;

//     const { query, history, currentNoteId, userEmail, userName } = await req.json();

//     if (!query) {
//       return NextResponse.json({ error: "Query is required" }, { status: 400 });
//     }

//     // Use provided userEmail or session email
//     const email = session?.user?.email || user.email || ""; // Always use session email for security
//     const name = userName || session?.user?.name || user.name || "";
//     // Process chat with context awareness
//     const result = await processChat(query, history || [], email, currentNoteId, { name });

//     // Get updated context for client
//     const updatedContext = contextService.getContext(email);

//     // Merge multiple actions into a single one for the frontend
//     let mergedAction:{
//       success: boolean;
//       message: string;
//       data?: unknown[];
//       navigationUrl?: string;
//       createdNoteId?: string;
//       noteTitle?: string;
//     } | undefined;
//     if (result?.actions?.length > 0) {
//       const allSuccess = result.actions.every(a => a.success);
//       const allData = result.actions.flatMap(a => a.data || []);
//       const combinedMessages = result.actions.map((a, i) => `Action ${i + 1}: ${a.message}`).join("\n");
    
//       mergedAction = {
//         success: allSuccess,
//         message: combinedMessages,
//         data: allData,
//         // If any action has navigationUrl or createdNoteId, handle as needed:
//         navigationUrl: result.actions.find(a => a.navigationUrl)?.navigationUrl,
//         createdNoteId: result.actions.find(a => a.createdNoteId)?.createdNoteId,
//         noteTitle: result.actions.find(a => a.noteTitle)?.noteTitle,
//       };
//     }
    
//     return NextResponse.json({
//       response: result.response,
//       action: mergedAction,
//       context: {
//         currentNoteId: updatedContext?.currentNoteId,
//         currentPath: updatedContext?.currentNotePath,
//         navigationUrl: mergedAction?.navigationUrl,
//         permissions: updatedContext?.userPermissions,
//         userName: name,
//         userEmail: email,
//       },
//     });
//   } catch (error) {
//     console.error("Chat API error:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }
