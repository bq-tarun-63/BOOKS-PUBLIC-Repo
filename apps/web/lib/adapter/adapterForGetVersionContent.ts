import { NoteService } from "@/services/noteService";
import { getVersionContentfromMongoDB } from "@/services/versions/getVersionContent";
const STORAGE_SYSTEM = process.env.STORAGE_SYSTEM;

export async function adapterForGetVersionContent({
  noteId,
  contentPath,
  sha,
  version,
}: {
  noteId: string;
  contentPath?: string;
  sha?: string;
  version?: string;
}) {
  if (STORAGE_SYSTEM === "github") {
    return await NoteService.getVersionContentGitHubAwareness({ noteId, contentPath, sha });
  } else if (STORAGE_SYSTEM === "mongodb") {
    return await getVersionContentfromMongoDB(noteId, version);
  }
  throw new Error("Storage system not found");
}