import { useState, useEffect, useRef } from "react";
import { Bell, X , Loader2} from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/use-notifications";
import { useNotificationsContext } from "@/contexts/notification/notificationContext";
import { CreatedBy } from "@/types/notification";
import { postWithAuth } from "@/lib/api-helpers";
import NotificationRenderer from "@/components/tailwind/notification/notificationRenderer";

export default function NotificationModal() {
  const [open, setOpen] = useState<boolean>(false);
  const [isLoading , setIsLoading] = useState<boolean>(true);

  const [isMarkingAsRead, setIsMarkingAsRead] = useState<boolean>(false);
  const [respondedMap, setRespondedMap] = useState<Record<string, boolean>>({});

  const { notifications,fetchNotifications, unreadCount, setNotifications } = useNotificationsContext()
  const { decideJoinRequest } = useNotifications();

  const modalRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (isMarkingAsRead) {
        return;
      }
      if (modalRef.current &&
          !modalRef.current.contains(e.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(e.target as Node)
        ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, isMarkingAsRead]);
  // Close on Esc key
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  const handleNotificationClick = async() => {
    setIsLoading(true)
    try{
      const response = await fetchNotifications()
    }
    catch(error){
      console.log(error)
    }
    finally{
      setIsLoading(false);
    }
  }

  const handleAccept = async (notificationId: string , sentTo: CreatedBy[], workspaceId: string) => {
    const type = 'ACCEPT'
    const message = 'Request to join workspace Accepted';
    try{
      const response = await postWithAuth('/api/notification/add' , {
        notificationId,
        sentTo,
        type,
        workspaceId,
        message
      })

      if ("error" in response || "message" in response) {
        return null;
      }

      setRespondedMap(prev => ({ ...prev, [notificationId]: true }));

      // push notification
      decideJoinRequest(response.notification)

      // setNotifications(prev => prev.map(n =>
      //   n._id === notificationId ? { ...n, read: true } : n
      // ));

      toast.success("Accepted Successfully");
    }
    catch(error){
      console.log(error)
    }
  };

  const handleReject = async (notificationId: string,  sentTo: CreatedBy[], workspaceId: string) => {
     const type = 'REJECT'
     const message = 'Request to join workspace Rejected';

    try{
      const response = await postWithAuth('/api/notification/add' , {
        notificationId,
        sentTo,
        type,
        workspaceId,
        message
      })

      if ("error" in response || "message" in response) {
        return null;
      }

      setRespondedMap(prev => ({ ...prev, [notificationId]: true }));

      // push notification
      decideJoinRequest(response.notification)

      // setNotifications(prev => prev.map(n =>
      //   n._id === notificationId ? { ...n, read: true } : n
      // ));
      toast.success("Rejected Request");
    }
    catch(error){
      console.log(error)
    }
    
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsMarkingAsRead(true);
    try {
      setNotifications(prev => prev.filter(n => n._id !== notificationId));

      const response = await postWithAuth("/api/notification/read/one", {
        notificationId,
      });
      if ("error" in response || "message" in response) {
        return;
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (notifications.length === 0) return;
    setIsMarkingAsRead(true);
    try {
      // Filter notifications before setting
      setNotifications((prev) =>
        prev.filter((n) => {
          if (n.type === "JOIN") {
            // keep JOIN notifications that are not yet responded
            const isResponded = n.responsed || respondedMap[n._id];
            return !isResponded;
          }
          // hide all other notifications
          return false;
        })
      );

      const response = await postWithAuth("/api/notification/read/all", {});
      if ("error" in response || "message" in response) {
        return;
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          if(!open){
            console.log("in the notification call fuction ")
            handleNotificationClick();
          }
          setOpen(!open)
        }}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-gray-600 text-white text-xs font-medium rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Modal - Positioned below the button */}
      {open && (
        <div className="fixed inset-0 z-50 md:absolute md:inset-auto md:right-0 md:top-12">
          {/* Backdrop - Only for mobile */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Modal Box */}
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 mt-2 w-80 sm:w-96 md:w-[28rem] lg:max-w-[50vw] xl:max-w-[40vw] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-hidden"
          >

            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => handleMarkAllAsRead(e)}
                  className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:underline"
                  disabled={unreadCount === 0}
                >
                  Mark all as read
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto max-h-[calc(80vh-57px)]">
              {isLoading ? (
                <div className="flex items-center justify-center p-10">
                  <Loader2 className="animate-spin w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((n) => (

                  <div key={n._id} className="flex justify-between items-start">
                    <NotificationRenderer
                      key={n._id}
                      notification={n}
                      handleAccept={handleAccept}
                      handleReject={handleReject}
                      responded={!!respondedMap[n._id]}
                    />

                      <button
                        onClick={(e) => handleMarkAsRead(e, n._id)}
                        className="p-2 pt-3 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="Mark as read"
                        disabled={isMarkingAsRead}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-gray-600 dark:text-gray-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                            stroke="currentColor"
                            fill="none"
                          />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                        </svg>
                      </button>

                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}