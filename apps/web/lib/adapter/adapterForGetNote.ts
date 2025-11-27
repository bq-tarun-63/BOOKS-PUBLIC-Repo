import { INoteWithContent, NoteService } from "@/services/noteService";
import { INote } from "@/models/types/Note";

const STORAGE_SYSTEM = process.env.STORAGE_SYSTEM;


export async function adapterForGetNote({
  id,
  includeContent,
  contentPath,
}: {
  id: string;
  includeContent: boolean;
  contentPath?: string;
}): Promise<INoteWithContent> {
  console.log("STORAGE_SYSTEM", STORAGE_SYSTEM);
  if (STORAGE_SYSTEM === "github") {
    return await NoteService.getNoteByIdwithGitHubAwareness({ id, includeContent, contentPath });
  } else if (STORAGE_SYSTEM === "mongodb") {
    return await NoteService.getNoteByIdwithClusterAwareness({ id, includeContent });
  }
  throw new Error("Database not found");
} 
