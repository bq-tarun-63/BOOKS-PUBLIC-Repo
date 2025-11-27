import clientPromise from "@/lib/mongoDb/mongodb";
import { INotification } from "@/models/types/Notification";
import { IWorkspace } from "@/models/types/Workspace";
import { ObjectId } from "mongodb";
import type { AnyBulkWriteOperation } from "mongodb";
import { WorkspaceService } from "@/services/workspaceService";
import { ChangeStreamDocument, Document } from "mongodb";
import { IUser } from "@/models/types/User";
import { NotificationType } from "@/models/types/Notification";
import { SentToUser } from "@/models/types/Notification";
import { getMentionNotificationHtml } from "@/lib/emailNotification/emailTemplate/mentionNotificationTemplate";
import { sendEmail } from "@/lib/emailNotification/sendEmailNotification";

async function removeUserFromRequests(workspaceId: string, userEmail: string) {
  const client = await clientPromise();
  const db = client.db();
  const workspacesCollection = db.collection<IWorkspace>("workspaces");
  const result = await workspacesCollection.updateOne(
    { _id: new ObjectId(workspaceId) },
    { $pull: { requests: { userEmail: userEmail } } },
  );
  return result;
}

async function addUserToRequests(workspaceId: string, userEmail: string) {
  const client = await clientPromise();
  const db = client.db();
  const workspacesCollection = db.collection<IWorkspace>("workspaces");
  const result = await workspacesCollection.updateOne(
    { _id: new ObjectId(workspaceId) },
    { $addToSet: { requests: { userEmail: userEmail } } },
  );
  return result;
}

/**
 * Add a member to workspace
 */
// {userId: ObjectId;
//   userName: string;
//   userEmail: string;}
export async function addMemberToWorkspace({
  workspaceId,
  user,
  role = "member",
}: {
  workspaceId: string | ObjectId;
  user: {
    userId: ObjectId;
    userName: string;
    userEmail: string;
  };
  role?: string;
}) {
  const client = await clientPromise();
  const db = client.db();
  const workspacesCollection = db.collection("workspaces");
  const existingMember = await workspacesCollection.findOne({
    _id: new ObjectId(String(workspaceId)),
    members: { $elemMatch: { userEmail: user.userEmail } },
  });
  if (existingMember) {
    return {
      success: false,
      message: "User is already a member of this workspace",
      modifiedCount: 0,
    };
  }
  const member = {
    userId:
      typeof user.userId === "string"
        ? new ObjectId(String(user.userId))
        : user.userId,
    userName: user.userName,
    userEmail: user.userEmail,
    role,
    joinedAt: new Date(),
  };

  const result = await workspacesCollection.updateOne(
    { _id: new ObjectId(String(workspaceId)) },
    { $addToSet: { members: member } }, // prevents duplicates
  );

  return result;
}

/**
 * Add a notification and update recipients
 */
export async function addNotification({
  notificationId,
  workspaceId,
  type,
  message,
  createdBy,
  noteId,
  noteTitle,
  recipients,
}: {
  notificationId: string;
  workspaceId: string | ObjectId;
  type: NotificationType;
  message?: string;
  createdBy: { userId: string | ObjectId; userName: string; userEmail: string };
  noteId?: string | ObjectId;
  noteTitle?: string;
  recipients?: SentToUser[];
}) {
  const client = await clientPromise();
  const db = client.db();
  const notifications = db.collection<INotification>("notifications");
  const usersCollection = db.collection<IUser>("users");

  // recipients list
  let sentTo: SentToUser[] = [];

  // fetch workspace
  const workspace = await WorkspaceService.getWorkspaceById({
    workspaceId: String(workspaceId),
  });
  if (!workspace) throw new Error("Workspace not found");

  if (type === "JOIN") {
    // owner + admins get the notification
    await addUserToRequests(String(workspaceId), createdBy.userEmail);
    sentTo = workspace.members
      .filter((m: any) => m.role === "admin" || m.role === "owner")
      .map((m: any) => ({
        userId: typeof m.userId === "string" ? m.userId : m.userId,
        userName: m.userName,
        userEmail: m.userEmail,
        read: false,
      }));
  } else if (recipients && recipients.length > 0) {
    sentTo = recipients.map((u) => ({
      ...u,
      userId:
        typeof u.userId === "string"
          ? new ObjectId(String(u.userId))
          : u.userId,
      read: false,
    }));
  }

  // If accept -> add member to workspace
  if (type === "ACCEPT" && recipients && recipients.length > 0) {
    if (recipients && recipients.length > 0 && recipients[0]) {
      await removeUserFromRequests(
        String(workspaceId),
        recipients[0]?.userEmail || "",
      );

      await addMemberToWorkspace({
        workspaceId,
        user: recipients[0], // whoever accepted
        role: "member",
      });
    }
  }
  if (type === "REJECT") {
    if (recipients && recipients.length > 0 && recipients[0]) {
      await removeUserFromRequests(
        String(workspaceId),
        recipients[0]?.userEmail || "",
      );
    }
  }

  const notification: INotification = {
    workspaceId: new ObjectId(String(workspaceId)),
    workspaceName: workspace.name,
    type,
    sentTo,
    createdBy: {
      ...createdBy,
      userId:
        typeof createdBy.userId === "string"
          ? new ObjectId(createdBy.userId)
          : createdBy.userId,
    },

    createdAt: new Date(),
    noteId,
    noteTitle,
  };
  if (type == "ACCEPT" || type == "REJECT") {
    await notifications.updateOne(
      { _id: new ObjectId(String(notificationId)) },
      { $set: { responsed: true } },
    );
  }

  if (type === "MENTION") {
    const link = `${process.env.MAIL_LINK}/${noteId}`;
    if (recipients && recipients.length > 0) {
      for (const u of recipients) {
        const subject = `💬 You were mentioned in "${noteTitle}"`;
        const mentionTemplate = getMentionNotificationHtml(
          noteTitle || "Untitled Note",
          link,
          createdBy.userName,
        );

        await sendEmail({
          to: u.userEmail,
          subject,
          html: mentionTemplate,
        });
      }
    }
  }

  const result = await notifications.insertOne(notification);

  // update users collection (each recipient gets notification id)
  const userIds = sentTo.map((u) => u.userId);

  await usersCollection.updateMany(
    { _id: { $in: userIds } },
    { $addToSet: { notifications: result.insertedId } },
  );

  return { ...notification, _id: result.insertedId };
}
export async function removeNotification({ notificationId }: { notificationId: string }) {
  const client = await clientPromise();
  const db = client.db();
  const notifications = db.collection<INotification>("notifications");

  const result = await notifications.deleteOne({
    _id: new ObjectId(notificationId),
  });

  return result.deletedCount > 0;
}

