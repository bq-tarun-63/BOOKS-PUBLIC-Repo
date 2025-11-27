import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import { IMarketplaceTemplate } from "@/models/types/marketPlace";
import { INote } from "@/models/types/Note";

export const MarketplaceTemplateService = {
  /**
   * Validate template link URL
   */
  validateTemplateLink(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  },

  /**
   * Validate brief description length (max 280 characters)
   */
  validateBriefDescription(description: string): boolean {
    return description.length <= 280;
  },

  /**
   * Validate URL slug format
   */
  validateUrlSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 100;
  },

  /**
   * Check if URL slug is already taken
   */
  async isUrlSlugTaken({
    slug,
    excludeTemplateId,
  }: {
    slug: string;
    excludeTemplateId?: string;
  }): Promise<boolean> {
    const client = await clientPromise();
    const db = client.db();
    const templatesCollection = db.collection<IMarketplaceTemplate>("marketplaceTemplates");

    const query: any = { urlSlug: slug.toLowerCase() };
    if (excludeTemplateId) {
      query._id = { $ne: new ObjectId(excludeTemplateId) };
    }

    const existing = await templatesCollection.findOne(query);
    console.log("existing", existing);
    if(existing!==null) {
      return true;
    }
    return false;
  },

  /**
   * Get template by ID
   */
  async getTemplateById({ templateId }: { templateId: string }): Promise<IMarketplaceTemplate | null> {
    const client = await clientPromise();
    const db = client.db();
    const templatesCollection = db.collection<IMarketplaceTemplate>("marketplaceTemplates");

    const template = await templatesCollection.findOne({
      _id: new ObjectId(templateId),
    });

    return template;
  },

  /**
   * Get template by template note ID
   */
  async getTemplateByNoteId({ templateId }: { templateId: string }): Promise<IMarketplaceTemplate | null> {
    const client = await clientPromise();
    const db = client.db();
    const templatesCollection = db.collection<IMarketplaceTemplate>("marketplaceTemplates");

    const template = await templatesCollection.findOne({
      _id: new ObjectId(templateId),
    });

    return template;
  },

  /**
   * Get creator's templates
   */
  async getTemplatesByCreatorId({
    creatorId,
    status,
  }: {
    creatorId: string;
    status?: string;
  }): Promise<IMarketplaceTemplate[]> {
    return MarketplaceTemplateService.getTemplatesForCreator({
      creatorId,
      status,
    });
  },

  /**
   * List templates for a creator with optional filters & pagination
   */
  async getTemplatesForCreator({
    creatorId,
    status,
    search,
    page = 1,
    limit = 20,
  }: {
    creatorId: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<IMarketplaceTemplate[]> {
    const client = await clientPromise();
    const db = client.db();
    const templatesCollection = db.collection<IMarketplaceTemplate>("marketplaceTemplates");

    const query: any = { creatorId: new ObjectId(creatorId) };
    if (status) {
      query.status = status;
    }
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: regex }, { description: regex }, { tags: regex }];
    }

    const currentPage = Math.max(page, 1);
    const currentLimit = Math.min(Math.max(limit, 1), 100);

    const templatesCursor = templatesCollection.find(query).sort({ updatedAt: -1 });
    if (limit) {
      templatesCursor.skip((currentPage - 1) * currentLimit).limit(currentLimit);
    }

    const templates = await templatesCursor.toArray();

    return templates;
  },

  /**
   * Get templates that are in review (submitted/pending)
   */
  async getTemplatesInReview({
    statuses = ["submitted"],
    search,
    page = 1,
    limit = 20,
    creatorId,
  }: {
    statuses?: Array<IMarketplaceTemplate["status"]>;
    search?: string;
    page?: number;
    limit?: number;
    creatorId?: string;
  }): Promise<IMarketplaceTemplate[]> {
    const client = await clientPromise();
    const db = client.db();
    const templatesCollection = db.collection<IMarketplaceTemplate>("marketplaceTemplates");

    const query: any = { status: { $in: statuses } };
    if (creatorId) {
      query.creatorId = new ObjectId(creatorId);
    }
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: regex }, { description: regex }, { tags: regex }];
    }

    const currentPage = Math.max(page, 1);
    const currentLimit = Math.min(Math.max(limit, 1), 100);

    const cursor = templatesCollection
      .find(query)
      .sort({ submittedAt: -1, updatedAt: -1 });

    if (limit) {
      cursor.skip((currentPage - 1) * currentLimit).limit(currentLimit);
    }

    const templates = await cursor.toArray();
    return templates;
  },

  /**
   * Get published/approved templates for marketplace discovery (public)
   */
  async getPublishedTemplates({
    status = "approved",
    search,
    category,
    page = 1,
    limit = 50,
  }: {
    status?: "approved" | "published";
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<IMarketplaceTemplate[]> {
    const client = await clientPromise();
    const db = client.db();
    const templatesCollection = db.collection<IMarketplaceTemplate>("marketplaceTemplates");

    // Query for approved or published templates
    const query: any = { 
      status: { $in: [status, "published"] } 
    };

    // Add search filter
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { title: regex }, 
        { description: regex }, 
        { briefDescription: regex },
        { tags: { $in: [regex] } }
      ];
    }

    // Add category filter
    if (category) {
      query.category = { $in: [category] };
    }

    const currentPage = Math.max(page, 1);
    const currentLimit = Math.min(Math.max(limit, 1), 100);

    const cursor = templatesCollection
      .find(query)
      .sort({ publishedAt: -1, updatedAt: -1 });

    if (limit) {
      cursor.skip((currentPage - 1) * currentLimit).limit(currentLimit);
    }

    const templates = await cursor.toArray();
    return templates;
  },

  /**
   * Create draft template
   */
  async createDraft({
    creatorId,
    templateData,
  }: {
    creatorId: string;
    templateData: {
      title: string;
      templateLink: string;
      description: string;
      briefDescription: string;
      category?: string[];
      tags?: string[];
      language: string;
      urlSlug?: string;
      isPaid: boolean;
      price?: number;
      currency?: string;
      accessLocking: "open" | "locked" | "restricted";
      coverImage?: string;
      previewImages?: string[];
    };
  }) {
    const client = await clientPromise();
    const db = client.db();
    const templatesCollection = db.collection<IMarketplaceTemplate>("marketplaceTemplates");
    const notesCollection = db.collection<INote>("notes");
    if (templateData.templateLink && !MarketplaceTemplateService.validateTemplateLink(templateData.templateLink)) {
      throw new Error("Invalid template link URL");
    }

    // 3. Validate brief description if provided
    if (templateData.briefDescription && !MarketplaceTemplateService.validateBriefDescription(templateData.briefDescription)) {
      throw new Error("Brief description must be 280 characters or less");
    }

    // 4. Validate URL slug if provided
    if (templateData.urlSlug) {
      if (!MarketplaceTemplateService.validateUrlSlug(templateData.urlSlug)) {
        throw new Error("URL slug must be 3-100 characters, lowercase alphanumeric with hyphens");
      }
   if(!templateData.language) {
      throw new Error("Invalid language");
    }
   
   if(!templateData.accessLocking) {
      throw new Error("Invalid access locking");
    }
   }
 const result = await templatesCollection.insertOne({
   _id: new ObjectId(),
  creatorId: new ObjectId(creatorId),
    title: templateData.title,
    templateLink: templateData.templateLink,
    description: templateData.description,
    briefDescription: templateData.briefDescription,
    category: templateData.category,
    tags: templateData.tags,
    language: templateData.language,
    urlSlug: templateData.urlSlug,
    isPaid: templateData.isPaid,
    price: templateData.price,
    currency: templateData.currency,
    accessLocking: templateData.accessLocking,
    coverImage: templateData.coverImage,
    previewImages: templateData.previewImages || [],
    downloadCount: 0,
    viewCount: 0,
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
 },
 )
 const template = await templatesCollection.findOne({ _id: result.insertedId });
 return template;
},
  /**
   * Save or update draft template
   */
  async saveDraft({
    creatorId,
    templateId,
    templateData,
  }: {
    creatorId: string;
    templateId: string;
    templateData: {
      title?: string;
      templateLink?: string;
      description?: string;
      briefDescription?: string;
      category?: string[];
      tags?: string[];
      language?: string;
      urlSlug?: string;
      isPaid?: boolean;
      price?: number;
      currency?: string;
      accessLocking?: "open" | "locked" | "restricted";
      coverImage?: string;
      previewImages?: string[];
    };
  }): Promise<IMarketplaceTemplate> {
    const client = await clientPromise();
    const db = client.db();
    const templatesCollection = db.collection<IMarketplaceTemplate>("marketplaceTemplates");
    const notesCollection = db.collection<INote>("notes");

    // 1. Verify template note exists and is a template
    console.log("templateId", templateId);

    // 2. Validate template link if provided
    if (templateData.templateLink && !MarketplaceTemplateService.validateTemplateLink(templateData.templateLink)) {
      throw new Error("Invalid template link URL");
    }

    // 3. Validate brief description if provided
    if (templateData.briefDescription && !MarketplaceTemplateService.validateBriefDescription(templateData.briefDescription)) {
      throw new Error("Brief description must be 280 characters or less");
    }
    const existingTemplate = await MarketplaceTemplateService.getTemplateByNoteId({ templateId: templateId });

    // 4. Validate URL slug if provided
    if (templateData.urlSlug) {
      if (!MarketplaceTemplateService.validateUrlSlug(templateData.urlSlug)) {
        throw new Error("URL slug must be 3-100 characters, lowercase alphanumeric with hyphens");
      }

      // Check if slug is taken by another template
      const slugTaken = await MarketplaceTemplateService.isUrlSlugTaken({
        slug: templateData.urlSlug,
        excludeTemplateId: existingTemplate ? String(existingTemplate._id) : undefined,
      });


      if (slugTaken) {
        throw new Error("URL slug is already taken");
      }
    }

    // 5. Check if template already exists

    const now = new Date();
    let result: IMarketplaceTemplate;

    if (existingTemplate) {
      // Build update object
      const updateFields: Partial<IMarketplaceTemplate> = {
        updatedAt: now,
      };
      
      // Allow updating approved/rejected templates - reset to draft when changes are made
      let unsetFields: Partial<Record<keyof IMarketplaceTemplate, "">> | undefined;
      if ((existingTemplate.status === "approved" || existingTemplate.status === "rejected")) {
        updateFields.status = "draft";
        // Clear review-related fields when resetting to draft
        unsetFields = {
          reviewNotes: "",
          reviewedAt: "",
          reviewedBy: "",
        };
      }

      if (templateData.title !== undefined) updateFields.title = templateData.title;
      if (templateData.templateLink !== undefined) updateFields.templateLink = templateData.templateLink;
      if (templateData.description !== undefined) updateFields.description = templateData.description;
      if (templateData.briefDescription !== undefined) updateFields.briefDescription = templateData.briefDescription;
      if (templateData.category !== undefined) updateFields.category = templateData.category;
      if (templateData.tags !== undefined) updateFields.tags = templateData.tags;
      if (templateData.language !== undefined) updateFields.language = templateData.language;
      if (templateData.urlSlug !== undefined) updateFields.urlSlug = templateData.urlSlug.toLowerCase();
      if (templateData.isPaid !== undefined) {
        updateFields.isPaid = templateData.isPaid;
      }
      if (templateData.price !== undefined) updateFields.price = templateData.price;
      if (templateData.currency !== undefined) updateFields.currency = templateData.currency;
      if (templateData.accessLocking !== undefined) updateFields.accessLocking = templateData.accessLocking;
      if (templateData.coverImage !== undefined) updateFields.coverImage = templateData.coverImage;
      if (templateData.previewImages !== undefined) updateFields.previewImages = templateData.previewImages;

      // Update template
      const updateDoc: any = { $set: updateFields };
      if (unsetFields) {
        updateDoc.$unset = unsetFields;
      }
      const updated = await templatesCollection.findOneAndUpdate(
        { _id: existingTemplate._id },
        updateDoc,
        { returnDocument: "after" }
      );

      if (!updated ){
        throw new Error("Failed to update template draft");
      }

      result = updated;
    } else {
      // Create new draft template
      if (!templateData.title || !templateData.templateLink || !templateData.urlSlug) {
        throw new Error("title, templateLink, and urlSlug are required for new templates");
      }

      const newTemplate: IMarketplaceTemplate = {
        _id: new ObjectId(),
        creatorId: new ObjectId(creatorId),
        title: templateData.title,
        templateLink: templateData.templateLink,
        description: templateData.description || "",
        briefDescription: templateData.briefDescription,
        category: templateData.category || [],
        tags: templateData.tags || [],
        language: templateData.language || "en-US",
        urlSlug: templateData.urlSlug.toLowerCase(),
        isPaid: templateData.isPaid || false,
        price: templateData.price,
        currency: templateData.currency || "USD",
        accessLocking: templateData.accessLocking || "open",
        coverImage: templateData.coverImage,
        previewImages: templateData.previewImages || [],
        downloadCount: 0,
        viewCount: 0,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };

      const insertResult = await templatesCollection.insertOne(newTemplate);
      newTemplate._id = insertResult.insertedId;
      result = newTemplate;
    }

    return result;
  },

  /**
   * Submit template for review by marketplace template ID
   */
  async submitForReview({
    templateId,
    creatorId,
  }: {
    templateId: string;
    creatorId: string;
  }): Promise<IMarketplaceTemplate> {
    const client = await clientPromise();
    const db = client.db();
    const templatesCollection = db.collection<IMarketplaceTemplate>("marketplaceTemplates");

    // 1. Get template
    const template = await MarketplaceTemplateService.getTemplateById({ templateId });
    if (!template) {
      throw new Error("Template not found");
    }

    // 2. Verify creator owns this template
    if (String(template.creatorId) !== String(creatorId)) {
      throw new Error("Not authorized to submit this template");
    }

    // 3. Verify template is in draft status
    if (template.status !== "draft") {
      throw new Error(`Template cannot be submitted. Current status: ${template.status}`);
    }

    // 4. Validate required fields
    if (!template.title || !template.templateLink || !template.urlSlug) {
      throw new Error("Template must have title, templateLink, and urlSlug before submission");
    }

    if (!template.description || template.description.trim().length === 0) {
      throw new Error("Template must have a description before submission");
    }

    if (!template.category || template.category.length === 0) {
      throw new Error("Template must have at least one category before submission");
    }

    // 5. Update template status to submitted
    const now = new Date();
    const updated = await templatesCollection.findOneAndUpdate(
      { _id: new ObjectId(templateId) },
      {
        $set: {
          status: "submitted",
          submittedAt: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );

    if (!updated) {
      throw new Error("Failed to submit template for review");
    }

    return updated;
  },

  /**
   * Update template status during review (approve/reject)
   */
  async updateTemplateStatus({
    templateId,
    reviewerId,
    status,
    reviewNotes,
  }: {
    templateId: string;
    reviewerId: string;
    status: Extract<IMarketplaceTemplate["status"], "approved" | "rejected">;
    reviewNotes?: string;
  }): Promise<IMarketplaceTemplate> {
    const allowedStatuses: Array<IMarketplaceTemplate["status"]> = ["approved", "rejected"];
    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid status. Allowed values are 'approved' or 'rejected'.");
    }

    const client = await clientPromise();
    const db = client.db();
    const templatesCollection = db.collection<IMarketplaceTemplate>("marketplaceTemplates");

    const templateObjectId = new ObjectId(templateId);
    const reviewerObjectId = new ObjectId(reviewerId);

    const existingTemplate = await templatesCollection.findOne({ _id: templateObjectId });
    if (!existingTemplate) {
      throw new Error("Template not found");
    }

    if (existingTemplate.status !== "submitted" && existingTemplate.status !== "approved" && existingTemplate.status !== "rejected") {
      throw new Error("Template must be in submitted/approved/rejected state to update status");
    }

    const now = new Date();
    const setFields: Partial<IMarketplaceTemplate> & {
      reviewedBy: ObjectId;
      reviewedAt: Date;
      status: IMarketplaceTemplate["status"];
      updatedAt: Date;
    } = {
      status,
      reviewedBy: reviewerObjectId,
      reviewedAt: now,
      updatedAt: now,
    };

    if (reviewNotes !== undefined) {
      setFields.reviewNotes = reviewNotes;
    }

    const updateDoc: any = { $set: setFields };
    if (status === "approved") {
      updateDoc.$set.publishedAt = existingTemplate.publishedAt ?? now;
    } else if (status === "rejected") {
      updateDoc.$unset = { publishedAt: "" };
    }

    const updated = await templatesCollection.findOneAndUpdate(
      { _id: templateObjectId },
      updateDoc,
      { returnDocument: "after" }
    );

    if (!updated) {
      throw new Error("Failed to update template status");
    }

    return updated;
  },

  /**
   * Format template for API response
   */
  formatTemplate({ template }: { template: IMarketplaceTemplate }) {
    const formatted = {
      ...template,
      id: String(template._id),
      _id: String(template._id),
    };
    if (template.reviewedBy) {
      (formatted as any).reviewedBy = String(template.reviewedBy);
    }

    if (template.creatorId) {
      (formatted as any).creatorId = String(template.creatorId);
    }
    return formatted;
  },
};

