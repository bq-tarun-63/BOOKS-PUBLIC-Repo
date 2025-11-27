import { Editor } from "@tiptap/core";
import { Node } from "@tiptap/core";
import { MenuConfig, MenuItemConfig } from "./types";
import React from "react";

// SVG Icons as React components
const TurnIntoIcon = () => (
  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path d="M6.475 3.125a.625.625 0 1 0 0 1.25h7.975c.65 0 1.175.526 1.175 1.175v6.057l-1.408-1.408a.625.625 0 1 0-.884.884l2.475 2.475a.625.625 0 0 0 .884 0l2.475-2.475a.625.625 0 0 0-.884-.884l-1.408 1.408V5.55a2.425 2.425 0 0 0-2.425-2.425zM3.308 6.442a.625.625 0 0 1 .884 0l2.475 2.475a.625.625 0 1 1-.884.884L4.375 8.393v6.057c0 .649.526 1.175 1.175 1.175h7.975a.625.625 0 0 1 0 1.25H5.55a2.425 2.425 0 0 1-2.425-2.425V8.393L1.717 9.801a.625.625 0 1 1-.884-.884z"></path>
  </svg>
);

const ColorIcon = () => (
  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path d="M5.606 2.669a1.55 1.55 0 0 0-1.55 1.55v.379l-.069-.004h-.693a.55.55 0 0 0 0 1.1h.693l.069-.004v.379c0 .856.694 1.55 1.55 1.55h8.787a1.55 1.55 0 0 0 1.55-1.55v-.375h.3c.208 0 .376.168.376.375v2.023a.375.375 0 0 1-.375.375h-5.32c-.814 0-1.474.66-1.474 1.475v.592a1.55 1.55 0 0 0-1.463 1.547v3.7c0 .856.694 1.55 1.55 1.55h.925a1.55 1.55 0 0 0 1.55-1.55v-3.7a1.55 1.55 0 0 0-1.462-1.547v-.592c0-.207.168-.375.375-.375h5.319c.814 0 1.475-.66 1.475-1.475V6.069c0-.815-.66-1.475-1.475-1.475h-.3v-.375a1.55 1.55 0 0 0-1.55-1.55zm-.3 1.55a.3.3 0 0 1 .3-.3h8.787a.3.3 0 0 1 .3.3v1.85a.3.3 0 0 1-.3.3H5.606a.3.3 0 0 1-.3-.3zm3.931 7.862a.3.3 0 0 1 .3-.3h.925a.3.3 0 0 1 .3.3v3.7a.3.3 0 0 1-.3.3h-.925a.3.3 0 0 1-.3-.3z"></path>
  </svg>
);

const LinkIcon = () => (
  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path d="M10.61 3.61a3.776 3.776 0 0 1 5.34 0l.367.368a3.776 3.776 0 0 1 0 5.34l-1.852 1.853a.625.625 0 1 1-.884-.884l1.853-1.853a2.526 2.526 0 0 0 0-3.572l-.368-.367a2.526 2.526 0 0 0-3.572 0L9.641 6.347a.625.625 0 1 1-.883-.883z"></path>
    <path d="M12.98 6.949a.625.625 0 0 1 0 .884L7.53 13.28a.625.625 0 0 1-.884-.884l5.448-5.448a.625.625 0 0 1 .884 0"></path>
    <path d="M6.348 8.757a.625.625 0 0 1 0 .884l-1.853 1.853a2.526 2.526 0 0 0 0 3.572l.367.367a2.525 2.525 0 0 0 3.572 0l1.853-1.852a.625.625 0 1 1 .884.883l-1.853 1.853a3.776 3.776 0 0 1-5.34 0l-.367-.367a3.776 3.776 0 0 1 0-5.34l1.853-1.853a.625.625 0 0 1 .884 0"></path>
  </svg>
);

