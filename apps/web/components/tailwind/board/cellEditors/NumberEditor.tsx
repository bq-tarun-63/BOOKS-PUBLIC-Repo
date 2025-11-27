"use client";

import React, { useState, useRef, useEffect } from "react";
import BaseCellEditor from "./BaseCellEditor";
import type { CellEditorProps } from "@/types/cellEditor";

export default function NumberEditor({ value, property, onUpdate, onClose, note, boardId, position }: CellEditorProps) {
  const [inputValue, setInputValue] = useState(value?.toString() || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Get decimal places from property
  const decimalPlaces = (property as any)?.decimalPlaces ?? undefined;

  // Helper function to round number based on decimal places
  const roundNumber = (num: number): number => {
    if (decimalPlaces === undefined || decimalPlaces === null) {
      return num;
    }
    const multiplier = Math.pow(10, decimalPlaces);
    return Math.round(num * multiplier) / multiplier;
  };

  const handleSave = () => {
    if (inputValue === "") {
      onUpdate(note._id, property.id, null);
    } else {
      const numValue = Number(inputValue);
      if (Number.isFinite(numValue)) {
        // Round the value before saving
        const roundedValue = roundNumber(numValue);
        onUpdate(note._id, property.id, roundedValue);
      } else {
        onUpdate(note._id, property.id, numValue);
      }
    }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
    }
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
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={property.placeholder || `Enter ${property.name.toLowerCase()}...`}
        className="w-full px-3 py-2 text-sm border-none outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
      />
    </BaseCellEditor>
  );
}
