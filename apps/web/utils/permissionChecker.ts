// import { contextService } from "../llm-system/contextService";
// import type { UserPermissions } from "../llm-system/types/chat";

// export async function canPerformAction(
//   userId: string,
//   action: string,
//   targetNoteId?: string,
// ): Promise<{ allowed: boolean; reason?: string }> {
//   const context = contextService.getContext(userId);
//   if (!context) {
//     return { allowed: false, reason: "User context not found" };
//   }

//   const permissions = context.userPermissions;

//   switch (action) {
//     case "create":
//     case "create_note":
//       // If this is a root level note (no targetNoteId/parentId), allow it regardless of permissions
//       if (!targetNoteId) {
//         return { allowed: true };
//       }

//       // Otherwise use regular permission check for child notes
//       return {
//         allowed: permissions.canCreate,
//         reason: permissions.canCreate ? undefined : "You do not have permission to create notes",
//       };

//     case "edit_note":
//       if (targetNoteId) {
//         // Re-check permissions for specific note
//         const updatedContext = await contextService.initializeContext(userId, targetNoteId);
//         return {
//           allowed: updatedContext.userPermissions.canEdit,
//           reason: updatedContext.userPermissions.canEdit ? undefined : "You do not have permission to edit this note",
//         };
//       }
//       return {
//         allowed: permissions.canEdit,
//         reason: permissions.canEdit ? undefined : "You do not have permission to edit notes",
//       };

//     case "delete_note":
//       return {
//         allowed: permissions.canDelete,
//         reason: permissions.canDelete ? undefined : "You do not have permission to delete notes",
//       };

//     case "share_note":
//       return {
//         allowed: permissions.canShare,
//         reason: permissions.canShare ? undefined : "You do not have permission to share notes",
//       };

//     case "manage_users":
//       return {
//         allowed: permissions.canManageUsers,
//         reason: permissions.canManageUsers ? undefined : "You do not have permission to manage users",
//       };

//     default:
//       return { allowed: true };
//   }
// }

// export async function getUserAccessLevel(userId: string, noteId?: string): Promise<string> {
//   const context = contextService.getContext(userId);
//   if (!context) return "none";

//   if (noteId && noteId !== context.currentNoteId) {
//     const updatedContext = await contextService.initializeContext(userId, noteId);
//     return updatedContext.userPermissions.accessLevel;
//   }

//   return context.userPermissions.accessLevel;
// }

// export function formatPermissionsSummary(permissions: UserPermissions): string {
//   const actions: string[] = [];
//   if (permissions.canCreate) actions.push("create notes");
//   if (permissions.canEdit) actions.push("edit notes");
//   if (permissions.canDelete) actions.push("delete notes");
//   if (permissions.canShare) actions.push("share notes");
//   if (permissions.canManageUsers) actions.push("manage users");

//   return `Access Level: ${permissions.accessLevel}\nPermissions: ${actions.join(", ") || "view only"}`;
// }

// // Export as an object for backwards compatibility
// export const PermissionChecker = {
//   canPerformAction,
//   getUserAccessLevel,
//   formatPermissionsSummary,
// };