const DuplicateIcon = () => (
  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path d="M4.5 2.375A2.125 2.125 0 0 0 2.375 4.5V12c0 1.174.951 2.125 2.125 2.125h1.625v1.625c0 1.174.951 2.125 2.125 2.125h7.5a2.125 2.125 0 0 0 2.125-2.125v-7.5a2.125 2.125 0 0 0-2.125-2.125h-1.625V4.5A2.125 2.125 0 0 0 12 2.375zm8.375 3.75H8.25A2.125 2.125 0 0 0 6.125 8.25v4.625H4.5A.875.875 0 0 1 3.625 12V4.5c0-.483.392-.875.875-.875H12c.483 0 .875.392.875.875zm-5.5 2.125c0-.483.392-.875.875-.875h7.5c.483 0 .875.392.875.875v7.5a.875.875 0 0 1-.875.875h-7.5a.875.875 0 0 1-.875-.875z"></path>
  </svg>
);

const MoveToIcon = () => (
  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path d="M12.408 4.792a.625.625 0 0 1 .884-.884l4.4 4.4a.625.625 0 0 1 0 .884l-4.4 4.4a.625.625 0 0 1-.884-.884l3.333-3.333H5.25a.875.875 0 0 0-.875.875v5a.625.625 0 1 1-1.25 0v-5c0-1.173.951-2.125 2.125-2.125h10.491z"></path>
  </svg>
);

const DeleteIcon = () => (
  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path d="M8.806 8.505a.55.55 0 0 0-1.1 0v5.979a.55.55 0 1 0 1.1 0zm3.488 0a.55.55 0 0 0-1.1 0v5.979a.55.55 0 1 0 1.1 0z"></path>
    <path d="M6.386 3.925v1.464H3.523a.625.625 0 1 0 0 1.25h.897l.393 8.646A2.425 2.425 0 0 0 7.236 17.6h5.528a2.425 2.425 0 0 0 2.422-2.315l.393-8.646h.898a.625.625 0 1 0 0-1.25h-2.863V3.925c0-.842-.683-1.525-1.525-1.525H7.91c-.842 0-1.524.683-1.524 1.525M7.91 3.65h4.18c.15 0 .274.123.274.275v1.464H7.636V3.925c0-.152.123-.275.274-.275m-.9 2.99h7.318l-.39 8.588a1.175 1.175 0 0 1-1.174 1.122H7.236a1.175 1.175 0 0 1-1.174-1.122l-.39-8.589z"></path>
  </svg>
);

const CommentIcon = () => (
  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path d="M5.875 7.505c0-.345.28-.625.625-.625h7a.625.625 0 1 1 0 1.25h-7a.625.625 0 0 1-.625-.625m0 3c0-.345.28-.625.625-.625h5a.625.625 0 1 1 0 1.25h-5a.625.625 0 0 1-.625-.625"></path>
    <path d="M17.625 5.255A2.125 2.125 0 0 0 15.5 3.13h-11a2.125 2.125 0 0 0-2.125 2.125v7.5c0 1.173.951 2.125 2.125 2.125h1.188v2.482a.625.625 0 0 0 1.006.496l3.87-2.978H15.5a2.125 2.125 0 0 0 2.125-2.125zM15.5 4.38c.483 0 .875.392.875.875v7.5a.875.875 0 0 1-.875.875h-5.148a.63.63 0 0 0-.38.13l-3.034 2.333v-1.838a.625.625 0 0 0-.625-.625H4.5a.875.875 0 0 1-.875-.875v-7.5c0-.483.392-.875.875-.875z"></path>
  </svg>
);

const SuggestEditsIcon = () => (
  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path d="M12.728 4.015H4.5a.875.875 0 0 0-.875.875v7.5l.005.09a.875.875 0 0 0 .87.784h1.813a.625.625 0 0 1 .625.626v1.838l3.034-2.334a.63.63 0 0 1 .38-.13H15.5l.09-.004a.875.875 0 0 0 .78-.78l.005-.09V6.089l1.247-1.248.003.049v7.5l-.01.216a2.126 2.126 0 0 1-2.115 1.909h-4.935l-3.872 2.977a.625.625 0 0 1-1.005-.495v-2.482H4.5l-.217-.011a2.126 2.126 0 0 1-1.908-2.114v-7.5c0-1.174.951-2.125 2.125-2.125h9.48z"></path>
    <path d="M17.294 1.223a.77.77 0 0 1 1.084 0 .77.77 0 0 1 0 1.083v.012l-7.986 7.987a.87.87 0 0 1-.387.232l-.916.283c-.18.065-.361-.116-.31-.31l.284-.915a1.1 1.1 0 0 1 .232-.387z"></path>
  </svg>
);

