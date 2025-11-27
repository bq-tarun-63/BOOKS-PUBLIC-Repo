"use client";

import { useState, useEffect, useRef } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/tailwind/ui/popover";
import { Button } from "@/components/tailwind/ui/button";
import { MessageSquare, Check, ArrowUp, Paperclip, Loader2 } from "lucide-react";
import { useEditor } from "novel";
import { postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";
import clsx from "clsx";
import { ObjectId } from "bson";
import { useCommentPanel } from "@/contexts/inlineCommentContext";
import { useAuth } from "@/hooks/use-auth";
import { useCommentFileUpload, type MediaMetaData } from "../comment/commentFileUpload";

interface CommentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId?: string; // optional, so you can attach comment to a note
}

export const CommentSelector = ({ open, onOpenChange, noteId }: CommentSelectorProps) => {
  const { editor } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const [commentText, setCommentText] = useState("");
  const [mediaMetaData, setMediaMetaData] = useState<MediaMetaData[]>([]);
  const { addComment } = useCommentPanel();
  const { user } = useAuth();
  const userName = user?.name;
  const initialLetter = userName?.toUpperCase().charAt(0);
  const {
    isUploading: isFileUploading,
    openFilePicker,
    handleFileChange,
    fileInputRef,
    attachmentsElement,
  } = useCommentFileUpload({
    mediaMetaData,
    onMediaChange: setMediaMetaData,
    noteId,
  });
  
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!editor) return null;

  // submit comment logic
  const handleSubmit = async (e?: React.FormEvent, closeAfterSubmit: boolean = false) => {
    e?.preventDefault();
  
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

  
    if (!selectedText) {
      toast.error("Select some text to comment on.");
      return;
    }
    const newCommentId = new ObjectId();
    const commentId =  `${newCommentId}`
   
  
    try {
      const res = await postWithAuth("/api/database/comments/inline/add", {
        chatId: commentId,
        noteId,
        text: commentText,
        mediaMetaData: mediaMetaData.length > 0 ? mediaMetaData : undefined,
      });
  
      if (res?.comment.success) {
        const commentId = res?.comment?.comment?._id;
        console.log("printing the comment ID -->", commentId);
        editor.chain().focus().setTextSelection({ from, to }).setMark("commentMark", { commentId: commentId})
        .run(); 

        // add it instantly to context so it's visible in panel
        addComment(res?.comment.comment);

        toast.success("Comment added");
        setCommentText("");
        setMediaMetaData([]);
        if (closeAfterSubmit) onOpenChange(false);
      } else {
        toast.error("Failed to save comment");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save comment");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(undefined, true); 
    }
  };

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="gap-2 rounded-none border-none hover:bg-accent"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm">Comment</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent sideOffset={10} align="start" className="p-2 w-full bg-background">
        <form onSubmit={(e) => handleSubmit(e, true)} className="flex gap-2">
          
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500">
              {initialLetter}
            </div>
          </div>

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Add a comment"
            className="flex-1 rounded-md bg-background p-1 text-sm outline-none"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => openFilePicker(e)}
              aria-label="Attach file"
              className={clsx(
                "flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/10",
                isFileUploading && "cursor-wait"
              )}
              disabled={isFileUploading}
            >
              {isFileUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() =>  handleSubmit(undefined, true)}
              disabled={!commentText.trim() && mediaMetaData.length === 0}
              aria-label="Send comment"
              className={clsx(
                "flex items-center justify-center h-6 w-6 rounded-full transition-all duration-150 shrink-0",
                (commentText.trim() || mediaMetaData.length > 0)
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-default dark:bg-[#2c2c2c] dark:text-gray-500 border border-gray-200 dark:border-[#343434]"
              )}
            >
              <ArrowUp className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </form>
        
        {/* File upload component */}
        {attachmentsElement && <div className="mt-2">{attachmentsElement}</div>}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          accept=".png,.jpg,.jpeg,.pdf,.txt"
        />
      </PopoverContent>
    </Popover>
  );
};
