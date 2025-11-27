import { NoteService } from "@/services/noteService";
import { permanentlyDeleteNote } from "../deleteNote/permanentlyDeleteNote";

const STORAGE_SYSTEM = process.env.STORAGE_SYSTEM;

export async function adapterForDeleteNote({ noteId }: { noteId: string }) {
  console.log("STORAGE_SYSTEM", STORAGE_SYSTEM);
  if (STORAGE_SYSTEM === "github") {
    const { deletedIds } = await permanentlyDeleteNote(noteId);
    return { deletedIds: deletedIds, success: true };
  } else if (STORAGE_SYSTEM === "mongodb") {
    const { deletedIds } = await NoteService.permanentlyDeleteNoteFromMongoDB({ noteId });
    return { deletedIds: deletedIds, success: true };
  }
  return { success: false };
}

