"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";
import BaseCellEditor from "./BaseCellEditor";
import type { CellEditorProps } from "@/types/cellEditor";

// Helper function to convert date to YYYY-MM-DD format (local date, not ISO)
function formatDateToLocalString(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "";
  
  try {
    let date: Date;
    
    // If it's already in YYYY-MM-DD format, use it directly
    if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
    // Otherwise, parse it as a date
    if (typeof dateValue === "string") {
      // Try parsing ISO string or other formats
      date = new Date(dateValue);
    } else {
      date = dateValue;
    }
    
    if (isNaN(date.getTime())) return "";
    
    // Format as YYYY-MM-DD (local date, not UTC)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

export default function DateEditor({ value, property, onUpdate, onClose, note, boardId, position }: CellEditorProps) {
  const [inputValue, setInputValue] = useState(() => {
    return formatDateToLocalString(value);
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const initialValue = useRef(inputValue);
  const hasUserChanged = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);


  const handleSave = () => {
    // Save in YYYY-MM-DD format (same as right sidebar)
    const dateValue = inputValue && inputValue.trim() ? inputValue.trim() : null;
    onUpdate(note._id, property.id, dateValue);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Only save if the blur is not caused by clicking on the clear button
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !relatedTarget.closest('button')) {
      handleSave();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    hasUserChanged.current = true;
    setInputValue(newValue);
    
    // Auto-save immediately when user changes the date
    // Save in YYYY-MM-DD format (same as right sidebar)
    if (newValue && newValue !== initialValue.current) {
      const dateValue = newValue.trim() || null;
      onUpdate(note._id, property.id, dateValue);
      // Close the editor automatically after saving with a small delay
      setTimeout(() => {
        onClose();
      }, 50);
    }
  };

  const handleClear = () => {
    setInputValue("");
    onUpdate(note._id, property.id, null);
    onClose();
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
      className="p-2"
    >
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <input
          ref={inputRef}
          type="date"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear
          </button>
        )}
      </div>
    </BaseCellEditor>
  );
}
