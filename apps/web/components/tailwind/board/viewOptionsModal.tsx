"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { 
  Calendar,
  LayoutGrid,
  List,
  Clock,
} from "lucide-react";
import { DropdownMenu, DropdownMenuIcons } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

interface ViewOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditView: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  onOpenFullPage: () => void;
  onShowDataSource: () => void;
  viewName: string;
  viewType: string;
}

export default function ViewOptionsModal({
  isOpen,
  onClose,
  onEditView,
  onDelete,
  onCopyLink,
  onOpenFullPage,
  onShowDataSource,
  viewName,
  viewType,
}: ViewOptionsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getViewIcon = (type: string) => {
    switch (type) {
      case "board":
        return <LayoutGrid className="h-4 w-4" />
      case "list":
        return <List className="h-4 w-4" />
      case "calendar":
        return <Calendar className="h-4 w-4" />;
      case "timeline":
        return <Clock className="h-4 w-4" />
      default:
        return <LayoutGrid className="h-4 w-4" />
    }
  };

  // Build menu items array
  const menuItems: DropdownMenuItemProps[] = useMemo(() => {
    const items: DropdownMenuItemProps[] = [];
    
    // View type header as first list item
    items.push({
      id: 'view-type-header',
      label: viewType.charAt(0).toUpperCase() + viewType.slice(1),
      icon: getViewIcon(viewType),
      onClick: () => {}, // No-op, just display
      disabled: false,
      className: "font-medium",
    });
    
    // Type item - disabled with rightElement
    items.push({
      id: 'type',
      label: "Type",
      icon: <DropdownMenuIcons.Type />,
      onClick: () => {}, // No-op for disabled item
      disabled: true,
      rightElement: (
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <DropdownMenuIcons.Lock />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
          </span>
        </div>
      ),
      className: "opacity-60",
    });
    
    // Edit view
    items.push({
      id: 'edit-view',
      label: "Edit view",
      icon: <DropdownMenuIcons.EditView />,
      onClick: onEditView,
    });
    
    // Copy link to view
    items.push({
      id: 'copy-link',
      label: "Copy link to view",
      icon: <DropdownMenuIcons.Link />,
      onClick: onCopyLink,
    });
    
    // Open as full page
    items.push({
      id: 'open-full-page',
      label: "Open as full page",
      icon: <DropdownMenuIcons.ExternalLink />,
      onClick: onOpenFullPage,
    });
    
    // Show data source titles
    items.push({
      id: 'show-data-source',
      label: "Show data source titles",
      icon: <DropdownMenuIcons.Eye />,
      onClick: onShowDataSource,
    });
    
    // Delete View - destructive
    items.push({
      id: 'delete-view',
      label: "Delete View",
      icon: <DropdownMenuIcons.Delete />,
      variant: 'destructive',
      onClick: onDelete,
    });
    
    return items;
  }, [viewType, onEditView, onCopyLink, onOpenFullPage, onShowDataSource, onDelete]);

  return (
    <div
      ref={modalRef}
      className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-56 max-w-[calc(100vw-48px)]"
      style={{
        borderRadius: "10px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
    >
      <div className="flex flex-col">
        {/* Menu Items */}
        <div className="py-1">
          <DropdownMenu 
            items={menuItems} 
            dividerAfter={[0, 2, 5]} // Dividers after "View type header" (index 0), "Edit view" (index 2), and "Show data source titles" (index 5)
          />
        </div>
      </div>
    </div>
  );
}
