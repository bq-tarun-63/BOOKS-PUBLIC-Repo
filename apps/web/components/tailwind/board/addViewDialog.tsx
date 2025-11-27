import { View } from "@/types/board";
import type React from "react";
import { useEffect, useRef, useMemo } from "react";
import { DropdownMenu, DropdownMenuIcons } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

interface AddViewDialogProps {
  readonly existingViews: View[];
  readonly onSelect: (view: "board" | "list" | "calendar" | "timeline" | "forms") => void;
  readonly onClose: () => void;
}

export default function AddViewDialog({ existingViews, onSelect, onClose }: AddViewDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Build menu items array
  const menuItems: DropdownMenuItemProps[] = useMemo(() => {
    const allViews: { id: "board" | "list" | "calendar" | "timeline" | "forms"; label: string; icon: React.ReactNode }[] = [
      { id: "list", label: "List", icon: <DropdownMenuIcons.List /> },
      { id: "board", label: "Board", icon: <DropdownMenuIcons.Board /> },
      { id: "calendar", label: "Calendar", icon: <DropdownMenuIcons.Calendar /> },
      { id: "timeline", label: "Timeline", icon: <DropdownMenuIcons.Timeline /> },
      { id: "forms", label: "Form", icon: <DropdownMenuIcons.Form /> },
    ];

    return allViews.map((view) => ({
      id: view.id,
      label: view.label,
      icon: view.icon,
      onClick: () => {
        onSelect(view.id);
      },
    }));
  }, [onSelect]);

  return (
    <div
      ref={dialogRef}
      className="absolute mt-2 w-48 rounded-md border bg-popover text-popover-foreground shadow-lg z-50"
    >
      {menuItems.length > 0 ? (
        <DropdownMenu items={menuItems} />
      ) : (
        <div className="p-1">
          <p className="px-3 py-2 text-sm text-muted-foreground">All views already added</p>
        </div>
      )}
    </div>
  );
}
