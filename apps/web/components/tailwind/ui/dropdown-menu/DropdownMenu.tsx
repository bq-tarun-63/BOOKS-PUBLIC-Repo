"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { DropdownMenuItem } from './DropdownMenuItem';
import { DropdownMenuDivider } from './DropdownMenuDivider';
import type { DropdownMenuProps } from './types';

export function DropdownMenu({
  items,
  className,
  dividerAfter = [],
}: DropdownMenuProps) {
  return (
    <div className={cn("flex flex-col p-1", className)}>
      {items.map((item, index) => (
        <React.Fragment key={item.id || index}>
          <DropdownMenuItem {...item} />
          {dividerAfter.includes(index) && <DropdownMenuDivider />}
        </React.Fragment>
      ))}
    </div>
  );
}

