"use client";

import { CheckCircleIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NotificationRequestAcceptedProps {
  createdByName: string;
  workspaceName: string;
  createdAt: string;
}

export default function NotificationRequestAccepted({
  createdByName,
  workspaceName,
  createdAt,
}: NotificationRequestAcceptedProps) {
  return (
    <div className="flex items-start space-x-3 rounded-lg p-4">
      {/* Icon */}
      <div className="flex-shrink-0">
        <CheckCircleIcon className="h-8 w-8 text-green-500" />
      </div>

      {/* Content */}
      <div className="flex-1 text-sm text-gray-800 dark:text-gray-200">
        <p className="font-medium text-green-700 dark:text-green-400">
          Request Accepted
        </p>
        <p className="mt-1">
          Your request to join the workspace{" "}
          <span className="font-semibold">{workspaceName}</span> was accepted by{" "}
          <span className="font-semibold">{createdByName}</span>.
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
