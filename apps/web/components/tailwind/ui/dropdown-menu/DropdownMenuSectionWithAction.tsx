"use client";

import React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownMenuSectionWithActionProps {
  heading: string;
  actionLabel: string;
  onActionClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuSectionWithAction({
  heading,
  actionLabel,
  onActionClick,
  children,
  className,
}: DropdownMenuSectionWithActionProps) {
  return (
    <div className={cn("flex flex-col gap-px", className)}>
      {/* Section header with action button */}
      <div className="flex items-center px-2 mt-1.5 mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 h-[19px]">
        <div className="flex self-center">{heading}</div>
        <div className="ml-auto">
          <button
            onClick={onActionClick}
            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            type="button"
          >
            {actionLabel}
          </button>
        </div>
      </div>
      
      {/* Section content */}
      <div className="flex flex-col cursor-grab">
        {children}
      </div>
    </div>
  );
}

