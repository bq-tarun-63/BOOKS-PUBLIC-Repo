// hooks/useCommentMentions.ts
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { postWithAuth } from "@/lib/api-helpers";
import { Comment } from "@/types/board";

export function useCommentMentions() {
  const { currentWorkspace } = useWorkspaceContext();

  async function sendMentionNotifications(workspaceId: string, comment:Comment ,noteId: string, noteTitle: string) {

    const mentions = [...comment.text.matchAll(/@(\w+)/g)].map((m) => m[1]).filter((m): m is string => !!m);;
    if (mentions.length === 0) return;

    // Find userIds and emails from workspace members
    if (!currentWorkspace?.members) return;
    

    const sentTo = currentWorkspace.members
    .filter(member => 
      mentions.some(m => member.userName.toLowerCase().split(" ").includes(m.toLowerCase()))
    )
    .map(member => ({ userId: member.userId, userEmail: member.userEmail, userName: member.userName }));

    if (sentTo.length === 0) return;

    const type = "MENTION"
    try {
      const response = await postWithAuth("/api/notification/add", { 
        workspaceId,
        noteId,
        noteTitle,
        type,
        sentTo
      });

      if(!response.success){
        throw new Error("Failed to send mention notifications in DB");
      }

      return response.notification;

    } catch (err) {
      console.error("Failed to send mention notifications:", err);
    }
    return null;
  }

  return { sendMentionNotifications };
}
