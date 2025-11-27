"use client";

import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownMenuHeaderProps {
  title: string;
  onBack?: () => void;
  onClose?: () => void;
  className?: string;
  showBack?: boolean;
  showClose?: boolean;
}

export function DropdownMenuHeader({
  title,
  onBack,
  onClose,
  className,
  showBack = true,
  showClose = true,
}: DropdownMenuHeaderProps) {
  return (
    <div className={cn("flex-shrink-0", className)} draggable={false}>
      <div className="flex items-center pl-3 pr-4 py-2">
        {/* Back button */}
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="inline-flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-75 flex-shrink-0 mr-2"
            style={{ height: '22px', width: '24px', padding: '0px' }}
          >
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        )}
        
        {/* Heading */}
        <span className="flex-1 text-xs font-medium text-muted-foreground truncate">
          {title}
        </span>
        
        {/* Close button */}
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto inline-flex items-center justify-center rounded hover:bg-accent transition-colors duration-75 flex-shrink-0"
            style={{ height: '24px', width: '24px', padding: '0px' }}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

