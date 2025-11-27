"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Editor } from "@tiptap/core";
import { Check } from "lucide-react";
import { DropdownMenuSectionHeading, DropdownMenu, DropdownMenuDivider } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";

// Use the same color definitions from color-selector.tsx
const TEXT_COLORS = [
  { name: "Default", color: "var(--novel-black)" },
  { name: "Purple", color: "#9333EA" },
  { name: "Red", color: "#E00000" },
  { name: "Yellow", color: "#EAB308" },
  { name: "Blue", color: "#2563EB" },
  { name: "Green", color: "#008A00" },
  { name: "Orange", color: "#FFA500" },
  { name: "Pink", color: "#BA4081" },
  { name: "Gray", color: "#A8A29E" },
];

const HIGHLIGHT_COLORS = [
  { name: "Default", color: "var(--novel-highlight-default)" },
  { name: "Purple", color: "var(--novel-highlight-purple)" },
  { name: "Red", color: "var(--novel-highlight-red)" },
  { name: "Yellow", color: "var(--novel-highlight-yellow)" },
  { name: "Blue", color: "var(--novel-highlight-blue)" },
  { name: "Green", color: "var(--novel-highlight-green)" },
  { name: "Orange", color: "var(--novel-highlight-orange)" },
  { name: "Pink", color: "var(--novel-highlight-pink)" },
  { name: "Gray", color: "var(--novel-highlight-gray)" },
];

interface ColorSelectorMenuProps {
  editor: Editor;
  onClose: () => void;
  onBack: () => void;
  anchorPosition: { top: number; left: number };
  showOnRight?: boolean;
}

