// components/notifications/NotificationMention.tsx
"use client";

import { FC } from "react";
import { formatTimeAgo } from "@/services-frontend/notificationService/notificationServices";

interface NotificationMentionProps {
  createdByName: string; // e.g. "Atharv"
  noteTitle?: string;
  noteId? : string;
  workspaceName: string;
  createdAt: string;
}

const NotificationMention: FC<NotificationMentionProps> = ({
  createdByName,
  noteTitle,
  noteId,
  workspaceName,
  createdAt,
}) => {
  const firstLetter = createdByName?.charAt(0).toUpperCase() || "U";
  return (
    <div className="p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center">
          <span className="text-sm font-semibold">{firstLetter}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
            {createdByName}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Mentioned you in the note{" "}
            {noteId ? (
              <a
                href={`/notes/${noteId}`}
                className="font-bold text-blue-600 hover:underline"
              >
                {noteTitle}
              </a>
            ) : (
              <span className="font-semibold">a note</span>
            )}{" "}
            inside{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {workspaceName}
            </span>{" "}
            workspace.
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {createdAt ? formatTimeAgo(createdAt) : ""}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationMention;
