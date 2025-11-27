"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import BaseCellEditor from "./BaseCellEditor";
import type { CellEditorProps } from "@/types/cellEditor";
import { getColorStyles } from "@/utils/colorStyles";

export default function StatusDropdown({ value, property, onUpdate, onClose, note, boardId, position }: CellEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedValue, setSelectedValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const options = property.options || [];
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelect = (optionValue: string) => {
    setSelectedValue(optionValue);
    onUpdate(note._id, property.id, optionValue);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filteredOptions.length > 0) {
      handleSelect(filteredOptions[0]?.name || "");
    }
  };

  const getOptionColorStyles = (optionName: string) => {
    const option = options.find(opt => opt.name === optionName);
    const color = option?.color || "default";
    return getColorStyles(color);
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
      <div className="w-full">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search options..."
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="mt-2 max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No options found
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selectedValue === option.name;
              const colorStyles = getOptionColorStyles(option.name);
              
              return (
                <button
                  key={option.name}
                  onClick={() => handleSelect(option.name)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: colorStyles.dot }}
                    />
                    <span className="text-gray-900 dark:text-white">{option.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </BaseCellEditor>
  );
}
