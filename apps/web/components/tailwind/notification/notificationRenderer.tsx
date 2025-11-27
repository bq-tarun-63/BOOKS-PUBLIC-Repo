import NotificationJoin from "@/components/tailwind/notification/notificationJoin";
import NotificationMention from "@/components/tailwind/notification/notificationMention";
import NotificationRequestAccepted from "@/components/tailwind/notification/notificationRequestAccepted"
import NotificationRequestRejected from "@/components/tailwind/notification/notificationRequestRejected"
import NotificationAssign from "@/components/tailwind/notification/notificationAssign"

// import NotificationSharedNote from "./NotificationSharedNote";
// import NotificationStatusUpdate from "./NotificationStatusUpdate";
// import NotificationWorkspaceRequest from "./NotificationWorkspaceRequest";

import {  CreatedBy, Notification } from "@/types/notification";

export default function NotificationRenderer({
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
  switch (notification.type) {
    case "JOIN":
      return (
        <NotificationJoin
          notification={notification}
          handleAccept={handleAccept}
          handleReject={handleReject}
          responded={responded}
        />
      );
    
    case "MENTION":
      return <NotificationMention 
      key={notification._id}
      createdByName={notification.createdBy.userName || "Unknown User"}
      noteTitle={notification.noteTitle}
      noteId={notification.noteId}
      workspaceName={notification.workspaceName}
      createdAt={notification.createdAt}
      />;

    case "ACCEPT":
      return (
        <NotificationRequestAccepted
          key={notification._id}
          createdByName={notification.createdBy.userName || "Unknown User"}
          workspaceName={notification.workspaceName}
          createdAt={notification.createdAt}
        />
      );

    case "REJECT":
      return (
        <NotificationRequestRejected
          key={notification._id}
          createdByName={notification.createdBy.userName || "Unknown User"}
          workspaceName={notification.workspaceName}
          createdAt={notification.createdAt}
        />
      );

      case "ASSIGN": 
      return (
        <NotificationAssign notification={notification} />
      );


    // case "shared-note":
    //   return <NotificationSharedNote notification={notification} />;

    // case "status-update":
    //   return <NotificationStatusUpdate notification={notification} />;

    // case "workspace-request":
    //   return <NotificationWorkspaceRequest notification={notification} />;

    default:
      return (
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {notification.message}
        </p>
      );
  }
}
