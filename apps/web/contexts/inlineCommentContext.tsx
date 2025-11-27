"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { deleteWithAuth, getWithAuth, postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";
import { Chat, InlineComment, InlineCommentResponse } from "@/types/note";
import { ObjectId } from "bson";
import { useAuth } from "@/hooks/use-auth";


interface inlineCommentContextProps {
  openCommentId: string | null;
  comments: InlineComment[];
  isPanelVisible: boolean;
  openComment: (id: string) => void;
  closePanel: () => void;
  togglePanel: () => void;
  updateComment: (id: string, parentCommentId: string, text: string) => Promise<void>;
  deleteCommentMessage: (id: string, parentCommentId) => Promise<void>;
  fetchComments: (noteId: string) => Promise<void>;
  fetchCommentsBatch: (ids: string[]) => Promise<void>;
  addComment: (comment: InlineComment) => void; 
  addChatReply: (parentCommentId: string, text: string, mediaMetaData?: Array<{ id: string; name: string; url: string; size?: number; mimeType?: string; uploadedAt?: string }>) => void;
}

// Create a default context value
const defaultContextValue: inlineCommentContextProps = {
  openCommentId: null,
  comments: [],
  isPanelVisible: false,
  openComment: () => {},
  closePanel: () => {},
  togglePanel: () => {},
  updateComment: async () => {},
  deleteCommentMessage: async () => {},
  fetchComments: async () => {},
  fetchCommentsBatch: async () => {},
  addComment: () => {},
  addChatReply: async() => {},
};

const CommentPanelContext = createContext<inlineCommentContextProps>(defaultContextValue);

