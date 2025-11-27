import { NoteService } from "@/services/noteService";
import { getAllVersions } from "@/services/versions/getallversions";
const STORAGE_SYSTEM = process.env.STORAGE_SYSTEM;
export async function adapterForGetAllHistory({
  noteId,
  contentPath,
}: {
  noteId: string;
  contentPath: string;
}) {
  if (STORAGE_SYSTEM === "github") {
    return await NoteService.getHistoryGitHubAwareness({ contentPath: contentPath });
  } else if (STORAGE_SYSTEM === "mongodb") {
    return getAllVersions(noteId);
  }
  throw new Error("Storage system not found");
}   