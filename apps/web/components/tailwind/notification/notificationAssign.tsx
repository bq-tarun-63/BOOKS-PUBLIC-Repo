import { Notification } from "@/types/notification";
import { formatTimeAgo } from "@/services-frontend/notificationService/notificationServices";

interface NotificationAssignProps {
  notification: Notification;
}

export default function NotificationAssign({ notification }: NotificationAssignProps) {
  const displayName = notification.createdBy?.userName || "System";
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center">
          <span className="text-sm font-semibold">
            {firstLetter}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {displayName}
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Assigned you to the note{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {notification.noteTitle || "Untitled Note"}
            </span>{" "}
            in{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {notification.workspaceName}
            </span>{" "}
            workspace
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {notification.createdAt ? formatTimeAgo(notification.createdAt) : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

