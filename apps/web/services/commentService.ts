import clientPromise from "@/lib/mongoDb/mongodb";
import { INote } from "@/models/types/Note";
import { IComment } from "@/models/types/comment";
import { ObjectId } from "mongodb";
import { IChatMessage } from "@/models/types/comment";
import { AuditService } from "./auditService";
export const inlineCommentService = { 
    async addComment({
        commenterName,
        commenterEmail,
        text,
        noteId,
        chatId,
        commentId,
        mediaMetaData,
    }: {
        commenterName: string;
        commenterEmail: string;
        text: string;
        noteId: string;
        chatId: string;
        commentId: string;
        mediaMetaData?: Array<{ id: string; name: string; url: string; size?: number; mimeType?: string; uploadedAt?: string }>;
    }) {
        const client = await clientPromise();
        const db = client.db();
        const noteCollection = db.collection<INote>("notes");
        const commentCollection = db.collection<IComment>("comments");
        const note = await noteCollection.findOne({ _id: new ObjectId(noteId) });
        if(!note){
            throw new Error("Note not found");
        }
        const comment :IComment = {
            _id: new ObjectId(chatId),
            type:"inline",
            noteId: new ObjectId(noteId),
            chats: [{
                commentId: new ObjectId(commentId),
                commenterName,
                commenterEmail,
                text,
                createdAt: new Date(),
                ...(mediaMetaData && mediaMetaData.length > 0 ? { mediaMetaData } : {}),
            }],
        };
      
        await commentCollection.insertOne(comment);

        // Log audit for comment creation
        await AuditService.log({
            action: "CREATE",
            noteId,
            userId: commenterEmail, // Using email as userId for comments
            userEmail: commenterEmail,
            userName: commenterName,
            noteName: note.title,
            serviceType: "MONGODB",
            field: "comment",
            oldValue: undefined,
            newValue: text,
            workspaceId: note.workspaceId,
            organizationDomain: note.organizationDomain,
        });

        return { success: true ,comment:comment};
    },
    async addChatMessage({
        chatId,
        commentId,
        commenterName,
        commenterEmail,
        text,
        noteId,
        mediaMetaData,
    }: {
        chatId: string;
        commentId: string;
        commenterName: string;
        commenterEmail: string;
        text: string;
        noteId: string;
        mediaMetaData?: Array<{ id: string; name: string; url: string; size?: number; mimeType?: string; uploadedAt?: string }>;
    }) {
        const client = await clientPromise();
        const db = client.db();
        const noteCollection = db.collection<INote>("notes");
        const commentCollection = db.collection<IComment>("comments");
        
        // Optimize: Fetch note and chat in parallel instead of sequentially
        const [note, chat] = await Promise.all([
            noteCollection.findOne({ _id: new ObjectId(noteId) }),
            commentCollection.findOne({_id: new ObjectId(chatId)})
        ]);
    
        if(!note){
            throw new Error("Note not found");
        }
        if(!chat){
            throw new Error("Chat not found");
        }
    const chatMessage:IChatMessage = {
           commentId: new ObjectId(commentId),
            commenterName,
            commenterEmail,
            text,
            createdAt: new Date(),
            ...(mediaMetaData && mediaMetaData.length > 0 ? { mediaMetaData } : {}),

    };
    await commentCollection.updateOne({_id:new ObjectId (chatId)},{$push:{chats:chatMessage}});
    
    // Log audit for chat message creation
    await AuditService.log({
        action: "CREATE",
        noteId,
        userId: commenterEmail, // Using email as userId for comments
        userEmail: commenterEmail,
        userName: commenterName,
        noteName: note.title,
        serviceType: "MONGODB",
        field: "comment",
        oldValue: undefined,
        newValue: text,
        workspaceId: note.workspaceId,
        organizationDomain: note.organizationDomain,
    });
    
    return { success: true ,comment:chatMessage};
    },
   async getAllChatMessages({ chatId }: { chatId: string }) {
    const client = await clientPromise();
    const db = client.db();
    const commentCollection = db.collection<IComment>("comments");
    const chat  = await commentCollection.findOne({_id:new ObjectId (chatId)});
    if(!chat){
        throw new Error("Chat not found");
    }
    return chat;
    },
    async deleteChat({
        chatId,
        noteId,
        userId,
        userEmail,
        userName,
    }: {
        chatId: string;
        noteId?: string;
        userId?: string;
        userEmail?: string;
        userName?: string;
    }){
        const client = await clientPromise();
        const db = client.db();
        const commentCollection = db.collection<IComment>("comments");
        
        // Get the comment before deleting for audit
        const comment = await commentCollection.findOne({_id:new ObjectId (chatId)});
        
        await commentCollection.deleteOne({_id:new ObjectId (chatId)});

        // Log audit for chat deletion if we have the required info
        if (noteId && userId && userEmail && userName) {
            await AuditService.log({
                action: "DELETE",
                noteId,
                userId,
                userEmail,
                userName,
                noteName: "chat",
                serviceType: "MONGODB",
                field: "comment",
                oldValue: comment?.chats?.[0]?.text || "Chat message",
                newValue: undefined,
                workspaceId: undefined,
                organizationDomain: undefined,
            });
        }
        
        return { success: true};
    },
    async deleteChatMessage({
        chatId,
        commentId,
        noteId,
        userId,
        userEmail,
        userName,
    }: {
        chatId: string;
        commentId: string;
        noteId?: string;
        userId?: string;
        userEmail?: string;
        userName?: string;
    }){
        const client = await clientPromise();
        const db = client.db();
        const commentCollection = db.collection<IComment>("comments");
        
        // Get the comment and specific message before deleting for audit
        const comment = await commentCollection.findOne({_id:new ObjectId (chatId)});
        const messageToDelete = comment?.chats?.find(c => c.commentId.toString() === commentId);
        
        await commentCollection.updateOne({_id:new ObjectId (chatId)},{$pull:{chats:{commentId:new ObjectId(commentId)}}});

        // Log audit for chat message deletion if we have the required info
        if (noteId && userId && userEmail && userName) {
            await AuditService.log({
                action: "DELETE",
                noteId,
                userId,
                userEmail,
                userName,
                noteName: "Note-Name", // fetch from the frontend
                serviceType: "MONGODB",
                field: "comment",
                oldValue: messageToDelete?.text || "Chat message",
                newValue: undefined,
                workspaceId: undefined,
                organizationDomain: undefined,
            });
        }
        
        return { success: true};
    },
    async updateChatMessage({
        chatId,
        commentId,
        text,
        noteId,
        userId,
        userEmail,
        userName,
    }: {
        chatId: string;
        commentId: string;
        text: string;
        noteId?: string;
        userId?: string;
        userEmail?: string;
        userName?: string;
    }) {
        const client = await clientPromise();
        const db = client.db();
        const commentCollection = db.collection<IComment>("comments");
      
        // Optional: fetch existing chat to return updated comment later (and to check existence before update)
        const chat = await commentCollection.findOne({ _id: new ObjectId(chatId) });
        if (!chat) throw new Error("Chat not found");
      
        const chatMessage = chat.chats.find(c => c.commentId.toString() === commentId);
        if (!chatMessage) throw new Error("Chat message not found");
        
        const oldText = chatMessage.text;
      
        const now = new Date();
      
        const result = await commentCollection.updateOne(
          {
            _id: new ObjectId(chatId),
            "chats.commentId": new ObjectId(commentId)
          },
          {
            $set: {
              "chats.$.text": text,
              "chats.$.updatedAt": now
            }
          }
        );
      
        if (result.matchedCount === 0) {
          throw new Error("Chat not found"); // defensive, though we checked earlier
        }
      
        if (result.modifiedCount === 0) {
          // Could mean no change (text identical) — choose how you want to handle it
          throw new Error("Chat message not updated (maybe text was identical)");
        }

        // Log audit for chat message update if we have the required info
        if (noteId && userId && userEmail && userName) {
            await AuditService.log({
                action: "UPDATE",
                noteId,
                userId,
                userEmail,
                userName,
                noteName: "Note-Name", // fetch from the frontend
                serviceType: "MONGODB",
                field: "comment",
                oldValue: oldText,
                newValue: text,
                workspaceId: undefined,
                organizationDomain: undefined,
            });
        }
      
        // Build and return the updated comment object to caller
        const updatedComment = {
          ...chatMessage,
          text,
          updatedAt: now
        };
      
        return { success: true, comment: updatedComment };
    }
}