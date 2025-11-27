import type { ObjectId } from "mongodb";

/**
 * Marketplace Creator Profile Interface
 * Represents a creator's public profile in the marketplace
 */
export interface IMarketplaceCreator {
  _id: string | ObjectId;

  // Reference to user account
  userId: ObjectId; // Links to IUser._id
  userEmail: string; // Denormalized for quick access

  // Basic Profile Information
  displayName: string; // Required - Can be different from user account name
  handle: string; // Required - Unique handle like @username (must start with @)
  bio?: string; // Optional - Short description (max 280 characters)
  // Profile Images
  profilePicture?: string; // URL to profile picture/avatar
  coverPhoto?: string; // URL to cover photo/banner image

  // Contact Preferences
  allowEmailContact: boolean; // Whether others can email this creator
  emailToContact: string;
  // Social Links & Websites
  // Examples: LinkedIn, personal website, portfolio, etc.
  socialLinks?: string[]; // Array of website URLs (max 5 links)
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date; // Last time crator was active
}

/**
 * Marketplace Template Interface
 * Represents a template listed in the marketplace
 */
export interface IMarketplaceTemplate {
  _id?: string | ObjectId;
  id?: string;

  // Reference to template note
  creatorId: ObjectId; // Links to IMarketplaceCreator._id

  // Template Information
  title: string;
  templateLink: string; // URL to the template (required)
  description: string; // Full description
  briefDescription?: string; // Brief description (max 280 characters) for cards/previews
  category?: string[]; // Array of categories (e.g., ["Productivity", "Project Management"])
  tags?: string[]; // Array of tags for searchability
  language: string; // Language code (e.g., "en-US", "en-GB")
  urlSlug?: string; // URL slug for the template (e.g., "productivity-dashboard")

  // Pricing
  isPaid: boolean; // Whether template is paid or not
  price?: number; // Price in USD (if not free)
  currency?: string; // Currency code (default: "USD")

  // Access Control
  accessLocking: "open" | "locked" | "restricted"; // Access locking level
  // "open" - Anyone can duplicate
  // "locked" - Prevent duplication across workspaces
  // "restricted" - Prevent re-selling purchased templates

  // Media
  thumbnailUrl?: string; // Main thumbnail image
  previewImages?: string[]; // Array of preview image URLs
  coverImage?: string; // Cover image for detail page (auto-generated from templateLink)

  // Statistics
  downloadCount: number;
  viewCount: number;
  rating?: number; // Average rating (0-5)
  // Status & Workflow
  status: "draft" | "submitted" | "approved" | "rejected" | "published";
  reviewNotes?: string; // Optional reviewer notes / rejection reason
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date; // When template was submitted for review
  publishedAt?: Date; // When template was published
  reviewedAt?: Date; // When template was reviewed by admin
  reviewedBy?: ObjectId | string; // Admin who reviewed the template
}

/**
 * Marketplace Review Interface
 * Represents a review/rating for a template
 */
export interface IMarketplaceReview {
  _id?: string | ObjectId;
  id?: string;

  templateId: ObjectId; // Links to IMarketplaceTemplate._id
  reviewerId: ObjectId; // Links to IUser._id
  reviewerName: string;
  reviewerEmail: string;
  reviewerProfilePicture?: string;

  rating: number; // 1-5 stars
  title?: string; // Optional review title
  comment?: string; // Optional review text

  // Metadata
  createdAt: Date;
  updatedAt?: Date;
  helpfulCount: number; // Number of "helpful" votes
}

/**
 * Marketplace Creator Class Implementation
 */
