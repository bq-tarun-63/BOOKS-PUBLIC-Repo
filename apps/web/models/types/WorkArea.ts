import type { ObjectId } from "mongodb";

/**
 * WorkArea Member Interface
 * Represents a member of a workarea with their role
 */
export interface IWorkAreaMember {
  userId: ObjectId;
  userEmail: string;
  userName: string;
  role: "owner" | "admin" | "member"; // WorkArea-specific roles (simpler than workspace)
  joinedAt: Date;
}

/**
 * Group Access Interface
 * Represents which workspace groups have access to this workarea and their permission level
 */
export interface IWorkAreaGroupAccess {
  groupId: ObjectId; // Reference to workspace group _id
  groupName?: string; // Denormalized for easier queries (can be updated)
  permission: "full" | "edit" | "comment" | "view";
  grantedAt: Date;
  grantedBy: ObjectId; // User who granted this access
}

/**
 * WorkArea Join Request Interface
 * For closed workareas, users can request to join
 */
export interface IWorkAreaJoinRequest {
  userId: ObjectId;
  userEmail: string;
  userName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  reviewedBy?: ObjectId; // User who reviewed the request
  reviewedAt?: Date;
}

/**
 * Main WorkArea Interface
 * Represents a workarea within a workspace (like Books by Betaque 's teamspaces)
 */
export interface IWorkArea {
  _id?: string | ObjectId;
  id?: string;
  
  // Basic Info
  name: string;
  description?: string;
  icon?: string;
  
  // Parent Workspace (required)
  workspaceId: ObjectId; // Parent workspace
  orgDomain: string; // For quick filtering (denormalized from workspace)
  
  // Access Control
  accessLevel: "open" | "closed" | "private" |"default";
  // open: Anyone in workspace can join and view
  // closed: Visible to all, but joining requires invitation
  // private: Only visible and accessible to invited members
  
  // Ownership
  ownerId: ObjectId; // WorkArea owner (usually workspace owner/admin)
  
  // Membership
  members: IWorkAreaMember[]; // WorkArea-specific members
  requests?: IWorkAreaJoinRequest[]; // Join requests (for closed workareas)
  
  // Group Access (references to workspace groups)
  groupAccess?: IWorkAreaGroupAccess[]; // Groups that have access to this workarea
    
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ObjectId; // User who created the workarea
}

/**
 * WorkArea Class Implementation
 * Follows the same pattern as Workspace and Note classes
 */
export class WorkArea implements IWorkArea {
  _id?: string | ObjectId;
  id?: string;
  name: string;
  description?: string;
  icon?: string;
  workspaceId: ObjectId;
  orgDomain: string;
  accessLevel: "open" | "closed" | "private" | "default";
  ownerId: ObjectId;
  members: IWorkAreaMember[];
  requests?: IWorkAreaJoinRequest[];
  groupAccess?: IWorkAreaGroupAccess[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: ObjectId;

  constructor(wa: IWorkArea) {
    this._id = wa._id;
    this.id = wa.id;
    this.name = wa.name;
    this.description = wa.description;
    this.icon = wa.icon;
    this.workspaceId = wa.workspaceId;
    this.orgDomain = wa.orgDomain;
    this.accessLevel = wa.accessLevel;
    this.ownerId = wa.ownerId;
    this.members = wa.members || [];
    this.requests = wa.requests || [];
    this.groupAccess = wa.groupAccess || [];
    this.createdAt = wa.createdAt || new Date();
    this.updatedAt = wa.updatedAt || new Date();
    this.createdBy = wa.createdBy;
  }

  /**
   * Format workarea for API response
   * Converts MongoDB _id to string id
   */
  static formatWorkArea(wa: IWorkArea): IWorkArea {
    const formattedWa = { ...wa };
    if (wa._id) {
      formattedWa.id = String(wa._id);
    }
    return formattedWa;
  }
}

