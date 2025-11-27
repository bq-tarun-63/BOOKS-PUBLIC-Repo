"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Comment, Note } from "@/types/board";
import { useAuth } from "@/hooks/use-auth";
import { ObjectId } from "bson";
import { deleteWithAuth, postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";
import { useBoard } from "@/contexts/boardContext";
import { useCommentMentions } from "@/hooks/use-commentMention";
import { useWorkspaceContext } from "./workspaceContext";
import { useNotifications } from "@/hooks/use-notifications";
import { useNoteContext } from "./NoteContext";
import { Members } from "@/types/workspace";
import { eventBus } from "@/services-frontend/comment/eventBus";

interface CommentContextType {
  comments: Comment[];
  addComment: (text: string, mediaMetaData?: Array<{ id: string; name: string; url: string; size?: number; mimeType?: string; uploadedAt?: string }>) => void;
  editComment: (commentId: string, newText: string) => void;
  deleteComment: (commentId: string) => void;
  setComments: (comments: Comment[]) => void;
}

type DeleteCommentResponse = {
  message: string;
  comment: { success: boolean };
};

const CommentContext = createContext<CommentContextType | undefined>(undefined);

export function CommentProvider({
  children,
  initialComments = [],
  noteId,
  boardId,
  note,
}: {
  children: ReactNode;
  initialComments?: Comment[];
  noteId: string;
  boardId: string,
  note: Note
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const {user} = useAuth();
  const { updateNote } = useBoard();
  const { sendMentionNotifications } = useCommentMentions();
  const { currentWorkspace, workspaceMembers } = useWorkspaceContext();
  const { notifyCommentMention, notifyNewComment } = useNotifications();
  const { iscurrentNotPublic, sharedWith } = useNoteContext();

  useEffect(() => {
    function onNewComment(comment: Comment){
      console.log("New comment received throgh Bus ", comment)
      setComments((prev) => {
        const exists = prev.some((c) => c.commentId === comment.commentId);
        if(exists) return prev;
        return [...prev, comment];
      })
    }
    eventBus.on("new-comment", onNewComment);
    return () => eventBus.off("new-comment", onNewComment);
  },[])


  const addComment = async (text: string, mediaMetaData?: Array<{ id: string; name: string; url: string; size?: number; mimeType?: string; uploadedAt?: string }>) => {

    if(!user){
      console.log("User not found")
      return;
    }
    const newCommentId = new ObjectId();
    const newComment: Comment = {
      commentId: `${newCommentId}`,
      commenterName: user?.name ||  "unknown" ,
      commenterEmail: user?.email,
      text,
      createdAt: new Date().toISOString(),
      ...(mediaMetaData && mediaMetaData.length > 0 ? { mediaMetaData } : {}),
    };

    setComments((prev) => [...prev, newComment]);
    try{
        const response = await postWithAuth("/api/database/comments/add", {
            text,
            noteId,
            ...(mediaMetaData && mediaMetaData.length > 0 ? { mediaMetaData } : {}),
        });

        if (response?.comment?.success) {
          const updatedComment = response.comment?.comment;
          const serverComment: Comment = {
            ...updatedComment,
            createdAt: updatedComment.createdAt,
          };
  
          // Replace optimistic comment with real one
          setComments((prev) =>
            prev.map((c) =>
              c.commentId === newCommentId.toString() ? serverComment : c
            )
          );

          // After receiving the server comment
          const updatedNoteForContext = {
              ...note,   
              comments: [...comments, serverComment]
          };
          
          // Update BoardContext
          updateNote(boardId, noteId, updatedNoteForContext);

          // Determine who to send the new comment 
          let targetMembers: Members[] = [];

          if (iscurrentNotPublic) {
            // public note →  send comment to all workspace members
            targetMembers = workspaceMembers;
          } else {
            // private note → notify only shared users
            targetMembers = sharedWith.map((u, index) => {
              const matchedMember = workspaceMembers.find(
                (wm) => wm.userEmail === u.email
              );
              return {
                userId: matchedMember ? matchedMember.userId : `shared-${index}`,
                userEmail: u.email,
                role: u.access,
                joinedAt: matchedMember ? matchedMember.joinedAt : "",
                userName: matchedMember ? matchedMember.userName : u.email,
              };
            });
          }
          
          // send the new COMMENT to the targetMembers in real time 
          if(targetMembers.length > 0){
            notifyNewComment(serverComment, targetMembers);
          }

          // Make the notification in DB 
          if(!currentWorkspace){
            console.error("Unable to fetch the workspace !!");
            return
          }
          const notificationResposne = await sendMentionNotifications(currentWorkspace?._id, updatedComment, noteId, note.title);

          // send the notification in Real-Time
          if(notificationResposne !== null)
          notifyCommentMention(notificationResposne);

        }
        else{
          toast.error("Failed to add comment");
          throw new Error("Failed to add comment");
        }
    }
    catch(err){
      console.log("Error in adding comment", err);
      setComments((prev) => prev.filter((c) => c.commentId !== newCommentId.toString()));
    }
  };

  const editComment = async (commentId: string, newText: string) => {
 
    const prevComments = comments; 
    setComments((prev) =>
      prev.map((c) => (c.commentId === commentId ? { ...c, text: newText } : c))
    );

    try{
      const response = await postWithAuth("/api/database/comments/update", {
          commentId,
          text:newText,
          noteId,
      });

      if (response?.comment?.success) {

        const updatedAt = response.comment.comment.updatedAt;


        // Replace optimistic comment with real one
        setComments((prev) =>
          prev.map((c) => (c.commentId === commentId ? {...c , updatedAt } : c))
        );

        // Update note in BoardContext only after API confirms
        const updatedNoteForContext: Note = {
          ...note,
          comments: comments.map((c) => (c.commentId === commentId ? {...c , updatedAt, text: newText } : c)),
        };

        updateNote(boardId, noteId, updatedNoteForContext);
          
      }
      else{
        toast.error("Failed to edit comment");
        throw new Error("Failed to edit comment");
      }
    }
    catch(err){
      console.log("Error in editing comment", err);
      setComments(prevComments);
    }  
  };

  const deleteComment = async (commentId: string) => {

    const prevComments = [...comments];    
    
    setComments((prev) => prev.filter((c) => c.commentId !== commentId));

    try{
      const response = await deleteWithAuth("/api/database/comments/delete", {
        body: JSON.stringify({
          commentId,
          noteId
          })
      }) as DeleteCommentResponse

      if(response.comment.success){
        
        const updatedComments = prevComments.filter((c) => c.commentId !== commentId);
        setComments(updatedComments);

        const updatedNoteForContext: Note = {
          ...note,
          comments: updatedComments,
        };

        updateNote(boardId, noteId, updatedNoteForContext);

      }
      else{
        toast.error("Failed to delete comment");
        throw new Error("Failed to delete comment");
      }

    }
    catch(err){
      console.log("Error in deleting comment", err);
      setComments(prevComments);
    }
  };

  return (
    <CommentContext.Provider
      value={{ comments, addComment, editComment, deleteComment, setComments }}
    >
      {children}
    </CommentContext.Provider>
  );
}

export const useComments = () => {
  const context = useContext(CommentContext);
  if (!context) throw new Error("useComments must be used within CommentProvider");
  return context;
};
