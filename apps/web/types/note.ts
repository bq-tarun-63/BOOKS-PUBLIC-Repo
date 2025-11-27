export interface Node {
    id: string;
    title: string;
    parentId: string | null;
    gitPath?: string;
    contentPath?: string;
    commitSha: string;
    createdAt: string;
    updatedAt: string;
    content?: string;
    icon?: string;
    children: { _id: string; title: string; icon?: string; userId?: string; userEmail?: string }[];
    userId?: string;
    userEmail?: string;
    isPublish?: boolean;
    approvalStatus: string;
    isPublicNote: boolean;
    isRestrictedPage: boolean;
    noteType: string;
    isTemplate?: boolean;
    workAreaId: string;
  }

  export interface Chat {
    chatId: string;
    commenterName: string;
    commenterEmail: string;
    text: string;
    createdAt: string;
    updatedAt: string;
    commentId?: string;
    mediaMetaData?: Array<{
      id: string;
      name: string;
      url: string;
      size?: number;
      mimeType?: string;
      uploadedAt?: string;
    }>;
  }

  export interface InlineComment {
    _id: string;
    type: "inline" | "note";
    noteId: string;
    chats: Chat[];
  }

  export interface InlineCommentResponse {
    message: string;
    comment: InlineComment;
  }
