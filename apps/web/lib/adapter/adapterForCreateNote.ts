import { INote } from "@/models/types/Note";
import { INoteWithContent, NoteService } from "@/services/noteService";
const STORAGE_SYSTEM = process.env.STORAGE_SYSTEM;

export async function adapterForCreateNote({
  noteId,
  title,
  userId,
  userEmail,
  userName,
  parentId,
  icon,
  isPublicNote,
  isRestrictedPage,
  parentNote,
  organizationDomain,
  workspaceId,
  databaseViewId,
  databaseProperties,
  databaseNoteId,
  workAreaId,
  isTemplate = false,
}: {
  noteId: string;
  title: string;
  userId: string;
  userEmail: string;
  userName: string;
  parentId?: string | null;
  icon?: string;
  isPublicNote?: boolean;
  isRestrictedPage?: boolean;
  parentNote?: any;
  organizationDomain?: string;
  workspaceId?: string;
  databaseViewId?: string;
  databaseProperties?: Record<string, any>;
  databaseNoteId?: string;
  workAreaId?: string;
  isTemplate?: boolean;
}): Promise<INoteWithContent | { parent: INoteWithContent; child: INoteWithContent }> {
  if (STORAGE_SYSTEM === "github") {
    const noteWithContent = await NoteService.createNoteinGitHub({
      noteId,
      title,
      userId,
      userEmail,
      userName,
      parentId,
      icon,
      isPublicNote,
      isRestrictedPage,
      parentNote,
      organizationDomain,
      workspaceId,
      databaseViewId,
      databaseProperties,
      databaseNoteId,
      workAreaId,
      isTemplate,
    });
    return noteWithContent;
  } else if (STORAGE_SYSTEM === "mongodb") {
    const noteWithContent = await NoteService.createNoteinMongoDB({
      noteId,
      title,
      userId,
      userEmail,
      userName,
      parentId,
      icon,
      isPublicNote,
      isRestrictedPage,
      parentNote,
      organizationDomain,
      workspaceId,
      databaseViewId,
      databaseProperties,
      databaseNoteId,
      workAreaId,
      isTemplate,
    });
    return noteWithContent;
  }
  throw new Error("Storage system not found");
}
