import { Members } from "./workspace";

export interface WorkArea {
    _id: string;
    name: string;
    workspaceId: string;
    orgDomain: string;
    accessLevel:  "open" | "closed" | "private";
    ownerId: string;
    members: Members[];
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    groupAccess: WorkAreaGroupAccess[];
    requests: WorkAreaJoinRequest[];
    icon?: string;
    description?: string;
}

export interface WorkAreaJoinRequest {
    userId: string;
    userEmail: string;
    userName: string;
    status: "pending" | "approved" | "rejected";
    createdAt: Date;
    reviewedBy?: string; 
    reviewedAt?: Date;
  }

  export interface WorkAreaGroupAccess {
    groupId: string; 
    groupName?: string; 
    permission: "full" | "edit" | "comment" | "view";
    grantedAt: Date;
    grantedBy: string; 
  }