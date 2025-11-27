import { useRef, useCallback } from 'react';
import { Note, ViewCollection } from '@/types/board';
import { JSONContent } from 'novel';
import { NoteResponse } from '@/types/advance-editor';
import { fetchNote } from '@/services-frontend/note/notesService';
import { saveContentOnline } from '@/services-frontend/editor/editorService';
import { defaultEditorContent } from '@/lib/content';
import { useBoard } from '@/contexts/boardContext';

interface UseBoardFunctionsProps {
  board: ViewCollection;
  setSelectedTask: React.Dispatch<React.SetStateAction<Note | null>>;
  setRightSidebarContent: React.Dispatch<React.SetStateAction<JSONContent | null>>;
  setIsClosing: React.Dispatch<React.SetStateAction<boolean>>;
  previousCardIdRef: React.MutableRefObject<string | null>;
}

const useBoardFunctions = ({
  board,
  setSelectedTask,
  setRightSidebarContent,
  setIsClosing,
  previousCardIdRef,
}: UseBoardFunctionsProps) => {
  const { setCurrentBoardNoteId} = useBoard();

  const handleCardClick = useCallback(async (card: Note) => {
    const currentEditorKey = card._id;
    const prevId = previousCardIdRef.current;

    previousCardIdRef.current = currentEditorKey;

    if (prevId) {
      const localTime = JSON.parse(window.localStorage.getItem(`offline_content_time-${prevId}`) ?? "null");
      const serverTime = JSON.parse(window.localStorage.getItem(`last_content_update_time-${prevId}`) ?? "null");

      if (localTime && serverTime && localTime !== serverTime) {
        try {
          const json = JSON.parse(window.localStorage.getItem(`novel-content-${prevId}`) ?? "null");
          const response = await saveContentOnline({ editorKey: prevId, content: json });
        } catch (err) {
          console.error("Error saving local content online:", err);
        }
      }
    }

    // 👉 Open sidebar instantly
    setSelectedTask(card);
    setRightSidebarContent(null); // clear old content

    // 👉 Background fetch content
    fetchNote(card._id, card.commitSha, card.contentPath)
      .then((response) => {
        const res = response as NoteResponse;
        if ("isError" in res && res.isError) {
          console.error("Error fetching note:", res.error);
          return;
        }

        const content = res.content;
        const parsedContent = typeof content === "string"  && content !== "" ? JSON.parse(content) : defaultEditorContent;
        const onlineContent = parsedContent?.online_content ?? parsedContent;

        setRightSidebarContent(onlineContent);
      })
      .catch((err) => {
        console.error("Failed to load card:", err);
      });
      
  }, [previousCardIdRef, setRightSidebarContent, setSelectedTask]);

  const handleCloseSidebar = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedTask(null);
      setCurrentBoardNoteId(null)
      setIsClosing(false);
    }, 300);
  }, [setIsClosing, setSelectedTask]);


  return {
    handleCardClick,
    handleCloseSidebar,
  };
};

export default useBoardFunctions;