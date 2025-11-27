"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import { ArrowUp, Paperclip, Loader2 } from 'lucide-react'
import clsx from "clsx";
import MentionList from "../mention-list";
import { useCommentFileUpload, type MediaMetaData } from "./commentFileUpload";

interface CommentInputBoxProps {
  onSubmit: (text: string, mediaMetaData?: MediaMetaData[]) => void;
  noteId?: string;
}

export default function CommentInputBox({ onSubmit, noteId }: CommentInputBoxProps) {
  const [text, setText] = useState("");
  const [mentionMap, setMentionMap] = useState<Map<string, string>>(new Map()); // name -> userId
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mediaMetaData, setMediaMetaData] = useState<MediaMetaData[]>([]);
  const textareaRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
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
 
 
  // Auto-grow height like Books by Betaque 
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  // Helper to get cursor position in contentEditable
  const getCursorPosition = (element: HTMLDivElement): number => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    return preCaretRange.toString().length;
  };

  // Helper to set cursor position in contentEditable
  const setCursorPosition = (element: HTMLDivElement, position: number) => {
    const selection = window.getSelection();
    const range = document.createRange();
    
    let currentPos = 0;
    let found = false;
    
    function traverse(node: Node) {
      if (found) return;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0;
        if (currentPos + textLength >= position) {
          range.setStart(node, position - currentPos);
          range.collapse(true);
          found = true;
          return;
        }
        currentPos += textLength;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          const childNode = node.childNodes[i];
          if (childNode) {
            traverse(childNode);
            if (found) return;
          }
        }
      }
    }
    
    traverse(element);
    
    if (found) {
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  // Helper to render text with blue mentions
  const renderTextWithMentions = (plainText: string) => {
    if (!textareaRef.current) return;
    
    const parts: Array<{ type: 'text' | 'mention'; content: string }> = [];
    let lastIndex = 0;
    
    // Find all @mentions
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = mentionRegex.exec(plainText)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: plainText.slice(lastIndex, match.index)
        });
      }
      
      // Add mention
      parts.push({
        type: 'mention',
        content: match[0] // includes @
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < plainText.length) {
      parts.push({
        type: 'text',
        content: plainText.slice(lastIndex)
      });
    }
    
    // Clear and rebuild with styled content
    textareaRef.current.innerHTML = '';
    parts.forEach(part => {
      if (part.type === 'mention') {
        const div = document.createElement('div');
        div.textContent = part.content;
        div.className = 'text-blue-600 dark:text-blue-400 font-medium';
        div.style.display = 'inline';
        textareaRef.current!.appendChild(div);
      } else {
        textareaRef.current!.appendChild(document.createTextNode(part.content));
      }
    });
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerText;
    setText(content);

    // Get cursor position
    const cursorPos = getCursorPosition(e.currentTarget);
    const textBeforeCursor = content.slice(0, cursorPos);
    
    // Check for @ mention before cursor 
    const match = textBeforeCursor.match(/@([\w]*)$/);
    if (match) {
      setMentionQuery(match[1] || "");
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (mentionUser) => {
    if (!textareaRef.current) return;
    
    const cursorPos = getCursorPosition(textareaRef.current);
    const textBeforeCursor = text.slice(0, cursorPos);
    const textAfterCursor = text.slice(cursorPos);

    // Replace @query with @username
    const updatedBefore = textBeforeCursor.replace(/@[\w]*$/, `@${mentionUser.label} `);
    
    const newText = updatedBefore + textAfterCursor;
    setText(newText);

    // Store the mention mapping
    const newMentionMap = new Map(mentionMap);
    newMentionMap.set(mentionUser.label, mentionUser.id);
    setMentionMap(newMentionMap);

    // Render with blue styling
    renderTextWithMentions(newText);
    
    setShowMentions(false);
    
    // Set cursor after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        setCursorPosition(textareaRef.current, updatedBefore.length);
      }
    }, 0);
  };


  const handleSubmit = async () => {
    if (!text.trim() && mediaMetaData.length === 0) return;
    // Convert to stored format
    let textToStore = text.trim();
    mentionMap.forEach((userId, name) => {
      const regex = new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\])`, 'g');
      textToStore = textToStore.replace(regex, `@[${name}](${userId})`);
    });
    
    onSubmit(textToStore, mediaMetaData.length > 0 ? mediaMetaData : undefined);
    setText("");
    setMentionMap(new Map());
    setMediaMetaData([]);
    if (textareaRef.current) textareaRef.current.innerHTML = "";
  };

  const initialLetter = user?.name?.toUpperCase().charAt(0);

  return (
    <div className="flex flex-col w-full cursor-text">
      <div className="flex items-start flex-grow">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1 mr-2 p-1">
          <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500">
            {initialLetter}
          </div>
        </div>

        {/* Editable input container */}
        <div
          className={clsx(
            "flex-1 min-w-0 text-sm mt-1 flex flex-wrap items-start bg-transparent p-[2px] gap-[4px_6px]"
          )}
        >        
          {/* Input field */}
          <div className="relative flex-1 min-w-0 text-sm bg-transparent p-[2px]">
            {/* Editable field */}
            <div
              ref={textareaRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Add a comment"
              className="flex-grow min-h-[24px] w-full outline-none resize-none text-gray-800 dark:text-gray-100 leading-5 whitespace-pre-wrap relative z-10"
              style={{ padding: "2.5px", margin: "-2.5px" }}
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

            {/* Placeholder overlay */}
            {text.trim() === "" && (
              <p className="absolute top-[2px] left-[2.5px] text-gray-400 dark:text-gray-500 pointer-events-none select-none z-0 transition-opacity duration-150 m-0">
                Add a comment…
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
            {/* Post button */}
            <button
              onClick={handleSubmit}
              disabled={!text.trim() && mediaMetaData.length === 0}
              aria-label="Send comment"
              className={clsx(
                "flex items-center justify-center h-6 w-6 rounded-full transition-all duration-150",
                (text.trim() || mediaMetaData.length > 0)
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-default dark:bg-[#2c2c2c] dark:text-gray-500 border border-gray-200 dark:border-[#343434]"
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {/* Attachments preview */}
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
