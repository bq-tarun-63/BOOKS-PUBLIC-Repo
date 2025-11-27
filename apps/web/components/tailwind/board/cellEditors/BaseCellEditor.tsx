"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CellEditorProps } from "@/types/cellEditor";

interface BaseCellEditorProps extends CellEditorProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: number;
}

export default function BaseCellEditor({
  children,
  position,
  onClose,
  className = "",
  maxHeight = 300,
}: BaseCellEditorProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Add a small delay to allow blur events to complete first
        setTimeout(() => {
          onClose();
        }, 100);
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

  useEffect(() => {
    if (!dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let { top, left } = position;

    // Adjust horizontal position if dropdown goes off-screen
    if (left + rect.width > viewport.width) {
      left = viewport.width - rect.width - 10;
    }

    // Adjust vertical position if dropdown goes off-screen
    if (top + rect.height > viewport.height) {
      top = position.top - rect.height - 5;
    }

    // Ensure minimum distance from edges
    left = Math.max(10, left);
    top = Math.max(10, top);

    setAdjustedPosition({ top, left, width: position.width, height: position.height });
  }, [position]);

  return (
    <div
      ref={dropdownRef}
      className={`fixed z-[1000] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg ${className}`}
      style={{
        top: `${adjustedPosition.top}px`,
        left: `${adjustedPosition.left}px`,
        minWidth: `${position.width}px`,
        maxHeight: `${maxHeight}px`,
      }}
    >
      {children}
    </div>
  );
}
