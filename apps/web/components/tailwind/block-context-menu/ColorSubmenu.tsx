"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Editor } from "@tiptap/core";

interface ColorSubmenuProps {
  editor: Editor;
  onClose: () => void;
  onBack: () => void;
  anchorPosition: { top: number; left: number };
  showOnRight?: boolean;
}

type ColorType = "text" | "background";

interface ColorOption {
  id: string;
  label: string;
  value: string;
  type: ColorType;
}

const textColors: ColorOption[] = [
  { id: "default-text", label: "Default text", value: "default", type: "text" },
  { id: "gray-text", label: "Gray text", value: "gray", type: "text" },
  { id: "brown-text", label: "Brown text", value: "brown", type: "text" },
  { id: "orange-text", label: "Orange text", value: "orange", type: "text" },
  { id: "yellow-text", label: "Yellow text", value: "yellow", type: "text" },
  { id: "green-text", label: "Green text", value: "green", type: "text" },
  { id: "blue-text", label: "Blue text", value: "blue", type: "text" },
  { id: "purple-text", label: "Purple text", value: "purple", type: "text" },
  { id: "pink-text", label: "Pink text", value: "pink", type: "text" },
  { id: "red-text", label: "Red text", value: "red", type: "text" },
];

const backgroundColors: ColorOption[] = [
  { id: "default-bg", label: "Default background", value: "default", type: "background" },
  { id: "gray-bg", label: "Gray background", value: "gray", type: "background" },
  { id: "brown-bg", label: "Brown background", value: "brown", type: "background" },
  { id: "orange-bg", label: "Orange background", value: "orange", type: "background" },
  { id: "yellow-bg", label: "Yellow background", value: "yellow", type: "background" },
  { id: "green-bg", label: "Green background", value: "green", type: "background" },
  { id: "blue-bg", label: "Blue background", value: "blue", type: "background" },
  { id: "purple-bg", label: "Purple background", value: "purple", type: "background" },
  { id: "pink-bg", label: "Pink background", value: "pink", type: "background" },
  { id: "red-bg", label: "Red background", value: "red", type: "background" },
];

// Color mapping for CSS variables (you may need to adjust these based on your theme)
const colorStyles: Record<string, { text: string; bg: string; border: string }> = {
  default: {
    text: "inherit",
    bg: "transparent",
    border: "var(--ca-graBorPriTra)",
  },
  gray: {
    text: "var(--c-graTexSec)",
    bg: "var(--c-graBacSec)",
    border: "var(--ca-graBorPriTra)",
  },
  brown: {
    text: "var(--c-broTexSec)",
    bg: "var(--c-broBacSec)",
    border: "var(--ca-broBorPriTra)",
  },
  orange: {
    text: "var(--c-oraTexSec)",
    bg: "var(--c-oraBacSec)",
    border: "var(--ca-oraBorPriTra)",
  },
  yellow: {
    text: "var(--c-yelTexSec)",
    bg: "var(--c-yelBacSec)",
    border: "var(--ca-yelBorPriTra)",
  },
  green: {
    text: "var(--c-greTexSec)",
    bg: "var(--c-greBacSec)",
    border: "var(--ca-greBorPriTra)",
  },
  blue: {
    text: "var(--c-bluTexSec)",
    bg: "var(--c-bluBacSec)",
    border: "var(--ca-bluBorPriTra)",
  },
  purple: {
    text: "var(--c-purTexSec)",
    bg: "var(--c-purBacSec)",
    border: "var(--ca-purBorPriTra)",
  },
  pink: {
    text: "var(--c-pinTexSec)",
    bg: "var(--c-pinBacSec)",
    border: "var(--ca-pinBorPriTra)",
  },
  red: {
    text: "var(--c-redTexSec)",
    bg: "var(--c-redBacSec)",
    border: "var(--ca-redBorPriTra)",
  },
};

