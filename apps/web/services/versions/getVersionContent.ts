

import { MongoClient, ObjectId } from "mongodb";
import { clusterManager } from "@/lib/mongoDb/clusterManager";
import * as jsondiffpatch from "jsondiffpatch";

const jdp = jsondiffpatch.create({
  objectHash: (obj: any) =>
    obj && typeof obj === "object"
      ? obj.attrs?.["_uid"] ?? obj.attrs?.id ?? JSON.stringify(obj)
      : JSON.stringify(obj),
  arrays: { detectMove: true, includeValueOnMove: false },
});

function tryParseJson(content: any): any {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error("❌ Failed to parse JSON content:", error);
      return content; // Return as-is if parsing fails
    }
  }
  return content;
}

export async function getVersionContentfromMongoDB(noteId: string, version?: string) {
  console.log("🚀 STARTING getVersionContentfromMongoDB");
  console.log("📝 Note ID:", noteId);
  console.log("📝 Version:", version);

  // Get note info to find cluster
  const metadataClient = await clusterManager.getMetadataClient();
  const metadataDb = metadataClient.db();
  const notesCollection = metadataDb.collection("notes");
  
  const note = await notesCollection.findOne({ _id: new ObjectId(noteId) });
  if (!note || !note.clusterName) {
    throw new Error("Note not found or no cluster assigned");
  }


  // Get content client
  const contentClient = await clusterManager.getContentClient(note.clusterName);
  const contentDb = contentClient.db();
  const contentColl = contentDb.collection("note_content");
  const versionsColl = contentDb.collection("note_versions");

  // Get current content (latest snapshot)
  const contentDoc = await contentColl.findOne({ noteId: String(noteId) });

  if (!contentDoc) {
    throw new Error("Content not found");
  }

  // If no version specified, return current content
  if (!version) {
    const parsedContent = tryParseJson(contentDoc.content);
    return typeof parsedContent === 'string' ? parsedContent : JSON.stringify(parsedContent);
  }

  const targetVersion = parseInt(version);
  console.log("🎯 Target version:", targetVersion);

  // Get versions array
  const versionsDoc = await versionsColl.findOne({ noteId: String(noteId) });

  if (!versionsDoc || !versionsDoc.versions) {
    throw new Error("Versions not found");
  }

  const versions = versionsDoc.versions;

  // If requesting version 0, return empty state
  if (targetVersion === 0) {
    console.log("📄 Returning empty state for version 0");
    return JSON.stringify({});
  }
  
  // If requesting version beyond what we have, return current content
  if (targetVersion > versions.length) {
    console.log(`📄 Requested version ${targetVersion} beyond available versions (${versions.length}), returning current content`);
    const parsedContent = tryParseJson(contentDoc.content);
    return typeof parsedContent === 'string' ? parsedContent : JSON.stringify(parsedContent);
  }


  // Start with version 0 (empty state) and apply deltas forward
  // Get the base content from version 0 or create empty state
  let reconstructedContent = {};
  
  console.log(`🔄 Reconstructing content for version ${targetVersion}`);
  console.log(`📊 Available versions: ${versions.length}`);
  console.log(`📄 Starting with empty state:`, reconstructedContent);
  
  // Apply deltas from version 1 to target version (forward order)
  for (let i = 0; i < targetVersion && i < versions.length; i++) {
    const versionEntry = versions[i];
    console.log(`🔄 Applying delta for version ${versionEntry.version}`);
    console.log(`📊 Delta for version ${versionEntry.version}:`, versionEntry.delta);
    
    if (versionEntry.delta) {
      try {
        // Apply delta forward (patch forward)
        reconstructedContent = jdp.patch(reconstructedContent, versionEntry.delta) || {};
        console.log(`✅ Applied delta for version ${versionEntry.version}`);
        console.log(`📄 Content after version ${versionEntry.version}:`, reconstructedContent);
      } catch (error) {
        console.error(`❌ Error applying delta for version ${versionEntry.version}:`, error);
        console.error(`📄 Current content:`, reconstructedContent);
        console.error(`📊 Delta:`, versionEntry.delta);
        throw new Error(`Failed to apply delta for version ${versionEntry.version}`);
      }
    }
  }

  return typeof reconstructedContent === 'string' ? reconstructedContent : JSON.stringify(reconstructedContent);
}