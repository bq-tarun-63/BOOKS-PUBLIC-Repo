"use client";

import React, { useRef, useState, useEffect } from "react";
import { BoardProperty, ViewCollection } from "@/types/board";
import { ChevronDown, GripVertical, Trash2, Plus,  X } from "lucide-react";
import { 
  PropertyPicker, 
  PropertyDropdown, 
  DirectionDropdown,
  PROPERTY_TYPES 
} from "./sortDropdowns";
import { DropdownMenuHeader } from "@/components/tailwind/ui/dropdown-menu";
interface SortItem {
  propertyId: string;
  direction: "ascending" | "descending";
}

interface SortModalProps {
  board: ViewCollection;
  boardProperties: Record<string, BoardProperty>;
  onClose: () => void;
  onApply: (sorts: SortItem[]) => void;
  sorts: SortItem[];
}

export default function SortModal({ 
  board,
  boardProperties, 
  sorts: initialSorts,
  onClose, 
  onApply 
}: SortModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [sorts, setSorts] = useState<SortItem[]>(initialSorts || []);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [activePropertyDropdown, setActivePropertyDropdown] = useState<number | null>(null);
  const [activeDirectionDropdown, setActiveDirectionDropdown] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
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

  const handleUpdateSort = (index: number, sort: SortItem) => {
    const newSorts = [...sorts];
    if (index >= newSorts.length) {
      newSorts.push(sort);
    } else {
      newSorts[index] = sort;
    }
    setSorts(newSorts);
  };

  const handleDeleteSort = (index: number) => {
    const newSorts = sorts.filter((_, i) => i !== index);
    setSorts(newSorts);
    onApply(newSorts);
  };

  const handleDeleteAll = () => {
    setSorts([]);
    onApply([]);
    onClose();
  };

  const handleAddSort = (propertyId: string) => {
    if (!propertyId) return; 
    const newSorts = [...sorts, { propertyId, direction: "ascending" as const }];
    setSorts(newSorts);
    setShowPropertyPicker(false);
    onApply(newSorts); 
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    
    const newSorts = [...sorts];
    const removed = newSorts.splice(dragIndex, 1)[0];
    if (!removed) return; 
    newSorts.splice(index, 0, removed);
    setSorts(newSorts);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    onApply(sorts); 
  };

  // Show initial property picker if no sorts
  if (sorts.length === 0) {
    return (
      <div 
        ref={modalRef}
        className="flex flex-col min-w-[280px] max-w-[320px] rounded-lg border bg-background dark:border-gray-700 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0">
          <DropdownMenuHeader
            title="Sort"
            onBack={onClose}
            onClose={onClose}
            showBack={true}
            showClose={true}
          />
        </div>
        <PropertyPicker
          properties={boardProperties}
          existingSorts={sorts}
          onSelect={(id) => {
            const newSorts = [{ propertyId: id, direction: "ascending" as const }];
            setSorts(newSorts);
            onApply(newSorts); 
          }}
          onClose={onClose}
          title="New sort"
        />
      </div>
    );
  }

  return (
    <div 
      ref={modalRef} 
      className="flex flex-col min-w-[360px] max-w-[400px] rounded-lg border bg-background dark:border-gray-700 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex-shrink-0"
        draggable={false}
        onDragStart={(e) => e.stopPropagation()}
      >
        <DropdownMenuHeader
          title="Sort"
          onBack={onClose}
          onClose={onClose}
          showBack={true}
          showClose={true}
        />
      </div>

      {/* Sort items */}
      <div className="px-2 py-2 space-y-1">
        {sorts.map((sort, index) => {
          const property = boardProperties[sort.propertyId];
          if (!property) return null;
          
          const Icon = getPropertyIcon(property.type);

          return (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-2 group"
            >
              {/* Drag handle */}
              <div className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>

              {/* Property selector */}
              <div className="flex-1 relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePropertyDropdown(activePropertyDropdown === index ? null : index);
                    setActiveDirectionDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 border rounded dark:border-gray-700 bg-background hover:bg-gray-50 dark:hover:bg-gray-750 text-left text-gray-700 dark:text-gray-200"
                >
                  <div className="flex items-center justify-center w-5 h-5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm">
                    {property.name.charAt(0).toUpperCase() + property.name.slice(1)}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />
                </button>

                {/* Property Dropdown */}
                {activePropertyDropdown === index && (
                  <div className="absolute left-0 top-full mt-1 z-50">
                    <PropertyDropdown
                      properties={boardProperties}
                      existingSorts={sorts}
                      currentPropertyId={sort.propertyId}
                      onSelect={(id) => {
                        const newSorts = [...sorts];
                        newSorts[index] = {
                          ...newSorts[index],
                          propertyId: id,
                        } as SortItem; 
                        setSorts(newSorts);
                        setActivePropertyDropdown(null);
                        onApply(newSorts); 
                      }}
                      onClose={() => setActivePropertyDropdown(null)}
                    />
                  </div>
                )}
              </div>

              {/* Direction selector */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDirectionDropdown(activeDirectionDropdown === index ? null : index);
                    setActivePropertyDropdown(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border rounded dark:border-gray-700 bg-background hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-200 capitalize">
                    {sort.direction}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Direction Dropdown */}
                {activeDirectionDropdown === index && (
                  <div className="absolute right-0 top-full mt-1 z-50">
                    <DirectionDropdown
                      currentDirection={sort.direction}
                      onSelect={(direction) => {
                        const newSorts = [...sorts];
                        newSorts[index] = {
                          ...newSorts[index],
                          direction: direction,
                        } as SortItem; 
                        setSorts(newSorts);
                        setActiveDirectionDropdown(null);
                        onApply(newSorts); // Apply immediately
                      }}                      
                      onClose={() => setActiveDirectionDropdown(null)}
                    />
                  </div>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSort(index);
                }}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add sort button */}
      <div className="px-2 pb-2 relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPropertyPicker(!showPropertyPicker);
          }}
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded w-full"
        >
          <Plus className="w-4 h-4" />
          Add sort
        </button>

        {/* Property picker dropdown */}
        {showPropertyPicker && (
          <div className="absolute left-2 right-2 top-full mt-1 z-50">
            <PropertyPicker
              properties={boardProperties}
              existingSorts={sorts}
              onSelect={handleAddSort}
              onClose={() => setShowPropertyPicker(false)}
            />
          </div>
        )}
      </div>

      {/* Delete sort button */}
      {sorts.length > 0 && (
        <div className="px-2 pb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteAll();
            }}
            className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded w-full"
          >
            <Trash2 className="w-4 h-4" />
            Delete sort
          </button>
        </div>
      )}
    </div>
  );
}