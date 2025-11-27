import type { ObjectId } from "mongodb";
export interface IJoinRequest {
  userId: ObjectId;
  userEmail?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}
export interface IWorkspaceNotification {
  notificationId: ObjectId;
  requesterName: string;
  requesterId: ObjectId;
  requesterEmail: string;
  type: string; // e.g., "join-request", "permit-request"
  message: string;
  read: boolean;
  createdAt: Date;
}
export interface IWorkspaceMember {
  userId: ObjectId;
  userEmail: string;
  userName: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
}
export interface IWorkspaceGroup {
  _id?: string | ObjectId;
  id?: string;
  name: string;
  createdAt: Date;
  members: IWorkspaceMember[];
}
export interface IWorkspace {
  _id?: string | ObjectId;
  id?: string;
  name: string;
  slug: string;
  orgDomain: string; // directly store the organization's domain
  createdAt: Date;
  ownerId: ObjectId; // ✅ Workspace owner
  members: IWorkspaceMember[]; // ✅ Accepted members
  requests?: IJoinRequest[]; // ✅ Join requests
  notifications?: IWorkspaceNotification[];
  type: "public" | 'private';
  allowedDomains?: string[];
  icon?: string;
  diplayAnalytics?: boolean;
  Profiles?: boolean;
  HoverCards?: boolean;
  groups?: IWorkspaceGroup[];
}

export class Workspace implements IWorkspace {
  _id?: string | ObjectId;
  id?: string;

  name: string;
  slug: string;
  orgDomain: string;
  createdAt: Date;
  ownerId: ObjectId;
  admins?: string[];
  type: "public" | 'private';
  members: IWorkspaceMember[];
  notifications?: IWorkspaceNotification[];
  requests?: IJoinRequest[];
  constructor(ws: IWorkspace) {
    this._id = ws._id;
    this.id = ws.id;
    this.name = ws.name;
    this.slug = ws.slug;
    this.orgDomain = ws.orgDomain;
    this.createdAt = ws.createdAt || new Date();
    this.ownerId = ws.ownerId;
    this.members = ws.members || [];
    this.requests = ws.requests || [];
    this.notifications = ws.notifications || [];
  }

  static formatWorkspace(ws: IWorkspace): IWorkspace {
    const formattedWs = { ...ws };
    if (ws._id) {
      formattedWs.id = String(ws._id);
    }
    return formattedWs;
  }
}
