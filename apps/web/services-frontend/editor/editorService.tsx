import type { publishResponse } from "@/lib/api-helpers";
import { JSONContent } from "novel";
import { postWithAuth } from "@/lib/api-helpers";

interface SaveOnlineOptions {
  editorKey: string;
  content: JSONContent;
}

export function isEditorContentEmpty(json): boolean {
    if (!json || json.type !== "doc" || !Array.isArray(json.content)) {
      return true;
    }

    // Typical empty: a doc with one empty paragraph
    if (
      json.content.length === 1 &&
      json.content[0].type === "paragraph" &&
      (!json.content[0].content || json.content[0].content.length === 0)
    ) {
      return true;
    }

    // Fallback: no meaningful text nodes
    const hasText = JSON.stringify(json).includes("text");
    return !hasText;
}

export function isPublishResponse(response: unknown): response is  publishResponse{
  return (
    typeof response === "object" &&
    response !== null &&
    "approvalStatus" in response &&
    typeof (response as any).approvalStatus === "string"
  );
}

export async function saveContentOnline({
  editorKey,
  content,
}: SaveOnlineOptions): Promise<any> {
  try {    
    const pageName = `docs/notes/${editorKey}`;

    const response = await postWithAuth(
      "/api/note/uploadContent",
      {
        online_content: content,
        online_content_time: new Date(),
      },
      {
        headers: {
          "x-vercel-pagename": pageName,
        },
      }
    );

    if ("isError" in response && response.isError) {
      console.error("Error saving content online:", response.message);
      return response;
    }

    const updatedAt = response?.updatedAt;
    window.localStorage.setItem(`offline_content_time-${editorKey}`, JSON.stringify(updatedAt));
    window.localStorage.setItem(`last_content_update_time-${editorKey}`, JSON.stringify(updatedAt));

    return response;
  } catch (error) {
    console.error("Network error saving content online:", error);
    throw error;
  }
}
