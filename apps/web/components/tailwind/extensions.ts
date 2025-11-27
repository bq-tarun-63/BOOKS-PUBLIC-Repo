import React from "react";
import {
  AIHighlight,
  CharacterCount,
  CodeBlockLowlight,
  Color,
  CustomKeymap,
  GlobalDragHandle,
  HighlightExtension,
  HorizontalRule,
  Mathematics,
  Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TextStyle,
  TiptapImage,
  TiptapLink,
  TiptapUnderline,
  Embed,
  Twitter,
  UpdatedImage,
  UploadImagesPlugin,
  Youtube,
} from "novel";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { ReactNodeViewRenderer } from "@tiptap/react"
import { AnyExtension, Node, mergeAttributes, Mark, RawCommands, Extension } from "@tiptap/core";
import BoardBlock from "./selectors/boardBlock";
import { CmsBlockExtension } from "./cms-block";
import { CalloutExtension } from "./callout";
import { BookmarkExtension } from "./bookmark";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { createRoot } from "react-dom/client";
import CommentBox from "./comment/commentBox";
import {
  MIN_COLUMN_PERCENT,
  applyColumnWidths,
  clampColumnCount,
  getDefaultColumnWidths,
  getGridTemplateFromWidths,
  normalizeColumnWidths,
  parseWidthsAttribute,
} from "./column-layout-utils";

import Mention from "@tiptap/extension-mention";
import MentionList, { MentionListRef } from "@/components/tailwind/mention-list"
import tippy, { type Instance, type Props } from "tippy.js"




import { Markdown as MarkdownExtension } from "tiptap-markdown";


import { cx } from "class-variance-authority";
import { common, createLowlight } from "lowlight";
import { postWithAuth, deleteWithAuth } from "@/lib/api-helpers";
import { boardDeletionGuardExtension } from "./plugins/boardDeletionGuard";
import { BlockContextMenuExtension } from "./block-context-menu/context-menu-extension";

// Extension to ensure block-level drag works correctly inside column nodes
// This intercepts selection changes and ensures block nodes are selected, not column nodes
const columnDragHandleExtension = Extension.create({
  name: "columnDragHandle",
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("columnDragHandle"),
        appendTransaction: (transactions, oldState, newState) => {
          // Check if a node selection was made and if it's a column node
          const selection = newState.selection;
          
          // Check if this is a node selection (used for dragging)
          if (selection && (selection as any).node) {
            const selectedNode = (selection as any).node;
            
            // If the selected node is a column node, we need to select a block inside it instead
            if (selectedNode.type.name === "columnItem" || selectedNode.type.name === "columnLayout") {
              const $from = newState.doc.resolve(selection.from);
              
              // Find the first block node inside the column
              let blockNode: any = null;
              let blockPos: number | null = null;
              
              // Walk down to find the first non-column block
              selectedNode.forEach((node: any, offset: number) => {
                if (!blockNode && node.type.name !== "columnItem" && node.type.name !== "columnLayout") {
                  blockNode = node;
                  blockPos = selection.from + offset + 1;
                }
              });
              
              // If we found a block node, select it instead
              if (blockNode && blockPos !== null) {
                const tr = newState.tr;
                // Try to create a selection that selects the block node
                try {
                  // Access NodeSelection through the selection constructor
                  const NodeSelection = (selection.constructor as any);
                  const blockSelection = NodeSelection.create(newState.doc, blockPos);
                  tr.setSelection(blockSelection);
                  return tr;
                } catch (e) {
                  // If that doesn't work, try selecting the content range
                  try {
                    const $blockPos = newState.doc.resolve(blockPos);
                    const blockSelection = newState.selection.constructor.create(
                      newState.doc,
                      blockPos,
                      blockPos + (blockNode.nodeSize as number)
                    );
                    tr.setSelection(blockSelection);
                    return tr;
                  } catch (e2) {
                    // If all else fails, just return the transaction as-is
                    return tr;
                  }
                }
              }
            }
          }
          
          return null;
        },
      }),
    ];
  },
});

//TODO I am using cx here to get tailwind autocomplete working, idk if someone else can write a regex to just capture the class key in objects
const aiHighlight = AIHighlight;
// Board delete confirmation is implemented in ./plugins/boardDeletionGuard
//You can overwrite the placeholder with your own configuration
const placeholder = Placeholder;
const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    class: cx(
      "text-muted-foreground underline underline-offset-[3px] hover:text-primary transition-colors cursor-pointer",
    ),
  },
});

