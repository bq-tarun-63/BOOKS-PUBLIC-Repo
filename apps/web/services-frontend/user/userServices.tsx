import type { NoteResponse } from "@/types/advance-editor";
import type { Workspace } from "@/types/workspace";

// Function to check if current user owns a note
export const isOwner = (noteUserEmail?: string, isRootNote = false, user?: { email?: string } | null) => {
  if (!user) return false;

  // If we have user email, check it directly
  if (noteUserEmail && user.email) {
    return noteUserEmail === user.email;
  }

  // For root notes, if no user information is available, assume the current user owns it
  // This handles cases where newly created notes might not have user info populated yet
  if (!noteUserEmail && isRootNote) return true;

  // For child notes without user info, deny access
  return false;
};

// Function to check if user has write access to a note
export const checkUserWriteAccess = (note: NoteResponse, userId?: string, userEmail?: string): boolean => {
  if (!note || !userEmail) return false;

  if (note.isPublicNote && !note.isRestrictedPage) {
    return true;
  }

  if (note && note.isPublish === true) return false;
  // Check if user is the owner (by email - primary check)
  if (note.userEmail && note.userEmail === userEmail) return true;

  if (note?.sharedWith) {
    // Check if user has write access through sharing (if userId is available)
    // Note: userId might not be available in localStorage, so this is secondary
    const sharedEntry = note.sharedWith.find((entry: { email: string; access: string }) => entry.email === userEmail);
    if (sharedEntry && sharedEntry.access === "write") return true;
  }
  // For notes without userEmail, only allow access if it's a newly created note (no id or content)
  // This prevents access to existing notes that might be missing user info
  if (!note.userEmail) {
    // If the note has content or a proper ID, it's an existing note - be more restrictive
    if (note.content || (note.id && note.id !== "undefined" && note.id !== "notes")) {
      return false;
    }
    // Only allow access for truly new/empty notes
    return true;
  }

  // Check public write access (isPublic === 2 means public read/write)
  if (note.isPublic === 2) return true;

  return false;
};

export const isWorkspaceMember = (workSpace: Workspace, email: string) : boolean => {
  return workSpace.members.some((member) => member.userEmail === email)
}