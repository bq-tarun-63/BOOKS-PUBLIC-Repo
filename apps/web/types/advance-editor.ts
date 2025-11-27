// editor.types.ts
import { JSONContent } from "novel";
import { publishResponse, publishState } from "@/lib/api-helpers";


export interface AdvancedEditorProps {
  editorKey: string;
  shareNoteId?: string | null;
  onShareComplete?: () => void;
}


export interface NoteContent {
  online_content: JSONContent;
  online_content_time: string;
}

export type PendingTitle = {
  newTitle: string;
  parentId: string | null;
  titleIcon: string;
};

export interface NoteResponse {
  id: string;
  icon: string;
  coverUrl?: string | null;
  title: string;
  content: NoteContent;
  userId?: string;
  userEmail?: string;
  isPublic?: number;
  sharedWith?: Array<{ email: string; access: string }>;
  status?: number;
  message?: string;
  error?: string;
  noteId?: string;
  noteTitle?: string;
  [key: string]: unknown;
  isPublish: boolean;
  approvalStatus: publishState;
  githubRawUrl: string;
  updatedAt: string;
  isPublicNote?: boolean;
  parentId?: string;
  workspaceId?: string;
  isRestrictedPage?: boolean;
  noteType?: string;
  commitsha?: string;
  commitPath?: string;
}

export interface ApiError {
  message: string;
  status: number;
  error?: string;
  noteId?: string;
  noteTitle?: string;
}

export type Invite = {
  email: string;
  permission: "read" | "write";
};