const AIIcon = () => (
  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
    <path d="M12.758 9.976a1.178 1.178 0 1 0 .377-2.326 1.178 1.178 0 0 0-.377 2.326M6.547 8.97a1.178 1.178 0 1 0 .377-2.327 1.178 1.178 0 0 0-.377 2.326"></path>
    <path d="M10.573 5.554a3.917 3.917 0 0 1 6.743.035.625.625 0 1 1-1.08.63 2.667 2.667 0 0 0-4.591-.023l-5.398 9.015 4.192.68a.625.625 0 0 1-.2 1.233l-5.102-.827a.625.625 0 0 1-.436-.938zM4.36 3.517a3.92 3.92 0 0 1 5.572.356.625.625 0 1 1-.945.818 2.67 2.67 0 0 0-3.795-.243.625.625 0 1 1-.833-.931"></path>
  </svg>
);

const ChevronRightIcon = () => (
  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
    <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z"></path>
  </svg>
);

// Helper function to create menu items
function createMenuItem(
  id: string,
  label: string,
  icon: React.ReactNode,
  onClick: (editor: Editor, node: Node, pos: number) => void | Promise<void>,
  options?: {
    keyboardShortcut?: string;
    hasSubmenu?: boolean;
    enabled?: (editor: Editor, node: Node, pos: number) => boolean;
    visible?: (editor: Editor, node: Node, pos: number) => boolean;
  }
): MenuItemConfig {
  return {
    id,
    label,
    icon,
    onClick,
    keyboardShortcut: options?.keyboardShortcut,
    hasSubmenu: options?.hasSubmenu,
    enabled: options?.enabled ?? (() => true),
    visible: options?.visible ?? (() => true),
  };
}

// Default menu handlers (can be overridden)
export const defaultMenuHandlers = {
  turnInto: (editor: Editor, node: Node, pos: number) => {
    // TODO: Implement turn into submenu
    const nodeTypeName = (node.type as any).name || "paragraph";
    console.log("Turn into", nodeTypeName, pos);
  },

  color: (editor: Editor, node: Node, pos: number) => {
    // Color submenu is handled by BlockContextMenu component
    // This handler won't be called if hasSubmenu is true
    const nodeTypeName = (node.type as any).name || "paragraph";
    console.log("Color", nodeTypeName, pos);
  },

  copyLink: async (editor: Editor, node: Node, pos: number) => {
    // TODO: Implement copy link to block
    const blockId = `block-${pos}`;
    await navigator.clipboard.writeText(`${window.location.href}#${blockId}`);
    console.log("Copy link to block", blockId);
  },

  duplicate: (editor: Editor, node: Node, pos: number) => {
    const tr = editor.state.tr;
    const $pos = editor.state.doc.resolve(pos);
    const nodeSize = (node as any).nodeSize || 1;
    
    // Copy the node
    const slice = editor.state.doc.slice(pos, pos + nodeSize);
    tr.insert(pos + nodeSize, slice.content);
    editor.view.dispatch(tr);
  },

  moveTo: (editor: Editor, node: Node, pos: number) => {
    // TODO: Implement move to dialog
    const nodeTypeName = (node.type as any).name || "paragraph";
    console.log("Move to", nodeTypeName, pos);
  },

  delete: (editor: Editor, node: Node, pos: number) => {
    const tr = editor.state.tr;
    const nodeSize = (node as any).nodeSize || 1;
    tr.delete(pos, pos + nodeSize);
    editor.view.dispatch(tr);
  },

  comment: (editor: Editor, node: Node, pos: number) => {
    // TODO: Implement comment functionality
    const nodeTypeName = (node.type as any).name || "paragraph";
    console.log("Comment", nodeTypeName, pos);
  },

  suggestEdits: (editor: Editor, node: Node, pos: number) => {
    // TODO: Implement suggest edits
    const nodeTypeName = (node.type as any).name || "paragraph";
    console.log("Suggest edits", nodeTypeName, pos);
  },

  askAI: (editor: Editor, node: Node, pos: number) => {
    // TODO: Implement AI functionality
    const nodeTypeName = (node.type as any).name || "paragraph";
    console.log("Ask AI", nodeTypeName, pos);
  },
};

