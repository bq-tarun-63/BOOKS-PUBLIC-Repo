"use client";

import React, { useState, useRef, useEffect } from "react";
import BaseCellEditor from "./BaseCellEditor";
import type { CellEditorProps } from "@/types/cellEditor";

export default function TextEditor({ value, property, onUpdate, onClose, note, boardId, position }: CellEditorProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    onUpdate(note._id, property.id, inputValue);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  return (
    <BaseCellEditor
      value={value}
      property={property}
      note={note}
      boardId={boardId}
      onUpdate={onUpdate}
      onClose={onClose}
      position={position}
      className="p-0"
    >
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={property.placeholder || `Enter ${property.name.toLowerCase()}...`}
        className="w-full px-3 py-2 text-sm border-none outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
      />
    </BaseCellEditor>
  );
}
