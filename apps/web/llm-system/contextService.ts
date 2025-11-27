// import type { INote } from "../models/types/Note";
// import type { IUser } from "../models/types/User";
// import type { ChatContext, UserPermissions } from "./types/chat";
// import { NoteService } from "../services/noteService";
// import { UserService } from "../services/userService";
// import { adapterForGetNote } from "@/lib/adapter/adapterForGetNote"

// /**
//  * Checks if a user has access to a specific note
//  * @param note - The note to check access for
//  * @param user - The user requesting access
//  * @param userEmail - The email of the user
//  * @returns boolean indicating whether user has access
//  */

// function checkGptAccess({
//   note,
//   user,
//   userEmail,
// }: {
//   note: INote;
//   user: IUser;
//   userEmail?: string | null;
// }): boolean {
//   // If no user email or note doesn't have an owner email, deny access
//   if (!userEmail || !note) return false;

//   // User is the creator of the note
//   if (note.userEmail === userEmail) return true;

//   // Note is public - checking different variations
//   // Check for numeric status (0 | 1 | 2)
//   if (typeof note.isPublic === "number" && note.isPublic === 1) return true;
//   // Check for boolean status
//   if (typeof note.isPublic === "boolean" && note.isPublic === true) return true;
//   // Check for isPublicNote flag
//   if (note.isPublicNote === true) return true;

//   // Note is shared with user
//   if (note.sharedWith && Array.isArray(note.sharedWith)) {
//     const isSharedWithUser = note.sharedWith.some((share) => share.email === userEmail);
//     if (isSharedWithUser) return true;
//   }

//   return false;
// }

// class ContextService {
//   private userSessions = new Map<string, ChatContext>();

//   async initializeContext(userId: string, currentNoteId?: string, userName?: string): Promise<ChatContext> {
//     // If userId is an email, use findUserByEmail; otherwise, you need a findUserById method in UserService
//     const user = await UserService.findUserByEmail(userId);
//     if (!user) {
//       throw new Error("User not found");
//     }
//     if (!user._id) {
//       throw new Error("User ID not found");
//     }

//     // Get user permissions
//     const permissions = await this.getUserPermissions(userId, currentNoteId);

//     // Get navigation history from session or initialize
//     const existingContext = this.userSessions.get(userId);
//     const navigationHistory = existingContext?.navigationHistory || [];
//     const recentNotes = existingContext?.recentNotes || [];

//     // Add current note to history if provided
//     if (currentNoteId && !navigationHistory.includes(currentNoteId)) {
//       navigationHistory.unshift(currentNoteId);
//       if (navigationHistory.length > 10) navigationHistory.pop();
//     }

//     const context: ChatContext = {
//       currentNoteId,
//       currentNotePath: currentNoteId ? await this.getNotePath(currentNoteId) : undefined,
//       userEmail: userId, // userId parameter is actually email
//       userId: user._id.toString(), // Store the actual MongoDB ObjectId as string
//       userName: userName || user.name || existingContext?.userName,
//       userPermissions: permissions,
//       sessionId: this.generateSessionId(),
//       navigationHistory,
//       recentNotes,
//     };

//     this.userSessions.set(userId, context);
//     return context;
//   }

//   async updateContext(userId: string, updates: Partial<ChatContext>): Promise<ChatContext> {
//     const existingContext = this.userSessions.get(userId);
//     if (!existingContext) {
//       throw new Error("Context not initialized");
//     }

//     const updatedContext = { ...existingContext, ...updates };

//     // Update navigation history if note changed
//     if (updates.currentNoteId && updates.currentNoteId !== existingContext.currentNoteId) {
//       updatedContext.navigationHistory = [updates.currentNoteId, ...existingContext.navigationHistory.slice(0, 9)];
//       updatedContext.currentNotePath = await this.getNotePath(updates.currentNoteId);
//     }

//     this.userSessions.set(userId, updatedContext);
//     return updatedContext;
//   }

//   getContext(userId: string): ChatContext | undefined {
//     return this.userSessions.get(userId);
//   }

//   private async getUserPermissions(userId: string, noteId?: string): Promise<UserPermissions> {
//     try {
//       // Check if user is admin/owner
//       const user = await UserService.findUserByEmail(userId);
//       const isAdmin = user?.role === "admin" || user?.role === "owner";

