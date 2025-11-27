"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, ChevronDown, ChevronRight, Pencil, Trash, ArrowUp, X } from "lucide-react";
import { InlineChatMessage }  from "./inlineChatMessage";
import InlineChatInputBox from "./inlineChatInputBox";
import { InlineComment } from "@/types/note";
import { useCommentPanel } from "@/contexts/inlineCommentContext";

interface CommentCardProps {
  thread: InlineComment;
}

export default function InlineCommentCard({ thread }: CommentCardProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [showInputBox, setShowInputBox] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { updateComment, deleteCommentMessage} = useCommentPanel();

  useEffect(() =>{
    function handleCardOutsideClick(e : MouseEvent){
      if(cardRef.current && !cardRef.current.contains(e.target as Node)){
        setShowInputBox(false);
        setEditingChatId(null);
      }
    }
    if(showInputBox){
      document.addEventListener("mousedown", handleCardOutsideClick);
    }
    else{
      document.removeEventListener("mousedown", handleCardOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleCardOutsideClick);
  },[])



  const handleEditClick = (commentId: string, currentText: string) => {
    setEditingChatId(commentId);
    setDrafts((prev) => ({
      ...prev,
      [commentId]: currentText,
    }));
  };


  const handleSave = (commentId: string, parentCommentId: string) => {
    const newText = drafts[commentId]?.trim();
    if (newText && commentId && parentCommentId) {
      console.log("In the handle Save button ====+++>", commentId, parentCommentId , newText)
      updateComment(commentId, parentCommentId ,  newText);
    }
    setEditingChatId(null);
  };

  const handleCancel = () => {
    setEditingChatId(null);
  };

  
  const handleCardClick = (e) => {
    e.stopPropagation();
    // Toggle input visibility when user clicks the comment card
    setShowInputBox((prev) => !prev);
  };


   // Determine which chats to show based on state
   const visibleChats = showReplies
   ? thread.chats.filter((c): c is NonNullable<typeof c> => c != null)
   : thread.chats.length <= 2
   ? thread.chats
   : [thread.chats[0], thread.chats[thread.chats.length - 1]].filter(
       (c): c is NonNullable<typeof c> => c != null
     );

     console.log("Chat IDs: ==+++>", thread.chats.map(c => c.commentId));
     console.log("Thread and Thread Chats  ==+++>", thread, thread.chats);

   return (
    <div
      onClick={handleCardClick}
      ref={cardRef}
      className="border border-border w-[280px] rounded-md bg-background hover:bg-muted/50 !dark:hover:bg-none  cursor-pointer transform hover:scale-105 transition-all duration-300 ease-out group-hover:scale-110 shadow-sm hover:shadow-md"
    >
      <div className="p-3 space-y-3">
        {visibleChats.map((chat) => {
          const isEditing = editingChatId === chat.commentId;
          const draftText = chat.commentId ? (drafts[chat.commentId] ?? chat.text ?? "") : "";
          console.log("Printi0ng the draft text  ----++>", draftText);
          return (
            <div
              key={chat.commentId}
              className="relative group hover:bg-muted/40 !dark:hover:bg-none rounded-lg p-1 transition-colors"
            >
              {/* Chat message or edit mode */}
              {isEditing ? (
                <div className="flex items-start gap-2">
                  <textarea
                    value={draftText}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        ...(chat.commentId ? { [chat.commentId]: e.target.value } : {}),
                      }))
                    }
                    className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none resize-none overflow-hidden"
                    rows={1}
                    autoFocus
                  />
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Update Button Clicked --+++>")
                        if (chat.commentId && thread._id) {
                          handleSave(chat.commentId, thread._id);
                        }
                      }}
                      className="p-[3px] rounded-full bg-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel();
                      }}
                      className="p-[3px] rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <InlineChatMessage chat={chat} hideTimestamp={false} />
              )}

              {/* Vertical line */}
              <div className="absolute left-[14px] top-[30px] h-auto bottom-0 w-[1.5px] bg-gray-200 dark:bg-gray-700 z-50" />

              {/* Edit/Delete icons on hover */}
              {!isEditing && (
                <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity z-20 bg-background px-1 py-0.5 rounded-md border shadow-sm ">
                  <div 
                    title="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (chat.commentId) {
                        handleEditClick(chat.commentId, chat.text || "");
                      }
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#2c2c2c]"
                  > 
                    <Pencil size={14} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <div
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (chat.commentId && thread._id) {
                        deleteCommentMessage(chat.commentId, thread._id);
                      }
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#2c2c2c]"
                  >
                    <Trash
                      size={14}
                      className="text-gray-500 dark:text-gray-400 hover:text-red-500"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Reply input box */}
        {showInputBox && (
          <div
            className="mt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <InlineChatInputBox parentCommentId={thread._id} noteId={thread.noteId} />
          </div>
        )}
      </div>

      {/* Replies toggle */}
      {thread.chats.length > 2 && (
        <div
          className="border-t border-border bg-background p-2 text-xs text-gray-500 flex items-center gap-1 cursor-pointer hover:bg-muted/40  !dark:hover:bg-none rounded-b-xl"
          onClick={(e) => {
            e.stopPropagation();
            setShowReplies(!showReplies);
          }}
        >
          {showReplies ? (
            <>
              <ChevronDown size={12} />
              Hide replies
            </>
          ) : (
            <>
              <ChevronRight size={12} />
              View {thread.chats.length - 2} replies
            </>
          )}
        </div>
      )}
    </div>
  );
}
