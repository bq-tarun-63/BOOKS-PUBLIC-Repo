import  { type Node } from "@/types/note";
import { deleteWithAuth, getWithAuth, putWithAuth } from "@/lib/api-helpers";

export default function useNoteActions() {
  const UpdateNote = async (
    id: string,
    title: string,
    parentId: string | null = null,
    icon: string | null = null,
  ): Promise<Node[] | null> => {
    try {
      const responseObject = await putWithAuth("/api/note/updateNote", {
        id,
        title,
        parentId,
        icon,
      });

      if ("error" in responseObject) {
        console.error("Error updating note:", responseObject.error);
        return null;
      }

      const data = await getWithAuth<Node[]>("/api/note/getNoteParent");
      if (!Array.isArray(data)) {
        console.error("Unexpected response:", data);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Error in UpdateNote:", err);
      return null;
    }
  };

  const DeleteNote = async (noteId: string): Promise<Node[] | null> => {
    try {
      const response = await deleteWithAuth<true | any>(`/api/note/deleteNote/${noteId}`);

      if ("isError" in response) {
        console.error("Error deleting note:", response.message);
        return null;
      }

      const data = await getWithAuth<Node[]>("/api/note/getNoteParent");
      if (!Array.isArray(data)) {
        console.error("Unexpected response:", data);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Error in DeleteNote:", err);
      return null;
    }
  };

  const MoveNote = async (noteId: string, isPublicNote: boolean, isRestrictedPage: boolean): Promise<Node[] | null> => {
    try {
      const response = await putWithAuth("/api/note/togglePublicNote", {
        noteId,
        isPublicNote,
        isRestrictedPage,
      });

      if ("isError" in response) {
        console.error("Error deleting note:", response.message);
        return null;
      }

      const data = await getWithAuth<Node[]>("/api/note/getNoteParent");
      if (!Array.isArray(data)) {
        console.error("Unexpected response:", data);
        return null;
      }
      return data;
    } catch (err) {
      console.error("Error in Moving Note ", err);
      return null;
    }
  };

  return {
    UpdateNote,
    DeleteNote,
    MoveNote,
  };
}
