import { Loader2, Smile } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useState } from "react";

interface NoteModalProps {
  isLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  setTitle: (val: string) => void;
  selectedEmoji: string;
  setSelectedEmoji: (emoji: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (val: boolean) => void;
  isEdit?: boolean;
  isPublicPage: boolean;
  setIsRestrictedPage: (val: boolean) => void;
  isRestrictedPage:boolean;
}

export default function NoteModal({
  isLoading,
  onClose,
  onSubmit,
  title,
  setTitle,
  selectedEmoji,
  setSelectedEmoji,
  showEmojiPicker,
  setShowEmojiPicker,
  isPublicPage,
  setIsRestrictedPage,
  isRestrictedPage,
  isEdit = false,
}: NoteModalProps) {

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="relative bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg w-[400px] max-w-full">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {isEdit ? "Update Page Title" : "Add New Page"}
        </h2>
        {isEdit && (
          <div className="flex items-center mb-4 relative">
          <input
            type="text"
            placeholder="Enter title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) onSubmit();
            }}
            className="w-full p-2 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white pl-10"
          />
          <div className="absolute left-2 flex items-center">
            {selectedEmoji ? (
              <span
                className="text-xl cursor-pointer"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                {selectedEmoji}
              </span>
            ) : (
              <Smile
                className="w-5 h-5 text-gray-500 cursor-pointer"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              />
            )}
          </div>

          {showEmojiPicker && (
            <div className="absolute z-10 top-full left-0 mt-1">
              <EmojiPicker
                onEmojiClick={(e) => {
                  setSelectedEmoji(e.emoji);
                  setShowEmojiPicker(false);
                }}
                height={350}
                width={300}
                theme={window.localStorage.getItem("theme") === "dark" ? Theme.DARK : Theme.LIGHT}
              />
            </div>
          )}
          </div>
        )}
       
        {isPublicPage && (
          <div className="mb-4 space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="access"
                value="public"
                checked={!isRestrictedPage}
                onChange={() => setIsRestrictedPage(false)}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-900 dark:text-gray-200 font-medium">
                Public to Everyone
              </span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
              All users can read and write to this page.
            </p>

            <label className="flex items-center space-x-2 mt-1">
              <input
                type="radio"
                name="access"
                value="restricted"
                checked={isRestrictedPage}
                onChange={() => setIsRestrictedPage(true)}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-900 dark:text-gray-200 font-medium">
                Restricted
              </span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
              Only you can edit this page. Others will have read-only access.
            </p>
          </div>

        )}

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-white"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white flex items-center justify-center min-w-[60px]"
            onClick={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
