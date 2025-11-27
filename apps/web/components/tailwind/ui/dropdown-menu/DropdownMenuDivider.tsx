"use client";

import React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownMenuDividerProps {
  className?: string;
}

/**
 * Generic divider component for separating dropdown menu items
 * Matches the styling used in boardSettingDropdown (border-t)
 */
export function DropdownMenuDivider({ className }: DropdownMenuDividerProps) {
  return (
    <div 
      className={cn(
        "h-px bg-gray-200 dark:bg-gray-700 my-1",
        className
      )} 
    />
  );
}

