// src/services/versioningService.ts  (replace the function with this version)
import * as jsondiffpatch from "jsondiffpatch";
import { v4 as uuidv4 } from "uuid";
import { ObjectId, MongoClient } from "mongodb";
import { clusterManager } from "@/lib/mongoDb/clusterManager";
import type { INote } from "@/models/types/Note";

/**
 * jsondiffpatch config tuned for ProseMirror-like documents.
 * objectHash uses attrs._uid or attrs.id if present; otherwise falls back to JSON.stringify.
 */
const jdp = jsondiffpatch.create({
  objectHash: (obj: any) =>
    obj && typeof obj === "object"
      ? obj.attrs?.["_uid"] ?? obj.attrs?.id ?? JSON.stringify(obj)
      : JSON.stringify(obj),
  arrays: { detectMove: true, includeValueOnMove: false },
});


// parse string → object (safe)
function tryParseJson<T = any>(s: string | T): T {
  if (typeof s !== "string") return s as unknown as T;
  try {
    return JSON.parse(s) as T;
  } catch {
    return (s as unknown) as T;
  }
}


export async function updateContentWithJsonDiffpatch({
  note,
  incomingContent,
  authorId,
  clientOpId,
}: {
  note: INote;
  incomingContent: any | string;
  authorId?: string;
  clientOpId?: string;
}): Promise<{ opId: string; version: number; time: Date }> {
 
  
  const time = new Date();
  if (!note) throw new Error("note required");
  if (!note.clusterName) throw new Error("note.clusterName required");

  // parse incoming string -> object
  const incomingParsed = tryParseJson(incomingContent);

  const contentClient: MongoClient = await clusterManager.getContentClient(
    note.clusterName,
  );
  const contentDb = contentClient.db();
  const contentColl = contentDb.collection("note_content");
  const versionsColl = contentDb.collection("note_versions");
  

  // read current content and version count
  const contentDoc = await contentColl.findOne({ noteId: String(note._id) });

  
  const rawCurrent = contentDoc?.content ?? null;
  const currentContent = typeof rawCurrent === "string" ? tryParseJson(rawCurrent) : rawCurrent;
  
  // get current version count from versions collection
  const versionsDoc = await versionsColl.findOne({ noteId: String(note._id) });

  
  const currentVersion = versionsDoc?.versions?.length ?? 0;

  // compute delta
  const delta = jdp.diff(currentContent ?? {}, incomingParsed ?? {});
  
 
  
  // Force a delta even if jsondiffpatch thinks they're the same
  const currentString = JSON.stringify(currentContent ?? {});
  const incomingString = JSON.stringify(incomingParsed ?? {});

  // if no changes detected by jsondiffpatch, but strings are different, force a delta
  let effectiveDelta = delta;
  if (!effectiveDelta && currentString !== incomingString) {
    effectiveDelta = { _replace: incomingParsed };
  }
  
  
  // if still no changes, return current version
  if (!effectiveDelta) {
    return { opId: clientOpId ?? "noop", version: currentVersion, time };
  }

  const opId = clientOpId ?? uuidv4();
  const newVersion = currentVersion + 1;
  

  // store version in array format
  const versionEntry = {
    version: newVersion,
    opId,
    authorId: authorId ? new ObjectId(authorId) : null,
    delta: effectiveDelta,
    createdAt: time,
  };
  

  // update content and add version to array
  const contentResult = await contentColl.updateOne(
    { noteId: String(note._id) },
    {
      $set: {
        content: incomingParsed,
        updatedAt: time,
        clusterName: note.clusterName,
      },
      $setOnInsert: { createdAt: time },
    },
    { upsert: true },
  );
  
 
  // add version to versions array
  const versionsResult = await versionsColl.updateOne(
    { noteId: String(note._id) },
    {
      $push: { versions: versionEntry } as any,
      $setOnInsert: { 
        noteId: String(note._id),
        clusterName: note.clusterName,
        createdAt: time,
      },
    },
    { upsert: true },
  );
 
  return { opId, version: newVersion, time };
}
