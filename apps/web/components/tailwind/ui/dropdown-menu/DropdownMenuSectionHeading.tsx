"use client";

import React from 'react';
import { cn } from '@/lib/utils';

export interface DropdownMenuSectionHeadingProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuSectionHeading({
  children,
  className,
}: DropdownMenuSectionHeadingProps) {
  return (
    <div
      className={cn(
        "text-[11px] font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

