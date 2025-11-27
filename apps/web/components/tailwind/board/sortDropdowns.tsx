"use client";

import React, { useRef, useState, useEffect } from "react";
import { Tag, ListChecks, Hash, Text, User, Calendar, CheckSquare, Star, Calculator, BarChart3, Mail, Link, Phone } from "lucide-react";
import { BoardProperty } from "@/types/board";
import { DropdownMenuHeader, DropdownMenuSearch, DropdownMenu } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

export const PROPERTY_TYPES = [
  { type: "text", label: "Text", icon: Text },
  { type: "email", label: "Email", icon: Mail },
  { type: "url", label: "URL", icon: Link },
  { type: "phone", label: "Phone", icon: Phone },
  { type: "select", label: "Select", icon: Tag },
  { type: "multi_select", label: "Multi-Select", icon: ListChecks },
  { type: "status", label: "Status", icon: Tag },
  { type: "person", label: "Person", icon: User },
  { type: "date", label: "Date", icon: Calendar },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "priority", label: "Priority", icon: Star },
  { type: "number", label: "Number", icon: Hash },
  { type: "formula", label: "Formula", icon: Calculator },
  { type: "rollup", label: "Rollup", icon: BarChart3 },
];

interface SortItem {
  propertyId: string;
  direction: "ascending" | "descending";
}

// Property Picker 
export function PropertyPicker({
  properties,
  existingSorts,
  onSelect,
  onClose,
  title = "Sort by...",
  showHeader = false
}: {
  properties: Record<string, BoardProperty>;
  existingSorts: SortItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
  title?: string;
  showHeader?: boolean;
}) {
  const [search, setSearch] = useState("");

  const getPropertyIcon = (type: string) => {
    const found = PROPERTY_TYPES.find((p) => p.type === type);
    return found?.icon || (() => <span className="text-xs">•</span>);
  };

  const SORTABLE_TYPES = ["status", "select", "person", "priority", "text", "number", "date", "boolean", "relation", "rollup", "email", "url", "phone"];

  const filteredProperties = Object.entries(properties).filter(
    ([id, prop]) => {
      const isAlreadySelected = existingSorts.some(s => s.propertyId === id);
      const resolvedType = prop.type === "formula"
        ? prop.formulaReturnType ?? "text"
        : prop.type;
      return (
        !isAlreadySelected &&
        SORTABLE_TYPES.includes(resolvedType) &&
        prop.name.toLowerCase().includes(search.toLowerCase())
      );
    }
  );

  const menuItems: DropdownMenuItemProps[] = filteredProperties.map(([id, prop]) => {
    const Icon = getPropertyIcon(prop.type);
    return {
      id,
      label: prop.name.charAt(0).toUpperCase() + prop.name.slice(1),
      icon: <Icon className="h-4 w-4 text-muted-foreground" />,
      onClick: () => onSelect(id),
    };
  });

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] bg-background dark:border-gray-700 shadow-lg">
      {/* Header */}
      {showHeader && (
        <div className="flex-shrink-0">
          <DropdownMenuHeader
            title={title}
            onBack={onClose}
            onClose={onClose}
            showBack={true}
            showClose={true}
          />
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2">
        <DropdownMenuSearch
          placeholder="Sort by..."
          value={search}
          onChange={setSearch}
          autoFocus={true}
        />
      </div>

      {/* Property list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <DropdownMenu items={menuItems} />
      </div>
    </div>
  );
}

// Property Dropdown (list of properties)
export function PropertyDropdown({
  properties,
  existingSorts,
  currentPropertyId,
  onSelect,
  onClose
}: {
  properties: Record<string, BoardProperty>;
  existingSorts: SortItem[];
  currentPropertyId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const getPropertyIcon = (type: string) => {
    const found = PROPERTY_TYPES.find((p) => p.type === type);
    return found?.icon || (() => <span className="text-xs">•</span>);
  };

  const SORTABLE_TYPES = ["status", "select", "person", "priority", "text", "number", "date", "boolean", "relation", "rollup", "email", "url", "phone"];

  const filteredProperties = Object.entries(properties).filter(
    ([id, prop]) => {
      const isAlreadySelected = existingSorts.some(s => s.propertyId === id && id !== currentPropertyId);
      const resolvedType = prop.type === "formula"
        ? prop.formulaReturnType ?? "text"
        : prop.type;
      return !isAlreadySelected && SORTABLE_TYPES.includes(resolvedType);
    }
  );

  const menuItems: DropdownMenuItemProps[] = filteredProperties.map(([id, prop]) => {
    const Icon = getPropertyIcon(prop.type);
    return {
      id,
      label: prop.name.charAt(0).toUpperCase() + prop.name.slice(1),
      icon: <Icon className="h-4 w-4 text-muted-foreground" />,
      onClick: (e) => {
        e?.stopPropagation();
        onSelect(id);
      },
    };
  });

  return (
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      className="min-w-[200px] max-w-[280px] max-h-[300px] rounded-lg border bg-background dark:border-gray-700 shadow-xl"
    >
      <div className="overflow-y-auto max-h-[300px]">
        <DropdownMenu items={menuItems} />
      </div>
    </div>
  );
}

// Direction Dropdown (ascending/descending)
export function DirectionDropdown({
  currentDirection,
  onSelect,
  onClose
}: {
  currentDirection: "ascending" | "descending";
  onSelect: (direction: "ascending" | "descending") => void;
  onClose: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const directions: Array<"ascending" | "descending"> = ["ascending", "descending"];

  const menuItems: DropdownMenuItemProps[] = directions.map((direction) => ({
    id: direction,
    label: direction.charAt(0).toUpperCase() + direction.slice(1),
    onClick: (e) => {
      e?.stopPropagation();
      onSelect(direction);
    },
    selected: currentDirection === direction,
    className: currentDirection === direction
      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
      : undefined,
  }));

  return (
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      className="min-w-[160px] rounded-lg border bg-background dark:border-gray-700 shadow-xl"
    >
      <DropdownMenu items={menuItems} />
    </div>
  );
}