export const ColorSubmenu: React.FC<ColorSubmenuProps> = ({
  editor,
  onClose,
  onBack,
  anchorPosition,
  showOnRight = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lastUsedColors, setLastUsedColors] = useState<ColorOption[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load last used colors from localStorage (optional enhancement)
  useEffect(() => {
    const saved = localStorage.getItem("lastUsedColors");
    if (saved) {
      try {
        setLastUsedColors(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Calculate position - same logic as main menu
  const menuWidth = 220;
  const sidebarWidth = 240;
  const padding = 20;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left: number;
  if (showOnRight) {
    left = anchorPosition.left + padding;
    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding;
    }
  } else {
    left = anchorPosition.left - menuWidth - padding;
    if (left < sidebarWidth + padding) {
      left = anchorPosition.left + padding;
    }
    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding;
    }
  }

  let top = anchorPosition.top;
  const maxHeight = viewportHeight - top - padding;
  const actualMaxHeight = Math.min(maxHeight, viewportHeight * 0.7);
  if (top + actualMaxHeight > viewportHeight - padding) {
    top = Math.max(padding, viewportHeight - actualMaxHeight - padding);
  }

  const getColorValue = useCallback((colorName: string): string => {
    // Map color names to actual hex values for text color
    const colorMap: Record<string, string> = {
      gray: "#9b9a97",
      brown: "#64473a",
      orange: "#d9730d",
      yellow: "#dfab01",
      green: "#0f7b6c",
      blue: "#0b6e99",
      purple: "#6940a5",
      pink: "#ad1a72",
      red: "#e03e3e",
    };
    return colorMap[colorName] || "";
  }, []);

  const getHighlightColor = useCallback((colorName: string): string => {
    // Map color names to highlight CSS variables
    const highlightMap: Record<string, string> = {
      gray: "var(--novel-highlight-gray)",
      brown: "var(--novel-highlight-gray)", // Fallback if brown highlight doesn't exist
      orange: "var(--novel-highlight-orange)",
      yellow: "var(--novel-highlight-yellow)",
      green: "var(--novel-highlight-green)",
      blue: "var(--novel-highlight-blue)",
      purple: "var(--novel-highlight-purple)",
      pink: "var(--novel-highlight-pink)",
      red: "var(--novel-highlight-red)",
    };
    return highlightMap[colorName] || "var(--novel-highlight-default)";
  }, []);

  const handleColorSelect = useCallback((color: ColorOption) => {
    // Get current marks BEFORE any changes to preserve them
    const isHighlightActive = editor.isActive("highlight");
    const currentHighlightAttrs = isHighlightActive ? editor.getAttributes("highlight") : null;
    const currentHighlightColor = currentHighlightAttrs?.color || null;
    
    const currentTextStyleAttrs = editor.getAttributes("textStyle");
    const currentTextColor = currentTextStyleAttrs?.color || null;
    
    // Use ProseMirror transaction to apply both marks simultaneously
    const { state, view } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    // Check if we're inside a callout node
    let calloutNode: any = null;
    let calloutDepth = -1;
    
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === "callout") {
        calloutNode = node;
        calloutDepth = depth;
        break;
      }
    }
    
    // If inside callout and applying background color, use node attribute
    if (calloutNode && color.type === "background") {
      const calloutPos = $from.before(calloutDepth);
      if (color.value === "default") {
        editor.chain()
          .setNodeSelection(calloutPos)
          .updateAttributes("callout", { backgroundColor: null })
          .run();
      } else {
        const colorValue = getHighlightColor(color.value);
        editor.chain()
          .setNodeSelection(calloutPos)
          .updateAttributes("callout", { backgroundColor: colorValue })
          .run();
      }
      onClose();
      return;
    }
    
    // For regular blocks, use mark-based approach
    let from: number;
    let to: number;
    
    if (color.type === "background") {
      // Find the block-level node
      let blockDepth = $from.depth;
      let blockNode: any = null;
      
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.isBlock && !node.type.name.includes("doc")) {
          blockNode = node;
          blockDepth = depth;
          break;
        }
      }
      
      if (blockNode) {
        from = $from.start(blockDepth);
        to = $from.end(blockDepth);
      } else {
        from = selection.from;
        to = selection.to;
      }
    } else {
      from = selection.from;
      to = selection.to;
    }
    
    // Focus the editor first
    editor.chain().focus();
    
    // Create a transaction that applies both marks at once
    const tr = state.tr;
    
    // Get the mark types
    const textStyleMark = state.schema.marks.textStyle;
    const highlightMark = state.schema.marks.highlight;
    
    // Apply marks based on color type
    // Important: Remove existing marks of the type we're changing first,
    // then add both the new mark and the preserved mark together
    if (color.type === "text") {
      if (color.value === "default") {
        // Remove text color but preserve highlight
        if (textStyleMark) {
          tr.removeMark(from, to, textStyleMark);
        }
        // Re-add highlight if it existed
        if (currentHighlightColor && highlightMark) {
          const highlightMarkInstance = highlightMark.create({ color: currentHighlightColor });
          tr.addMark(from, to, highlightMarkInstance);
        }
      } else {
        const colorValue = getColorValue(color.value);
        // Remove existing textStyle mark first
        if (textStyleMark) {
          tr.removeMark(from, to, textStyleMark);
        }
        // Add new textStyle mark
        if (textStyleMark) {
          const textStyleMarkInstance = textStyleMark.create({ color: colorValue });
          tr.addMark(from, to, textStyleMarkInstance);
        }
        // Re-add highlight if it existed (after removing textStyle, we need to restore it)
        if (currentHighlightColor && highlightMark) {
          const highlightMarkInstance = highlightMark.create({ color: currentHighlightColor });
          tr.addMark(from, to, highlightMarkInstance);
        }
      }
    } else {
      // Background color (using highlight)
      if (color.value === "default") {
        // Remove highlight but preserve text color
        if (highlightMark) {
          tr.removeMark(from, to, highlightMark);
        }
        // Re-add text color if it existed
        if (currentTextColor && textStyleMark) {
          const textStyleMarkInstance = textStyleMark.create({ color: currentTextColor });
          tr.addMark(from, to, textStyleMarkInstance);
        }
      } else {
        const colorValue = getHighlightColor(color.value);
        // Remove existing highlight mark first
        if (highlightMark) {
          tr.removeMark(from, to, highlightMark);
        }
        // Re-add text color if it existed (before adding new highlight)
        if (currentTextColor && textStyleMark) {
          const textStyleMarkInstance = textStyleMark.create({ color: currentTextColor });
          tr.addMark(from, to, textStyleMarkInstance);
        }
        // Add new highlight mark
        if (highlightMark) {
          const highlightMarkInstance = highlightMark.create({ color: colorValue });
          tr.addMark(from, to, highlightMarkInstance);
        }
      }
    }
    
    // Dispatch the transaction
    view.dispatch(tr);

    // Save to last used (limit to 1)
    setLastUsedColors([color]);
    try {
      localStorage.setItem("lastUsedColors", JSON.stringify([color]));
    } catch {
      // Ignore storage errors
    }

    onClose();
  }, [editor, getColorValue, getHighlightColor, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!menuRef.current) return;

      const allItems = [...lastUsedColors, ...textColors, ...backgroundColors];
      const totalItems = allItems.length;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
          break;
        case "Enter":
          e.preventDefault();
          const selectedColor = allItems[selectedIndex];
          if (selectedColor) {
            handleColorSelect(selectedColor);
          }
          break;
        case "Escape":
          e.preventDefault();
          onBack();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, onBack, lastUsedColors, handleColorSelect]);

  const renderColorItem = (color: ColorOption, index: number, showCheckmark = false) => {
    const isSelected = selectedIndex === index;
    const isHovered = hoveredIndex === index;
    const styles: { text: string; bg: string; border: string } = colorStyles[color.value] ?? colorStyles.default ?? {
      text: "inherit",
      bg: "transparent",
      border: "var(--ca-graBorPriTra)",
    };
    const isActive = checkIfColorActive(color);

    return (
      <div
        key={color.id}
        role="menuitem"
        tabIndex={-1}
        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
          isSelected || isHovered ? "bg-accent" : "hover:bg-accent/50"
        }`}
        onClick={() => handleColorSelect(color)}
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <div className="flex items-center justify-center min-w-[20px] min-h-[20px]">
          <div
            className="inline-flex items-center justify-center w-[26px] h-[26px] text-center text-base rounded-md font-medium"
            style={{
              boxShadow: `inset 0 0 0 ${color.value === "default" ? "1px" : color.type === "text" ? "1px" : "1px"} ${styles.border}`,
              color: color.type === "text" && color.value !== "default" ? styles.text : "inherit",
              fill: color.type === "text" && color.value !== "default" ? styles.text : "inherit",
              backgroundColor: color.type === "background" && color.value !== "default" ? styles.bg : "transparent",
            }}
          >
            {color.type === "text" ? "A" : ""}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate">{color.label}</div>
        </div>
        {(showCheckmark && isActive) && (
          <div className="flex-shrink-0">
            <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
              <path d="M11.834 3.309a.625.625 0 0 1 1.072.642l-5.244 8.74a.625.625 0 0 1-1.01.085L3.155 8.699a.626.626 0 0 1 .95-.813l2.93 3.419z"></path>
            </svg>
          </div>
        )}
      </div>
    );
  };

  const checkIfColorActive = useCallback((color: ColorOption): boolean => {
    if (color.type === "text") {
      if (color.value === "default") {
        // Check if no color is set
        const attrs = editor.getAttributes("textStyle");
        return !attrs.color;
      }
      const colorValue = getColorValue(color.value);
      const attrs = editor.getAttributes("textStyle");
      return attrs.color === colorValue;
    } else {
      if (color.value === "default") {
        return !editor.isActive("highlight");
      }
      const highlightValue = getHighlightColor(color.value);
      return editor.isActive("highlight", { color: highlightValue });
    }
  }, [editor, getColorValue, getHighlightColor]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[10001] bg-background border rounded-lg shadow-lg w-[220px] max-w-[calc(100vw-24px)] max-h-[70vh] flex flex-col overflow-hidden"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
      role="menu"
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Last Used Section */}
        {lastUsedColors.length > 0 && (
          <div className="p-1">
            <div className="flex items-center px-2 py-1.5 mt-1.5 mb-2 text-xs font-medium text-muted-foreground">
              <div className="flex-1 truncate">Last used</div>
            </div>
            <div className="flex flex-col gap-[1px]">
              {lastUsedColors.map((color, idx) => renderColorItem(color, idx, true))}
            </div>
          </div>
        )}

        {/* Text Color Section */}
        <div className="p-1">
          {lastUsedColors.length > 0 && (
            <div className="relative my-1 mb-0">
              <div className="absolute top-0 left-3 right-3 h-px bg-border"></div>
            </div>
          )}
          <div className="flex items-center px-2 py-1.5 mt-1.5 mb-2 text-xs font-medium text-muted-foreground">
            <div className="flex-1 truncate">Text color</div>
          </div>
          <div className="flex flex-col gap-[1px]">
            {textColors.map((color, idx) =>
              renderColorItem(
                color,
                lastUsedColors.length + idx,
                true
              )
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-1">
          <div className="absolute top-0 left-3 right-3 h-px bg-border"></div>
        </div>

        {/* Background Color Section */}
        <div className="p-1">
          <div className="flex items-center px-2 py-1.5 mt-1.5 mb-2 text-xs font-medium text-muted-foreground">
            <div className="flex-1 truncate">Background color</div>
          </div>
          <div className="flex flex-col gap-[1px]">
            {backgroundColors.map((color, idx) =>
              renderColorItem(
                color,
                lastUsedColors.length + textColors.length + idx,
                true
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

