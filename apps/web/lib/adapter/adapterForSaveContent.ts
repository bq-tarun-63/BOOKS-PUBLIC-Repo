import { NoteService } from "@/services/noteService";
import { INote } from "@/models/types/Note";

const STORAGE_SYSTEM = process.env.STORAGE_SYSTEM;

export async function adapterForSaveContent({
  note,
  fileContent,
  userName,
}: {
  note: INote;
  fileContent: string;
  userName: string;
}): Promise<{ sha: string; updatedAt: Date; success: boolean }> {
  console.log("STORAGE_SYSTEM", STORAGE_SYSTEM);
  if (STORAGE_SYSTEM === "github") {
    const { sha, time } = await NoteService.updateContentGitHubAwareness({ note, content: fileContent, userName });
    return { sha, updatedAt: time, success: true };
  } else if (STORAGE_SYSTEM === "mongodb") {
    const { time } = await NoteService.updateContentMongoDBAwareness({ note, content: fileContent, userName });
    return { sha: "", updatedAt: time, success: true };
  }
  throw new Error("Storage system not found");
}

