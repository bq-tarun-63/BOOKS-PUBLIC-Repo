"use client";

import { BellIcon, XCircleIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NotificationRequestRejectedProps {
  createdByName: string;
  workspaceName: string;
  createdAt: string;
}

export default function NotificationRequestRejected({
  createdByName,
  workspaceName,
  createdAt,
}: NotificationRequestRejectedProps) {
  return (
    <div className="flex items-start space-x-3 rounded-lg p-4 ">
      {/* Icon */}
      <div className="flex-shrink-0">
        <XCircleIcon className="h-8 w-8 text-red-500" />
      </div>

      {/* Content */}
      <div className="flex-1 text-sm text-gray-800 dark:text-gray-200">
        <p className="font-medium text-red-700 dark:text-red-400">
          Request Rejected
        </p>
        <p className="mt-1">
          Your request to join the workspace{" "}
          <span className="font-semibold">{workspaceName}</span> was rejected by{" "}
          <span className="font-semibold">{createdByName}</span>.
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