// Get menu config for a specific node type
export function getMenuConfigForNode(nodeType: string): MenuConfig {
  const baseConfig: MenuConfig = {
    sections: [
      {
        id: "transform",
        label: getNodeTypeLabel(nodeType),
        items: [
          createMenuItem(
            "turn-into",
            "Turn into",
            <TurnIntoIcon />,
            defaultMenuHandlers.turnInto,
            { hasSubmenu: true }
          ),
          createMenuItem(
            "color",
            "Color",
            <ColorIcon />,
            defaultMenuHandlers.color,
            { hasSubmenu: true }
          ),
        ],
      },
      {
        id: "actions",
        items: [
          createMenuItem(
            "copy-link",
            "Copy link to block",
            <LinkIcon />,
            defaultMenuHandlers.copyLink,
            { keyboardShortcut: "⌘⌃L" }
          ),
          createMenuItem(
            "duplicate",
            "Duplicate",
            <DuplicateIcon />,
            defaultMenuHandlers.duplicate,
            { keyboardShortcut: "⌘D" }
          ),
          createMenuItem(
            "move-to",
            "Move to",
            <MoveToIcon />,
            defaultMenuHandlers.moveTo,
            { keyboardShortcut: "⌘⇧P" }
          ),
          createMenuItem(
            "delete",
            "Delete",
            <DeleteIcon />,
            defaultMenuHandlers.delete,
            { keyboardShortcut: "Del" }
          ),
        ],
      },
      {
        id: "collaboration",
        items: [
          createMenuItem(
            "comment",
            "Comment",
            <CommentIcon />,
            defaultMenuHandlers.comment,
            { keyboardShortcut: "⌘⇧M" }
          ),
          createMenuItem(
            "suggest-edits",
            "Suggest edits",
            <SuggestEditsIcon />,
            defaultMenuHandlers.suggestEdits,
            { keyboardShortcut: "⌘⇧⌥X" }
          ),
          createMenuItem(
            "ask-ai",
            "Ask AI",
            <AIIcon />,
            defaultMenuHandlers.askAI,
            { keyboardShortcut: "⌘J" }
          ),
        ],
      },
    ],
  };

  // Customize based on node type
  switch (nodeType) {
    case "image":
    case "youtube":
    case "twitter":
      // Images and embeds might not need "Turn into" or "Comment"
      return {
        ...baseConfig,
        sections: baseConfig.sections.map((section) => {
          if (section.id === "transform") {
            return {
              ...section,
              items: section.items.filter((item) => item.id !== "turn-into"),
            };
          }
          if (section.id === "collaboration") {
            return {
              ...section,
              items: section.items.filter((item) => item.id !== "comment"),
            };
          }
          return section;
        }),
      };

    case "codeBlock":
      // Code blocks can be converted to other types
      return baseConfig;

    default:
      return baseConfig;
  }
}

function getNodeTypeLabel(nodeType: string): string {
  const labels: Record<string, string> = {
    paragraph: "Text",
    heading: "Heading",
    bulletList: "Bullet List",
    orderedList: "Numbered List",
    blockquote: "Quote",
    codeBlock: "Code",
    horizontalRule: "Divider",
    image: "Image",
    youtube: "Video",
    twitter: "Tweet",
    table: "Table",
    taskList: "To-do List",
  };

  return labels[nodeType] || "Block";
}

