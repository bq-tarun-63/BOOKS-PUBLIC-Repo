"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenSelectFieldProps {
  label: string;
  tokens: string[];
  options: string[];
  placeholder?: string;
  helperText?: string;
  onAddToken: (value: string) => void;
  onRemoveToken: (value: string) => void;
  disabled?: boolean;
  maxTokens?: number;
}

export function TokenSelectField({
  label,
  tokens,
  options,
  placeholder,
  helperText,
  onAddToken,
  onRemoveToken,
  disabled = false,
  maxTokens = 5,
}: TokenSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search query and exclude already selected tokens
  const availableOptions = options.filter(
    (option) =>
      option.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !tokens.includes(option),
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectOption = (option: string) => {
    if (tokens.length < maxTokens && !tokens.includes(option)) {
      onAddToken(option);
      setSearchQuery("");
      setInputValue("");
      // Keep dropdown open - don't close it
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const value = inputValue.trim();
      if (value && tokens.length < maxTokens && !tokens.includes(value)) {
        onAddToken(value);
        setInputValue("");
        setSearchQuery("");
      }
    } else if (event.key === "Backspace" && !inputValue && tokens.length > 0) {
      onRemoveToken(tokens[tokens.length - 1]!);
    }
  };

  return (
    <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
      <div className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <label>{label}</label>
      </div>
      <div
        className={cn(
          "flex flex-wrap gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 min-h-[44px] transition-colors",
          disabled && "opacity-60 cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500 border-blue-500",
        )}
        style={{ minWidth: "100%" }}
      >
        {tokens.map((token) => (
          <span
            key={token}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200"
          >
            {token}
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemoveToken(token)}
                className="flex h-4 w-4 items-center justify-center rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </button>
            )}
          </span>
        ))}
        {!disabled && tokens.length < maxTokens && (
          <div className="relative flex-1 min-w-[200px]">
            <div className="flex items-center w-full">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder || "Type or select..."}
                className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 px-2 py-1"
              />
              <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className="flex items-center justify-center px-2 py-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 focus:outline-none"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "transform rotate-180",
                  )}
                />
              </button>
            </div>
            {isOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                <div className="p-2 border-b border-zinc-200 dark:border-zinc-700">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setInputValue(e.target.value);
                    }}
                    placeholder="Search or type custom value..."
                    className="w-full px-2 py-1.5 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="py-1">
                  {availableOptions.length > 0 ? (
                    <>
                      {searchQuery && 
                        !tokens.includes(searchQuery.trim()) && 
                        !options.includes(searchQuery.trim()) && 
                        searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            if (tokens.length < maxTokens) {
                              onAddToken(searchQuery.trim());
                              setInputValue("");
                              setSearchQuery("");
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium"
                        >
                          + Add "{searchQuery.trim()}"
                        </button>
                      )}
                      {availableOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleSelectOption(option)}
                          className="w-full text-left px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          {option}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {searchQuery && 
                        !tokens.includes(searchQuery.trim()) && 
                        searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            if (tokens.length < maxTokens) {
                              onAddToken(searchQuery.trim());
                              setInputValue("");
                              setSearchQuery("");
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium"
                        >
                          + Add "{searchQuery.trim()}"
                        </button>
                      )}
                      {!searchQuery && (
                        <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                          No options found. Type to add custom value.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {helperText && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {helperText}
          {tokens.length > 0 && ` (${tokens.length}/${maxTokens})`}
        </span>
      )}
    </div>
  );
}

