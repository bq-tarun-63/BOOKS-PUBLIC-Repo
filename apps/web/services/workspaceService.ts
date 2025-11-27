import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import type { IWorkspace, IWorkspaceMember } from "@/models/types/Workspace";
import { IUser } from "@/models/types/User";

export const WorkspaceService = {
 
  async updateGroup({
    workspaceId,
    groupId,
    name,
    currentUserId,
    members,
  }: {
    workspaceId: string;
    groupId: string;
    name: string;
    currentUserId: string;
    members: IWorkspaceMember[];
  }) {
    const client = await clientPromise();
    const db = client.db();
    const workspaces = db.collection<IWorkspace>("workspaces");
    const groupIdObj = new ObjectId(groupId);
    const group = await workspaces.findOneAndUpdate(
      { 
        _id: new ObjectId(workspaceId)
      },
      { 
        $set: { 
          "groups.$[group].name": name,
          "groups.$[group].members": members
        } 
      },
      { 
        arrayFilters: [{ "group._id": groupIdObj }],
        returnDocument: "after" 
      }
    );
    return group;
  },
  async createGroup({
    workspaceId,
    name,
    currentUserId,
    members,
  }: {
    workspaceId: string;
    name: string;
    currentUserId: string;
    members: IWorkspaceMember[];
  }) {
    const client = await clientPromise();
    const db = client.db();
    const workspaces = db.collection<IWorkspace>("workspaces");
    
    // First ensure groups array exists
    await workspaces.updateOne(
      { _id: new ObjectId(workspaceId), groups: { $exists: false } },
      { $set: { groups: [] } }
    );
    
    const newGroup = { 
      name, 
      members, 
      createdAt: new Date(), 
      _id: new ObjectId() 
    };
    
    const group = await workspaces.findOneAndUpdate(
      { _id: new ObjectId(workspaceId) },
      { $push: { groups: newGroup } },
      { returnDocument: "after" }
    );
    
    return group;
  },
  async deleteGroup({
    workspaceId,
    groupId,
    currentUserId,
  }: {
    workspaceId: string;
    groupId: string;
    currentUserId: string;
  }) {
    const client = await clientPromise();
    const db = client.db();
    const workspaces = db.collection<IWorkspace>("workspaces");
    const workAreas = db.collection("workAreas");

    // 1. Verify workspace exists and user has permission (owner or admin)
    const workspace = await workspaces.findOne({ _id: new ObjectId(workspaceId) });
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Check authorization
    const isOwner = String(workspace.ownerId) === String(currentUserId);
    const isAdmin = workspace.members?.some(
      (m) => String(m.userId) === String(currentUserId) && 
             (m.role === "admin" || m.role === "owner")
    );

    if (!isOwner && !isAdmin) {
      throw new Error("Not authorized: only workspace owners and admins can delete groups");
    }

    // 2. Verify group exists
    const group = workspace.groups?.find((g) => String(g._id) === groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const groupObjectId = new ObjectId(groupId);

    // 3. Remove group from workspace
    const updatedWorkspace = await workspaces.findOneAndUpdate(
      { _id: new ObjectId(workspaceId) },
      { 
        $pull: { groups: { _id: groupObjectId } },
      },
      { returnDocument: "after" }
    );

    if (!updatedWorkspace) {
      throw new Error("Failed to delete group");
    }

    // 4. Clean up: Remove group access from all workareas that reference this group
    await workAreas.updateMany(
      { 
        workspaceId: new ObjectId(workspaceId),
        "groupAccess.groupId": groupObjectId 
      },
      {
        $pull: { 
          groupAccess: { 
            groupId: groupObjectId 
          } 
        } as any,
        $set: { updatedAt: new Date() }
      }
    );

    return updatedWorkspace; 
  },
  async updateMemberRole({
    workspaceId,
    memberId,
    role,
    currentUserId,
  }: {
    workspaceId: string;
    memberId: string;
    role: "owner" | "admin" | "member";
    currentUserId: string;
  }) {
    const client = await clientPromise();
    const db = client.db();
    const workspaces = db.collection<IWorkspace>("workspaces");

    // If assigning owner, enforce owner-only and perform atomic transfer
    if (role === "owner") {
      const session = client.startSession();
      try {
        let resultDoc: IWorkspace | null = null;
        await session.withTransaction(async () => {
          const ws = await workspaces.findOne({ _id: new ObjectId(workspaceId) }, { session });
          if (!ws) throw new Error("Workspace not found");

          // Only current owner can transfer ownership
          if (String(ws.ownerId) !== String(currentUserId)) {
            throw new Error("Not authorized: only owner can transfer ownership");
          }

          const newOwnerId = new ObjectId(memberId);
          const oldOwnerId = new ObjectId(String(ws.ownerId));

          // Ensure both users exist in members to keep roles consistent
          const memberIds = new Set((ws.members || []).map((m) => String(m.userId)));
          if (!memberIds.has(String(newOwnerId))) {
            throw new Error("New owner must be an existing workspace member");
          }
          if (!memberIds.has(String(oldOwnerId))) {
            throw new Error("Current owner missing from members array (data integrity)");
          }

          // Atomically set ownerId, promote new owner in members, demote old owner to admin
          const res = await workspaces.findOneAndUpdate(
            {
              _id: new ObjectId(workspaceId),
              $and: [
                { members: { $elemMatch: { userId: newOwnerId } } },
                { members: { $elemMatch: { userId: oldOwnerId } } },
              ],
            },
            {
              $set: {
                ownerId: newOwnerId,
                "members.$[newOwner].role": "owner",
                "members.$[oldOwner].role": "admin",
              },
            },
            {
              arrayFilters: [
                { "newOwner.userId": newOwnerId },
                { "oldOwner.userId": oldOwnerId },
              ],
              returnDocument: "after",
              session,
            }
          );
          resultDoc = (res as any)?.value as IWorkspace | null;
          if (!resultDoc) throw new Error("Owner transfer failed");
        });
        if (!resultDoc) throw new Error("Owner transfer failed");
        return resultDoc;
      } finally {
        await session.endSession();
      }
    }

    // For non-owner role changes, allow owner and admins
    // But do not allow admins to modify the current owner's role
    const ws = await workspaces.findOne({ _id: new ObjectId(workspaceId) });
    if (!ws) throw new Error("Workspace not found");
    if (String(ws.ownerId) === String(memberId) && String(ws.ownerId) !== String(currentUserId)) {
      throw new Error("Only owner can change current owner's role");
    }

    const res = await workspaces.findOneAndUpdate(
      {
        _id: new ObjectId(workspaceId),
        $or: [
          { ownerId: new ObjectId(currentUserId) },
          { members: { $elemMatch: { userId: new ObjectId(currentUserId), role: { $in: ["owner", "admin"] } } } },
        ],
        "members.userId": new ObjectId(memberId),
      },
      { $set: { "members.$.role": role } },
      { returnDocument: "after" }
    );
    return res;
  },

  async removeMemberFromWorkspace({
    workspaceId,
    memberId,
    currentUserId,
  }: {
    workspaceId: string;
    memberId: string;
    currentUserId: string;
  }) {
    const client = await clientPromise();
    const db = client.db();
    const workspaces = db.collection<IWorkspace>("workspaces");
    // Block removing the current owner
    const res = await workspaces.findOneAndUpdate(
      {
        _id: new ObjectId(workspaceId),
        $or: [
          { ownerId: new ObjectId(currentUserId) },
          { members: { $elemMatch: { userId: new ObjectId(currentUserId), role: { $in: ["owner", "admin"] } } } },
        ],
        ownerId: { $ne: new ObjectId(memberId) },
      },
      { $pull: { members: { userId: new ObjectId(memberId) } } },
      { returnDocument: "after" }
    );
    // const updatedWorkspace = (res as any)?.value as IWorkspace | null;
    // if (!updatedWorkspace) throw new Error("Workspace not found or member missing, cannot remove owner, or not authorized");
    return res;
  },
  async updateWorkspaceDetails({
    workspaceId,
    name,
    icon,
    allowedDomains,
    displayAnalytics,
    profiles,
    hoverCards,
    currentUserId,
  }: {
    workspaceId: string;
    name: string;
    icon: string;
    allowedDomains: string[];
    displayAnalytics: boolean;
    profiles: boolean;
    hoverCards: boolean;
    currentUserId: string;
  }) {
    const client = await clientPromise();
    const db = client.db();
    const workspaces = db.collection<IWorkspace>("workspaces");
    const updateFields: Partial<IWorkspace> = {
      name,
      icon,
      allowedDomains,
      diplayAnalytics: displayAnalytics,
      Profiles: profiles,
      HoverCards: hoverCards,
    };

  
    const workspace = await workspaces.findOne({ _id: new ObjectId(workspaceId) });
   //check if the current user is an owner or admin
   const isOwner = workspace?.ownerId.toString() === currentUserId;
   const isAdmin = workspace?.members?.some(member => member.userId.toString() === currentUserId && (member.role === "owner" || member.role === "admin"));
   if(!isOwner && !isAdmin){
    throw new Error("You are not authorized to update this workspace");
   }
    const res = await workspaces.findOneAndUpdate(
      {
        _id: new ObjectId(workspaceId),
        $or: [
          { ownerId: new ObjectId(currentUserId) },
          { members: { $elemMatch: { userId: new ObjectId(currentUserId), role: { $in: ["owner", "admin"] } } } },
        ],
      },
      { $set: updateFields },
      { returnDocument: "after" }
    );
   
    return res as IWorkspace | null;
  },
  
  async deleteWorkspace({
    workspaceId,
    currentUserId,
  }: {
    workspaceId: string;
    currentUserId: string;
  }) {
    const client = await clientPromise();
    const db = client.db();
    const workspaces = db.collection<IWorkspace>("workspaces");
    const notesCollection = db.collection("notes");
    const viewDatabasesCollection = db.collection("viewDatabases");
    const  result = await workspaces.deleteOne({
      _id: new ObjectId(workspaceId),
      $or: [
        { ownerId: new ObjectId(currentUserId) },
        { members: { $elemMatch: { userId: new ObjectId(currentUserId), role: { $in: ["owner", "admin"] } } } },
      ],
    });
    //delelete all the notes of the workspace
    const notes = await notesCollection.deleteMany({ workspaceId: new ObjectId(workspaceId) });
    //delete all t
    const viewDatabases = await viewDatabasesCollection.deleteMany({ workspaceId: new ObjectId(workspaceId) });
    if (!result.deletedCount) throw new Error("Workspace not found");
    return result;
  },
  async getWorkspaceById({ workspaceId }: { workspaceId: string }): Promise<IWorkspace | null> {
    const client = await clientPromise();
    const db = client.db();
    const workspaces = db.collection<IWorkspace>("workspaces");
    const workspace = await workspaces.findOne({ _id: new ObjectId(workspaceId) });
    return workspace;
  },
  
  async addMemberToWorkspace({
    workspaceId,
    role,
    membersEmail,
  }: {
    workspaceId: string;
    role: "owner" | "admin" | "member";
    membersEmail: string[];
  }) {
    const client = await clientPromise();
    const db = client.db();
    const workspaces = db.collection<IWorkspace>("workspaces");
    const users = db.collection<IUser>("users");
    const workspace = await workspaces.findOne({ _id: new ObjectId(workspaceId) });
    if (!workspace) throw new Error("Workspace not found");
    
    // Fix N+1 query: Fetch all users in a single query using $in operator
    if (membersEmail.length > 0) {
      const foundUsers = await users.find({ email: { $in: membersEmail } }).toArray();
      const userMap = new Map(foundUsers.map(user => [user.email, user]));
      
      // Create workspace members for all found users
      for (const email of membersEmail) {
        const user = userMap.get(email);
        if (!user) continue;
        const workspaceMember = {
          userId: new ObjectId(user._id),
          userEmail: email,
          userName: user.name || "",
          role,
          joinedAt: new Date()
        };
        workspace.members.push(workspaceMember);
      }
    }
    
    //remove duplicates 
    workspace.members = workspace.members.filter((member, index, self) =>
      index === self.findIndex((t) => t.userEmail === member.userEmail)
    );
    await workspaces.updateOne({ _id: new ObjectId(workspaceId) }, { $set: { members: workspace.members } });
    return workspace;
  },
  async getWorkspacesByDomain({ domain }: { domain: string }) {
    const client = await clientPromise();
    const db = client.db();
    const wsCol = db.collection<IWorkspace>("workspaces");
    const workspaces = await wsCol.find({orgDomain:domain}).toArray();
    return workspaces;
  },
 async createWorkspace({
    name,
    slug,
    orgDomain,
    ownerId,
    ownerEmail,
    user,
    type
  }: {
    name: string;
    slug: string;
    orgDomain: string;
    ownerId: ObjectId;
    ownerEmail: string;
    user,
    type: 'public' | 'private'
  }) {
    const client = await clientPromise();
    const db = client.db();
    const collection = db.collection<IWorkspace>("workspaces");
  
    const now = new Date();
  
    const newWs: IWorkspace = {
      name,
      slug,
      orgDomain,
      createdAt: now,
      ownerId,
  
      members: [
        {
          userId: ownerId,
          userEmail: ownerEmail,
          userName:user.name,
          role: "owner",
          joinedAt: now,
        },
      ],
  
    
      requests: [],
      notifications: [],
      type,
    };
  
    const result = await collection.insertOne(newWs);
    newWs._id = result.insertedId;
  
    return newWs;
  },
  // async addJoinRequest(workspaceId: string, userEmail: string) {
  //   const client = await clientPromise();
  //   const db = client.db();
  //   const wsCol = db.collection<IWorkspace>("workspaces");


  //   const joinRequest = {
  //     userEmail
  //   };
  //   console.log(joinRequest, "joinRequest");
  //   await wsCol.updateOne(
  //     { _id: new ObjectId(workspaceId) },
  //     { $push: { requests: joinRequest } }
  //   );

  //   // notify owner + admins
  //   // await WorkspaceService.notifyOwnerAndAdmins(workspaceId, userId);

  //   return joinRequest;
  // },

  /** Notify owner & admins when a join request is created */
  async notifyOwnerAndAdmins({
    workspaceId,
    userId,
  }: {
    workspaceId: string;
    userId: string;
  }) {
    const client = await clientPromise();
    const db = client.db();
    const wsCol = db.collection<IWorkspace>("workspaces");

    const workspace = await wsCol.findOne({ _id: new ObjectId(workspaceId) });
    if (!workspace) throw new Error("Workspace not found");

    const recipients = [
      workspace.ownerId,
      ...((workspace.members || [])
        .filter((m) => m.role === "admin")
        .map((m) => m.userId)),
    ];

    // Here you’d integrate with your notification/email system
    for (const recipientId of recipients) {
      console.log(
        `Notify ${recipientId} → User ${userId} requested to join workspace ${workspace.name}`
      );
      // Example: await NotificationService.send(...)
    }

    return true;
  }
   
};
