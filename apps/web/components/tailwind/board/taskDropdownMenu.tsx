"use client";

import React, { useMemo } from "react";
import { DropdownMenu, DropdownMenuIcons } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

interface TaskDropdownMenuProps {
  onEditProperties: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function TaskDropdownMenu({
  onEditProperties,
  onDelete,
  onClose,
}: TaskDropdownMenuProps) {
  const menuItems: DropdownMenuItemProps[] = useMemo(() => [
    {
      id: 'edit-properties',
      label: "Edit Properties",
      icon: <DropdownMenuIcons.EditProperties />,
      onClick: (e) => {
        e?.stopPropagation();
        onEditProperties();
        onClose();
      },
    },
    {
      id: 'delete-task',
      label: "Delete Task",
      icon: <DropdownMenuIcons.Delete />,
      onClick: (e) => {
        e?.stopPropagation();
        onDelete();
        onClose();
      },
      variant: 'destructive',
    },
  ], [onEditProperties, onDelete, onClose]);

  return (
    <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-900 shadow-md rounded border border-gray-200 dark:border-gray-700 z-50">
      <DropdownMenu items={menuItems} dividerAfter={[0]} />
    </div>
  );
}
