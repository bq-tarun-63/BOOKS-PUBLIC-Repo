"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenInputFieldProps {
  label: string;
  tokens: string[];
  placeholder?: string;
  helperText?: string;
  onAddToken: (value: string) => void;
  onRemoveToken: (value: string) => void;
  disabled?: boolean;
}

export function TokenInputField({
  label,
  tokens,
  placeholder,
  helperText,
  onAddToken,
  onRemoveToken,
  disabled = false,
}: TokenInputFieldProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (!inputValue.trim()) return;
      onAddToken(inputValue.trim());
      setInputValue("");
    } else if (event.key === "Backspace" && !inputValue && tokens.length > 0) {
      onRemoveToken(tokens[tokens.length - 1]!);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <label>{label}</label>
      </div>
      <div
        className={cn(
          "flex flex-wrap gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-2 min-h-[44px] focus-within:ring-2 focus-within:ring-blue-500 transition-colors",
          disabled && "opacity-60 cursor-not-allowed",
        )}
      >
        {tokens.map((token) => (
          <span
            key={token}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200"
          >
            {token}
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemoveToken(token)}
                className="flex h-4 w-4 items-center justify-center rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </button>
            )}
          </span>
        ))}
        <input
          value={inputValue}
          onChange={(event) => !disabled && setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tokens.length === 0 ? placeholder : ""}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 disabled:cursor-not-allowed"
        />
      </div>
      {helperText && <span className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</span>}
    </div>
  );
}