export async function watchNotifications({
  onNotification,
  onClose,
  workspaceId,
}: {
  onNotification: (data: { notification: any }) => void;
  onClose: () => void;
  workspaceId: string;
}) {
  const client = await clientPromise();

  const db = client.db("test"); // ⚡ change DB name if needed
  const collection = db.collection("workspaces");

  const changeStream = collection.watch(
    [
      {
        $match: {
          "fullDocument._id": new ObjectId(workspaceId),
        },
      },
    ],
    { fullDocument: "updateLookup" },
  );

  changeStream.on("change", (change: ChangeStreamDocument<Document>) => {
    if (
      change.operationType === "update" &&
      change.updateDescription?.updatedFields?.notifications
    ) {
      onNotification({
        notification: change.updateDescription.updatedFields.notifications,
      });
    }
  });

  changeStream.on("close", () => {
    onClose();
  });

  return changeStream;
}
async function markAllNotificationsAsRead(userEmail: String) {
  const client = await clientPromise();
  const db = client.db();
  const notifications = db.collection<INotification>("notifications");

  const result = await notifications.updateMany(
    { "sentTo.userEmail": userEmail }, // all notifications for this user
    {
      $set: { "sentTo.$[elem].read": true },
    },
    {
      arrayFilters: [{ "elem.userEmail": userEmail }],
    },
  );

  console.log(
    `Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`,
  );
  return result;
}
export const NotificationService = {

  async deleteAllNotification({ userEmail }: { userEmail: string }) {
    const client = await clientPromise();
    const db = client.db();
  
    const users = db.collection<IUser>("users");
    const notifications = db.collection<INotification>("notifications");
  
    // 1. Clear user's local notifications array
    await users.updateOne(
      { email: userEmail },
      { $set: { notifications: [] } }
    );
  
    // 2. Fetch notifications where the user is in sentTo
    const notificationsArray = await notifications
      .find({ "sentTo.userEmail": userEmail })
      .toArray();
  
    for (const notification of notificationsArray) {
      if (notification.type === "JOIN" && notification.responsed === undefined) {
        // Push back to user's notifications array since we don't want to remove it
        await users.updateOne(
          { email: userEmail },
          { $push: { notifications: notification._id } }
        );
      } else {
        // Remove user from sentTo
        await notifications.updateOne(
          { _id: notification._id },
          { $pull: { sentTo: { userEmail } } }
        );
      }
    }
  
    // 3. Delete notifications where sentTo becomes empty
    await notifications.deleteMany({ sentTo: { $size: 0 } });
  
    return { success: true };
  }
,  
  
  async deleteNotification({
    notificationId,
    userEmail,
  }: {
    notificationId: string;
    userEmail: string;
  }) {
    const client = await clientPromise();
    const db = client.db();
    const notifications = db.collection<INotification>("notifications");
    const users = db.collection<IUser>("users");
  
    // 1. Remove notification from user's notifications array
    await users.updateOne(
      { email: userEmail },
      { $pull: { notifications: notificationId } }
    );
  
    // 2. Remove user from notification's sentTo array and get updated notification in one call
    // Fix unnecessary database call: Use findOneAndUpdate with returnDocument to avoid extra findOne
    const updatedNotification = await notifications.findOneAndUpdate(
      { _id: new ObjectId(notificationId) },
      { $pull: { sentTo: { userEmail } } },
      { returnDocument: "after" }
    );
  
    // 3. Delete notification if no recipients are left
    if (updatedNotification && updatedNotification.sentTo.length === 0) {
      await notifications.deleteOne({ _id: new ObjectId(notificationId) });
    }
    return { success: true };
  },
  
  async getNotificationsForUser({ userEmail }: { userEmail: string }) {
    const client = await clientPromise();
    const db = client.db();
    const users = db.collection("users");
    const notifications = db.collection("notifications");
    // Find the user
    const user = await users.findOne({ email: userEmail });
    // const read = await markAllNotificationsAsRead(userEmail);
    if (!user) return [];

    if (!user.notifications || user.notifications.length === 0) {
      return [];
    }

    // Fetch notifications by ObjectIds
    const userNotifications = await notifications
      .find({
        _id: { $in: user.notifications.map((id) => new ObjectId(String(id))) },
      })
      .sort({ createdAt: -1 })
      .toArray();
    return userNotifications;
  },
  async getNotificationsByUser({ userId }: { userId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const notificationsCol = db.collection("notifications");

    const notifications = await notificationsCol
      .find({ recipientId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return notifications;
  },
};
