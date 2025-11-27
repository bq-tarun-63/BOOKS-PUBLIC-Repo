import clientPromise from "@/lib/mongoDb/mongodb";
import { ObjectId } from "mongodb";
import { IMarketplaceCreator } from "@/models/types/marketPlace";

export const MarketplaceService = {
  /**
   * Validate handle format
   * Handle must start with @ and be alphanumeric with underscores/hyphens
   */

  validateHandle(handle: string): boolean {
    const handleRegex = /^@[a-zA-Z0-9_-]+$/;
    return handleRegex.test(handle) && handle.length >= 3 && handle.length <= 30;
  },

  /**
   * Validate bio length
   */
  validateBio(bio: string): boolean {
    return bio.length <= 280;
  },

  /**
   * Validate social links array
   * Maximum 5 links, must be valid URLs
   */
  validateSocialLinks(links: string[]): boolean {
    if (links.length > 5) return false;
    const urlRegex = /^https?:\/\/.+/;
    return links.every(url => urlRegex.test(url));
  },
    async getCreatorProfile({ userId }: { userId: string }): Promise<IMarketplaceCreator | null> {
      const client = await clientPromise();
      const db = client.db();
      const creatorsCollection = db.collection<IMarketplaceCreator>("marketplaceCreators");

      const creator = await creatorsCollection.findOne({ userId: new ObjectId(userId) });
      return creator;
    },
  /**
   * Check if handle is already taken
   */
  async isHandleTaken({
    handle,
    excludeCreatorId,
  }: {
    handle: string;
    excludeCreatorId?: string;
  }): Promise<boolean> {
    const client = await clientPromise();
    const db = client.db();
    const creatorsCollection = db.collection<IMarketplaceCreator>("marketplaceCreators");

    const query: any = { handle: handle.toLowerCase() };
    if (excludeCreatorId) {
      query._id = { $ne: new ObjectId(excludeCreatorId) };
    }

    const existing = await creatorsCollection.findOne(query);
    return !!existing;
  },

  /**
   * Get creator profile by user ID
   */
  async getCreatorByUserId({ userId }: { userId: string }): Promise<IMarketplaceCreator | null> {
    const client = await clientPromise();
    const db = client.db();
    const creatorsCollection = db.collection<IMarketplaceCreator>("marketplaceCreators");

    const creator = await creatorsCollection.findOne({
      userId: new ObjectId(userId),
    });

    return creator;
  },

  /**
   * Get creator profile by handle
   */
  async getCreatorByHandle({ handle }: { handle: string }): Promise<IMarketplaceCreator | null> {
    const client = await clientPromise();
    const db = client.db();
    const creatorsCollection = db.collection<IMarketplaceCreator>("marketplaceCreators");

    const creator = await creatorsCollection.findOne({
      handle: handle.toLowerCase(),
    });

    return creator;
  },

  /**
   * Create marketplace creator profile
   */
  async createCreatorProfile({
    userId,
    userEmail,
    displayName,
    handle,
    bio,
    profilePicture,
    coverPhoto,
    allowEmailContact,
    emailToContact,
    socialLinks,
  }: {
    userId: string;
    userEmail: string;
    displayName: string;
    handle: string;
    bio?: string;
    profilePicture?: string;
    coverPhoto?: string;
    allowEmailContact: boolean;
    emailToContact: string;
    socialLinks?: string[];
  }): Promise<IMarketplaceCreator> {
    const client = await clientPromise();
    const db = client.db();
    const creatorsCollection = db.collection<IMarketplaceCreator>("marketplaceCreators");

    // 1. Validate handle format
    if (!MarketplaceService.validateHandle(handle)) {
      throw new Error("Handle must start with @ and be 3-30 characters (alphanumeric, _, -)");
    }

    // 2. Check if handle is already taken
    const handleTaken = await MarketplaceService.isHandleTaken({ handle });
    if (handleTaken) {
      throw new Error("Handle is already taken");
    }

    // 3. Check if user already has a profile
    const existingProfile = await MarketplaceService.getCreatorByUserId({ userId });
    if (existingProfile) {
      throw new Error("Creator profile already exists for this user");
    }

    // 4. Validate bio if provided
    if (bio && !MarketplaceService.validateBio(bio)) {
      throw new Error("Bio must be 280 characters or less");
    }

    // 5. Validate social links if provided
    if (socialLinks && !MarketplaceService.validateSocialLinks(socialLinks)) {
      throw new Error("Maximum 5 social links allowed, and all must be valid URLs");
    }

    // 6. Create unique index on handle if it doesn't exist
    try {
      await creatorsCollection.createIndex({ handle: 1 }, { unique: true });
    } catch (error) {
      // Index might already exist, that's okay
    }

    // 7. Create unique index on userId if it doesn't exist
    try {
      await creatorsCollection.createIndex({ userId: 1 }, { unique: true });
    } catch (error) {
      // Index might already exist, that's okay
    }

    // 8. Create new creator profile
    const now = new Date();
    const newCreator: IMarketplaceCreator = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      userEmail: userEmail.toLowerCase(),
      displayName: displayName.trim(),
      handle: handle.toLowerCase(),
      bio: bio?.trim(),
      profilePicture,
      coverPhoto,
      allowEmailContact: allowEmailContact ?? true,
      emailToContact: emailToContact.toLowerCase(),
      socialLinks: socialLinks || [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await creatorsCollection.insertOne(newCreator);
    newCreator._id = result.insertedId;

    return newCreator;
  },

  /**
   * Update marketplace creator profile
   */
  async updateCreatorProfile({
    userId,
    displayName,
    handle,
    bio,
    profilePicture,
    coverPhoto,
    allowEmailContact,
    emailToContact,
    socialLinks,
  }: {
    userId: string;
    displayName?: string;
    handle?: string;
    bio?: string;
    profilePicture?: string;
    coverPhoto?: string;
    allowEmailContact?: boolean;
    emailToContact?: string;
    socialLinks?: string[];
  }): Promise<IMarketplaceCreator> {
    const client = await clientPromise();
    const db = client.db();
    const creatorsCollection = db.collection<IMarketplaceCreator>("marketplaceCreators");

    // 1. Get existing profile
    const existingProfile = await MarketplaceService.getCreatorByUserId({ userId });
    if (!existingProfile) {
      throw new Error("Creator profile not found");
    }

    // 2. Validate handle if provided
    if (handle) {
      if (!MarketplaceService.validateHandle(handle)) {
        throw new Error("Handle must start with @ and be 3-30 characters (alphanumeric, _, -)");
      }

      // Check if handle is taken by another user
      const handleTaken = await MarketplaceService.isHandleTaken({ handle, excludeCreatorId: String(existingProfile._id) });
      if (handleTaken) {
        throw new Error("Handle is already taken");
      }
    }

    // 3. Validate bio if provided
    if (bio !== undefined) {
      if (bio && !MarketplaceService.validateBio(bio)) {
        throw new Error("Bio must be 280 characters or less");
      }
    }

    // 4. Validate social links if provided
    if (socialLinks && !MarketplaceService.validateSocialLinks(socialLinks)) {
      throw new Error("Maximum 5 social links allowed, and all must be valid URLs");
    }

    // 5. Build update object
    const updateFields: Partial<IMarketplaceCreator> = {
      updatedAt: new Date(),
      lastActiveAt: new Date(),
    };

    if (displayName !== undefined) {
      updateFields.displayName = displayName.trim();
    }
    if (handle !== undefined) {
      updateFields.handle = handle.toLowerCase();
    }
    if (bio !== undefined) {
      updateFields.bio = bio?.trim() || undefined;
    }
    if (profilePicture !== undefined) {
      updateFields.profilePicture = profilePicture || undefined;
    }
    if (coverPhoto !== undefined) {
      updateFields.coverPhoto = coverPhoto || undefined;
    }
    if (allowEmailContact !== undefined) {
      updateFields.allowEmailContact = allowEmailContact;
    }
    if (emailToContact !== undefined) {
      updateFields.emailToContact = emailToContact.toLowerCase();
    }
    if (socialLinks !== undefined) {
      updateFields.socialLinks = socialLinks;
    }

    // 6. Update profile
    const result = await creatorsCollection.findOneAndUpdate(
      { userId: new ObjectId(userId) },
      { $set: updateFields },
      { returnDocument: "after" }
    );
    
    if (!result) {
      throw new Error("Failed to update creator profile");
    }

    return result;
  },

  /**
   * Delete marketplace creator profile
   */
  async deleteCreatorProfile({ userId }: { userId: string }): Promise<{ success: boolean }> {
    const client = await clientPromise();
    const db = client.db();
    const creatorsCollection = db.collection<IMarketplaceCreator>("marketplaceCreators");

    // 1. Check if profile exists
    const existingProfile = await MarketplaceService.getCreatorByUserId({ userId });
    if (!existingProfile) {
      throw new Error("Creator profile not found");
    }

    // 2. Delete profile
    const result = await creatorsCollection.deleteOne({
      userId: new ObjectId(userId),
    });

    if (!result.deletedCount) {
      throw new Error("Failed to delete creator profile");
    }

    return { success: true };
  },

  /**
   * Format creator for API response
   */
  formatCreator({ creator }: { creator: IMarketplaceCreator }) {
    return {
      ...creator,
      id: String(creator._id),
      _id: String(creator._id),
    };
  },
};

