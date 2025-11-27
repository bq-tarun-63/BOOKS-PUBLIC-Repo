import { Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Editor } from "@tiptap/core";
import { createRoot, Root } from "react-dom/client";
import React from "react";
import { BlockContextMenu } from "./BlockContextMenu";
import { getMenuConfigForNode } from "./menu-config";

// Use ProseMirror's Node type from the view
type ProseMirrorNode = ReturnType<EditorView["state"]["doc"]["nodeAt"]>;

export interface ContextMenuState {
  isOpen: boolean;
  node: ProseMirrorNode | null;
  position: number;
  anchorPosition: { top: number; left: number } | null;
}

export const contextMenuPluginKey = new PluginKey("blockContextMenu");

export function createContextMenuPlugin(editor: Editor) {
  let retryCounts = 0;
  const MAX_RETRIES = 100; //5 seconds

  let menuContainer: HTMLDivElement | null = null;
  let root: Root | null = null;
  let clickHandler: ((e: MouseEvent) => void) | null = null;
  
  // Track mouse movement to distinguish clicks from drags
  let mouseDownPos: { x: number; y: number } | null = null;
  const dragThreshold = 5; // pixels

  const closeMenu = () => {
    if (menuContainer && root) {
      root.render(React.createElement("div")); // Clear
      document.body.removeChild(menuContainer);
      menuContainer = null;
      root = null;
      // Restore page scrolling when menu is closed
      document.body.style.overflow = "";
    }
  };

  const showMenu = (
    node: ProseMirrorNode,
    position: number,
    anchorPosition: { top: number; left: number },
    showOnRight: boolean = false
  ) => {
    closeMenu(); // Close any existing menu

    menuContainer = document.createElement("div");
    menuContainer.style.position = "fixed";
    menuContainer.style.zIndex = "10000";
    menuContainer.style.pointerEvents = "auto";
    document.body.appendChild(menuContainer);
    
    // Prevent page scrolling when menu is open
    document.body.style.overflow = "hidden";

    root = createRoot(menuContainer);

    const nodeTypeName = node.type.name;
    const config = getMenuConfigForNode(nodeTypeName);

    root.render(
      React.createElement(BlockContextMenu, {
        editor,
        node,
        position,
        config,
        onClose: closeMenu,
        anchorPosition,
        showOnRight,
      })
    );
  };

  // Set up click handler - listen on document with capture to catch it early
  clickHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Don't interfere if clicking inside an open menu
    if (menuContainer && menuContainer.contains(target)) {
      return;
    }

    // Check if click is on a drag handle or its children
    const dragHandle = target.classList.contains("drag-handle")
      ? target
      : target.closest(".drag-handle");

    if (dragHandle) {
      // Check if this was a drag (mouse moved significantly) or a click
      if (mouseDownPos) {
        const distance = Math.sqrt(
          Math.pow(event.clientX - mouseDownPos.x, 2) +
          Math.pow(event.clientY - mouseDownPos.y, 2)
        );
        
        // If mouse moved significantly, it was a drag, not a click
        if (distance > dragThreshold) {
          mouseDownPos = null;
          return; // Don't show menu for drag operations
        }
      }

      // This was a click, show the menu
      console.log("Drag handle clicked!", dragHandle, {
        clientX: event.clientX,
        clientY: event.clientY,
        editorReady: !!editor.view
      });
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      mouseDownPos = null;

      const view = editor.view;
      if (!view || !view.state || !view.state.doc) {
        console.warn("Editor view not ready yet");
        return;
      }

      // Find the node associated with this drag handle
      // The drag handle is positioned relative to a block, so we need to find the nearest block
      let coords;
      
      // Try multiple coordinate points - the drag handle click might not map directly
      const dragHandleRect = (dragHandle as HTMLElement).getBoundingClientRect();
      const editorRect = view.dom.getBoundingClientRect();
      
      // Try the center of the drag handle first
      const tryCoords = [
        { left: dragHandleRect.left + dragHandleRect.width / 2, top: dragHandleRect.top + dragHandleRect.height / 2 },
        { left: dragHandleRect.left, top: dragHandleRect.top },
        { left: dragHandleRect.right, top: dragHandleRect.top },
        { left: event.clientX, top: event.clientY },
        // Try points slightly to the right of the drag handle (where the content is)
        { left: dragHandleRect.right + 10, top: dragHandleRect.top + dragHandleRect.height / 2 },
        { left: dragHandleRect.right + 20, top: dragHandleRect.top + dragHandleRect.height / 2 },
      ];
      
      for (const coord of tryCoords) {
        try {
          coords = view.posAtCoords(coord);
          if (coords) break;
        } catch (error) {
          // Continue to next coordinate
          continue;
        }
      }

      if (!coords) {
        // Last resort: try to find node by searching the DOM more thoroughly
        const editorDom = view.dom;
        let nearestBlock: HTMLElement | null = null;
        let minDistance = Infinity;
        
        // The drag handle is typically positioned to the left of the content
        // Search for elements that are at the same vertical position
        const handleCenterY = dragHandleRect.top + dragHandleRect.height / 2;
        
        // Try multiple strategies to find the associated block
        // Strategy 1: Find all ProseMirror block elements
        const proseMirrorBlocks = editorDom.querySelectorAll('.ProseMirror > *');
        proseMirrorBlocks.forEach((block) => {
          const blockRect = block.getBoundingClientRect();
          if (blockRect.height > 0) {
            const blockCenterY = blockRect.top + blockRect.height / 2;
            const distance = Math.abs(blockCenterY - handleCenterY);
            // Check if the block overlaps vertically with the drag handle
            if (blockRect.top <= dragHandleRect.bottom && blockRect.bottom >= dragHandleRect.top) {
              if (distance < minDistance) {
                minDistance = distance;
                nearestBlock = block as HTMLElement;
              }
            }
          }
        });
        
        // Strategy 2: If not found, search for any block-level elements
        if (!nearestBlock) {
          const allBlocks = editorDom.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div[data-type], li, blockquote');
          allBlocks.forEach((block) => {
            const blockRect = block.getBoundingClientRect();
            if (blockRect.height > 0) {
              const blockCenterY = blockRect.top + blockRect.height / 2;
              const distance = Math.abs(blockCenterY - handleCenterY);
              if (blockRect.top <= dragHandleRect.bottom && blockRect.bottom >= dragHandleRect.top) {
                if (distance < minDistance) {
                  minDistance = distance;
                  nearestBlock = block as HTMLElement;
                }
              }
            }
          });
        }
        
        // Strategy 3: Try to find by walking up from the drag handle's parent
        if (!nearestBlock) {
          let current: HTMLElement | null = dragHandle.parentElement;
          while (current && current !== editorDom && !nearestBlock) {
            // Check if this element is a block-level ProseMirror element
            if (current.classList.contains('ProseMirror') || current.hasAttribute('data-type')) {
              nearestBlock = current;
              break;
            }
            // Check if this element contains block-level content
            const blockChild = current.querySelector('p, h1, h2, h3, h4, h5, h6, div[data-type]');
            if (blockChild) {
              nearestBlock = blockChild as HTMLElement;
              break;
            }
            current = current.parentElement;
          }
        }
        
        if (nearestBlock) {
          // Try to get position from the DOM element
          try {
            // Try multiple positions within the element
            const positions = [0, 1, nearestBlock.textContent?.length || 0];
            for (const offset of positions) {
              try {
                const domPos = view.posAtDOM(nearestBlock, offset);
                if (domPos !== null && domPos >= 0 && domPos < view.state.doc.content.size) {
                  coords = { pos: domPos, inside: -1 };
                  break;
                }
              } catch (e) {
                continue;
              }
            }
          } catch (error) {
            console.warn("Failed to get position from DOM element:", error);
          }
        }
        
        // Strategy 4: Last resort - search through the document by position
        if (!coords) {
          try {
            // Try to find a position by iterating through the document
            const docSize = view.state.doc.content.size;
            const searchRange = Math.min(500, docSize);
            const startPos = Math.max(0, Math.floor(docSize / 2) - searchRange / 2);
            
            for (let i = startPos; i < startPos + searchRange && i < docSize; i += 10) {
              try {
                const $testPos = view.state.doc.resolve(i);
                const node = $testPos.nodeAfter || $testPos.nodeBefore;
                if (node && node.type.isBlock && node.type.name !== "doc") {
                  coords = { pos: i, inside: -1 };
                  break;
                }
              } catch (e) {
                continue;
              }
            }
          } catch (error) {
            console.warn("Failed to search document:", error);
          }
        }
        
        if (!coords) {
          console.warn("Could not determine coordinates from click position or DOM", {
            dragHandleRect,
            editorRect: editorDom.getBoundingClientRect(),
            docSize: view.state.doc.content.size
          });
          return;
        }
      }

      const $pos = view.state.doc.resolve(coords.pos);
      let node: ProseMirrorNode | null = null;
      let nodePos = coords.pos;

      // Try to find the block node by walking up the document tree
      // The drag handle is typically next to a block-level node
      for (let depth = $pos.depth; depth > 0; depth--) {
        const nodeAtDepth = $pos.node(depth);
        // Skip doc, columnLayout, and columnItem - we want the actual content block
        if (
          nodeAtDepth.type.isBlock &&
          nodeAtDepth.type.name !== "doc" &&
          nodeAtDepth.type.name !== "columnLayout" &&
          nodeAtDepth.type.name !== "columnItem"
        ) {
          node = nodeAtDepth;
          nodePos = $pos.start(depth);
          break;
        }
      }

      // Fallback: try to get adjacent nodes
      if (!node) {
        const nodeAfter = $pos.nodeAfter;
        const nodeBefore = $pos.nodeBefore;

        if (nodeAfter && nodeAfter.type.isBlock && nodeAfter.type.name !== "doc") {
          node = nodeAfter;
          nodePos = coords.pos;
        } else if (nodeBefore && nodeBefore.type.isBlock && nodeBefore.type.name !== "doc") {
          node = nodeBefore;
          nodePos = coords.pos - nodeBefore.nodeSize;
        }
      }

      // Last resort: try to find any block node near the position
      if (!node) {
        for (let i = Math.max(0, coords.pos - 100); i < Math.min(view.state.doc.content.size, coords.pos + 100); i++) {
          try {
            const $testPos = view.state.doc.resolve(i);
            const testNode = $testPos.nodeAfter || $testPos.nodeBefore;
            if (testNode && testNode.type.isBlock && testNode.type.name !== "doc") {
              node = testNode;
              nodePos = $testPos.pos;
              break;
            }
          } catch {
            // Continue searching
          }
        }
      }

      if (!node) {
        console.warn("Could not find node for drag handle");
        return;
      }

      // Select the entire node content before showing menu
      // This ensures color/property changes apply to the whole block
      try {
        // Get the node's resolved position
        const $nodePos = view.state.doc.resolve(nodePos);
        
        // Calculate the content range
        // For block nodes with content, we want to select from start to end
        // nodePos is the position of the node itself
        // node.nodeSize includes the opening and closing tags
        let contentStart = nodePos;
        let contentEnd = nodePos + node.nodeSize;
        
        // Try to get the actual content boundaries (skip opening/closing tags if possible)
        // For most block nodes, content starts at nodePos + 1 and ends at nodePos + nodeSize - 1
        if (node.nodeSize > 2) {
          // Node has content, select the inner content
          contentStart = nodePos + 1;
          contentEnd = nodePos + node.nodeSize - 1;
        }
        
        // Ensure positions are valid and within document bounds
        contentStart = Math.max(0, Math.min(contentStart, view.state.doc.content.size));
        contentEnd = Math.max(0, Math.min(contentEnd, view.state.doc.content.size));
        
        // Only select if we have a valid range
        if (contentStart < contentEnd) {
          // Use editor's setTextSelection command via chain API
          // This will select all text content within the block
          editor.chain().focus().setTextSelection({ from: contentStart, to: contentEnd }).run();
        } else if (node.nodeSize > 0) {
          // For empty nodes or very small nodes, place cursor at the node position
          editor.chain().focus().setTextSelection(contentStart).run();
        }
      } catch (error) {
        console.warn("Failed to select node content:", error);
        // Continue anyway - menu will still work
      }

      // Calculate anchor position - position menu to the right of drag handle
      // If not enough space on left, position to the right
      const rect = (dragHandle as HTMLElement).getBoundingClientRect();
      const menuWidth = 265; // Menu width from BlockContextMenu
      const sidebarWidth = 240; // Approximate sidebar width
      const viewportWidth = window.innerWidth;
      const spaceOnLeft = rect.left;
      const spaceOnRight = viewportWidth - rect.right;
      
      // Determine if we should show menu on left or right
      const showOnRight = spaceOnLeft < menuWidth + sidebarWidth + 20; // 20px padding
      
      const anchorPosition = {
        top: rect.top,
        left: showOnRight ? rect.right : rect.left, // If showing on right, use right edge
      };

      showMenu(node, nodePos, anchorPosition, showOnRight);
    } else if (menuContainer) {
      // Close menu on outside click (but not if clicking inside the menu)
      if (!menuContainer.contains(target)) {
        // Small delay to allow menu item clicks to register first
        setTimeout(() => {
          if (menuContainer && !menuContainer.contains(document.activeElement)) {
            closeMenu();
          }
        }, 0);
      }
    }
  };

  // Track mouse down position to distinguish clicks from drags
  const mouseDownHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target) return;

    const dragHandle = target.classList.contains("drag-handle")
      ? target
      : target.closest(".drag-handle");

    if (dragHandle) {
      // Store mouse position to detect drag vs click
      mouseDownPos = { x: event.clientX, y: event.clientY };
    }
  };

  // Track mouse move to cancel menu if dragging
  const mouseMoveHandler = (event: MouseEvent) => {
    if (mouseDownPos) {
      const distance = Math.sqrt(
        Math.pow(event.clientX - mouseDownPos.x, 2) +
        Math.pow(event.clientY - mouseDownPos.y, 2)
      );
      
      // If mouse moved significantly, clear the pending click
      if (distance > dragThreshold) {
        mouseDownPos = null;
      }
    }
  };

  // Clear mouse position on mouse up
  const mouseUpHandler = () => {
    // Don't clear immediately - we need it for the click event
    // It will be cleared in the click handler
  };

  // Track if listeners are attached to avoid duplicates
  let listenersAttached = false;

  // Add event listeners to document with capture phase to catch them early
  // Use a small delay to ensure editor is fully mounted on first load
  const attachListeners = () => {
    if (listenersAttached) return;
    
    // Ensure clickHandler is defined before attaching
    if (!clickHandler) {
      console.warn("clickHandler not initialized yet");
      return;
    }
    
    // Check if editor view is available before attaching listeners
    if (editor.view && editor.view.state && editor.view.state.doc) {
      // TypeScript: clickHandler is guaranteed to be non-null due to check above
      document.addEventListener("click", clickHandler!, true);
      document.addEventListener("mousedown", mouseDownHandler, true);
      document.addEventListener("mousemove", mouseMoveHandler, true);
      document.addEventListener("mouseup", mouseUpHandler, true);
      listenersAttached = true;
    } else if (retryCounts < MAX_RETRIES) {
      retryCounts++;
      setTimeout(attachListeners, 50);
    } else {
      console.error("Failed to attach listeners: editor not ready after retries");
    }
  };

  // Try to attach immediately, but retry if needed
  attachListeners();

  return new Plugin({
    key: contextMenuPluginKey,
    view() {
      // When the plugin view is created, ensure listeners are attached
      // This happens after the editor view is mounted
      setTimeout(() => {
        if (!listenersAttached) {
          attachListeners();
        }
      }, 0);
      return {};
    },
    destroy() {
      // Clean up event listeners
      if (clickHandler) {
        document.removeEventListener("click", clickHandler, true);
        clickHandler = null;
      }
      document.removeEventListener("mousedown", mouseDownHandler, true);
      document.removeEventListener("mousemove", mouseMoveHandler, true);
      document.removeEventListener("mouseup", mouseUpHandler, true);
      listenersAttached = false;
      closeMenu();
    },
  });
}

