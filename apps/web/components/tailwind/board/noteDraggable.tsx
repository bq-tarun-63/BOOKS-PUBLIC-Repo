import React, { useState } from "react";

interface Props {
  noteId: string;
  columnId: string;
  onDragStart: (noteId: string, fromGroupId: string) => void;
  onDragOver?: (targetNoteId: string, targetColumnId: string, position: "above" | "below") => void;
  onDrop: (toGroupId: string, targetNoteId?: string, position?: "above" | "below") => void;
  children: React.ReactNode;
}

export const NoteDraggable: React.FC<Props> = ({
  noteId,
  columnId,
  onDragStart,
  onDrop,
  children,
  onDragOver
}) => {

    const [hoverPosition, setHoverPosition] = useState<"above" | "below" | null>(null);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(noteId, columnId);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();

        const bounds = e.currentTarget.getBoundingClientRect();
        const offset = e.clientY - bounds.top;
        const position = offset < bounds.height / 2 ? "above" : "below";
        setHoverPosition(position);

        if (onDragOver) onDragOver(noteId, columnId, position);
      }}
      onDragLeave={() => setHoverPosition(null)}
      onDrop={(e) => {
        e.stopPropagation();
        onDrop(columnId, noteId, hoverPosition || "below");
        setHoverPosition(null);
      }}
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow cursor-move hover:bg-gray-100 dark:hover:bg-gray-700
        relative transition-colors
      `}
    >
      {/* Top indicator */}
      {hoverPosition === "above" && (
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 rounded-t" />
      )}

      {/* Bottom indicator */}
      {hoverPosition === "below" && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-b" />
      )}

      {children}
    </div>
  );
};
