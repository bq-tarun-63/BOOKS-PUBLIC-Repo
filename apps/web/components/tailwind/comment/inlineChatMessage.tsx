"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Paperclip, Download } from "lucide-react";

interface ChatMessageProps {
  chat: {
    commenterName: string;
    text: string;
    createdAt?: string;
    mediaMetaData?: Array<{
      id: string;
      name: string;
      url: string;
      size?: number;
      mimeType?: string;
      uploadedAt?: string;
    }>;
  };
  isParent?: boolean;
  hideTimestamp?: boolean; 
}

export const InlineChatMessage: React.FC<ChatMessageProps> = ({ chat, isParent, hideTimestamp=false}) => {
  const initials = chat.commenterName?.[0]?.toUpperCase() || "?";
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div
        className={` flex-shrink-0 w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 ${
          isParent ? "bg-indigo-100 text-indigo-600" : "bg-gray-200 text-gray-600"
        }`}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {chat.commenterName}
          </p>
          {chat.createdAt && !hideTimestamp && (
            <p className="m-0 text-[11px] text-gray-500 group-hover:opacity-0 transition-opacity duration-200">
              {formatDistanceToNow(new Date(chat.createdAt), {
                addSuffix: true,
              })}
            </p>
          )}
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-400 mt-1 leading-snug">{chat.text}</p>
        {/* Media attachments */}
        {chat.mediaMetaData && chat.mediaMetaData.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {chat.mediaMetaData.map((file) => (
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
    </div>
  );
};
