
import { formatTimeAgo } from "@/services-frontend/notificationService/notificationServices";
import {  CreatedBy, Notification } from "@/types/notification";

export default function NotificationJoin({
  notification,
  handleAccept,
  handleReject,
  responded,
}: {
  notification: Notification;
  handleAccept: (id: string, sentTo: [CreatedBy], workspaceId: string) => void;
  handleReject: (id: string, sentTo: [CreatedBy], workspaceId: string) => void;
  responded: boolean;
}) {
  const displayName = notification.createdBy?.userName || "System";
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <div 
      key={notification._id}
      className="p-4 "
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center">
          <span className=" text-sm font-semibold">
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
            Request to join{" "}
            <span className="font-semibold text-gray dark:text-gray-100">
              {notification.workspaceName}
            </span>{" "}
            Workspace
          </p>
          {
          !notification.responsed && !responded &&  (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                  onClick={() => {
                    handleAccept(notification._id, [notification.createdBy], notification.workspaceId as string);
                  }}
                className="px-3 py-1 bg-gray-500 text-gray-200 text-xs rounded hover:bg-gray-700 transition"
              >
                Accept
              </button>
              <button
                type="button"
                  onClick={() => {
                    handleReject(notification._id, [notification.createdBy], notification.workspaceId as string);
                  }}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Reject
              </button>
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {notification.createdAt ? formatTimeAgo(notification.createdAt) : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
