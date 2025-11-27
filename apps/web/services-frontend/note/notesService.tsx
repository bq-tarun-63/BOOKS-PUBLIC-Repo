import { getWithAuth, postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";

export async function fetchNote(editorKey: string, commitSha = "", commitPath = "") {
  return getWithAuth(`/api/note/getNote/${editorKey}`, {
    headers: {
      "include-content": "true",
      commitSha: `${commitSha}`,
      commitPath: `${commitPath}`,
    },
  });
}

export async function publishNote(editorKey: string) {

  try {
    const response = await postWithAuth(`/api/note/publishNote`, {
      id: editorKey,
    });

    if ("isError" in response && response.isError) {
      const errorResponse = response as any;
      toast.error(errorResponse.message || "Failed to Publish. Please try again.");
      return;
    }
    return response;
  } catch (error) {
    console.error("Error in Publishing:", error);
    toast.error("There is an error in publishing. Please check your connection and try again.");
  } 
}

export async function inviteToNote(editorKey: string, sharedWith: any, isPublic: string) {
  try {
    const response = await postWithAuth(`/api/note/share/${editorKey}`, {
      noteId: editorKey,
      sharedWith,
      isPublic,
    });

    // Check if response is an error
    if ("isError" in response && response.isError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorResponse = response as any;
      toast.error(errorResponse.message || "Failed to send invites. Please try again.");
      return;
    }
    toast.success("Invitation Sent");
    return response;
  } catch (err) {
    console.error("Error sending invites:", err);
    toast.error("Network error. Please check your connection and try again.");
  }
}

export async function approveNote(editorKey: string, approved: boolean, email: string) {
  try {
    if (!email) {
      toast.error("Could not determine note owner. Please try publishing again.");
      return;
    }

    const response = await postWithAuth(`/api/note/give-approval`, {
      noteId: editorKey,
      approved,
      email,
    });

    // Check if response is an error
    if ("isError" in response && response.isError) {
      toast.error((response.message as any) || "Failed to Approve or Reject. Please try again.");
      return;
    }

    toast.success((response.message as any) || "Action successful!");
    return response;
  } catch (error) {
    console.error("Error in Approval:", error);
    toast.error("There was an error. Please check your connection and try again.");
  }
}