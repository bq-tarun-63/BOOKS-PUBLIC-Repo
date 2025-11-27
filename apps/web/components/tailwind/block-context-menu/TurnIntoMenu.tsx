"use client";

import React, { useRef, useMemo } from "react";
import { Editor } from "@tiptap/core";
import { Check, CheckSquare, Code, Heading1, Heading2, Heading3, ListOrdered, TextQuote, FileText, List, ListChecks, ToggleLeft, MessageSquare, Calculator, Columns, Layers } from "lucide-react";
import { DropdownMenuSearch, DropdownMenu, DropdownMenuDivider } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";
import { EditorBubbleMenuList } from "./EditorBubbleMenuList";
import { getDefaultColumnWidths } from "../column-layout-utils";

interface TurnIntoMenuProps {
  editor: Editor;
  node: any;
  position: number;
  onClose: () => void;
  onBack: () => void;
  anchorPosition: { top: number; left: number };
  showOnRight?: boolean;
}

interface TurnIntoOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
  isActive: (editor: Editor) => boolean;
}

// Helper to extract text content from a node, handling nested structures like lists
const extractTextContent = (node: any, schema: any): any => {
  // If node is a list (bulletList, orderedList, taskList), extract content from the first list item
  if (node.type.name === "bulletList" || node.type.name === "orderedList" || node.type.name === "taskList") {
    // Get the first list item
    const firstChild = node.firstChild;
    if (firstChild) {
      // List items contain paragraph nodes, so get the paragraph's content
      const paragraphInListItem = firstChild.firstChild;
      if (paragraphInListItem && paragraphInListItem.content && paragraphInListItem.content.size > 0) {
        return paragraphInListItem.content;
      }
      // Fallback: if no paragraph, try direct content
      if (firstChild.content && firstChild.content.size > 0) {
        return firstChild.content;
      }
    }
    return undefined;
  }
  
  // If node is a list item, extract content from its paragraph child
  if (node.type.name === "listItem" || node.type.name === "taskItem") {
    const paragraphChild = node.firstChild;
    if (paragraphChild && paragraphChild.content && paragraphChild.content.size > 0) {
      return paragraphChild.content;
    }
    // Fallback: if no paragraph, try direct content
    if (node.content && node.content.size > 0) {
      return node.content;
    }
    return undefined;
  }
  
  // For other nodes (paragraph, heading, etc.), extract content directly
  // This is the inline content (text nodes, marks, etc.)
  if (node.content && node.content.size > 0) {
    return node.content;
  }
  
  return undefined;
};

// Helper to convert node at specific position to a new type
const convertNodeAtPosition = (
  editor: Editor,
  node: any,
  position: number,
  newNodeType: string,
  attrs?: Record<string, any>
) => {
  const tr = editor.state.tr;
  const nodeSize = node.nodeSize || 1;
  const from = position;
  const to = position + nodeSize;
  
  // Get the schema and create the new node
  const schema = editor.schema;
  const newNode = schema.nodes[newNodeType];
  
  if (!newNode) {
    console.error(`Node type ${newNodeType} not found in schema`);
    return;
  }
  
  // Extract content from the current node, handling nested structures
  let nodeContent = extractTextContent(node, schema);
  
  // If we couldn't extract content, try to get it directly
  if (!nodeContent && node.content && node.content.size > 0) {
    nodeContent = node.content;
  }
  
  // For nodes that don't accept content (like codeBlock), we might need to extract text
  // For now, try to create with content, and if it fails, create empty
  let newBlockNode;
  try {
    newBlockNode = newNode.create(attrs || {}, nodeContent);
  } catch (error) {
    // If creating with content fails, try to extract text and create paragraph first
    if (nodeContent && nodeContent.size > 0) {
      // Try to create a paragraph with the content, then use that
      const paragraphNode = schema.nodes.paragraph;
      if (paragraphNode) {
        try {
          const paragraph = paragraphNode.create({}, nodeContent);
          newBlockNode = newNode.create(attrs || {}, paragraph.content);
        } catch {
          // If that fails, create empty node
          newBlockNode = newNode.create(attrs || {});
        }
      } else {
        newBlockNode = newNode.create(attrs || {});
      }
    } else {
      newBlockNode = newNode.create(attrs || {});
    }
  }
  
  // Replace the node
  tr.replaceWith(from, to, newBlockNode);
  
  // Set selection to the new node - place cursor at the start of the new node
  const newPos = tr.doc.resolve(from);
  tr.setSelection(editor.state.selection.constructor.near(newPos));
  
  editor.view.dispatch(tr);
};

