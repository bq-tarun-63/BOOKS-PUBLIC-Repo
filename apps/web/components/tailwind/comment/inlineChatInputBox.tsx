"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import { ArrowUp, Paperclip, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useCommentPanel } from "@/contexts/inlineCommentContext";
import MentionList from "../mention-list";
import { useCommentFileUpload, type MediaMetaData } from "./commentFileUpload";

interface InlineChatInputBoxProps {
  parentCommentId: string;
  noteId?: string;
}

export default function InlineChatInputBox({ parentCommentId, noteId }: InlineChatInputBoxProps) {
  const [text, setText] = useState("");
  const [mentionMap, setMentionMap] = useState<Map<string, string>>(new Map());
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mediaMetaData, setMediaMetaData] = useState<MediaMetaData[]>([]);
  const textareaRef = useRef<HTMLDivElement>(null);
  const { addChatReply, comments } = useCommentPanel();
  const { user } = useAuth();
  
  // Get noteId from comment if not provided
  const resolvedNoteId = noteId || comments.find((c) => c._id === parentCommentId)?.noteId;
  const {
    isUploading: isFileUploading,
    openFilePicker,
    handleFileChange,
    fileInputRef,
    attachmentsElement,
  } = useCommentFileUpload({
    mediaMetaData,
    onMediaChange: setMediaMetaData,
    noteId: resolvedNoteId,
  });

  // Auto-grow height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  // Get cursor position
  const getCursorPosition = (el: HTMLDivElement): number => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length;
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerText;
    setText(content);

    // Detect mentions
    const cursorPos = getCursorPosition(e.currentTarget);
    const textBefore = content.slice(0, cursorPos);
    const match = textBefore.match(/@([\w]*)$/);
    if (match) {
      setMentionQuery(match[1] || "");
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (mentionUser: { id: string; label: string }) => {
    if (!textareaRef.current) return;

    const cursorPos = getCursorPosition(textareaRef.current);
    const textBefore = text.slice(0, cursorPos);
    const textAfter = text.slice(cursorPos);
    const updated = textBefore.replace(/@[\w]*$/, `@${mentionUser.label} `) + textAfter;

    setText(updated);
    const newMap = new Map(mentionMap);
    newMap.set(mentionUser.label, mentionUser.id);
    setMentionMap(newMap);
    setShowMentions(false);

    // restore cursor
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSubmit = () => {
    if (!text.trim() && mediaMetaData.length === 0) return;

    let textToStore = text.trim();
    mentionMap.forEach((userId, name) => {
      const regex = new RegExp(`@${name}(?!\\])`, "g");
      textToStore = textToStore.replace(regex, `@[${name}](${userId})`);
    });

    addChatReply(parentCommentId, textToStore, mediaMetaData.length > 0 ? mediaMetaData : undefined);
    setText("");
    setMentionMap(new Map());
    setMediaMetaData([]);
    if (textareaRef.current) textareaRef.current.innerHTML = "";
  };

  const initialLetter = user?.name?.toUpperCase().charAt(0) ?? "?";

  return (
    <div className="flex flex-col w-full cursor-text">
      <div className="flex items-start">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1 mr-2 p-1">
          <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500">
            {initialLetter}
          </div>
        </div>

        {/* Input container */}
        <div className="flex-1 min-w-0 text-sm flex flex-wrap items-start bg-transparent p-[2px] gap-[4px_6px]">
          <div className="relative flex-1 min-w-0 text-sm bg-transparent p-[2px]">
            <div
              ref={textareaRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Add a reply"
              className="flex-grow min-h-[24px] w-full outline-none resize-none text-gray-800 dark:text-gray-100 leading-5 whitespace-pre-wrap"
              onInput={handleInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />

            {showMentions && (
              <div className="absolute left-10 top-full z-50">
                <MentionList query={mentionQuery} command={handleMentionSelect} />
              </div>
            )}

            {text.trim() === "" && (
              <p className="absolute top-[2px] left-[2.5px] text-gray-400 dark:text-gray-500 pointer-events-none select-none">
                Add a reply…
              </p>
            )}
          </div>

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
              onClick={handleSubmit}
              disabled={!text.trim() && mediaMetaData.length === 0}
              className={clsx(
                "flex items-center justify-center h-6 w-6 rounded-full transition-all duration-150",
                (text.trim() || mediaMetaData.length > 0)
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-200 text-gray-400 cursor-default dark:bg-[#2c2c2c] dark:text-gray-500 border border-gray-200 dark:border-[#343434]"
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* File upload preview */}
      {attachmentsElement && <div className="ml-8">{attachmentsElement}</div>}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".png,.jpg,.jpeg,.pdf,.txt"
      />
    </div>
  );
}
