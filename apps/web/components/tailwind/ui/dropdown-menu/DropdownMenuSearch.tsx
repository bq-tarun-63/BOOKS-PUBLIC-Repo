"use client";

import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownMenuSearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'subtle'; // 'default' has border/shadow, 'subtle' has background only
}

export function DropdownMenuSearch({
  placeholder = "Search...",
  value = "",
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  autoFocus = false,
  disabled = false,
  variant = 'default',
}: DropdownMenuSearchProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const variantStyles = {
    default: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-1 focus-within:ring-blue-500",
    subtle: "bg-gray-100 dark:bg-zinc-800",
  };

  return (
    <div
      className={cn(
        "flex items-center w-full h-7 px-2 gap-2 rounded-md",
        variantStyles[variant],
        className
      )}
    >
      <Search className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                autoFocus={autoFocus}
                disabled={disabled}
                className={cn(
                  "w-full text-sm border-none bg-transparent",
                  "focus:outline-none",
                  "text-gray-900 dark:text-white",
                  "placeholder-gray-500 dark:placeholder-gray-500",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              />
    </div>
  );
}

