"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, ChevronsRight, MessageSquareText } from "lucide-react";
import { PropertiesSection } from "./propertiesSection";
import { Note, ViewCollection } from "@/types/board";
import EditorLoading from "../editor/editorLoading";
import SidebarEditor from "../sidebarEditor";
import { JSONContent } from "novel";
import { useDatabaseProperties } from "@/hooks/use-viewProperty";
import CommentContainer from "@/components/tailwind/comment/commentContainer";
import ActivityLogContainer from "../activity/activityLogContainer";
import { useActivityLogs } from "@/hooks/useActivityLog";
import { useBoard } from "@/contexts/boardContext";

interface RightSidebarProps {
  note: Note;
  board: ViewCollection;
  onClose: () => void;
  onUpdate: (updatedNote: Note) => void;
  initialContent: JSONContent| null;
  isClosing?: boolean;
  updateNoteTitleLocally?: (noteId: string, newTitle: string) => void;
  persistNoteTitleChange?: (noteId: string, newTitle: string) => Promise<void>
}

export default function RightSidebar({
  note,
  board,
  onClose,
  onUpdate,
  initialContent,
  isClosing = false,
  updateNoteTitleLocally,
  persistNoteTitleChange
}: RightSidebarProps) {
  const [title, setTitle] = useState<string>(note?.title || "");
  const titleRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(initialContent);
  const [activeTab, setActiveTab] = useState<"comments" | "activity" | null>(null);
  const { activityLogs , isLogLoading} = useActivityLogs(note?._id || null);
  const { getCurrentDataSourceProperties, getNotesByDataSourceId, currentView, boards: contextBoards } = useBoard();

  // Get current dataSourceId and latest note from context
  const getCurrentDataSourceId = (): string | null => {
    const currentViewData = currentView[board._id];
    const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
    const view = latestBoard.viewsType?.find((vt) => 
      (currentViewData?.id && vt.id === currentViewData.id) || 
      (!currentViewData?.id && vt.viewType === currentViewData?.type)
    );
    const dsId = view?.databaseSourceId;
    return dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
  };
  const currentDataSourceId = getCurrentDataSourceId();
  const dataSourceNotes = currentDataSourceId ? getNotesByDataSourceId(currentDataSourceId) : [];
  const latestNote = dataSourceNotes.find((n) => n._id === note._id) || note;

  const { handleAddProperty,
    handleUpdateProperty,
    handleRenameProperty,
    handleDeleteProperty,
  } = useDatabaseProperties(board, latestNote, onUpdate);

  const handleTabClick = (tab: "comments" | "activity") => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  useEffect(() => {
    const currentNote = dataSourceNotes.find((n) => n._id === note._id) || note;
    setTitle(currentNote?.title || "");
    setContent(initialContent);
  }, [note, dataSourceNotes, board._id, initialContent]);

  // Keep the DOM content in sync when not actively editing to avoid caret jumps
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const isFocused = document.activeElement === el;
    if (!isFocused && el.textContent !== title) {
      el.textContent = title || "";
    }
  }, [title, note?._id]);

  if (!note) return null;

  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 md:w-[540px] lg:w-[680px] bg-[#f8f8f7] dark:bg-[#202020] flex flex-col z-50 transition-transform duration-300 ease-in-out border-l dark:border-l-[rgb(42,42,42)] ${
        isClosing ? 'transform translate-x-full' : 'transform translate-x-0'
      }`}
    >
      <button
        className="ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500"
        onClick={onClose}
      >
        <ChevronsRight className=" h-5 w-5 "/>
      </button>

      {/* Header */}
      <div className="flex justify-between items-center px-4 mx-4 mt-7 mb-3">
        <div
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning={true}
          onInput={(e) => {
            const newTitle = e.currentTarget.textContent || "";
            setTitle(newTitle);
            if(updateNoteTitleLocally) updateNoteTitleLocally(latestNote._id, newTitle);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          onBlur={() => {
            if (title.trim()) {
              // Use latestNote from context to ensure we have the most up-to-date data
              const noteToUpdate = { ...latestNote, title };
              onUpdate(noteToUpdate);
              if (persistNoteTitleChange) persistNoteTitleChange(latestNote._id, title);
            }
          }}
          className="w-full text-4xl font-semibold bg-transparent focus:outline-none whitespace-pre-wrap break-words"
          style={{ lineHeight: "1.2" }}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#f8f8f7] dark:bg-[#202020] mb-5">
        <PropertiesSection
          boardId={board._id}
          note={latestNote}
          boardProperties={getCurrentDataSourceProperties(board._id) || board.properties}
          onUpdateProperty={handleUpdateProperty}
          onAddProperty={handleAddProperty}
          onRenameProperty={handleRenameProperty}
          onDeleteProperty={handleDeleteProperty}
        />

        <div className="flex gap-4 !mt-0 px-2 mr-2 justify-end">
          <button
            onClick={() => handleTabClick("comments")}
            className={`px-1.5 py-1 text-sm font-medium transition-colors ${
              activeTab === "comments"
                ? "text-gray-900 dark:text-gray-100 border-b-2 border-blue-600"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-[#2c2c2c] rounded-sm"
            }`}
          >
            <MessageSquareText className="inline-block mr-2 h-4 w-4" />
            Comments
          </button>
          <button
            onClick={() => handleTabClick("activity")}
            className={`px-1.5 py-1 text-sm font-medium transition-colors ${
              activeTab === "activity"
                ? "text-gray-900 dark:text-gray-100 border-b-2 border-blue-600"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-[#2c2c2c] rounded-sm"
            }`}
          >
            <Activity className="inline-block mr-2 h-4 w-4" />
            Activity
          </button>
        </div>

        {activeTab === "comments" && (
          <CommentContainer
            key={note._id}
            comments={note.comments || []}
            noteId={note._id}
            boardId={board._id}
            note={note}
          />
        )}

        {activeTab === "activity" && (
          <div className="max-h-96 !mt-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <ActivityLogContainer logs={activityLogs}
            isLogLoading={isLogLoading}
            />
          </div>
        )}

        {/* Editor */}
        {(!initialContent )  ? (
          <EditorLoading/>
        ):(
          <SidebarEditor
            editorKey={note._id}
            initialContent={initialContent}
            onContentChange={setContent}
          />
        )}
      </div>
    </div>
  );
}