// Create commands that work with node position
const createTurnIntoCommand = (
  newNodeType: string,
  attrs?: Record<string, any>
): ((editor: Editor, node: any, position: number) => void) => {
  return (editor: Editor, node: any, position: number) => {
    convertNodeAtPosition(editor, node, position, newNodeType, attrs);
  };
};

const TURN_INTO_OPTIONS: Array<Omit<TurnIntoOption, 'command'> & { command: (editor: Editor, node: any, position: number) => void }> = [
  {
    id: "text",
    label: "Text",
    icon: <FileText className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("paragraph"),
    isActive: (editor) => editor.isActive("paragraph") && !editor.isActive("bulletList") && !editor.isActive("orderedList"),
  },
  {
    id: "heading1",
    label: "Heading 1",
    icon: <Heading1 className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("heading", { level: 1 }),
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
  },
  {
    id: "heading2",
    label: "Heading 2",
    icon: <Heading2 className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("heading", { level: 2 }),
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
  },
  {
    id: "heading3",
    label: "Heading 3",
    icon: <Heading3 className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("heading", { level: 3 }),
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
  },
  {
    id: "page",
    label: "Page",
    icon: <FileText className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("paragraph"),
    isActive: (editor) => false, // Page detection might need custom logic
  },
  {
    id: "bulletList",
    label: "Bulleted list",
    icon: <List className="h-4 w-4 text-muted-foreground" />,
    command: (editor: Editor, node: any, position: number) => {
      // For lists, we need to wrap the content in a list item first
      const tr = editor.state.tr;
      const nodeSize = node.nodeSize || 1;
      const from = position;
      const to = position + nodeSize;
      
      const listItemNode = editor.schema.nodes.listItem;
      const bulletListNode = editor.schema.nodes.bulletList;
      const paragraphNode = editor.schema.nodes.paragraph;
      
      if (!listItemNode || !bulletListNode) {
        console.error("List nodes not found in schema");
        return;
      }
      
      // Extract content from the node, handling nested structures
      let rawContent = extractTextContent(node, editor.schema);
      
      // If we couldn't extract content, try to get it directly
      if (!rawContent && node.content && node.content.size > 0) {
        rawContent = node.content;
      }
      
      // List items require paragraph nodes as their direct children
      // Create a paragraph node with the extracted content
      let paragraphForListItem;
      if (paragraphNode) {
        if (rawContent && rawContent.size > 0) {
          try {
            // Create a paragraph with the extracted content
            paragraphForListItem = paragraphNode.create({}, rawContent);
          } catch (error) {
            // If that fails, create empty paragraph
            paragraphForListItem = paragraphNode.create();
          }
        } else {
          // No content, create an empty paragraph
          paragraphForListItem = paragraphNode.create();
        }
      } else {
        console.error("Paragraph node not found in schema");
        return;
      }
      
      // Create a list item with the paragraph as its content (list items contain paragraph nodes)
      const listItem = listItemNode.create({}, [paragraphForListItem]);
      const bulletList = bulletListNode.create({}, [listItem]);
      
      tr.replaceWith(from, to, bulletList);
      tr.setSelection(editor.state.selection.constructor.near(tr.doc.resolve(from)));
      editor.view.dispatch(tr);
    },
    isActive: (editor) => editor.isActive("bulletList"),
  },
  {
    id: "numberedList",
    label: "Numbered list",
    icon: <ListOrdered className="h-4 w-4 text-muted-foreground" />,
    command: (editor: Editor, node: any, position: number) => {
      // For lists, we need to wrap the content in a list item first
      const tr = editor.state.tr;
      const nodeSize = node.nodeSize || 1;
      const from = position;
      const to = position + nodeSize;
      
      const listItemNode = editor.schema.nodes.listItem;
      const orderedListNode = editor.schema.nodes.orderedList;
      const paragraphNode = editor.schema.nodes.paragraph;
      
      if (!listItemNode || !orderedListNode) {
        console.error("List nodes not found in schema");
        return;
      }
      
      // Extract content from the node, handling nested structures
      let rawContent = extractTextContent(node, editor.schema);
      
      // If we couldn't extract content, try to get it directly
      if (!rawContent && node.content && node.content.size > 0) {
        rawContent = node.content;
      }
      
      // List items require paragraph nodes as their direct children
      // Create a paragraph node with the extracted content
      let paragraphForListItem;
      if (paragraphNode) {
        if (rawContent && rawContent.size > 0) {
          try {
            // Create a paragraph with the extracted content
            paragraphForListItem = paragraphNode.create({}, rawContent);
          } catch (error) {
            // If that fails, create empty paragraph
            paragraphForListItem = paragraphNode.create();
          }
        } else {
          // No content, create an empty paragraph
          paragraphForListItem = paragraphNode.create();
        }
      } else {
        console.error("Paragraph node not found in schema");
        return;
      }
      
      // Create a list item with the paragraph as its content (list items contain paragraph nodes)
      const listItem = listItemNode.create({}, [paragraphForListItem]);
      const orderedList = orderedListNode.create({}, [listItem]);
      
      tr.replaceWith(from, to, orderedList);
      tr.setSelection(editor.state.selection.constructor.near(tr.doc.resolve(from)));
      editor.view.dispatch(tr);
    },
    isActive: (editor) => editor.isActive("orderedList"),
  },
  {
    id: "todoList",
    label: "To-do list",
    icon: <ListChecks className="h-4 w-4 text-muted-foreground" />,
    command: (editor: Editor, node: any, position: number) => {
      // For task lists, we need to wrap the content in a task item first
      const tr = editor.state.tr;
      const nodeSize = node.nodeSize || 1;
      const from = position;
      const to = position + nodeSize;
      
      const taskItemNode = editor.schema.nodes.taskItem;
      const taskListNode = editor.schema.nodes.taskList;
      const paragraphNode = editor.schema.nodes.paragraph;
      
      if (!taskItemNode || !taskListNode) {
        console.error("Task list nodes not found in schema");
        return;
      }
      
      // Extract content from the node, handling nested structures
      let rawContent = extractTextContent(node, editor.schema);
      
      // If we couldn't extract content, try to get it directly
      if (!rawContent && node.content && node.content.size > 0) {
        rawContent = node.content;
      }
      
      // Task items require paragraph nodes as their direct children
      // Create a paragraph node with the extracted content
      let paragraphForTaskItem;
      if (paragraphNode) {
        if (rawContent && rawContent.size > 0) {
          try {
            // Create a paragraph with the extracted content
            paragraphForTaskItem = paragraphNode.create({}, rawContent);
          } catch (error) {
            // If that fails, create empty paragraph
            paragraphForTaskItem = paragraphNode.create();
          }
        } else {
          // No content, create an empty paragraph
          paragraphForTaskItem = paragraphNode.create();
        }
      } else {
        console.error("Paragraph node not found in schema");
        return;
      }
      
      // Create a task item with the paragraph as its content (task items contain paragraph nodes)
      const taskItem = taskItemNode.create({ checked: false }, [paragraphForTaskItem]);
      const taskList = taskListNode.create({}, [taskItem]);
      
      tr.replaceWith(from, to, taskList);
      tr.setSelection(editor.state.selection.constructor.near(tr.doc.resolve(from)));
      editor.view.dispatch(tr);
    },
    isActive: (editor) => editor.isActive("taskItem"),
  },
  {
    id: "toggleList",
    label: "Toggle list",
    icon: <ToggleLeft className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("paragraph"),
    isActive: (editor) => false,
  },
  {
    id: "code",
    label: "Code",
    icon: <Code className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("codeBlock"),
    isActive: (editor) => editor.isActive("codeBlock"),
  },
  {
    id: "quote",
    label: "Quote",
    icon: <TextQuote className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("blockquote"),
    isActive: (editor) => editor.isActive("blockquote"),
  },
  {
    id: "callout",
    label: "Callout",
    icon: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("callout"),
    isActive: (editor) => editor.isActive("callout"),
  },
  {
    id: "blockEquation",
    label: "Block equation",
    icon: <Calculator className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("codeBlock"),
    isActive: (editor) => false,
  },
  {
    id: "syncedBlock",
    label: "Synced block",
    icon: <Layers className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("paragraph"),
    isActive: (editor) => false,
  },
  {
    id: "toggleHeading1",
    label: "Toggle heading 1",
    icon: <Heading1 className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("heading", { level: 1 }),
    isActive: (editor) => false,
  },
  {
    id: "toggleHeading2",
    label: "Toggle heading 2",
    icon: <Heading2 className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("heading", { level: 2 }),
    isActive: (editor) => false,
  },
  {
    id: "toggleHeading3",
    label: "Toggle heading 3",
    icon: <Heading3 className="h-4 w-4 text-muted-foreground" />,
    command: createTurnIntoCommand("heading", { level: 3 }),
    isActive: (editor) => false,
  },
  {
    id: "columns2",
    label: "2 columns",
    icon: <Columns className="h-4 w-4 text-muted-foreground" />,
    command: (editor: Editor, node: any, position: number) => {
      // Convert to 2 columns layout - get current node content and wrap it
      const nodeSize = node.nodeSize || 1;
      const from = position;
      const to = position + nodeSize;
      const content = editor.state.doc.slice(from, to).content;
      const widthValues = getDefaultColumnWidths(2);
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent({
          type: "columnLayout",
          attrs: { columns: 2, widths: widthValues.join(",") },
          content: widthValues.map((width, index) => ({
            type: "columnItem",
            attrs: { width },
            content: index === 0 && content.size > 0 ? content.toJSON() : [{ type: "paragraph" }],
          })),
        })
        .run();
      
      // Move cursor into the first column's first paragraph
      setTimeout(() => {
        const { state } = editor;
        const { doc } = state;
        let columnLayoutPos = -1;
        let minDistance = Infinity;
        doc.descendants((node, pos) => {
          if (node.type.name === "columnLayout") {
            const distance = Math.abs(pos - from);
            if (distance < minDistance) {
              minDistance = distance;
              columnLayoutPos = pos;
            }
          }
        });
        if (columnLayoutPos !== -1) {
          const layoutNode = doc.nodeAt(columnLayoutPos);
          if (layoutNode && layoutNode.firstChild) {
            const firstColumnItemPos = columnLayoutPos + 1;
            const firstColumnNode = layoutNode.firstChild;
            let paragraphPos = -1;
            firstColumnNode.descendants((node, pos) => {
              if (node.type.name === "paragraph" && paragraphPos === -1) {
                paragraphPos = firstColumnItemPos + pos + 1;
                return false;
              }
            });
            if (paragraphPos !== -1) {
              editor.chain().setTextSelection(paragraphPos).focus().run();
            }
          }
        }
      }, 10);
    },
    isActive: (editor) => false,
  },
  {
    id: "columns3",
    label: "3 columns",
    icon: <Columns className="h-4 w-4 text-muted-foreground" />,
    command: (editor: Editor, node: any, position: number) => {
      // Convert to 3 columns layout
      const nodeSize = node.nodeSize || 1;
      const from = position;
      const to = position + nodeSize;
      const content = editor.state.doc.slice(from, to).content;
      const widthValues = getDefaultColumnWidths(3);
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent({
          type: "columnLayout",
          attrs: { columns: 3, widths: widthValues.join(",") },
          content: widthValues.map((width, index) => ({
            type: "columnItem",
            attrs: { width },
            content: index === 0 && content.size > 0 ? content.toJSON() : [{ type: "paragraph" }],
          })),
        })
        .run();
      
      // Move cursor into the first column's first paragraph
      setTimeout(() => {
        const { state } = editor;
        const { doc } = state;
        let columnLayoutPos = -1;
        let minDistance = Infinity;
        doc.descendants((node, pos) => {
          if (node.type.name === "columnLayout") {
            const distance = Math.abs(pos - from);
            if (distance < minDistance) {
              minDistance = distance;
              columnLayoutPos = pos;
            }
          }
        });
        if (columnLayoutPos !== -1) {
          const layoutNode = doc.nodeAt(columnLayoutPos);
          if (layoutNode && layoutNode.firstChild) {
            const firstColumnItemPos = columnLayoutPos + 1;
            const firstColumnNode = layoutNode.firstChild;
            let paragraphPos = -1;
            firstColumnNode.descendants((node, pos) => {
              if (node.type.name === "paragraph" && paragraphPos === -1) {
                paragraphPos = firstColumnItemPos + pos + 1;
                return false;
              }
            });
            if (paragraphPos !== -1) {
              editor.chain().setTextSelection(paragraphPos).focus().run();
            }
          }
        }
      }, 10);
    },
    isActive: (editor) => false,
  },
  {
    id: "columns4",
    label: "4 columns",
    icon: <Columns className="h-4 w-4 text-muted-foreground" />,
    command: (editor: Editor, node: any, position: number) => {
      // Convert to 4 columns layout
      const nodeSize = node.nodeSize || 1;
      const from = position;
      const to = position + nodeSize;
      const content = editor.state.doc.slice(from, to).content;
      const widthValues = getDefaultColumnWidths(4);
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent({
          type: "columnLayout",
          attrs: { columns: 4, widths: widthValues.join(",") },
          content: widthValues.map((width, index) => ({
            type: "columnItem",
            attrs: { width },
            content: index === 0 && content.size > 0 ? content.toJSON() : [{ type: "paragraph" }],
          })),
        })
        .run();
      
      // Move cursor into the first column's first paragraph
      setTimeout(() => {
        const { state } = editor;
        const { doc } = state;
        let columnLayoutPos = -1;
        let minDistance = Infinity;
        doc.descendants((node, pos) => {
          if (node.type.name === "columnLayout") {
            const distance = Math.abs(pos - from);
            if (distance < minDistance) {
              minDistance = distance;
              columnLayoutPos = pos;
            }
          }
        });
        if (columnLayoutPos !== -1) {
          const layoutNode = doc.nodeAt(columnLayoutPos);
          if (layoutNode && layoutNode.firstChild) {
            const firstColumnItemPos = columnLayoutPos + 1;
            const firstColumnNode = layoutNode.firstChild;
            let paragraphPos = -1;
            firstColumnNode.descendants((node, pos) => {
              if (node.type.name === "paragraph" && paragraphPos === -1) {
                paragraphPos = firstColumnItemPos + pos + 1;
                return false;
              }
            });
            if (paragraphPos !== -1) {
              editor.chain().setTextSelection(paragraphPos).focus().run();
            }
          }
        }
      }, 10);
    },
    isActive: (editor) => false,
  },
  {
    id: "columns5",
    label: "5 columns",
    icon: <Columns className="h-4 w-4 text-muted-foreground" />,
    command: (editor: Editor, node: any, position: number) => {
      // Convert to 5 columns layout
      const nodeSize = node.nodeSize || 1;
      const from = position;
      const to = position + nodeSize;
      const content = editor.state.doc.slice(from, to).content;
      const widthValues = getDefaultColumnWidths(5);
      editor.chain()
        .focus()
        .setTextSelection({ from, to })
        .deleteSelection()
        .insertContent({
          type: "columnLayout",
          attrs: { columns: 5, widths: widthValues.join(",") },
          content: widthValues.map((width, index) => ({
            type: "columnItem",
            attrs: { width },
            content: index === 0 && content.size > 0 ? content.toJSON() : [{ type: "paragraph" }],
          })),
        })
        .run();
      
      // Move cursor into the first column's first paragraph
      setTimeout(() => {
        const { state } = editor;
        const { doc } = state;
        let columnLayoutPos = -1;
        let minDistance = Infinity;
        doc.descendants((node, pos) => {
          if (node.type.name === "columnLayout") {
            const distance = Math.abs(pos - from);
            if (distance < minDistance) {
              minDistance = distance;
              columnLayoutPos = pos;
            }
          }
        });
        if (columnLayoutPos !== -1) {
          const layoutNode = doc.nodeAt(columnLayoutPos);
          if (layoutNode && layoutNode.firstChild) {
            const firstColumnItemPos = columnLayoutPos + 1;
            const firstColumnNode = layoutNode.firstChild;
            let paragraphPos = -1;
            firstColumnNode.descendants((node, pos) => {
              if (node.type.name === "paragraph" && paragraphPos === -1) {
                paragraphPos = firstColumnItemPos + pos + 1;
                return false;
              }
            });
            if (paragraphPos !== -1) {
              editor.chain().setTextSelection(paragraphPos).focus().run();
            }
          }
        }
      }, 10);
    },
    isActive: (editor) => false,
  },
];

