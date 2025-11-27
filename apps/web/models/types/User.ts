import type { ObjectId } from "mongodb";
export type NoteAccessType = "read" | "write";
export type RequestStatus = "pending" | "accepted" | "rejected";
export interface IWorkspaceNotification {
 
  notificationId: ObjectId;
  requesterName:string;
  requesterId: ObjectId;
  requesterEmail: string;
  type: string;        // e.g., "join-request", "permit-request"
  message: string;
  read: boolean;
  createdAt: Date;

}
export interface IUser {
  _id?: string | ObjectId;
  id?: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  role?: string;

  organizationId?: string; // ✅ Added
  organizationDomain?: string; // ✅ Added
  notifications?: ObjectId[];
  
  joinRequests?: {
    workspaceId: ObjectId;
    status: RequestStatus;
    createdAt: Date;
  }[];
  accessibleNotes?: {
    noteId: ObjectId;
    access: NoteAccessType;
  }[];
}

export class User implements IUser {
  _id?: string | ObjectId;
  id?: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  role?: string;
  notifications?: ObjectId[];
  /** notifications?: {
    notificationId: ObjectId;
    requesterName:string;
    userId: ObjectId;
    type: string;        // e.g., "join-request", "permit-request"
    message: string;
    read: boolean;
    createdAt: Date;
  }[]; */
  
  organizationId?: string; // ✅ Added
  organizationDomain?: string; // ✅ Added
  


  joinRequests?: {
    workspaceId: ObjectId;
    status: RequestStatus;
    createdAt: Date;
  }[];
  
  accessibleNotes?: {
    noteId: ObjectId;
    access: NoteAccessType;
  }[];

  constructor(user: IUser) {
    this._id = user._id;
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.image = user.image;
    this.createdAt = user.createdAt || new Date();
    this.updatedAt = user.updatedAt || new Date();
    this.accessibleNotes = user.accessibleNotes || [];
    this.role = user.role;
    this.organizationId = user.organizationId; // ✅ Added
    this.organizationDomain = user.organizationDomain; // ✅ Added
    this.notifications=user.notifications || [];
  }

  // Convert MongoDB _id to string id for response
  static formatUser(user: IUser): IUser {
    const formattedUser = { ...user };

    if (user._id) {
      formattedUser.id = String(user._id);
    }

    return formattedUser;
  }
}
