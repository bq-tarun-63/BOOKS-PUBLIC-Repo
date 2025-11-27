import { ObjectId } from "mongodb";

export interface IImageStatus {
  _id?: ObjectId;
  imageUrl?: string;              // Raw GitHub URL of the image (optional)
  originalNoteId: ObjectId;      // Note where the image was originally uploaded
  isCreatedUsed: boolean;        // Was this image used when a note was created?
  isPublishedUsed: boolean;      // Was it used during publishing?
  isApprovedUsed: boolean;       // Was it used in an approved note?
  createdAt: Date;
  updatedAt: Date;
  noteType: 'original' | 'review' | 'approved'; // Track which type of note is using this image
} 

export class ImageStatus implements IImageStatus {
  _id?: ObjectId;
  imageUrl?: string;              // Raw GitHub URL of the image (optional)
  originalNoteId: ObjectId;      // Note where the image was originally uploaded
  isCreatedUsed: boolean;        // Was this image used when a note was created?
  isPublishedUsed: boolean;      // Was it used during publishing?
  isApprovedUsed: boolean;       // Was it used in an approved note?
  createdAt: Date;
  updatedAt: Date;
  noteType: 'original' | 'review' | 'approved';
} 