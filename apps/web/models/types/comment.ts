import {ObjectId} from "mongodb";

export interface MediaMetaData {
    id: string;
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
    uploadedAt?: string;
}

export interface IChatMessage {
    commentId: ObjectId;           // unique id for each comment
    commenterName: string;      // display name of commenter
    commenterEmail: string;     // email of commenter
    text: string;               // comment text
    createdAt: Date;            // when the comment was made
    updatedAt?: Date;
    mediaMetaData?: MediaMetaData[]; // Array of uploaded files (images, PDFs, etc.)
}
export interface IComment{
    _id: ObjectId,
    type:"inline"|"note",
    noteId: ObjectId,
    chats: Array<IChatMessage>
}     