import clientPromise from "../../mongoDb/mongodb";
import { ObjectId } from "mongodb";
import { IImageStatus } from "../../../models/types/ImageStatus";

const getCollection = async () => {
  const client = await clientPromise();
  return client.db().collection<IImageStatus>("imageStatus");
};

export async function addOrUpdateImageStatus(
  imageStatusId: ObjectId,
  noteType: 'original' | 'review' | 'approved',
  imageUrl?: string
) {
  const collection = await getCollection();
  const update: Partial<IImageStatus> = { updatedAt: new Date() };
  if (noteType === 'original') update.isCreatedUsed = true;
  if (noteType === 'review') update.isPublishedUsed = true;
  if (noteType === 'approved') update.isApprovedUsed = true;

  await collection.updateOne(
    { _id: imageStatusId },
    { $set: update }
  );
}

 export async function maybeDeleteImageStatus(
  imageStatusId: string,
  noteType: 'original' | 'review' | 'approved'|'Viewdatabase_Note',
  imageUrl?: string
) { 
  const collection = await getCollection();
  const update: Partial<IImageStatus> = { updatedAt: new Date() };
  if (noteType == 'original') update.isCreatedUsed = false;
  if (noteType == 'review') update.isPublishedUsed = false;
  if (noteType == 'approved') update.isApprovedUsed = false;
 
  await collection.updateOne(
    { _id: new ObjectId(imageStatusId) },
    { $set: update }
  );

  const doc = await collection.findOne({ _id: new ObjectId(imageStatusId) });
  if (
    doc &&
    !doc.isCreatedUsed &&
    !doc.isPublishedUsed &&
    !doc.isApprovedUsed
  ) {
    await collection.deleteOne({ _id: new ObjectId(imageStatusId) });
    // TODO: Delete the image file from GitHub here if needed
    return true;//need to delete
  }
  return false; //no need to delete
}

// ... existing code ... 