/**
 *  await approvedCollection.insertOne({
          noteId: _noteId,
          githubRawUrl,
          Author: Author,
          title: updatedNote.title,
          userEmail: updatedNote.userEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
 */
import type {ObjectId} from "mongodb"
export interface IApprovedNote {
    noteId: ObjectId;
    githubRawUrl:string,
    author:string,
    title:string,
    userEmail:string,
    createdAt: Date,
    updatedAt:Date;

}
