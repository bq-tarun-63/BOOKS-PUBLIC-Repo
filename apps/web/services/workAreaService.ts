import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import { IWorkArea, IWorkAreaGroupAccess, IWorkAreaMember, IWorkAreaJoinRequest } from "@/models/types/WorkArea";
import type { IWorkspace } from "@/models/types/Workspace";
import type { IUser } from "@/models/types/User";
import { addNotification, NotificationService } from "./notificationServices";

export const WorkAreaService = {
    async getAllWorkAreas({ workspaceId }: { workspaceId: ObjectId | string }) {
        const client = await clientPromise();
        const db = client.db();
        const workAreasCollection = db.collection<IWorkArea>("workAreas");
        
        // Query by both ObjectId and string to handle both cases
        // Some work areas may have workspaceId stored as string, others as ObjectId
        const workspaceIdString = String(workspaceId);
        
        // Use type assertion to allow querying by string (since some documents have string workspaceId)
        const workAreas = await workAreasCollection.find({
            $or: [
                { workspaceId: workspaceId },
                { workspaceId: workspaceIdString as any },
                { workspaceId: new ObjectId(workspaceIdString) as any }
            ]
        } as any).toArray();
        
        return workAreas;
    },
    async createWorkArea({
        name,
        description,
        icon,
        workspaceId,
        orgDomain,
        ownerId,
        ownerEmail,
        user,
        accessLevel = "open"
    }: {
        name: string;
        description?: string;
        icon?: string;
        workspaceId: ObjectId;
        orgDomain: string;
        ownerId: ObjectId;
        ownerEmail: string;
        user: any;
        accessLevel?: "open" | "closed" | "private" | "default";
    }) {
        const client = await clientPromise();
        const db = client.db();
        const collection = db.collection<IWorkArea>("workAreas");
        
        const now = new Date();
        
        const newWorkArea: IWorkArea = {
            name,
            description,
            icon,
            workspaceId,
            orgDomain: orgDomain.toLowerCase(),
            accessLevel,
            ownerId,
            members: [
                {
                    userId: ownerId,
                    userEmail: ownerEmail,
                    userName: user.name || "",
                    role: "owner",
                    joinedAt: now,
                },
            ],
            requests: [],
            groupAccess: [],
            createdAt: now,
            updatedAt: now,
            createdBy: ownerId,
        };
        if(accessLevel === "default"){
            const workspacesCollection = db.collection<IWorkspace>("workspaces");
            const workspace = await workspacesCollection.findOne({ _id: workspaceId });
            if (!workspace) {
                throw new Error("Workspace not found");
            }
            newWorkArea.members = workspace.members;
        }
        const result = await collection.insertOne(newWorkArea);
        
        newWorkArea._id = result.insertedId;
        return newWorkArea;
    },

    async giveGroupAccessToWorkArea({
        workAreaId,
        groupId,
        permission,
        currentUserId
    }: {
        workAreaId: string;
        groupId: string;
        permission: "full" | "edit" | "comment" | "view";
        currentUserId: string;
    }) {
        const client = await clientPromise();
        const db = client.db();
        const workAreasCollection = db.collection<IWorkArea>("workAreas");
        const workspacesCollection = db.collection<IWorkspace>("workspaces");

        const workAreaObjectId = new ObjectId(workAreaId);
        const groupObjectId = new ObjectId(groupId);
        const currentUserObjectId = new ObjectId(currentUserId);

        // 1. Get the workarea
        const workArea = await workAreasCollection.findOne({ _id: workAreaObjectId });
        if (!workArea) {
            throw new Error("WorkArea not found");
        }

        // 2. Verify user has permission to grant access (must be workarea owner or workspace admin/owner)
        const hasPermission = 
            String(workArea.ownerId) === String(currentUserId) ||
            (await WorkAreaService.userCanManageWorkArea({
                workspaceId: workArea.workspaceId,
                userId: currentUserId,
            }));

        if (!hasPermission) {
            throw new Error("Not authorized to grant group access to this workarea");
        }

        // 3. Verify the group exists in the workspace
        const workspace = await workspacesCollection.findOne({ _id: workArea.workspaceId });
        if (!workspace) {
            throw new Error("Workspace not found");
        }

        const group = workspace.groups?.find(
            (g) => String(g._id) === String(groupObjectId)
        );

        if (!group) {
            throw new Error("Group not found in workspace");
        }

        // 4. Check if group already has access
        const existingGroupAccess = workArea.groupAccess?.find(
            (ga) => String(ga.groupId) === String(groupObjectId)
        );

        const newGroupAccess: IWorkAreaGroupAccess = {
            groupId: groupObjectId,
            groupName: group.name,
            permission,
            grantedAt: new Date(),
            grantedBy: currentUserObjectId,
        };

        let updatedWorkArea: IWorkArea;

        if (existingGroupAccess) {
            // Update existing access
            updatedWorkArea = (await workAreasCollection.findOneAndUpdate(
                {
                    _id: workAreaObjectId,
                    "groupAccess.groupId": groupObjectId,
                },
                {
                    $set: {
                        "groupAccess.$[group].permission": permission,
                        "groupAccess.$[group].grantedAt": new Date(),
                        "groupAccess.$[group].grantedBy": currentUserObjectId,
                        "groupAccess.$[group].groupName": group.name,
                        updatedAt: new Date(),
                    },
                },
                {
                    arrayFilters: [{ "group.groupId": groupObjectId }],
                    returnDocument: "after",
                }
            )) as any;

            if (!updatedWorkArea) {
                throw new Error("Failed to update group access");
            }
        } else {
            // Add new group access
            updatedWorkArea = (await workAreasCollection.findOneAndUpdate(
                { _id: workAreaObjectId },
                {
                    $push: { groupAccess: newGroupAccess },
                    $set: { updatedAt: new Date() },
                },
                { returnDocument: "after" }
            )) as any;

            if (!updatedWorkArea ) {
                throw new Error("Failed to add group access");
            }
            
        }
        const usersCollection = db.collection<IUser>("users");
        // Get current user info for createdBy
        const currentUser = await usersCollection.findOne({ _id: currentUserObjectId });
        if (!currentUser) {
            throw new Error("Current user not found");
        }
        
        //WE WANT TO GIVE NOTIFICATION TO ALL THE GROUP MEMBERS THAT THEY HAVE BEEN GRANTED ACCESS TO THE WORKAREA
        // Fix N+1 query: Batch all recipients into a single notification call
        const groupMembers = group.members;
        if (groupMembers && groupMembers.length > 0) {
            const notificationId = new ObjectId().toString();
            await addNotification({
                notificationId,
                workspaceId: workArea.workspaceId,
                type: "WORKAREA_ACCESS_GRANTED",
                message: "You have been granted access to the workarea",
                createdBy: {
                    userId: currentUserObjectId,
                    userName: currentUser.name || "",
                    userEmail: currentUser.email || "",
                },
                recipients: groupMembers.map(member => ({
                    userId: member.userId,
                    userName: member.userName,
                    userEmail: member.userEmail,
                    read: false,
                })),
            });
        }
        return updatedWorkArea;
    },

    async userCanManageWorkArea({
        workspaceId,
        userId,
    }: {
        workspaceId: ObjectId | string;
        userId: string;
    }): Promise<boolean> {
        const client = await clientPromise();
        const db = client.db();
        const workspacesCollection = db.collection<IWorkspace>("workspaces");

        const workspace = await workspacesCollection.findOne({ _id: workspaceId });
        if (!workspace) return false;

        // Check if user is workspace owner
        if (String(workspace.ownerId) === String(userId)) {
            return true;
        }

        // Check if user is workspace admin
        const isAdmin = workspace.members?.some(
            (member) =>
                String(member.userId) === String(userId) &&
                (member.role === "admin" || member.role === "owner")
        );

        return isAdmin || false;
    },

    async addPeopleToWorkArea({
        workAreaId,
        memberEmails,
        currentUserId,
        role = "member"
    }: {
        workAreaId: string;
        memberEmails: string[];
        currentUserId: string;
        role?: "owner" | "member";
    }) {
        const client = await clientPromise();
        const db = client.db();
        const workAreasCollection = db.collection<IWorkArea>("workAreas");
        const usersCollection = db.collection<IUser>("users");

        const workAreaObjectId = new ObjectId(workAreaId);

        // 1. Get the workarea
        const workArea = await workAreasCollection.findOne({ _id: workAreaObjectId });
        if (!workArea) {
            throw new Error("WorkArea not found");
        }

        // 2. Verify user has permission (must be workarea owner or workspace admin/owner)
        const hasPermission = 
            String(workArea.ownerId) === String(currentUserId) ||
            (await WorkAreaService.userCanManageWorkArea({
                workspaceId: workArea.workspaceId,
                userId: currentUserId,
            }));

        if (!hasPermission) {
            throw new Error("Not authorized to add people to this workarea");
        }

        // 3. Validate memberEmails array
        if (!memberEmails || memberEmails.length === 0) {
            throw new Error("At least one member email is required");
        }

        // 4. Find or create users for each email and prepare members
        const newMembers: IWorkAreaMember[] = [];
        const now = new Date();

        // Fix N+1 query: Fetch all users in a single query using $in operator
        const normalizedEmails = memberEmails
            .map(email => email.toLowerCase().trim())
            .filter(email => email.length > 0);
        
        if (normalizedEmails.length > 0) {
            const foundUsers = await usersCollection.find({ email: { $in: normalizedEmails } }).toArray();
            const userMap = new Map(foundUsers.map(user => [user.email.toLowerCase(), user]));
            
            for (const email of normalizedEmails) {
                const user = userMap.get(email);
                
                // If user doesn't exist, skip (or create them - depends on your business logic)
                // For now, we'll skip users that don't exist
                if (!user) {
                    console.warn(`User with email ${email} not found, skipping`);
                    continue;
                }

                // Check if user is already a member
                const isAlreadyMember = workArea.members?.some(
                    (m) => String(m.userId) === String(user._id)
                );

                if (isAlreadyMember) {
                    console.warn(`User ${email} is already a member, skipping`);
                    continue;
                }

                // Check if user is in the workspace (they should be a workspace member to join workarea)
                // This validation can be added if needed

                newMembers.push({
                    userId: new ObjectId(user._id),
                    userEmail: email,
                    userName: user.name || "",
                    role: role,
                    joinedAt: now,
                });
            }
        }

        if (newMembers.length === 0) {
            throw new Error("No valid new members to add. Users may already be members or not found.");
        }

        // 5. Add members to workarea
        const updatedWorkArea = await workAreasCollection.findOneAndUpdate(
            { _id: workAreaObjectId },
            {
                $push: { 
                    members: { 
                        $each: newMembers 
                    } 
                },
                $set: { updatedAt: new Date() }
            },
            { returnDocument: "after" }
        );

        if (!updatedWorkArea) {
            throw new Error("Failed to add members to workarea");
        }

        return updatedWorkArea ;
    },

    async updateWorkArea({
        workAreaId,
        name,
        description,
        icon,
        accessLevel
    }: {
        workAreaId: ObjectId;
        name?: string;
        description?: string;
        icon?: string;
        accessLevel?: "open" | "closed" | "private";
    }) {
        const client = await clientPromise();
        const db = client.db();
        const workAreasCollection = db.collection<IWorkArea>("workAreas");

        const workAreaObjectId = workAreaId instanceof ObjectId ? workAreaId : new ObjectId(workAreaId);

        // Build update object with only provided fields
        const updateFields: Partial<IWorkArea> = {
            updatedAt: new Date(),
        };

        if (name !== undefined) {
            updateFields.name = name;
        }
        if (description !== undefined) {
            updateFields.description = description;
        }
        if (icon !== undefined) {
            updateFields.icon = icon;
        }
        if (accessLevel !== undefined) {
            updateFields.accessLevel = accessLevel;
        }

        console.log("Update fields:", updateFields);

        // Update the work area
        const updatedWorkArea = await workAreasCollection.findOneAndUpdate(
            { _id: workAreaObjectId },
            { $set: updateFields },
            { returnDocument: "after" }
        );

        if (!updatedWorkArea ) {
            throw new Error("Failed to update work area");
        }

        console.log("Updated work area:", updatedWorkArea);

        return updatedWorkArea;
    },

    async removePeopleFromWorkArea({
        workAreaId,
        memberEmails,
        currentUserId
    }: {
        workAreaId: string;
        memberEmails: string[];
        currentUserId: string;
    }) {
        const client = await clientPromise();
        const db = client.db();
        const workAreasCollection = db.collection<IWorkArea>("workAreas");
        const usersCollection = db.collection<IUser>("users");

        const workAreaObjectId = new ObjectId(workAreaId);

        // 1. Get the workarea
        const workArea = await workAreasCollection.findOne({ _id: workAreaObjectId });
        if (!workArea) {
            throw new Error("WorkArea not found");
        }

        // 2. Verify user has permission (must be workarea owner or workspace admin/owner)
        const hasPermission = 
            String(workArea.ownerId) === String(currentUserId) ||
            (await WorkAreaService.userCanManageWorkArea({
                workspaceId: workArea.workspaceId,
                userId: currentUserId,
            }));

        if (!hasPermission) {
            throw new Error("Not authorized to remove people from this workarea");
        }

        // 3. Validate memberEmails array
        if (!memberEmails || memberEmails.length === 0) {
            throw new Error("At least one member email is required");
        }

        // 4. Find user IDs for each email and prepare member IDs to remove
        const memberIdsToRemove: ObjectId[] = [];

        // Fix N+1 query: Fetch all users in a single query using $in operator
        const normalizedEmails = memberEmails
            .map(email => email.toLowerCase().trim())
            .filter(email => email.length > 0);
        
        if (normalizedEmails.length > 0) {
            const foundUsers = await usersCollection.find({ email: { $in: normalizedEmails } }).toArray();
            const userMap = new Map(foundUsers.map(user => [user.email.toLowerCase(), user]));
            
            for (const email of normalizedEmails) {
                const user = userMap.get(email);
                
                if (!user) {
                    console.warn(`User with email ${email} not found, skipping`);
                    continue;
                }

                const userId = new ObjectId(user._id);

                // Prevent removing the owner
                if (String(workArea.ownerId) === String(userId)) {
                    throw new Error("Cannot remove the workarea owner");
                }

                // Check if user is actually a member
                const isMember = workArea.members?.some(
                    (m) => String(m.userId) === String(userId)
                );

                if (!isMember) {
                    console.warn(`User ${email} is not a member, skipping`);
                    continue;
                }

                memberIdsToRemove.push(userId);
            }
        }

        if (memberIdsToRemove.length === 0) {
            throw new Error("No valid members to remove. Users may not be members or not found.");
        }

        // 5. Remove members from workarea using $pull with bulkWrite for better performance
        // Fix N+1 query: Use bulkWrite instead of loop with individual updateOne calls
        if (memberIdsToRemove.length > 0) {
            // Use findOneAndUpdate with returnDocument to avoid extra query
            const updatedWorkArea = await workAreasCollection.findOneAndUpdate(
                { _id: workAreaObjectId },
                {
                    $pull: { 
                        members: { 
                            userId: { $in: memberIdsToRemove } 
                        } 
                    },
                    $set: { updatedAt: new Date() }
                },
                { returnDocument: "after" }
            );
            
            if (!updatedWorkArea) {
                throw new Error("Failed to remove members from workarea");
            }
            
            return updatedWorkArea;
        }

        // Fallback: if bulk operation fails, return the workarea as-is
        return workArea;
    },

    async deleteWorkArea({
        workAreaId,
        currentUserId
    }: {
        workAreaId: string;
        currentUserId: string;
    }) {
        const client = await clientPromise();
        const db = client.db();
        const workAreasCollection = db.collection<IWorkArea>("workAreas");
        const notesCollection = db.collection("notes");

        const workAreaObjectId = new ObjectId(workAreaId);

        // 1. Get the workarea
        const workArea = await workAreasCollection.findOne({ _id: workAreaObjectId });
        if (!workArea) {
            throw new Error("WorkArea not found");
        }

        // 2. Verify user has permission (must be workarea owner or workspace admin/owner)
        const hasPermission = 
            String(workArea.ownerId) === String(currentUserId) ||
            (await WorkAreaService.userCanManageWorkArea({
                workspaceId: workArea.workspaceId,
                userId: currentUserId,
            }));

        if (!hasPermission) {
            throw new Error("Not authorized to delete this workarea");
        }

        // 3. Clean up: Remove workAreaId from all notes that reference this workarea
        await notesCollection.updateMany(
            { workAreaId: workAreaId },
            {
                $unset: { workAreaId: "" },
                $set: { updatedAt: new Date() }
            }
        );

        // 4. Delete the workarea
        const result = await workAreasCollection.deleteOne({ _id: workAreaObjectId });

        if (!result.deletedCount) {
            throw new Error("Failed to delete workarea");
        }

        return { success: true, deletedCount: result.deletedCount };
    },

    async joinWorkArea({
        workAreaId,
        currentUserId
    }: {
        workAreaId: string;
        currentUserId: string;
    }) {
        const client = await clientPromise();
        const db = client.db();
        const workAreasCollection = db.collection<IWorkArea>("workAreas");
        const workspacesCollection = db.collection<IWorkspace>("workspaces");
        const usersCollection = db.collection<IUser>("users");

        const workAreaObjectId = new ObjectId(workAreaId);
        const currentUserObjectId = new ObjectId(currentUserId);

        // 1. Get the workarea
        const workArea = await workAreasCollection.findOne({ _id: workAreaObjectId });
        if (!workArea) {
            throw new Error("WorkArea not found");
        }

        // 2. Get the user
        const user = await usersCollection.findOne({ _id: currentUserObjectId });
        if (!user) {
            throw new Error("User not found");
        }

        // 3. Verify user is a workspace member
        const workspace = await workspacesCollection.findOne({ _id: workArea.workspaceId });
        if (!workspace) {
            throw new Error("Workspace not found");
        }

        const isWorkspaceMember = workspace.members?.some(
            (m) => String(m.userId) === String(currentUserId)
        );

        if (!isWorkspaceMember) {
            throw new Error("You must be a workspace member to join a workarea");
        }

        // 4. Check if user is already a member
        const isAlreadyMember = workArea.members?.some(
            (m) => String(m.userId) === String(currentUserId)
        );

        if (isAlreadyMember) {
            throw new Error("You are already a member of this workarea");
        }

        // 5. Handle different access levels
        if (workArea.accessLevel === "private") {
            throw new Error("This workarea is private. You must be invited to join");
        }

        if (workArea.accessLevel === "default") {
            // For default workareas, user should already be a member (synced from workspace)
            // But if they're not, add them
            const newMember: IWorkAreaMember = {
                userId: currentUserObjectId,
                userEmail: user.email || "",
                userName: user.name || "",
                role: "member",
                joinedAt: new Date(),
            };

            const updatedWorkArea = await workAreasCollection.findOneAndUpdate(
                { _id: workAreaObjectId },
                {
                    $push: { members: newMember },
                    $set: { updatedAt: new Date() },
                },
                { returnDocument: "after" }
            );

            if (!updatedWorkArea) {
                throw new Error("Failed to join workarea");
            }

            return updatedWorkArea;
        }

        if (workArea.accessLevel === "closed") {
            // Check if there's already a pending request
            const existingRequest = workArea.requests?.find(
                (r) => String(r.userId) === String(currentUserId) && r.status === "pending"
            );

            if (existingRequest) {
                throw new Error("You already have a pending join request for this workarea");
            }

            // Create a join request
            const newRequest: IWorkAreaJoinRequest = {
                userId: currentUserObjectId,
                userEmail: user.email || "",
                userName: user.name || "",
                status: "pending",
                createdAt: new Date(),
            };

            const updatedWorkArea = await workAreasCollection.findOneAndUpdate(
                { _id: workAreaObjectId },
                {
                    $push: { requests: newRequest },
                    $set: { updatedAt: new Date() },
                },
                { returnDocument: "after" }
            );

            if (!updatedWorkArea) {
                throw new Error("Failed to create join request");
            }

            // Notify workarea owner and admins about the join request
            const owner = await usersCollection.findOne({ _id: workArea.ownerId });
            if (owner) {
                const notificationId = new ObjectId().toString();
                await addNotification({
                    notificationId,
                    workspaceId: workArea.workspaceId,
                    type: "WORKAREA_JOIN_REQUEST",
                    message: `${user.name || user.email} requested to join ${workArea.name}`,
                    createdBy: {
                        userId: currentUserObjectId,
                        userName: user.name || "",
                        userEmail: user.email || "",
                    },
                    recipients: [{
                        userId: workArea.ownerId,
                        userName: owner.name || "",
                        userEmail: owner.email || "",
                        read: false,
                    }],
                });
            }

            return updatedWorkArea;
        }

        // 6. For "open" workareas, directly add user as member
        if (workArea.accessLevel === "open") {
            const newMember: IWorkAreaMember = {
                userId: currentUserObjectId,
                userEmail: user.email || "",
                userName: user.name || "",
                role: "member",
                joinedAt: new Date(),
            };

            const updatedWorkArea = await workAreasCollection.findOneAndUpdate(
                { _id: workAreaObjectId },
                {
                    $push: { members: newMember },
                    $set: { updatedAt: new Date() },
                },
                { returnDocument: "after" }
            );

            if (!updatedWorkArea) {
                throw new Error("Failed to join workarea");
            }

            return updatedWorkArea;
        }

        throw new Error("Invalid access level");
    },

    /**
     * Get all workarea IDs that a user has access to (direct membership or group-based access)
     * @param userId - The user's ID
     * @param userEmail - The user's email
     * @param workspaceId - The workspace ID
     * @returns Array of workarea IDs (as strings) that the user can access
     */
    async getUserAccessibleWorkAreaIds(
        userId: string,
        userEmail: string,
        workspaceId: ObjectId
    ): Promise<string[]> {
        const client = await clientPromise();
        const db = client.db();
        const workAreasCollection = db.collection<IWorkArea>("workAreas");
        const workspacesCollection = db.collection<IWorkspace>("workspaces");

        const userObjectId = new ObjectId(userId);

        // Get workspace to access groups
        const workspace = await workspacesCollection.findOne({ _id: workspaceId });
        if (!workspace) return [];

        // Find all groups that contain this user
        const userGroupIds = (workspace.groups || [])
            .filter(group =>
                group.members.some(m =>
                    String(m.userId) === String(userId) ||
                    m.userEmail === userEmail
                )
            )
            .map(g => String(g._id));

        // Get all workareas in this workspace
        const workAreas = await workAreasCollection.find({
            $or: [
                { workspaceId: workspaceId },
                { workspaceId: String(workspaceId) }
            ]
        } as any).toArray();

        // Filter workareas where user has access
        const accessibleWorkAreaIds = workAreas
            .filter(wa => {
                // Check 1: Direct member
                const isDirectMember = wa.members?.some(m =>
                    String(m.userId) === String(userId) ||
                    m.userEmail === userEmail
                );

                // Check 2: Group-based access
                const hasGroupAccess = wa.groupAccess?.some(ga =>
                    userGroupIds.includes(String(ga.groupId))
                );

                // Check 3: Open/default access levels
                const hasAccessLevelAccess =
                    wa.accessLevel === "open" ||
                    wa.accessLevel === "default";

                return isDirectMember || hasGroupAccess || hasAccessLevelAccess;
            })
            .map(wa => String(wa._id));

        return accessibleWorkAreaIds;
    }
}

