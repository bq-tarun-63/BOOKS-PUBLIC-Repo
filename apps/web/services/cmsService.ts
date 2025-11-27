import connectToDatabase from "../lib/mongoDb/mongodb";
import { ObjectId, type WithId } from "mongodb";

export type CmsStatus = "draft" | "published";

export interface CmsContentDoc<TFields = any> {
  _id: ObjectId;
  customId?: string; // For custom string IDs
  projectId: string;
  slug?: string;
  locale?: string;
  type: string;
  fields: TFields;
  status: CmsStatus;
  version: number;
  publishedVersion?: number | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
  createdBy?: string;
  updatedBy?: string;
}

export const CmsService = {
  async ensureIndexes() {
    const client = await connectToDatabase();
    const db = client.db();
    const col = db.collection<CmsContentDoc>("cms_contents");
    await col.createIndex({ projectId: 1, slug: 1, locale: 1, status: 1 }, { name: "slug_locale_status" });
    await col.createIndex({ projectId: 1, customId: 1 }, { name: "project_customId" }); 
    await col.createIndex({ updatedAt: -1 }, { name: "updated_at" });
  },

  async createDraft<TFields = any>({
    projectId,
    customId,
    slug,
    locale,
    type,
    fields,
    createdBy,
    tags,
    metadata,
  }: {
    projectId: string;
    customId?: string;
    slug?: string;
    locale?: string;
    type: string;
    fields: TFields;
    createdBy?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }) {
    const client = await connectToDatabase();
    const db = client.db();
    const col = db.collection<CmsContentDoc<TFields>>("cms_contents");

    const now = new Date();
    const doc: CmsContentDoc<TFields> = {
      _id: new ObjectId(),
      customId,
      projectId,
      slug,
      locale,
      type: "",
      fields,
      status: "draft",
      version: 1,
      publishedVersion: null,
      tags: tags ?? [],
      metadata: metadata ?? {},
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      createdBy,
      updatedBy: createdBy,
    };

    await col.insertOne(doc);
    return { id: customId || doc._id.toHexString() };
  },

  async updateDraft<TFields = any>({
    id,
    fields,
    type,
    updatedBy,
  }: {
    id: string;
    fields: Partial<TFields>;
    type?: string;
    updatedBy?: string;
  }) {
    
    try {
      const client = await connectToDatabase();
      const db = client.db();
      const col = db.collection<CmsContentDoc<TFields>>("cms_contents");
      
      const query = { customId: id };
      
      const now = new Date();
      
      // Check if document exists first
      const existingDoc = await col.findOne(query);
      
      if (!existingDoc) {
        throw new Error(`Content with ID ${id} not found`);
      }
      
      const res = await col.updateOne(query,
        {
          $set: { 
            fields: { ...(fields as any) }, 
            type : type,
            status: "draft" as CmsStatus,
            updatedAt: now, 
            updatedBy,
          },
          $inc: { version: 1 },
        }
      );
        
      if (res.matchedCount === 0) {
        throw new Error(`Draft content with ID ${id} not found`);
      }
    } catch (e) {
      console.error('CmsService.updateDraft error:', e);
      throw e;
    }
  },

  async publish({ id }: { id: string }) {

    try {
      const client = await connectToDatabase();
      const db = client.db();
      const col = db.collection<CmsContentDoc>("cms_contents");
      
      const now = new Date();
      const doc = await col.findOne({ customId: id });
      
      if (!doc) {
        throw new Error(`Content with ID ${id} not found`);
      }
      
      const res = await col.updateOne({ customId: id }, {
        $set: {
          status: "published" as CmsStatus,
          publishedVersion: doc.version,
          publishedAt: now,
          updatedAt: now
        }
      });
      
      if (res.matchedCount === 0) {
        throw new Error("Failed to publish content");
      }
    } catch (e) {
      console.error('CmsService.publish error:', e);
      throw e;
    }
  },

  async getById<TFields = any>({
    id,
    opts,
  }: {
    id: string;
    opts?: { draft?: boolean };
  }) {
    const client = await connectToDatabase();
    const db = client.db();
    const col = db.collection<CmsContentDoc<TFields>>("cms_contents");
    
    let query: any;
    
    // Handle both ObjectId and custom string IDs
    try {
      const _id = new ObjectId(id);
      query = { _id };
    } catch (e) {
      // If it's not a valid ObjectId, treat it as a custom string ID
      query = { customId: id };
    }
    
    if (!opts?.draft) query.status = "published";
    const doc = await col.findOne(query);
    if (!doc) return null;
    return CmsService.toApi({ doc });
  },

  async getBySlug<TFields = any>({
    projectId,
    slug,
    locale,
    opts,
  }: {
    projectId: string;
    slug: string;
    locale?: string;
    opts?: { draft?: boolean };
  }) {
    const client = await connectToDatabase();
    const db = client.db();
    const col = db.collection<CmsContentDoc<TFields>>("cms_contents");
    const query: any = { projectId, slug };
    if (locale) query.locale = locale;
    if (!opts?.draft) query.status = "published";
    const doc = await col.findOne(query);
    if (!doc) return null;
    return CmsService.toApi({ doc });
  },

  async search<TFields = any>({
    projectId,
    opts,
  }: {
    projectId: string;
    opts?: { type?: string; tag?: string; limit?: number; offset?: number };
  }) {
    const client = await connectToDatabase();
    const db = client.db();
    const col = db.collection<CmsContentDoc<TFields>>("cms_contents");
    const query: any = { projectId, status: "published" };
    if (opts?.type) query.type = opts.type;
    if (opts?.tag) query.tags = opts.tag;
    return (
      await col
        .find(query)
        .skip(opts?.offset ?? 0)
        .limit(Math.min(opts?.limit ?? 20, 100))
        .sort({ updatedAt: -1 })
        .toArray()
    ).map((doc) => CmsService.toApi({ doc }));
  },

  toApi<TFields = any>({ doc }: { doc: WithId<CmsContentDoc<TFields>> }) {
    return {
      id: doc._id.toHexString(),
      projectId: doc.projectId,
      slug: doc.slug,
      locale: doc.locale,
      type: doc.type,
      fields: doc.fields,
      status: doc.status,
      version: doc.version,
      publishedVersion: doc.publishedVersion ?? null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
      tags: doc.tags ?? [],
      metadata: doc.metadata ?? {},
    };
  },
};

