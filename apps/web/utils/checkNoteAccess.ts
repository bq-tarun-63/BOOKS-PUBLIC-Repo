// utils/checkNoteAccess.ts

import type { ObjectId } from "mongodb"; // or mongoose if you're using it
import { UserService } from "@/services/userService";
import type { NoteAccessType } from "@/models/types/User"; // Adjust path as needed

export function checkNoteAccess({
  note,
  userId,
  requiredAccess, // "read" or "write"
  accessibleNotes = [],
 
}: {
  note: any;
  userId?: string;
  requiredAccess: "read" | "write";
  accessibleNotes?: {
    noteId: ObjectId;
    access: NoteAccessType;
  
  }[];
  
}): boolean {
  const userEmail=userId as string;
  const user =  UserService.findUserByEmail({ email: userEmail });
  const isOwner = userId && note.userId.toString() === userId.toString();
  // Owner always has full access
  if (isOwner) return true;

  // Handle public access

  if(note.isPublicNote== true)return true;
  // Check accessibleNotes array if provided

  // Fallback to sharedWith in note
  
  if (userEmail && note.sharedWith) {
    const shared = note.sharedWith.find((entry: any) => entry.email.toString() === userEmail.toString());
   
    if (!shared) return false;
  
    if (shared.access === "write") return true;
    if (shared.access === "read" && requiredAccess === "read") return true;
  }

  if (userId && accessibleNotes.length > 0) {
    const entry = accessibleNotes.find((a) => a.noteId.toString() === note._id.toString());
    if (entry) {
      if (entry.access === "write") return true;
      if (entry.access === "read" && requiredAccess === "read") return true;
    }
  }

  // Otherwise deny
  return false;
}
