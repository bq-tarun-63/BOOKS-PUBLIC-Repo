
export type SentTo = {
  userId: string;
  read: boolean;
  userName: string;
  userEmail: string;
}

export type CreatedBy =  {
  userName: string;
  userEmail: string;
  userId: string;
}

export interface Notification {
  _id: string;
  createdBy: CreatedBy;
  requesterId: string;
  type: "JOIN" | "MENTION" | "ACCEPT" | "REJECT" | "ASSIGN";
  message: string;
  read : boolean;
  createdAt: string;
  workspaceName: string;
  workspaceId: string;
  noteId: string;
  noteTitle: string;
  readby: [];
  sentTo: SentTo[];
  responsed?: boolean;
}

export interface Notification1{
  workspaceId: string;
  userEmail: string;
  type: "JOIN" | "ACCEPT";
  message: string;
}