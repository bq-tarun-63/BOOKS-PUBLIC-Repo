"use client";

import type { BoardProperty, ViewCollection } from "@/types/board";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PROPERTY_TYPES } from "./addPropertyDialog";
import { DropdownMenuHeader, DropdownMenuSearch, DropdownMenu } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

interface GroupByPropertiesModalProps {
  board: ViewCollection;
  boardProperties: Record<string, BoardProperty>;
  selectedPropertyId?: string; // current group by property
  onClose: () => void;
  onSelect: (propId: string) => void;
}

export default function GroupByPropertiesModal({
  board,
  boardProperties,
  selectedPropertyId,
  onClose,
  onSelect,
}: GroupByPropertiesModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const GROUPABLE_TYPES = ["status", "select", "person", "priority", "text", "boolean", "relation"];

  const filteredProperties = Object.entries(boardProperties).filter(([_, prop]) => {
    const resolvedType = prop.type === "formula" ? prop.formulaReturnType ?? "text" : prop.type;
    return (
      prop.name.toLowerCase().includes(search.toLowerCase()) &&
      GROUPABLE_TYPES.includes(resolvedType)
    );
  });

  const getPropertyIcon = (type: string) => {
    const found = PROPERTY_TYPES.find((p) => p.type === type);
    return found?.icon || null;
  };

  const menuItems: DropdownMenuItemProps[] = filteredProperties.map(([id, prop]) => {
    const isSelected = id === selectedPropertyId;
    const Icon = getPropertyIcon(prop.type);

    return {
      id,
      label: prop.name.charAt(0).toUpperCase() + prop.name.slice(1),
      icon: Icon ? <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : undefined,
      onClick: () => onSelect(id),
      selected: isSelected,
      rightElement: isSelected ? (
        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      ) : undefined,
    };
  });

  return (
    <div
      ref={modalRef}
      className="flex flex-col min-w-[280px] max-w-[280px] max-h-[70vh] rounded-lg border bg-background dark:border-gray-700 shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0">
        <DropdownMenuHeader
          title="Group"
          onBack={onClose}
          onClose={onClose}
          showBack={true}
          showClose={true}
        />
      </div>

      {/* Search */}
      <div className="px-3 py-1 pb-0">
        <DropdownMenuSearch
          placeholder="Group by..."
          value={search}
          onChange={setSearch}
          autoFocus={true}
        />
      </div>

      {/* Property list */}
      <div className="flex-1 overflow-y-auto p-2">
        <DropdownMenu items={menuItems} />
      </div>
    </div>
  );
}