export const CommentPanelProvider: React.FC<{ children: React.ReactNode; noteId?: string }> = ({ children, noteId }) => {
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [comments, setComments] = useState<InlineComment[]>([]);
  const isLargeScreen = typeof window !== "undefined" && window.innerWidth >= 768;
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(isLargeScreen);
  const { user } = useAuth();
  // Map commentId => full response
  const commentMap: Record<string, InlineComment> = {};
  useEffect(() => {
    console.log("Printing the comments ===+++>", comments);
  },[comments])

  const openComment = (id: string) => {
    setOpenCommentId(id);
    setIsPanelVisible(true);
  };

  const closePanel = () => {
    setIsPanelVisible(false);
    setOpenCommentId(null);
  };

  const togglePanel = () => setIsPanelVisible((v) => !v);

  async function fetchCommentsBatch(ids: string[]) {
    try {
      if(ids.length === 0){
        console.log("No inline comment IDs found, clearing comments");
        setComments([]);
        return;
      }
      const uniqueIds = Array.from(new Set(ids));
      console.log("Printing the uniqIds ++++==>",uniqueIds);
      
      // Call all APIs in parallel
      const responses = await Promise.all(
        uniqueIds.map((id) =>
          getWithAuth(`/api/database/comments/inline/getall/${id}`)
          .then((res) => res as InlineCommentResponse)  
          .catch((err) => {
              console.error("Failed to fetch comment", id, err);
              return null; // avoid breaking all if one fails
            })
          )
      );

      console.log("PRinting  the rresposne  for all inline COmment ====++>", responses);


      responses.forEach((res, index) => {
        const id = uniqueIds[index]; // string | undefined
        if (id && res?.comment) {
          commentMap[id] = res.comment;
        }
      });

      setComments( (prev) => {
        const newComments = Object.values(commentMap)
        return newComments;
      })
      console.log("Printing the commentMap ++++==>", commentMap);


    } catch (error) {
      console.error("Failed to fetch comment batch:", error);
    }
  }

  const fetchComments = async (noteId: string) => {
    try {
      const res = await getWithAuth(`/api/database/comments/inline/getAll/${noteId}`);
      setComments((res as any)?.comments || []);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  const updateComment = async (id: string, parentCommentId: string,  text: string) => {
      
    // Find parent comment
    const parentComment = comments.find((c) => c._id === parentCommentId);
    if (!parentComment) {
      console.error("Parent comment not found for chatId:", id);
      return;
    }

    const prevComments = [...comments];

    // Find noteId from parent comment
    const noteId = parentComment.noteId;

    // Optimistically update UI
    setComments((prev) =>
      prev.map((c) =>
        c._id === parentCommentId
          ? {
              ...c,
              chats: c.chats.map((chat) =>
                chat.commentId === id ? { ...chat, text } : chat
              ),
            }
          : c
      )
    );
      
    try {
      const res = await postWithAuth("/api/database/comments/inline/update", { 
        commentId: id, 
        text,
        noteId,
        chatId: parentCommentId,
      });

      if ((res as any)?.comment?.success) {
        toast.success("Comment updated");
      } else {
        throw new Error("Update failed");
      } 
    } catch (err) {
      toast.error("Error updating comment");
      setComments(prevComments);

    }
  };

  const deleteCommentMessage = async (id: string, parentCommentId: string) => {
    const prevComments = [...comments];
    
    // Optimistically remove the comment or chat
    setComments((prev) =>
      prev.map((c) =>
        c._id === parentCommentId
          ? { ...c, chats: c.chats.filter((chat) => chat.commentId !== id) }
          : c
      )
    );

    try {
      const res = await deleteWithAuth("/api/database/comments/inline/deleteMessage", { 
        body: JSON.stringify({
          chatId: parentCommentId,
          commentId: id,
        }),
      });
      if ((res as any)?.comment?.success) {
        document.dispatchEvent(
          new CustomEvent("removeCommentMark", { detail: { commentId: id } })
        );        
        toast.success("Comment deleted");
      }
      else {
        throw new Error("Delete failed");
      }
    } catch (err) {
      toast.error("Error deleting comment");
      setComments(prevComments);
    }
  };

  const addComment = (newComment: InlineComment) => {
    setComments((prev) => {
      // avoid duplicates if already added
      if (prev.some((c) => c._id === newComment._id)) return prev;
      return [...prev, newComment];
    });
  };

  const addChatReply = async (parentCommentId: string, text: string, mediaMetaData?: Array<{ id: string; name: string; url: string; size?: number; mimeType?: string; uploadedAt?: string }>) => {
    
    const tempChatId = new ObjectId();

    console.log("Printing the parent comment Id ====+++=>", parentCommentId, text)
    // Create optimistic chat
    const optimisticChat: Chat = {
      chatId: `${tempChatId}`,
      commenterName: user?.name || "unknown",
      commenterEmail: user?.email || "unknown",
      text,
      createdAt: new Date().toISOString(),
      updatedAt:"",
      ...(mediaMetaData && mediaMetaData.length > 0 ? { mediaMetaData } : {}),
    };
  
    // Update UI immediately
    setComments((prev) =>
      prev.map((c) =>
        c._id === parentCommentId
          ? { ...c, chats: [...c.chats, optimisticChat] }
          : c
      )
    );
  
    try {
      // Call backend API
      const res = await postWithAuth("/api/database/comments/inline/addMessage", {
        text,
        noteId: comments.find((c) => c._id === parentCommentId)?.noteId,
        chatId: parentCommentId,
        commentId:  `${tempChatId}`,
        ...(mediaMetaData && mediaMetaData.length > 0 ? { mediaMetaData } : {}),
      });
      console.log("Printing the response from the addChatReply", res);
  
      if ((res as any)?.comment) {
        console.log("Successfullt added the comment ++++?")
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      console.error("Failed to add reply:", error);
      toast.error("Failed to post reply");
  
      // // Remove optimistic chat on failure
      // setComments((prev) =>
      //   prev.map((c) =>
      //     c._id === parentCommentId
      //       ? {
      //           ...c,
      //           chats: c.chats.filter((chat) => chat.chatId !== tempId),
      //         }
      //       : c
      //   )
      // );
    }
  };

  return (
    <CommentPanelContext.Provider
      value={{
        openCommentId,
        comments,
        isPanelVisible,
        openComment,
        closePanel,
        togglePanel,
        updateComment,
        deleteCommentMessage,
        fetchComments,
        fetchCommentsBatch,
        addComment,
        addChatReply,
      }}
    >
      {children}
    </CommentPanelContext.Provider>
  );
};

export const useCommentPanel = () => {
  const ctx = useContext(CommentPanelContext);
  // Since we now have a default value, we don't need to check for null
  // But we can still add a warning if the context seems to be using default values
  if (ctx === defaultContextValue) {
    console.warn("useCommentPanel is using default context value. Make sure CommentPanelProvider is wrapping the component.");
  }
  return ctx;
};
