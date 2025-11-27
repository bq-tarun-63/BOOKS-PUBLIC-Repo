"use client";

import {
  AlignLeft,
  Calendar,
  CheckSquare,
  Hash,
  Link,
  ListChecks,
  Phone,
  User,
  X,
  Mail,
  Paperclip,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DropdownMenuSearch, DropdownMenu } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

interface FormAddPropertyDialogProps {
  onSelect: (type: string, label: string) => Promise<{ id: string; name: string } | null> | void;
  onClose: () => void;
}

export const FORM_PROPERTY_TYPES = [
  { id: "text", label: "Text", propertyType: "text", icon: AlignLeft },
  { id: "multi_select", label: "Multiple choice", propertyType: "multi_select", icon: ListChecks },
  { id: "date", label: "Date", propertyType: "date", icon: Calendar },
  { id: "person", label: "Person", propertyType: "person", icon: User },
  { id: "number", label: "Number", propertyType: "number", icon: Hash },
  { id: "checkbox", label: "Checkbox", propertyType: "checkbox", icon: CheckSquare },
  { id: "email", label: "Email", propertyType: "email", icon: Mail },
  { id: "url", label: "URL", propertyType: "url", icon: Link },
  { id: "phone", label: "Phone", propertyType: "phone", icon: Phone },
  { id: "file", label: "File / Media", propertyType: "file", icon: Paperclip },
] as const;

export default function FormAddPropertyDialog({ onSelect, onClose }: FormAddPropertyDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [loadingType, setLoadingType] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const filteredProperties = useMemo(
    () =>
      FORM_PROPERTY_TYPES.filter((prop) =>
        prop.label.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery, filteredProperties.length]);

  const handleSelect = async (propertyType: (typeof FORM_PROPERTY_TYPES)[number]) => {
    setLoadingType(propertyType.id);
    try {
      await onSelect(propertyType.propertyType, propertyType.label);
      onClose();
    } catch (error) {
      console.error("Failed to add property:", error);
      setLoadingType(null);
    }
  };

  const menuItems: DropdownMenuItemProps[] = useMemo(() => {
    return filteredProperties.map((prop, index) => {
      const Icon = prop.icon;
      const isSelected = selectedIndex === index;
      return {
        id: prop.id,
        label: prop.label,
        icon: (
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        ),
        onClick: () => handleSelect(prop),
        disabled: loadingType === prop.id,
        className: isSelected ? "bg-accent" : "",
      };
    });
  }, [filteredProperties, selectedIndex, loadingType]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredProperties.length > 0 ? Math.max(0, prev) : -1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredProperties.length - 1 ? prev + 1 : filteredProperties.length - 1,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredProperties.length) {
        const selected = filteredProperties[selectedIndex];
        if (selected) {
          handleSelect(selected);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      ref={dialogRef}
      className="relative z-50 w-72 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg mb-10"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex flex-col max-h-[80vh]">
        <div className="flex items-center px-4 pt-3 pb-1">
          <span className="flex-1 text-sm font-semibold">Select type</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <DropdownMenuSearch
            placeholder="Search types..."
            value={searchQuery}
            onChange={setSearchQuery}
            onKeyDown={handleSearchKeyDown}
            autoFocus
            variant="subtle"
            className="bg-transparent border-none"
          />
        </div>

        <div
          className="flex-1 overflow-y-auto px-2 pb-3"
          role="menu"
          tabIndex={0}
          onKeyDown={handleMenuKeyDown}
        >
          {filteredProperties.length > 0 ? (
            <DropdownMenu items={menuItems} />
          ) : (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">No types found</div>
          )}
        </div>
      </div>
    </div>
  );
}

