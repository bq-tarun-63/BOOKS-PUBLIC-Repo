import { ObjectId } from "mongodb";

export type NotificationType =
  | "JOIN"
  | "MENTION"
  | "SHARE"
  | "ACCEPT"
  | "REJECT"
  | "ASSIGN"
  | "WORKAREA_ACCESS_GRANTED"
  | "WORKAREA_JOIN_REQUEST";

export interface SentToUser {
  userId: ObjectId;
  userName: string;
  userEmail: string;
  read: boolean;        // null/undefined = unread
  deliveredAt?: Date;   // optional
}

export interface CreatedByUser {
  userId: ObjectId;
  userName: string;
  userEmail: string;
}

export interface INotification {
  _id?: ObjectId;
  workspaceId?: ObjectId;
  workspaceName?: string;
  type: NotificationType;
  createdBy: CreatedByUser;   // one actor per notification (array not needed)
  sentTo: SentToUser[];       // who can see it
  // lightweight, optional context for links/refs
  responsed?: Boolean;
  context?: {
    noteId?: ObjectId;
    noteTitle?: string;
    inviteId?: ObjectId;
  };
  createdAt: Date;
  updatedAt?: Date;
  archivedAt?: Date;
  noteId? : string | ObjectId;
  noteTitle? : string;
}
