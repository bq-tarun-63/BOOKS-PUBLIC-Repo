// utils/formatTime.ts
export function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds
  
    if (diff < 60) {
      return `${Math.floor(diff)}s ago`;
    } else if (diff < 3600) {
      return `${Math.floor(diff / 60)}m ago`;
    } else if (diff < 86400) {
      return `${Math.floor(diff / 3600)}h ago`;
    } else if (diff < 172800) {
      return "Yesterday";
    } else if (diff < 604800) {
      return `${Math.floor(diff / 86400)}d ago`;
    } else {
      // If older than a week, show date in readable format
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  