const tiptapImage = TiptapImage.extend({
  addProseMirrorPlugins() {
    return [
      UploadImagesPlugin({
        imageClass: cx("opacity-40 rounded-lg border border-stone-200"),
      }),
    ];
  },
}).configure({
  allowBase64: true,
  HTMLAttributes: {
    class: cx("rounded-lg border border-muted"),
  },
});

const updatedImage = UpdatedImage.configure({
  HTMLAttributes: {
    class: cx("rounded-lg border border-muted"),
  },
});

const taskList = TaskList.configure({
  HTMLAttributes: {
    class: cx("not-prose pl-2 "),
  },
});
const taskItem = TaskItem.configure({
  HTMLAttributes: {
    class: cx("flex gap-2 items-start my-4"),
  },
  nested: true,
});

const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: {
    class: cx("mt-4 mb-6 border-t border-muted-foreground"),
  },
});

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      class: cx("list-disc list-outside leading-3 -mt-2"),
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: cx("list-decimal list-outside leading-3 -mt-2"),
    },
  },
  listItem: {
    HTMLAttributes: {
      class: cx("leading-tight -mb-1"),
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: cx("border-l-4 border-primary"),
    },
  },
  codeBlock: {
    HTMLAttributes: {
      class: cx("rounded-md bg-muted text-muted-foreground border p-5 font-mono font-medium"),
    },
  },
  code: {
    HTMLAttributes: {
      class: cx("rounded-md bg-muted  px-1.5 py-1 font-mono font-medium"),
      spellcheck: "false",
    },
  },
  paragraph: {
    HTMLAttributes: {
      class: cx("leading-tight mb-2"),
    },
  },
  horizontalRule: false,
  dropcursor: {
    color: "#DBEAFE",
    width: 4,
  },
  gapcursor: false,
});

const codeBlockLowlight = CodeBlockLowlight.configure({
  // configure lowlight: common /  all / use highlightJS in case there is a need to specify certain language grammars only
  // common: covers 37 language grammars which should be good enough in most cases
  lowlight: createLowlight(common),
});

const embed = Embed.configure({
  HTMLAttributes: {
    class: cx("rounded-lg"),
  },
  inline: false,
  defaultHeight: 320,
  defaultWidth: 480,
  minWidth: 240,
  maxWidth: 960,
  minHeight: 160,
});

const youtube = Youtube.configure({
  HTMLAttributes: {
    class: cx("rounded-lg border border-muted"),
  },
  inline: false,
});

const twitter = Twitter.configure({
  HTMLAttributes: {
    class: cx("not-prose"),
  },
  inline: false,
});


const mathematics = Mathematics.configure({
  HTMLAttributes: {
    class: cx("text-foreground rounded p-1 hover:bg-accent cursor-pointer"),
  },
  katexOptions: {
    throwOnError: false,
  },
});

const characterCount = CharacterCount.configure();

const markdownExtension = MarkdownExtension.configure({
  html: true,
  tightLists: true,
  tightListClass: "tight",
  bulletListMarker: "-",
  linkify: false,
  breaks: false,
  transformPastedText: false,
  transformCopiedText: false,
});

const table = Table.configure({
  resizable: true,
  HTMLAttributes: {
    class: cx("table-auto border border-collapse w-full"),
  },
})

const mergeStyleStrings = (existing: string | null | undefined, addition: string) => {
  const base = existing?.trim();
  if (!base) {
    return addition;
  }
  if (base.endsWith(";")) {
    return `${base} ${addition}`;
  }
  return `${base}; ${addition}`;
};

