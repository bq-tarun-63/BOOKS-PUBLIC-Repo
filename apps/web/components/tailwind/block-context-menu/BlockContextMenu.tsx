"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Editor } from "@tiptap/core";
import { Node } from "@tiptap/core";
import { MenuConfig, MenuItemConfig } from "./types";
import { ColorSelectorMenu } from "./ColorSelectorMenu";
import { TurnIntoMenu } from "./TurnIntoMenu";
import { DropdownMenuSearch, DropdownMenu, DropdownMenuSectionHeading, DropdownMenuDivider } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";
import { EditorBubbleMenuList } from "./EditorBubbleMenuList";

interface BlockContextMenuProps {
  editor: Editor;
  node: Node;
  position: number;
  config: MenuConfig;
  onClose: () => void;
  anchorPosition: { top: number; left: number };
  showOnRight?: boolean;
}

export const BlockContextMenu: React.FC<BlockContextMenuProps> = ({
  editor,
  node,
  position,
  config,
  onClose,
  anchorPosition,
  showOnRight = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuAnchor, setSubmenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ensure editor maintains selection when menu is open
  // The selection is set when menu opens in context-menu-plugin.ts
  // We just need to ensure it doesn't get lost
  useEffect(() => {
    // Store the selection when menu opens to ensure it's preserved
    const currentSelection = editor.state.selection;
    if (currentSelection.empty) {
      // If selection is empty, this is a problem - but we can't fix it here
      // The selection should be set by context-menu-plugin.ts
      return;
    }
    
    // The selection should be preserved automatically by ProseMirror
    // We don't need to do anything aggressive here
  }, [editor]);

  // Flatten all items for search
  const allItems = useMemo(() => {
    const items: Array<{ item: MenuItemConfig; sectionId: string; index: number }> = [];
    config.sections.forEach((section) => {
      section.items.forEach((item, idx) => {
        if (item.visible?.(editor, node, position) !== false) {
          items.push({ item, sectionId: section.id, index: idx });
        }
      });
    });
    return items;
  }, [config, editor, node, position]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems;
    const query = searchQuery.toLowerCase();
    return allItems.filter(({ item }) =>
      item.label.toLowerCase().includes(query)
    );
  }, [allItems, searchQuery]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(null);
  }, [searchQuery, filteredItems.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!menuRef.current) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => {
            if (prev === null) {
              // First time pressing down - select first item
              return 0;
            }
            return prev < filteredItems.length - 1 ? prev + 1 : 0;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => {
            if (prev === null) {
              // First time pressing up - select last item
              return filteredItems.length - 1;
            }
            return prev > 0 ? prev - 1 : filteredItems.length - 1;
          });
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex !== null) {
            const selectedItem = filteredItems[selectedIndex];
            if (selectedItem) {
              // selectedIndex should match globalIndex since both represent position in visible items
              handleItemClick(selectedItem.item, selectedIndex);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredItems, selectedIndex, onClose]);


  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && e.target && !menuRef.current.contains(e.target as HTMLElement)) {
        // Don't close if clicking on submenu
        if (activeSubmenu && document.querySelector('[role="menu"]')) {
          const submenu = document.querySelector('[role="menu"]');
          if (submenu && submenu.contains(e.target as HTMLElement)) {
            return;
          }
        }
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, activeSubmenu]);

  // Calculate submenu anchor position
  const calculateSubmenuAnchor = (): { top: number; left: number } | null => {
    const submenuWidth = 220;
    const submenuPadding = 20;
    const mainMenuWidth = 265;
    
    // Get main menu's actual position from the DOM
    if (menuRef.current) {
      const mainMenuRect = menuRef.current.getBoundingClientRect();
      const mainMenuTop = mainMenuRect.top;
      const mainMenuLeft = mainMenuRect.left;
      
      // Position submenu to the side of main menu
      const submenuLeft = showOnRight 
        ? mainMenuLeft + mainMenuWidth + submenuPadding
        : mainMenuLeft - submenuWidth - submenuPadding;
      
      return {
        top: mainMenuTop, // Align with main menu's top
        left: submenuLeft, // Position to the side
      };
    } else {
      // Fallback: calculate based on anchor position
      const fallbackTop = anchorPosition.top;
      const fallbackLeft = showOnRight 
        ? anchorPosition.left + mainMenuWidth + submenuPadding
        : anchorPosition.left - submenuWidth - submenuPadding;
      
      return {
        top: fallbackTop,
        left: fallbackLeft,
      };
    }
  };

  // Open submenu for an item
  const openSubmenu = (item: MenuItemConfig) => {
    if (item.hasSubmenu && (item.id === "color" || item.id === "turn-into")) {
      // Clear any pending timeout
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
        submenuTimeoutRef.current = null;
      }
      
      // Ensure editor maintains focus and selection when opening submenu
      // This is critical to prevent selection loss
      try {
        const currentSelection = editor.state.selection;
        if (!currentSelection.empty && editor.view && !editor.view.hasFocus()) {
          // Restore focus to maintain selection visually
          requestAnimationFrame(() => {
            if (editor.view) {
              editor.view.focus();
            }
          });
        }
      } catch (error) {
        // Ignore errors
      }
      
      const anchor = calculateSubmenuAnchor();
      if (anchor) {
        setSubmenuAnchor(anchor);
        setActiveSubmenu(item.id);
      }
    }
  };

  // Close submenu with optional delay
  const closeSubmenu = (delay: number = 0) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
    
    if (delay > 0) {
      submenuTimeoutRef.current = setTimeout(() => {
        setActiveSubmenu(null);
        setSubmenuAnchor(null);
        submenuTimeoutRef.current = null;
      }, delay);
    } else {
      setActiveSubmenu(null);
      setSubmenuAnchor(null);
    }
  };

  const handleItemClick = async (item: MenuItemConfig, globalIndex: number, event?: React.MouseEvent) => {
    if (item.enabled && !item.enabled(editor, node, position)) return;

    // Update selected index to the clicked item
    setSelectedIndex(globalIndex);

    // If item has submenu, show submenu instead of executing onClick
    if (item.hasSubmenu && (item.id === "color" || item.id === "turn-into")) {
      // Simply prevent the click from affecting the editor
      // EditorBubbleItem will preserve selection automatically
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      openSubmenu(item);
      return;
    }

    try {
      await item.onClick(editor, node, position);
      if (!item.hasSubmenu) {
        onClose();
      }
    } catch (error) {
      console.error("Error executing menu item:", error);
    }
  };

  // Convert menu items to DropdownMenuItemProps
  const convertToMenuItemProps = (
    item: MenuItemConfig,
    globalIndex: number
  ): DropdownMenuItemProps => {
    const isEnabled = item.enabled ? item.enabled(editor, node, position) : true;
    const isSelected = selectedIndex === globalIndex;
    const isHovered = hoveredIndex === globalIndex;
    const hasSubmenu = item.hasSubmenu && (item.id === "color" || item.id === "turn-into");

    return {
      id: item.id,
      label: item.label,
      icon: item.icon,
      onClick: (e) => {
        if (isEnabled) {
          // Prevent event from affecting editor - especially important for color submenu
          e?.preventDefault();
          e?.stopPropagation();
          handleItemClick(item, globalIndex, e as React.MouseEvent);
        }
      },
      disabled: !isEnabled,
      hasChevron: item.hasSubmenu || false,
      count: item.keyboardShortcut,
      className: isSelected || isHovered ? "bg-accent" : undefined,
      onMouseEnter: () => {
        setHoveredIndex(globalIndex);
        // Open submenu on hover if item has submenu
        if (hasSubmenu && isEnabled) {
          openSubmenu(item);
        }
        // Don't change editor focus/selection on hover - this can cause marks to be lost
      },
      onMouseLeave: () => {
        setHoveredIndex(null);
        // Close submenu with small delay to allow moving to submenu
        if (hasSubmenu) {
          closeSubmenu(200);
        }
      },
    };
  };

  const groupedItems = useMemo(() => {
    const groups: Array<{
      sectionId: string;
      sectionLabel?: string;
      items: Array<{ item: MenuItemConfig; sectionId: string; index: number; globalIndex: number }>;
    }> = [];

    let globalIndex = 0;
    config.sections.forEach((section) => {
      const sectionItems = filteredItems
        .filter(({ sectionId }) => sectionId === section.id)
        .map(({ item, sectionId, index }) => ({
          item,
          sectionId,
          index,
          globalIndex: globalIndex++,
        }));

      if (sectionItems.length > 0) {
        groups.push({
          sectionId: section.id,
          sectionLabel: section.label,
          items: sectionItems,
        });
      }
    });

    return groups;
  }, [filteredItems, config.sections]);

  // Calculate position - avoid sidebar and viewport edges
  const menuWidth = 265;
  const sidebarWidth = 240;
  const padding = 20;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Calculate horizontal position
  let left: number;
  if (showOnRight) {
    // Show to the right of drag handle
    left = anchorPosition.left + padding;
    // Ensure it doesn't go off screen
    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding;
    }
  } else {
    // Show to the left of drag handle
    left = anchorPosition.left - menuWidth - padding;
    // If it would go under sidebar, show on right instead
    if (left < sidebarWidth + padding) {
      left = anchorPosition.left + padding;
    }
    // Ensure it doesn't go off screen
    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding;
    }
  }

  // Calculate vertical position - open upward if no space below
  // Use a more accurate estimate based on max-h-[70vh] which is 70% of viewport height
  const maxMenuHeight = viewportHeight * 0.7; // 70vh
  const estimatedMenuHeight = Math.min(500, maxMenuHeight); // Cap at 500px or 70vh, whichever is smaller
  const spaceBelow = viewportHeight - anchorPosition.top;
  const spaceAbove = anchorPosition.top;
  
  let top: number;
  let openUpward = false;
  
  if (spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow) {
    // Not enough space below, but more space above - open upward
    openUpward = true;
    top = anchorPosition.top - estimatedMenuHeight;
    // Ensure it doesn't go above viewport
    if (top < padding) {
      top = padding;
      // If we can't fit it above, try to fit as much as possible
      const availableHeight = anchorPosition.top - padding;
      if (availableHeight < estimatedMenuHeight) {
        // Adjust menu max height to fit available space
        // This will be handled by the max-h-[70vh] class
      }
    }
  } else {
    // Open downward (default)
    top = anchorPosition.top;
    const availableHeight = viewportHeight - top - padding;
    const actualMaxHeight = Math.min(availableHeight, maxMenuHeight);
    
    // If menu would go below viewport, adjust upward
    if (top + actualMaxHeight > viewportHeight - padding) {
      // Calculate how much we need to move up
      const overflow = (top + actualMaxHeight) - (viewportHeight - padding);
      top = Math.max(padding, top - overflow);
      
      // If we still don't have enough space, try opening upward
      if (top + actualMaxHeight > viewportHeight - padding && spaceAbove > spaceBelow) {
        openUpward = true;
        top = anchorPosition.top - actualMaxHeight;
        if (top < padding) {
          top = padding;
        }
      }
    }
  }

  return (
    <>
    <div
      ref={menuRef}
      className="fixed z-[10000] bg-background border rounded-lg shadow-lg w-[265px] max-w-[calc(100vw-24px)] max-h-[70vh] flex flex-col overflow-hidden"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        // Prevent mouse down from affecting editor selection
        // Only stop propagation, don't prevent default (that would break clicks)
        e.stopPropagation();
      }}
      onMouseUp={(e) => {
        // Prevent mouse up from affecting editor
        e.stopPropagation();
      }}
    >
      {/* Search Input */}
      <div className="flex-shrink-0 p-2 pb-1">
        <DropdownMenuSearch
          placeholder="Search actions…"
          value={searchQuery}
          onChange={setSearchQuery}
          variant="subtle"
          autoFocus={true}
        />
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div role="listbox" className="rounded-lg">
          {groupedItems.map((group, groupIndex) => {
            const menuItems: DropdownMenuItemProps[] = group.items.map(({ item, globalIndex }) =>
              convertToMenuItemProps(item, globalIndex)
            );

            return (
              <React.Fragment key={group.sectionId}>
                <div className="p-1">
                  {group.sectionLabel && (
                    <div className="px-2 mt-1.5 mb-2">
                      <DropdownMenuSectionHeading>
                        {group.sectionLabel}
                      </DropdownMenuSectionHeading>
                    </div>
                  )}
                  <EditorBubbleMenuList items={menuItems} editor={editor} />
                </div>
                {groupIndex < groupedItems.length - 1 && (
                  <div className="px-1">
                    <DropdownMenuDivider />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      {config.footer && (
        <div className="flex-shrink-0 p-2 pt-1">
          <div className="relative mt-1">
            <div className="absolute top-0 left-3 right-3 h-px bg-border"></div>
          </div>
          <div className="flex items-center gap-2 w-full px-2 py-1.5 min-h-[28px]">
            <div className="flex-1 min-w-0">
              {config.footer.lastEditedBy && (
                <div className="text-xs text-muted-foreground mb-1">
                  Last edited by {config.footer.lastEditedBy}
                </div>
              )}
              {config.footer.lastEditedAt && (
                <div className="text-xs text-muted-foreground truncate">
                  {config.footer.lastEditedAt}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Color Submenu */}
    {activeSubmenu === "color" && submenuAnchor && (
      <div
        onMouseEnter={() => {
          // Keep submenu open when hovering over it
          if (submenuTimeoutRef.current) {
            clearTimeout(submenuTimeoutRef.current);
            submenuTimeoutRef.current = null;
          }
        }}
        onMouseLeave={() => {
          // Close submenu when leaving it
          closeSubmenu(0);
        }}
        onMouseDown={(e) => {
          // Prevent mouse down from affecting editor selection
          e.stopPropagation();
        }}
        onMouseUp={(e) => {
          // Prevent mouse up from affecting editor
          e.stopPropagation();
        }}
      >
        <ColorSelectorMenu
          editor={editor}
          onClose={onClose}
          onBack={() => {
            closeSubmenu(0);
          }}
          anchorPosition={submenuAnchor}
          showOnRight={showOnRight}
        />
      </div>
    )}

    {/* Turn Into Submenu */}
    {activeSubmenu === "turn-into" && submenuAnchor && (
      <div
        onMouseEnter={() => {
          // Keep submenu open when hovering over it
          if (submenuTimeoutRef.current) {
            clearTimeout(submenuTimeoutRef.current);
            submenuTimeoutRef.current = null;
          }
        }}
        onMouseLeave={() => {
          // Close submenu when leaving it
          closeSubmenu(0);
        }}
        onMouseDown={(e) => {
          // Prevent mouse down from affecting editor selection
          e.stopPropagation();
        }}
        onMouseUp={(e) => {
          // Prevent mouse up from affecting editor
          e.stopPropagation();
        }}
      >
        <TurnIntoMenu
          editor={editor}
          node={node}
          position={position}
          onClose={onClose}
          onBack={() => {
            closeSubmenu(0);
          }}
          anchorPosition={submenuAnchor}
          showOnRight={showOnRight}
        />
      </div>
    )}
    </>
  );
};

