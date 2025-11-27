"use client";

import React from "react";
import { Note } from "@/types/board";

interface TimelineTaskCardProps {
  note: Note;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isDragging?: boolean;
}

export default function TimelineTaskCard({ note, onClick, onContextMenu, isDragging = false }: TimelineTaskCardProps) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`bg-white shadow rounded p-2 mb-2 cursor-pointer transition-all select-none ${
        isDragging 
          ? 'cursor-grabbing opacity-50' 
          : 'hover:bg-gray-50'
      }`}
      style={{
        transform: isDragging ? 'rotate(2deg)' : 'none',
        zIndex: isDragging ? 1000 : 1,
      }}
    >
      <div className="font-semibold text-sm truncate" title={note.title}>
        {note.title}
      </div>
    </div>
  );
}
