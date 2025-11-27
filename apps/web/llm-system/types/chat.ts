// import type { NoteMetadata } from "@/services/vectorService";
// export interface ChatContext {
//   currentNoteId?: string;
//   currentNotePath?: string;
//   userEmail: string; // User's email address
//   userId: string; // User's MongoDB ObjectId as string
//   userName?: string; // User's name for personalization
//   userPermissions: UserPermissions;
//   sessionId: string;
//   navigationHistory: string[];
//   recentNotes: string[];
// }

// export interface UserPermissions {
//   canCreate: boolean;
//   canEdit: boolean;
//   canDelete: boolean;
//   canShare: boolean;
//   canManageUsers: boolean;
//   accessLevel: "viewer" | "editor" | "admin" | "owner";
// }

// export interface ChatIntent {
//   type:
//     | "search"
//     | "create_note"
//     | "edit_note"
//     | "delete_note"
//     | "change_visibility"
//     | "navigate"
//     | "check_permissions"
//     | "manage_users"
//     | "general_query"
//     | "summarize_note"
//     | "add_content";
//   action?:
//     | "search"
//     | "create"
//     | "edit_note"
//     | "delete_note"
//     | "set_public"
//     | "set_private"
//     | "check_access"
//     | "list_users"
//     | "revoke_access"
//     | "summarize"
//     | "share_note"
//     | "navigate_to"
//     | "navigate"
//     | "no action needed"
//     | "publish_note"
//     | "add_content";
//   query?: string;
//   title?: string;
//   parentId?: string;
//   isParentIdRequired?: boolean;
//   noteId?: string;
//   targetNoteId?: string;
//   isPublic?: boolean;
//   isRestrictedPage?: boolean;
//   navigationTarget?: string;
//   userEmail?: string;
//   permissionLevel?: "viewer" | "editor" | "admin";
//   context?: ChatContext;
//   shareWith?: Array<{ email: string; permission: "read" | "write" }>;
//   isDirectReference?: boolean;
//   referenceNoteTitle?: string; // If true, use direct noteId/current note. If false, resolve note by title/path.
//   filters?: Partial<NoteMetadata>;
//   prompt?: string; // The prompt to generate content from
//   chunkText?: string; // Alternative field for content generation text
// }

// export interface ChatMessage {
//   role: "system" | "user" | "assistant";
//   content: string;
//   timestamp?: Date;
//   context?: ChatContext;
// }

// export interface ChatActionResult {
//   success: boolean;
//   message: string;
//   data?: SearchResult[] | UserPermissions | Record<string, unknown> | ContentGenerationData;
//   navigationUrl?: string;
//   createdNoteId?: string;
//   noteTitle?: string;
// }

// export interface ContentGenerationData {
//   noteId: string;
//   title: string;
//   prompt: string;
//   requiresConfirmation: boolean;
//   generatedContent?: string;
// }

// export interface SearchResult {
//   noteId: string;
//   title: string;
//   score: number;
//   preview?: string;
//   url: string;
// }
