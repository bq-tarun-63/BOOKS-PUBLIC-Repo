import { clusterManager } from "@/lib/mongoDb/clusterManager";
import { MongoClient, ObjectId } from "mongodb";

export async function getAllVersions(noteId: string) {
  try {
    // Get the note to find its cluster
    const metadataClient = await clusterManager.getMetadataClient();
    const metadataDb = metadataClient.db();
    const notesCollection = metadataDb.collection("notes");
    
    const note = await notesCollection.findOne({ _id: new ObjectId(noteId) });
    if (!note || !note.clusterName) {
      throw new Error("Note not found or no cluster assigned");
    }

    // Get versions from the content cluster
    const contentClient: MongoClient = await clusterManager.getContentClient(note.clusterName);
    const contentDb = contentClient.db();
    const versionsCollection = contentDb.collection("note_versions");

    const versionsDoc = await versionsCollection.findOne({ noteId });
    if (!versionsDoc || !versionsDoc.versions) {
      return [];
    }

    // Transform to match GitHub format
    const formattedVersions = versionsDoc.versions.map((version: any) => ({
      sha: version.opId,
      message: `Version ${version.version}`,
      author: {
        name: "User", // You might want to fetch actual user name
        email: "user@example.com", // You might want to fetch actual user email
        date: version.createdAt.toISOString()
      },
      date: version.createdAt.toISOString(),
      version: version.version,
    }));

    return formattedVersions;
  } catch (error) {
    console.error("Error getting versions:", error);
    return [];
  }
}