//       // Default permissions - authenticated user gets editor access to their own content
//       let notePermissions: UserPermissions = {
//         canCreate: true, // All users can create root notes
//         canEdit: true,
//         canDelete: true, // Users should be able to delete their own content
//         canShare: true,
//         canManageUsers: isAdmin,
//         accessLevel: "editor", // Default to editor for authenticated users
//       };

//       // If accessing a specific note, check permissions for that note
//       if (noteId) {
//         try {
//           const note = await adapterForGetNote(noteId, false);
//           if (!note) {
//             throw new Error("Note not found");
//           }

//           // Check access - owner, shared with, or public
//           const hasAccess = user
//             ? checkGptAccess({
//                 note,
//                 user,
//                 userEmail: user?.email,
//               })
//             : false;

//           // User is owner of the note
//           const isOwner =
//             note.userEmail === user?.email ||
//             (note.userId && user?._id && note.userId.toString() === user._id.toString());

//           // If user is not owner, adjust permissions
//           if (!isOwner) {
//             // For shared/public notes, provide appropriate permissions
//             notePermissions = {
//               canCreate: true, // Can still create notes
//               canEdit:
//                 hasAccess &&
//                 note.sharedWith &&
//                 Array.isArray(note.sharedWith) &&
//                 note.sharedWith.some((s) => s.email === user?.email && s.access === "write"),
//               canDelete: false, // Only owner can delete
//               canShare: false, // Only owner can share
//               canManageUsers: isAdmin,
//               accessLevel: hasAccess ? "editor" : "viewer", // Based on access level
//             };
//           }

//           // Final permissions considering admin status
//           notePermissions = {
//             canCreate: notePermissions.canCreate || isAdmin,
//             canEdit: notePermissions.canEdit || isAdmin,
//             canDelete: (isOwner || isAdmin) && notePermissions.canDelete,
//             canShare: (isOwner || isAdmin) && notePermissions.canShare,
//             canManageUsers: isAdmin,
//             accessLevel: this.determineAccessLevel(
//               {
//                 canDelete: notePermissions.canDelete,
//                 canEdit: notePermissions.canEdit,
//                 isOwner: isOwner || false,
//               },
//               isAdmin,
//             ),
//           };
//         } catch (noteError) {
//           console.error("Error getting note for permission check:", noteError);
//           // Don't change default permissions if note not found
//         }
//       }

//       return notePermissions;
//     } catch (error) {
//       console.error("Error getting user permissions:", error);
//       // As a fallback, provide basic permissions for authenticated users
//       return {
//         canCreate: true, // Still allow creation even if there was an error
//         canEdit: false,
//         canDelete: false,
//         canShare: false,
//         canManageUsers: false,
//         accessLevel: "editor", // Default to editor instead of viewer
//       };
//     }
//   }

//   private determineAccessLevel(
//     noteAccess: { canDelete: boolean; canEdit: boolean; isOwner?: boolean },
//     isAdmin: boolean,
//   ): "viewer" | "editor" | "admin" | "owner" {
//     if (isAdmin) return "admin";
//     if (noteAccess.isOwner || noteAccess.canDelete) return "owner";
//     if (noteAccess.canEdit) return "editor";
//     return "editor"; // Default to editor instead of viewer
//   }

//   private async getNotePath(noteId: string): Promise<string> {
//     try {
//       const note = await adapterForGetNote(noteId, true);
//       if (!note) return "/";

//       const pathParts: string[] = [];
//       let currentNote = note;

//       while (currentNote) {
//         pathParts.unshift(currentNote.title || "Untitled");
//         if (currentNote.parentId) {
//           currentNote = await adapterForGetNote(currentNote.parentId, true);
//         } else {
//           break;
//         }
//       }

//       return `/${pathParts.join("/")}`;
//     } catch (error) {
//       console.error("Error getting note path:", error);
//       return "/";
//     }
//   }

//   private generateSessionId(): string {
//     return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//   }

//   async addToRecentNotes(userEmail: string, noteId: string): Promise<void> {
//     const context = this.userSessions.get(userEmail);
//     if (context) {
//       const recentNotes = [noteId, ...context.recentNotes.filter((id) => id !== noteId)].slice(0, 5);
//       await this.updateContext(userEmail, { recentNotes });
//     }
//   }
// }

// export const contextService = new ContextService();