"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, X } from "lucide-react";
import BaseCellEditor from "./BaseCellEditor";
import type { CellEditorProps } from "@/types/cellEditor";
import { getColorStyles } from "@/utils/colorStyles";

export default function MultiSelectEditor({ value, property, onUpdate, onClose, note, boardId, position }: CellEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>(
    Array.isArray(value) ? value : (value ? [value] : [])
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const options = property.options || [];
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedValues.includes(option.name)
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleToggle = (optionValue: string) => {
    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter(v => v !== optionValue)
      : [...selectedValues, optionValue];
    
    setSelectedValues(newValues);
    onUpdate(note._id, property.id, newValues);
  };

  const handleRemove = (valueToRemove: string) => {
    const newValues = selectedValues.filter(v => v !== valueToRemove);
    setSelectedValues(newValues);
    onUpdate(note._id, property.id, newValues);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filteredOptions.length > 0) {
      handleToggle(filteredOptions[0]?.name || "");
      setSearchQuery("");
    } else if (e.key === "Escape") {
      onClose();
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
        {/* Selected values */}
        {selectedValues.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {selectedValues.map((value) => {
              const colorStyles = getOptionColorStyles(value);
              return (
                <div
                  key={value}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: colorStyles.bg,
                    color: colorStyles.text,
                  }}
                >
                  <span>{value}</span>
                  <button
                    onClick={() => handleRemove(value)}
                    className="hover:bg-black hover:bg-opacity-10 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search options..."
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {/* Available options */}
        <div className="mt-2 max-h-40 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? "No options found" : "All options selected"}
            </div>
          ) : (
            filteredOptions.map((option) => {
              const colorStyles = getOptionColorStyles(option.name);
              
              return (
                <button
                  key={option.name}
                  onClick={() => handleToggle(option.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: colorStyles.dot }}
                  />
                  <span className="text-gray-900 dark:text-white">{option.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </BaseCellEditor>
  );
}
