import React  from "react";
import { useState } from "react";
import { Smile } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";

export function PageTitleModal({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: { title: string; emoji: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {

  const [title, setTitle] = useState<string>("");
  const [emoji, setEmoji] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [theme, setTheme] = React.useState<Theme>(Theme.LIGHT);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("theme");
      setTheme(stored === "dark" ? Theme.DARK : Theme.LIGHT);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg w-[400px] max-w-full relative">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add New Page</h2>
        <div className="flex items-center mb-4 relative">
          <input
            type="text"
            placeholder="Enter title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!isLoading) {
                  onSubmit({ title, emoji });
                }
              }
            }}
            className="w-full p-2 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white pl-10"
          />
          <div className="absolute left-2 flex items-center">
            {emoji ? (
              <span className="text-xl cursor-pointer" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                {emoji}
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
                onEmojiClick={(emojiData) => {
                  setEmoji(emojiData.emoji);
                  setShowEmojiPicker(false);
                }}
                height={350}
                width={300}
                theme={theme}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ title, emoji })}
            disabled={isLoading || !title.trim()}
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
          >
            {isLoading ? "Loading..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