export const TurnIntoMenu: React.FC<TurnIntoMenuProps> = ({
  editor,
  node,
  position,
  onClose,
  onBack,
  anchorPosition,
  showOnRight = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return TURN_INTO_OPTIONS;
    const query = searchQuery.toLowerCase();
    return TURN_INTO_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Convert to menu items
  const menuItems: DropdownMenuItemProps[] = useMemo(() => {
    return filteredOptions.map((option) => {
      const isActive = option.isActive(editor);
      return {
        id: option.id,
        label: option.label,
        icon: option.icon,
        onClick: (e?: React.MouseEvent) => {
          // Prevent event from closing menu before command executes
          if (e) {
            e.preventDefault();
            e.stopPropagation();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }
          
          // Execute the command with node and position
          try {
            option.command(editor, node, position);
          } catch (error) {
            console.error("Error executing turn into command:", error);
          }
          
          // Close the menu after a small delay to ensure command executes
          setTimeout(() => {
            onClose();
          }, 50);
        },
        selected: isActive,
        rightElement: isActive ? <Check className="h-4 w-4 text-muted-foreground" /> : undefined,
      };
    });
  }, [filteredOptions, editor, node, position, onClose]);

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
  const estimatedSubmenuHeight = Math.min(300, maxSubmenuHeight); // Reduced cap at 300px
  
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

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking inside the menu
      if (menuRef.current && e.target && menuRef.current.contains(e.target as HTMLElement)) {
        return;
      }
      // Don't close if clicking on the main menu (parent)
      const mainMenu = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (mainMenu && mainMenu.contains(e.target as HTMLElement)) {
        return;
      }
      onBack();
    };

    // Use a small delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [onBack]);

  // Keyboard navigation - Escape to go back
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[10001] bg-background border rounded-lg shadow-lg w-[220px] max-w-[calc(100vw-24px)] max-h-[50vh] flex flex-col overflow-hidden"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Search Input */}
      <div className="flex-shrink-0 p-2 pb-1">
        <DropdownMenuSearch
          placeholder="Search blocks…"
          value={searchQuery}
          onChange={setSearchQuery}
          variant="subtle"
          autoFocus={true}
        />
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-1">
          <EditorBubbleMenuList items={menuItems} editor={editor} />
        </div>
      </div>
    </div>
  );
};

