import clientPromise from "@/lib/mongoDb/mongodb";
import { IActivityLog } from "@/models/types/ActivityLogs";

export const AuditService = {
  async log({
    action,
    noteId,
    userId,
    userEmail,
    userName,
    noteName,
    serviceType,
    field,
    oldValue,
    newValue,
    workspaceId,
    organizationDomain,
  }: {
    action: IActivityLog["action"];
    noteId: string;
    userId: string;
    userEmail: string;
    userName: string;
    noteName: string;
    serviceType: IActivityLog["serviceType"];
    field: IActivityLog["field"];
    oldValue: any;
    newValue?: any;
    workspaceId?: string;
    organizationDomain?: string;
  }): Promise<void> {
    try {
      const client = await clientPromise();
      const db = client.db();
      const auditCollection = db.collection<IActivityLog>("audit_logs");

      const auditLog: IActivityLog = {
        noteId,
        userId,
        userEmail,
        userName,
        noteName,
        workspaceId,
        organizationDomain,
        action,
        field,
        serviceType,
        timestamp: new Date(),
        oldValue,
        newValue,
      };

      await auditCollection.insertOne(auditLog);
      console.log(`✅ Audit log created for ${action} on note ${noteId}`);
    } catch (error) {
      console.error(`❌ Failed to create audit log for ${action} on note ${noteId}:`, error);
      // Don't throw error to avoid breaking the main operation
    }
  },

  async getNoteHistory({ noteId }: { noteId: string }): Promise<IActivityLog[]> {
    try {
      const client = await clientPromise();
      const db = client.db();
      const auditCollection = db.collection<IActivityLog>("audit_logs");

      const history = await auditCollection
        .find({ noteId })
        .sort({ timestamp: -1 })
        .toArray();

      return history;
    } catch (error) {
      console.error(`❌ Failed to get note history for ${noteId}:`, error);
      return [];
    }
  },

  async getUserActivity({
    userId,
    limit = 100,
  }: {
    userId: string;
    limit?: number;
  }): Promise<IActivityLog[]> {
    try {
      const client = await clientPromise();
      const db = client.db();
      const auditCollection = db.collection<IActivityLog>("audit_logs");

      const activity = await auditCollection
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return activity;
    } catch (error) {
      console.error(`❌ Failed to get user activity for ${userId}:`, error);
      return [];
    }
  },

  async getWorkspaceActivity({
    workspaceId,
    limit = 100,
  }: {
    workspaceId: string;
    limit?: number;
  }): Promise<IActivityLog[]> {
    try {
      const client = await clientPromise();
      const db = client.db();
      const auditCollection = db.collection<IActivityLog>("audit_logs");

      const activity = await auditCollection
        .find({ workspaceId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return activity;
    } catch (error) {
      console.error(`❌ Failed to get workspace activity for ${workspaceId}:`, error);
      return [];
    }
  }
};