"use client";

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';

export interface DropdownMenuEditableItemProps {
  // Icon button props
  iconButtonRef?: React.RefObject<HTMLButtonElement>;
  icon?: React.ReactNode; // Icon or emoji to display in the button
  onIconClick?: () => void;
  iconButtonDisabled?: boolean;
  iconButtonAriaLabel?: string;
  
  // Input field props
  inputValue: string;
  inputOnChange: (value: string) => void;
  inputOnFocus?: () => void;
  inputOnBlur?: () => void;
  inputOnKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputPlaceholder?: string;
  inputAriaLabel?: string;
  inputDisabled?: boolean;
  
  // Container props
  className?: string;
  children?: React.ReactNode; // For popups/modals (like emoji picker)
}

export function DropdownMenuEditableItem({
  iconButtonRef: externalIconButtonRef,
  icon,
  onIconClick,
  iconButtonDisabled = false,
  iconButtonAriaLabel = "Change icon",
  inputValue,
  inputOnChange,
  inputOnFocus,
  inputOnBlur,
  inputOnKeyDown,
  inputPlaceholder = "Name",
  inputAriaLabel = "Name",
  inputDisabled = false,
  className,
  children,
}: DropdownMenuEditableItemProps) {
  const internalIconButtonRef = useRef<HTMLButtonElement>(null);
  const iconButtonRef = externalIconButtonRef || internalIconButtonRef;

  return (
    <div className={cn("px-3 pb-1", className)}>
      <div className="flex items-center gap-2 w-full relative">
        {/* Icon button */}
        {icon !== undefined && (
          <button
            ref={iconButtonRef}
            type="button"
            onClick={onIconClick}
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={iconButtonAriaLabel}
            disabled={iconButtonDisabled}
          >
            {typeof icon === 'string' ? (
              <span className="text-base" aria-hidden="true">
                {icon}
              </span>
            ) : (
              <span aria-hidden="true">
                {icon}
              </span>
            )}
          </button>
        )}
        
        {/* Input field */}
        <input
          value={inputValue}
          onChange={(e) => inputOnChange(e.target.value)}
          onFocus={inputOnFocus}
          onBlur={inputOnBlur}
          onKeyDown={inputOnKeyDown}
          placeholder={inputPlaceholder}
          aria-label={inputAriaLabel}
          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
          disabled={inputDisabled}
        />
        
        {/* Children (for popups/modals like emoji picker) */}
        {children}
      </div>
    </div>
  );
}