export const ColorSelectorMenu: React.FC<ColorSelectorMenuProps> = ({
  editor,
  onClose,
  onBack,
  anchorPosition,
  showOnRight = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [editorState, setEditorState] = useState(0);
  
  // Store the original selection when menu opens to preserve it
  // This is critical - we need to preserve the selection that was set when menu opened
  const originalSelectionRef = useRef<{ from: number; to: number } | null>(null);
  
  useEffect(() => {
    // Store the current selection when menu opens
    // This selection was set by context-menu-plugin.ts to select the entire block
    const { from, to } = editor.state.selection;
    if (from !== to) {
      originalSelectionRef.current = { from, to };
    }
  }, []);
  
  // Continuously ensure editor maintains focus and selection is preserved
  // This prevents the selection from being lost when hovering
  useEffect(() => {
    if (!originalSelectionRef.current) return;
    
    const preserveSelection = () => {
      if (!originalSelectionRef.current) return;
      
      try {
        const currentSelection = editor.state.selection;
        const original = originalSelectionRef.current;
        
        // Check if document is still valid
        const docSize = editor.state.doc.content.size;
        if (original.from < 0 || original.to > docSize || original.from >= original.to) {
          return; // Invalid selection, don't try to restore
        }
        
        // If selection is empty or significantly different, restore it
        // Allow small differences (1-2 chars) to avoid constant restoration
        const fromDiff = Math.abs(currentSelection.from - original.from);
        const toDiff = Math.abs(currentSelection.to - original.to);
        
        if (currentSelection.empty || 
            (fromDiff > 2 || toDiff > 2)) {
          // Restore the original selection
          try {
            editor.chain().setTextSelection({ from: original.from, to: original.to }).run();
          } catch (error) {
            // Selection might be invalid now, ignore
          }
        }
        
        // Ensure editor has focus to maintain selection visually
        // But don't do this too aggressively to avoid focus stealing
        if (editor.view && !editor.view.hasFocus()) {
          // Use requestAnimationFrame to avoid conflicts
          requestAnimationFrame(() => {
            if (editor.view && originalSelectionRef.current) {
              editor.view.focus();
            }
          });
        }
      } catch (error) {
        // Ignore errors
      }
    };
    
    // Check periodically to preserve selection
    // Use a reasonable interval - not too frequent to avoid performance issues
    const interval = setInterval(preserveSelection, 150);
    
    return () => {
      clearInterval(interval);
    };
  }, [editor]);

  // Listen to editor updates to re-render when colors change
  // This is critical - we need to re-render when editor state changes
  useEffect(() => {
    const updateHandler = () => {
      // Force re-render by updating state
      setEditorState(prev => prev + 1);
    };
    
    // Listen to both update and selectionUpdate events
    editor.on("update", updateHandler);
    editor.on("selectionUpdate", updateHandler);
    editor.on("transaction", updateHandler);
    
    return () => {
      editor.off("update", updateHandler);
      editor.off("selectionUpdate", updateHandler);
      editor.off("transaction", updateHandler);
    };
  }, [editor]);

  // Use the provided left position (already calculated to be side by side with main menu)
  // Just ensure it doesn't go off screen
  const menuWidth = 220;
  const padding = 20;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = anchorPosition.left;
  
  // Ensure it doesn't go off screen
  if (left + menuWidth > viewportWidth - padding) {
    left = viewportWidth - menuWidth - padding;
  }
  if (left < padding) {
    left = padding;
  }

  // Calculate vertical position - align with main menu (side by side)
  // The submenu opens horizontally (to the side), aligned with the main menu's top
  const maxSubmenuHeight = viewportHeight * 0.5; // Reduced to 50vh max
  const estimatedSubmenuHeight = Math.min(250, maxSubmenuHeight); // Reduced cap at 250px
  
  // Align top of submenu with top of main menu
  let top = anchorPosition.top;
  
  // If submenu would cut off from bottom, adjust upward
  if (top + estimatedSubmenuHeight > viewportHeight - padding) {
    // Move up to fit within viewport
    top = viewportHeight - padding - estimatedSubmenuHeight;
    
    // If that pushes it above viewport, position at top with padding
    // (menu will scroll if needed, but won't cut off)
    if (top < padding) {
      top = padding;
    }
  }
  
  // Ensure it doesn't go above viewport
  if (top < padding) {
    top = padding;
  }

  // Get active colors - use the same logic as color-selector.tsx
  // Use useMemo to recalculate when editorState changes
  const activeColorItem = useMemo(() => {
    return TEXT_COLORS.find(({ color }) => editor.isActive("textStyle", { color }));
  }, [editor, editorState]);

  const activeHighlightItem = useMemo(() => {
    // Check if we're in a callout with background color
    if (editor.isActive("callout")) {
      const calloutAttrs = editor.getAttributes("callout");
      if (calloutAttrs.backgroundColor) {
        return HIGHLIGHT_COLORS.find(({ color }) => color === calloutAttrs.backgroundColor);
      }
    }
    // Otherwise check for highlight mark
    return HIGHLIGHT_COLORS.find(({ color }) => editor.isActive("highlight", { color }));
  }, [editor, editorState]);

  const handleTextColorSelect = useCallback((colorItem: typeof TEXT_COLORS[0]) => {
    // Use the exact same logic as color-selector.tsx
    editor.commands.unsetColor();
    if (colorItem.name !== "Default") {
      editor
        .chain()
        .focus()
        .setColor(colorItem.color || "")
        .run();
    }
    // Don't close - let user see the change and checkmark update
  }, [editor]);

  const handleHighlightColorSelect = useCallback((colorItem: typeof HIGHLIGHT_COLORS[0]) => {
    // CRITICAL: Always use the original selection that was stored when menu opened
    // This ensures we apply color to the correct block even if:
    // - User clicked outside (empty space) to close modal
    // - Editor lost focus
    // - Current selection is empty or changed

    const { state, view } = editor;
    let $from;
    
    // ALWAYS prefer original selection - this is the block that was selected when menu opened
    if (originalSelectionRef.current) {
      const original = originalSelectionRef.current;
      try {
        // Validate original selection is still within document bounds
        const docSize = state.doc.content.size;
        if (original.from >= 0 && original.to <= docSize && original.from <= original.to) {
          // Use original selection - this is the block we want to color
          $from = state.doc.resolve(original.from);
        } else {
          // Original selection is out of bounds, fall back to current
          $from = editor.state.selection.$from;
        }
      } catch (error) {
        // If resolution fails, try current selection
        $from = editor.state.selection.$from;
      }
    } else {
      // No original selection stored (shouldn't happen, but fallback)
      $from = editor.state.selection.$from;
    }
    
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
    
    // If inside callout, apply background color as node attribute
    if (calloutNode) {
      const calloutPos = $from.before(calloutDepth);
      if (colorItem.name === "Default") {
        editor.chain()
          .setNodeSelection(calloutPos)
          .updateAttributes("callout", { backgroundColor: null })
          .run();
      } else {
        editor.chain()
          .setNodeSelection(calloutPos)
          .updateAttributes("callout", { backgroundColor: colorItem.color })
          .run();
      }
    } else {
      // For regular blocks, apply highlight mark directly to block range
      // WITHOUT changing the selection - this is the key difference from before
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
        // Calculate the exact block boundaries
        // Use start() and end() to get the full block range including all content
        const blockStart = $from.start(blockDepth);
        const blockEnd = $from.end(blockDepth);
        
        // Check if block is empty (no text content)
        // A block is empty if it has no content or the start/end positions are the same
        const isBlockEmpty = blockNode.content.size === 0 || blockStart === blockEnd;
        
        if (isBlockEmpty) {
          // For empty blocks, we need to ensure there's a text node for the mark to attach to
          // First, set selection to the block, then apply the highlight
          // The editor commands should handle creating a text node if needed
          const selectionStart = blockStart;
          // For empty blocks, we need at least a 1-character range
          // blockEnd might equal blockStart for truly empty blocks, so ensure we have a range
          let selectionEnd = blockEnd;
          if (selectionEnd <= selectionStart) {
            // If block is completely empty, we need to insert a zero-width space or use blockStart + 1
            // Try to use the position right after the block start
            selectionEnd = Math.min(blockStart + 1, state.doc.content.size);
          }
          
          // Ensure selection end doesn't exceed document size
          const safeSelectionEnd = Math.min(selectionEnd, state.doc.content.size);
          
          // Store original selection for restoration
          const originalSel = originalSelectionRef.current 
            ? { from: originalSelectionRef.current.from, to: originalSelectionRef.current.to }
            : { from: editor.state.selection.from, to: editor.state.selection.to };
          
          if (colorItem.name === "Default") {
            // Remove highlight from empty block
            // Use focus() like color-selector.tsx does
            editor.chain()
              .setTextSelection({ from: selectionStart, to: safeSelectionEnd })
              .focus()
              .unsetHighlight()
              .run();
          } else {
            // Apply highlight to empty block
            // Use focus() like color-selector.tsx does - this ensures the editor is focused
            // and the mark can be applied properly even to empty blocks
            editor.chain()
              .setTextSelection({ from: selectionStart, to: safeSelectionEnd })
              .focus()
              .setHighlight({ color: colorItem.color })
              .run();
          }
          
          // Restore the original selection after a brief delay to ensure the mark is applied
          requestAnimationFrame(() => {
            try {
              // Try to restore the original selection
              const docSize = editor.state.doc.content.size;
              if (originalSel.from >= 0 && originalSel.to <= docSize && originalSel.from <= originalSel.to) {
                editor.chain().setTextSelection({ from: originalSel.from, to: originalSel.to }).run();
              } else {
                // If original selection is invalid, set cursor at block start
                editor.chain().setTextSelection(selectionStart).run();
              }
            } catch (error) {
              // If selection is invalid, just focus the editor
              if (editor.view) {
                editor.view.focus();
              }
            }
          });
        } else if (blockStart >= 0 && blockEnd > blockStart && blockEnd <= state.doc.content.size) {
          // For non-empty blocks, use editor commands (like color-selector.tsx)
          // This ensures the editor is focused and the mark is applied correctly
          // even when clicking outside (empty space) to close the modal
          if (colorItem.name === "Default") {
            editor.chain()
              .setTextSelection({ from: blockStart, to: blockEnd })
              .focus()
              .unsetHighlight()
              .run();
          } else {
            editor.chain()
              .setTextSelection({ from: blockStart, to: blockEnd })
              .focus()
              .setHighlight({ color: colorItem.color })
              .run();
          }
          
          // Restore the original selection after applying the color
          // This ensures the user's selection is preserved
          requestAnimationFrame(() => {
            try {
              if (originalSelectionRef.current) {
                const orig = originalSelectionRef.current;
                const docSize = editor.state.doc.content.size;
                if (orig.from >= 0 && orig.to <= docSize && orig.from <= orig.to) {
                  editor.chain().setTextSelection({ from: orig.from, to: orig.to }).run();
                }
              }
            } catch (error) {
              // If selection restoration fails, just ensure editor has focus
              if (editor.view) {
                editor.view.focus();
              }
            }
          });
        }
      } else {
        // Fallback: use current selection without changing it (like text color)
        editor.commands.unsetHighlight();
        if (colorItem.name !== "Default") {
          editor.chain().focus().setHighlight({ color: colorItem.color }).run();
        }
      }
    }
    // Don't close - let user see the change and checkmark update
  }, [editor]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && e.target && !menuRef.current.contains(e.target as HTMLElement)) {
        onBack();
      }
    };

    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onBack]);

  // Keyboard navigation - Escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  // Build text color menu items - check isActive directly like color-selector.tsx
  // Use useMemo to recalculate when editorState changes
  const textColorMenuItems: DropdownMenuItemProps[] = useMemo(() => {
    return TEXT_COLORS.map((colorItem) => {
      const isActive = editor.isActive("textStyle", { color: colorItem.color });
      return {
        id: `text-${colorItem.name.toLowerCase()}`,
        label: colorItem.name,
        icon: (
          <div className="rounded-sm border px-2 py-px font-medium" style={{ color: colorItem.color }}>
            A
          </div>
        ),
        onClick: () => handleTextColorSelect(colorItem),
        rightElement: isActive ? <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : undefined,
      };
    });
  }, [editor, editorState, handleTextColorSelect]);

  // Build highlight color menu items - check isActive directly like color-selector.tsx
  // Use useMemo to recalculate when editorState changes
  const highlightColorMenuItems: DropdownMenuItemProps[] = useMemo(() => {
    return HIGHLIGHT_COLORS.map((colorItem) => {
      const isActive = editor.isActive("highlight", { color: colorItem.color });
      return {
        id: `highlight-${colorItem.name.toLowerCase()}`,
        label: colorItem.name,
        icon: (
          <div className="rounded-sm border px-2 py-px font-medium" style={{ backgroundColor: colorItem.color }}>
            A
          </div>
        ),
        onClick: () => handleHighlightColorSelect(colorItem),
        rightElement: isActive ? <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : undefined,
      };
    });
  }, [editor, editorState, handleHighlightColorSelect]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[10001] bg-background border rounded-lg shadow-lg w-[220px] max-w-[calc(100vw-24px)] max-h-[50vh] flex flex-col overflow-hidden"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
      role="menu"
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        // Prevent mouse down from affecting editor selection
        e.stopPropagation();
        // Don't prevent default - we need clicks to work
      }}
      onMouseUp={(e) => {
        // Prevent mouse up from affecting editor
        e.stopPropagation();
      }}
      onMouseEnter={() => {
        // When hovering over menu, ensure editor maintains focus and selection
        if (originalSelectionRef.current) {
          const original = originalSelectionRef.current;
          // Restore selection if it was lost
          const currentSelection = editor.state.selection;
          if (currentSelection.empty || 
              currentSelection.from !== original.from || 
              currentSelection.to !== original.to) {
            editor.chain().setTextSelection({ from: original.from, to: original.to }).run();
          }
          // Ensure editor has focus
          if (editor.view && !editor.view.hasFocus()) {
            requestAnimationFrame(() => {
              if (editor.view) {
                editor.view.focus();
              }
            });
          }
        }
      }}
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Text Color Section */}
        <div className="p-1">
          <div className="px-2 mt-1.5 mb-2">
            <DropdownMenuSectionHeading>Color</DropdownMenuSectionHeading>
          </div>
          <DropdownMenu items={textColorMenuItems} />
        </div>

        {/* Divider */}
        <div className="px-1">
          <DropdownMenuDivider />
        </div>

        {/* Background Color Section */}
        <div className="p-1">
          <div className="px-2 mt-1.5 mb-2">
            <DropdownMenuSectionHeading>Background</DropdownMenuSectionHeading>
          </div>
          <DropdownMenu items={highlightColorMenuItems} />
        </div>
      </div>
    </div>
  );
};

