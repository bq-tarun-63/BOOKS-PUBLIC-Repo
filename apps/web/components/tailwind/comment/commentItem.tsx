"use client";

import { useAuth } from "@/hooks/use-auth";
import { Comment } from "@/types/board";
import { Pencil, Trash, X, ArrowUp, Paperclip, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DeleteConfirmationModal from "../ui/deleteConfirmationModal";
import MentionList from "../mention-list";


interface CommentItemProps {
  comment: Comment;
  onEditComment?: (commentId: string, newText: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

// Helper to extract mention map from stored text
function extractMentionMap(text: string): Map<string, string> {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const map = new Map<string, string>();
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    map.set(match[1], match[2]); // name -> userId
  }
  
  return map;
}

// Helper to parse mentions and render them as clickable @mentions
function MentionText({ text, onMentionClick }: { text: string; onMentionClick?: (userId: string) => void }) {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: Array<{ type: 'text' | 'mention'; content?: string; name?: string; userId?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    
    // Add mention
    parts.push({
      type: 'mention',
      name: match[1],
      userId: match[2]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }
  
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }
  
  return (
    <div className="inline">
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <button
              key={index}
              onClick={() => onMentionClick?.(part.userId!)}
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer inline-block bg-transparent border-0 p-0"
              title={`View ${part.name}'s profile`}
              type="button"
            >
              @{part.name}
            </button>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </div>
  );
}

export default function CommentItem({
  comment,
  onEditComment,
  onDeleteComment,
}: CommentItemProps) {

  const [isEditing , setIsEditing ] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [mentionMap, setMentionMap] = useState<Map<string, string>>(new Map());
  const [cursorPosition, setCursorPosition] = useState(0);
  const editRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { user } = useAuth();
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);


  // click outside to cancel edit 
  useEffect(() => {
    function handleClickOutside(e: MouseEvent){
      if(isEditing && editRef.current && !editRef.current.contains(e.target as Node)){
        setIsEditing(false);
        setDraftText("");
        setMentionMap(new Map());
        setShowMentions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  },[isEditing, comment.text]);

    // 🧠 Auto expand textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [draftText, isEditing]);


  const handleSave = () => {
    if(onEditComment &&  draftText.trim()){
      // Convert display format back to stored format: @Name → @[Name](userId)
      let textToStore = draftText.trim();
      mentionMap.forEach((userId, name) => {
        const regex = new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\])`, 'g');
        textToStore = textToStore.replace(regex, `@[${name}](${userId})`);
      });
      
      if (textToStore !== comment.text) {
        onEditComment(comment.commentId, textToStore);
      }
    }
    setIsEditing(false);
    setShowMentions(false);
    setMentionMap(new Map());
    setDraftText("");
  }

  const handleCancel = () => {
    setIsEditing(false);
    setDraftText("");
    setMentionMap(new Map());
    setShowMentions(false);
  }

  const handleDelete = () => {
    if (onDeleteComment) onDeleteComment(comment.commentId);
    setShowDeleteModal(false);
  };

  const handleEditClick = () => {
    // Convert stored format to display format 
    const displayText = comment.text.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '@$1');
    const map = extractMentionMap(comment.text);
    setDraftText(displayText);
    setMentionMap(map);
    setIsEditing(true);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setDraftText(content);
    setCursorPosition(cursor);

    // Check for @ mention before cursor 
    const textBeforeCursor = content.slice(0, cursor);
    const match = textBeforeCursor.match(/@([\w]*)$/);
    if (match) {
      setMentionQuery(match[1] || "");
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (mentionUser) => {
    const textBeforeCursor = draftText.slice(0, cursorPosition);
    const textAfterCursor = draftText.slice(cursorPosition);
    
    // Replace @query with @Name (display format)
    const updatedBefore = textBeforeCursor.replace(/@[\w]*$/, `@${mentionUser.label} `);
    
    const newText = updatedBefore + textAfterCursor;
    setDraftText(newText);
    
    // Store the mention mapping
    const newMentionMap = new Map(mentionMap);
    newMentionMap.set(mentionUser.label, mentionUser.id);
    setMentionMap(newMentionMap);
    
    setShowMentions(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = updatedBefore.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleMentionClick = (userId: string) => {
    console.log("Navigate to user:", userId);
  };

  const initials = comment.commenterName?.charAt(0)?.toUpperCase() || "?";
  const isOwnerofComment = comment.commenterEmail === user?.email ? true : false;
  const isEdited = comment.updatedAt && comment.updatedAt !== comment.createdAt;

  return (
    <div className="group relative flex gap-3 pl-[2px]">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-[36px] bottom-0 w-[1.5px] bg-gray-200 dark:bg-gray-700" />

      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500">
          {initials}
        </div>
      </div>

      {/* Comment body */}
      <div className="flex-1" ref={editRef}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {comment.commenterName}
            </div>
            <div className="text-[11px] text-gray-500">
              {new Date(comment.createdAt).toLocaleString([], {
                hour: "2-digit",
                minute: "2-digit",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
            {isEdited && (
              <div className="text-[11px] text-gray-400 italic">(edited)</div>
            )}
          </div>

          {/* Hover actions */}
          {!isEditing && isOwnerofComment && (
            <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity bg-white dark:bg-[#2c2c2c] p-0.5 border border-gray-200 dark:border-[#343434] rounded-md">
              <button
                title="Edit"
                className="hover:bg-gray-200 dark:hover:bg-[#202020] p-1 rounded"
                onClick={handleEditClick}
              >
                <Pencil size={14} className="text-gray-500 dark:text-gray-400" />
              </button>
              <button
                title="Delete"
                className="hover:bg-gray-200 dark:hover:bg-[#202020] p-1 rounded"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash size={14} className="text-gray-500 dark:text-gray-400 hover:text-red-400" />
              </button>
            </div>
          )}
        </div>

        {/* Comment text or edit box */}
        {isEditing ? (
          <div className="mt-1 ml-1 relative">
            <div className="flex items-start gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={draftText}
                  onChange={handleTextChange}
                  className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none resize-none overflow-hidden"
                  style={{
                    // Apply blue color to mentions using CSS
                    backgroundImage: draftText.match(/@[\w\s]+/g) ? 'none' : 'none'
                  }}
                  rows={1}
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-1 mt-[2px]">
                <button
                  onClick={handleSave}
                  className="p-[3px] rounded-full bg-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-[3px] rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {showMentions && (
              <div className="absolute left-2 top-full z-50 mt-1">
                <MentionList query={mentionQuery} command={handleMentionSelect} />
              </div>
            )}
          
          </div>
        ) : (
          <div className="mt-1 ml-1">
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-5">
              <MentionText text={comment.text} onMentionClick={handleMentionClick} />
            </div>
            {/* Media attachments */}
            {comment.mediaMetaData && comment.mediaMetaData.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {comment.mediaMetaData.map((file) => (
                  <div
                    key={file.id}
                    className="group flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-white/5 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-gray-500" />
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={file.name}
                      className="max-w-[120px] truncate hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {file.name}
                    </a>
                    <button
                      type="button"
                      className="rounded p-0.5 text-gray-500 transition hover:bg-gray-300 hover:text-gray-900 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const response = await fetch(file.url);
                          const blob = await response.blob();
                          const blobUrl = window.URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = blobUrl;
                          link.download = file.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(blobUrl);
                        } catch (error) {
                          console.error("Failed to download file:", error);
                        }
                      }}
                      aria-label={`Download ${file.name}`}
                    >
                      <Download className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        header="Delete Comment"
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
