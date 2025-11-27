"use client";

import React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownMenuToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function DropdownMenuToggle({
  checked,
  onChange,
  disabled = false,
  className,
}: DropdownMenuToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0",
        checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}