const columnItem = Node.create({
  name: "columnItem",
  content: "block+",
  defining: true,
  isolating: true,
  draggable: false, // Prevent column item itself from being dragged - only blocks inside should be draggable
  addAttributes() {
    return {
      width: {
        default: 100,
        parseHTML: (el) => {
          const w = parseFloat(el.getAttribute("data-width") || "100");
          return Number.isFinite(w) ? w : 100;
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column-item"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { width, style, ...rest } = HTMLAttributes;
    const widthValue = Math.min(Math.max(width ?? 100, 0), 100);

    const baseStyle = [
      "display: block",
      "box-sizing: border-box",
      "overflow-wrap: anywhere",
      "word-break: break-word",
      "width: 100%",
      "min-width: 0",
      "max-width: 100%",
      "padding-left: 10px",
      "padding-right: 10px",
      "margin: 0px !important",
      "line-height: 1.4",
      "min-height: 100%",
      // Prevent any influence on grid sizing
      "overflow: hidden",
    ].join("; ");


    return [
      "div",
      mergeAttributes(rest, {
        "data-type": "column-item",
        "data-width": widthValue,
        style: mergeStyleStrings(style, baseStyle),
      }),
      0,
    ];
  },
});

const columnLayout = Node.create({
  name: "columnLayout",
  group: "block",
  content: "columnItem+",
  defining: true,
  isolating: true,
  draggable: false, // Prevent column layout itself from being dragged - only blocks inside should be draggable
  addAttributes() {
    return {
      columns: {
        default: 2,
        parseHTML: (el) => {
          const c = parseInt(el.getAttribute("data-columns") || "2", 10);
          return Number.isFinite(c) ? c : 2;
        },
      },
      widths: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-widths"),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column-layout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { columns, widths, style, ...rest } = HTMLAttributes;
    const columnCount = clampColumnCount(columns ?? 2);
    const parsedWidths = parseWidthsAttribute(widths, columnCount);
    const normalizedWidths = normalizeColumnWidths(columnCount, parsedWidths);
    const template = getGridTemplateFromWidths(normalizedWidths);
    const baseStyle = [
      "display: grid",
      `--column-template: ${template}`,
      "grid-template-columns: var(--column-template)",
      "min-width: 100%",
      "box-sizing: border-box",
      "align-items: start",
      "justify-content: start",
      "overflow-x: auto",
      "scrollbar-width: thin",
      // Prevent any content-based resizing
      "grid-auto-rows: min-content",
      // CSS custom property for sidebar width that can be overridden
      "--sidebar-width: 15rem",
    ].join("; ");


    return [
      "div",
      mergeAttributes(rest, {
        "data-type": "column-layout",
        "data-columns": columnCount,
        "data-widths": normalizedWidths.join(","),
        style: mergeStyleStrings(style, baseStyle),
      }),
      0,
    ];
  },
});

type ColumnResizeState = {
  view: EditorView;
  nodePos: number;
  columnIndex: number;
  startX: number;
  containerWidth: number;
  startWidths: number[];
  pairTotal: number;
  layoutEl: HTMLElement;
};

const HANDLE_ACTIVE_WIDTH = 12;

const getColumnBoundaryIndex = (layoutEl: HTMLElement, clientX: number) => {
  const columnItems = Array.from(
    layoutEl.querySelectorAll(':scope > div[data-type="column-item"]'),
  ) as HTMLElement[];
  if (columnItems.length < 2) {
    return -1;
  }

  for (let index = 0; index < columnItems.length - 1; index += 1) {
    const currentItem = columnItems[index];
    const nextItem = columnItems[index + 1];
    if (!currentItem || !nextItem) {
      continue;
    }
    const current = currentItem.getBoundingClientRect();
    const next = nextItem.getBoundingClientRect();
    const boundaryStart = current.right;
    const boundaryEnd = next.left;
    const halfGap = Math.max(HANDLE_ACTIVE_WIDTH, Math.abs(boundaryEnd - boundaryStart) / 2);
    if (clientX >= boundaryStart - halfGap && clientX <= boundaryEnd + halfGap) {
      return index;
    }
  }
  return -1;
};

const createColumnResizePlugin = () => {
  let resizeState: ColumnResizeState | null = null;

  const stopResizing = () => {
    if (resizeState?.layoutEl) {
      resizeState.layoutEl.removeAttribute("data-resizing");
    }
    resizeState = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!resizeState) {
      return;
    }
    event.preventDefault();
    const { view, nodePos, columnIndex, startX, containerWidth, startWidths, pairTotal } = resizeState;
    if (!containerWidth) {
      return;
    }
    const deltaPx = event.clientX - startX;
    const deltaPercent = (deltaPx / containerWidth) * 100;
    const nextWidths = [...startWidths];
    const leftStart = startWidths[columnIndex];
    const rightStart = startWidths[columnIndex + 1];
    if (typeof leftStart !== "number" || typeof rightStart !== "number") {
      stopResizing();
      return;
    }
    const pairSum = Math.max(pairTotal, leftStart + rightStart, 0.1);
    let leftWidth = leftStart + deltaPercent;
    const minWidth = Math.min(pairSum / 2, MIN_COLUMN_PERCENT);
    leftWidth = Math.max(minWidth, Math.min(pairSum - minWidth, leftWidth));
    const rightWidth = pairSum - leftWidth;
    nextWidths[columnIndex] = parseFloat(leftWidth.toFixed(2));
    nextWidths[columnIndex + 1] = parseFloat(rightWidth.toFixed(2));
    applyColumnWidths(view, nodePos, nextWidths);
    const template = getGridTemplateFromWidths(nextWidths);
    resizeState.layoutEl.style.setProperty("--column-template", template);
    resizeState.layoutEl.style.setProperty("grid-template-columns", "var(--column-template)");
  };

  const handlePointerUp = () => {
    stopResizing();
  };

  return new Plugin({
    key: new PluginKey("columnResize"),
    props: {
      handleDOMEvents: {
        pointerdown(view, event) {
          if (!(event instanceof PointerEvent) || event.button !== 0) {
            return false;
          }
          if (resizeState) {
            stopResizing();
          }
          const target = event.target as HTMLElement | null;
          if (!target) {
            return false;
          }
          const layoutEl = target.closest('div[data-type="column-layout"]') as HTMLElement | null;
          if (!layoutEl) {
            return false;
          }

          const boundaryIndex = getColumnBoundaryIndex(layoutEl, event.clientX);
          if (boundaryIndex === -1) {
            return false;
          }

          const domPos = view.posAtDOM(layoutEl, 0);
          let nodePos = domPos;
          let node = view.state.doc.nodeAt(nodePos);
          if (!node || node.type.name !== "columnLayout") {
            nodePos = domPos - 1;
            node = view.state.doc.nodeAt(nodePos);
          }
          if (!node || node.type.name !== "columnLayout" || nodePos < 0) {
            return false;
          }

          const columnCount = node.childCount;
          if (columnCount < 2) {
            return false;
          }
          const widths = parseWidthsAttribute(node.attrs.widths, columnCount);
          const containerWidth = layoutEl.getBoundingClientRect().width;
          if (!containerWidth) {
            return false;
          }

          const leftWidth = widths[boundaryIndex] ?? 0;
          const rightWidth = widths[boundaryIndex + 1] ?? 0;
          const pairTotal = Math.max(leftWidth + rightWidth, 0.1);

          resizeState = {
            view,
            nodePos,
            columnIndex: boundaryIndex,
            startX: event.clientX,
            containerWidth,
            startWidths: widths,
            pairTotal,
            layoutEl,
          };

          layoutEl.setAttribute("data-resizing", "true");

          if (typeof window !== "undefined") {
            window.addEventListener("pointermove", handlePointerMove, { passive: false });
            window.addEventListener("pointerup", handlePointerUp, { passive: false });
          }

          event.preventDefault();
          event.stopPropagation();
          return true;
        },
      },
    },
    view() {
      return {
        destroy() {
          stopResizing();
        },
      };
    },
  });
};

const columnResizeExtension = Extension.create({
  name: "columnResize",

  addProseMirrorPlugins() {
    return [createColumnResizePlugin()];
  },
});

const reactComponentBlock = Node.create({
  name: "reactComponentBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  
  addAttributes() {
    return {
      viewId : {default: null},
      component: {
        default: "board",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="react-component"]', // Add proper parsing
        getAttrs: (dom) => ({
          viewId: (dom as HTMLElement).getAttribute('data-view-id'),
          component: (dom as HTMLElement).getAttribute('data-component') || 'board',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div", 
      mergeAttributes(HTMLAttributes, {
        'data-type': 'react-component',
        'data-view-id': HTMLAttributes.viewId,
        'data-component': HTMLAttributes.component,
      })
    ];
  },

  addNodeView() {
    console.log("addNodeView");
    return ReactNodeViewRenderer(BoardBlock);
  },

})

const commentMark = Mark.create({

  name: "commentMark",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-comment-id]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        { 
          "data-comment-id": HTMLAttributes.commentId,
          class: "bg-yellow-200 dark:bg-yellow-600 rounded-sm cursor-pointer",
        },
        this.options.HTMLAttributes
      ),
      0,
    ];
  },

  addCommands() {
    return {
      addCommentMark:
        (commentId: string) =>
        ({ chain }) => {
          return chain()
            .setMark(this.name, { commentId })
            .run();
        },
      removeCommentMark:
        () =>
        ({ chain }) => {
          return chain().unsetMark(this.name).run();
        },
    } as Partial<RawCommands>
  }, 
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("comment-icon-plugin"),
        props: {
          decorations: (state) => {
            const decorations: any[] = [];
            const { doc } = state;
  
            doc.descendants((node, pos) => {
              const mark = node.marks?.find((m) => m.type.name === "commentMark");
              if (mark) {
                const deco = Decoration.widget(pos + node.nodeSize, () => {
                  const span = document.createElement("span");
                  const root = createRoot(span);
                  root.render(React.createElement(CommentBox, { commentId: mark.attrs.commentId }))
                  return span;
                });
                decorations.push(deco);
              }
            });
  
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
})

// Import the new CMS Block extension

// const mention = Mention.configure({
//   HTMLAttributes: {
//     class: "bg-accent text-[color-mix(in_srgb,currentColor_60%,transparent)] rounded text-[16px] dark:text-[#9B9B9B] p-[2px]",
//   },
//   suggestion: {
//     char: "@",
//     items: () => [], // items handled inside MentionList via context
//     render: () => {
//       let component: ReactRenderer;
//       let popup: Instance<Props>;

//       return {
//         onStart: (props) => {
//           component = new ReactRenderer(MentionList, {
//             props: { ...props , 
//               onMention: async (item, workspaceId) => {
//                 console.log("....items", item);
//                 try {
//                   const response = await postWithAuth('/api/notification/add', {
//                     workspaceId,
//                     noteId: item.noteId,
//                     noteTitle: item.noteTitle,
//                     type: "MENTION",
//                     sentTo: [
//                       {
//                         userId: item.userId,
//                         userEmail: item.userEmail,
//                         userName: item.userName,
//                       },
//                     ],
//                   });
              
//                   if ("error" in response || "message" in response) {
//                     return null;
//                   }
              
//                 } catch (err) {
//                   console.error("Failed to send mention notification:", err);
//                 }
//               }
//             },
//             editor: props.editor,
//           });

//           popup = tippy(document.body, {
//             getReferenceClientRect: () =>
//               props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
//             appendTo: () => document.body,
//             content: component.element,
//             showOnCreate: true,
//             interactive: true,
//             trigger: "manual",
//             placement: "bottom-start",
//           });
//         },

//         onUpdate(props) {
//           component.updateProps({ ...props });
//           popup.setProps({
//             getReferenceClientRect: () =>
//               props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
//           });
//         },

//         onKeyDown(props) {
//           return (component.ref as MentionListRef)?.onKeyDown?.(props) ?? false;
//         },        

//         onExit() {
//           popup.destroy();
//           component.destroy();
//         },
//       };
//     },
//   },
// });

export const defaultExtensions: AnyExtension[] = [
  starterKit,
  placeholder,
  tiptapLink,
  tiptapImage,
  updatedImage,
  taskList,
  taskItem,
  horizontalRule,
  aiHighlight,
  codeBlockLowlight,
  embed,
  youtube,
  twitter,
  mathematics,
  characterCount,
  TiptapUnderline,
  markdownExtension,
  HighlightExtension,
  TextStyle,
  Color,
  CustomKeymap,
  table,
  TableRow,
  TableHeader,
  TableCell,
  columnItem,
  columnLayout,
  columnResizeExtension,
  // Configure GlobalDragHandle to work properly with isolated column nodes
  // It should show drag handles for blocks inside columns, not for columns themselves
  GlobalDragHandle.configure({
    // The extension should automatically handle block-level drag within isolated nodes
    // Column nodes are already set to draggable: false, so they won't be draggable
  }),
  // Custom extension to ensure block-level drag works inside columns
  // This intercepts drag handle clicks and selects the block node, not the column node
  columnDragHandleExtension,
  reactComponentBlock,
  boardDeletionGuardExtension,
  CmsBlockExtension,
  CalloutExtension,
  BookmarkExtension,
  BlockContextMenuExtension,
  // mention,
  commentMark
];
