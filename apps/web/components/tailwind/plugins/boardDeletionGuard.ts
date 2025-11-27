import React from "react";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { deleteWithAuth } from "@/lib/api-helpers";
import { createRoot } from "react-dom/client";

// Singleton guard for the confirmation modal so repeated keypresses don't spawn multiples
let boardDeleteModalOpen = false;
let boardDeleteModalPromise: Promise<boolean> | null = null;
const CONFIRM_META = 'boardDeletionConfirmed';

function deleteRangeWithConfirmMeta(editor: any, from: number, to: number) {
  const view = editor?.view;
  if (!view) return;
  const { state, dispatch } = view;
  let tr = state.tr.delete(from, to);
  tr = tr.setMeta(CONFIRM_META, true);
  dispatch(tr);
}

function showBoardDeleteModal(message: string): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if (boardDeleteModalOpen && boardDeleteModalPromise) {
    return boardDeleteModalPromise;
  }
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.zIndex = "999999";
  document.body.appendChild(container);
  boardDeleteModalOpen = true;
  boardDeleteModalPromise = new Promise((resolve) => {
    const onClose = (result: boolean) => {
      try { root.unmount(); } catch {}
      container.remove();
      boardDeleteModalOpen = false;
      boardDeleteModalPromise = null;
      resolve(result);
    };
    const Modal = () => (
      React.createElement("div", { className: "fixed inset-0 flex items-center justify-center" },
        React.createElement("div", { className: "absolute inset-0 bg-black/40" }),
        React.createElement("div", { className: "relative z-10 bg-white dark:bg-[#1f1f1f] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-[360px] max-w-[90vw] p-5" },
          React.createElement("div", { className: "text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100" }, "Delete board"),
          React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-300 mb-4" }, message),
          React.createElement("div", { className: "flex gap-2 justify-end" },
            React.createElement("button", { className: "px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#2f2f2f]", onClick: () => onClose(false) }, "Cancel"),
            React.createElement("button", { className: "px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700", onClick: () => onClose(true) }, "Delete")
          )
        )
      )
    );
    const root = createRoot(container);
    root.render(React.createElement(Modal));
  });
  return boardDeleteModalPromise;
}

export const boardDeletionGuardExtension = Extension.create({
  name: "boardDeletionGuard",

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const collectBoardsInRange = (from: number, to: number) => {
          const boards: Array<{ from: number; to: number; viewId: string | null }> = [];
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === "reactComponentBlock" && (node as any).attrs?.component === "board") {
              boards.push({ from: pos, to: pos + node.nodeSize, viewId: (node as any).attrs?.viewId ?? null });
            }
          });
          return boards;
        };
        const getBoardBeforeCaret = () => {
          const { $from } = selection as any;
          if ($from.parentOffset === 0 && $from.pos > 0) {
            const $prev = state.doc.resolve($from.pos - 1);
            const maybe = ($prev as any).nodeBefore;
            if (maybe && maybe.type?.name === "reactComponentBlock" && maybe.attrs?.component === "board") {
              const to = $from.pos;
              const from = to - maybe.nodeSize;
              return { from, to, viewId: maybe.attrs?.viewId ?? null } as { from: number; to: number; viewId: string | null };
            }
          }
          const nodeBefore = ($from as any).nodeBefore;
          if (nodeBefore && nodeBefore.type?.name === "reactComponentBlock" && nodeBefore.attrs?.component === "board") {
            return { from: $from.pos - nodeBefore.nodeSize, to: $from.pos, viewId: nodeBefore.attrs?.viewId ?? null } as { from: number; to: number; viewId: string | null };
          }
          return null;
        };

        if ((selection as any).node) {
          const node = (selection as any).node;
          if (node.type.name === "reactComponentBlock" && node.attrs.component === "board") {
            const boardId = node.attrs.viewId;
            showBoardDeleteModal("Are you sure you want to delete this board?").then(async (ok) => {
              if (!ok) return;
              deleteRangeWithConfirmMeta(editor, selection.from, selection.to);
              if (boardId) {
                try {
                  await deleteWithAuth(`/api/database/deleteView`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viewId: boardId }) });
                } catch {}
              }
            });
            return true;
          }
        }

        if (!selection.empty) {
          const boards = collectBoardsInRange(selection.from, selection.to);
          if (boards.length > 0) {
            showBoardDeleteModal("Are you sure you want to delete the selected board?").then(async (ok) => {
              if (!ok) return;
              deleteRangeWithConfirmMeta(editor, selection.from, selection.to);
              for (const b of boards) {
                if (!b.viewId) continue;
                try {
                  await deleteWithAuth(`/api/database/deleteView`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viewId: b.viewId }) });
                } catch {}
              }
            });
            return true;
          }
        }

        if (selection.empty) {
          const info = getBoardBeforeCaret();
          if (info) {
            showBoardDeleteModal("Are you sure you want to delete this board?").then(async (ok) => {
              if (!ok) return;
              deleteRangeWithConfirmMeta(editor, info.from, info.to);
              if (info.viewId) {
                try {
                  await deleteWithAuth(`/api/database/deleteView`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viewId: info.viewId }) });
                } catch {}
              }
            });
            return true;
          }
        }

        return false;
      },

      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const collectBoardsInRange = (from: number, to: number) => {
          const boards: Array<{ from: number; to: number; viewId: string | null }> = [];
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === "reactComponentBlock" && (node as any).attrs?.component === "board") {
              boards.push({ from: pos, to: pos + node.nodeSize, viewId: (node as any).attrs?.viewId ?? null });
            }
          });
          return boards;
        };
        const getBoardAfterCaret = () => {
          const { $from } = selection as any;
          const atEnd = $from.parentOffset === $from.parent.content.size;
          if (atEnd) {
            const $next = state.doc.resolve(Math.min(state.doc.nodeSize - 2, $from.pos));
            const maybe = ($next as any).nodeAfter;
            if (maybe && maybe.type?.name === "reactComponentBlock" && maybe.attrs?.component === "board") {
              const from = $from.pos;
              const to = from + maybe.nodeSize;
              return { from, to, viewId: maybe.attrs?.viewId ?? null } as { from: number; to: number; viewId: string | null };
            }
          }
          const nodeAfter = ($from as any).nodeAfter;
          if (nodeAfter && nodeAfter.type?.name === "reactComponentBlock" && nodeAfter.attrs?.component === "board") {
            return { from: $from.pos, to: $from.pos + nodeAfter.nodeSize, viewId: nodeAfter.attrs?.viewId ?? null } as { from: number; to: number; viewId: string | null };
          }
          return null;
        };

        if ((selection as any).node) {
          const node = (selection as any).node;
          if (node.type.name === "reactComponentBlock" && node.attrs.component === "board") {
            const boardId = node.attrs.viewId;
            showBoardDeleteModal("Are you sure you want to delete this board?").then(async (ok) => {
              if (!ok) return;
              deleteRangeWithConfirmMeta(editor, selection.from, selection.to);
              if (boardId) {
                try {
                  await deleteWithAuth(`/api/database/deleteView`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viewId: boardId }) });
                } catch {}
              }
            });
            return true;
          }
        }

        if (!selection.empty) {
          const boards = collectBoardsInRange(selection.from, selection.to);
          if (boards.length > 0) {
            showBoardDeleteModal("Are you sure you want to delete the selected board?").then(async (ok) => {
              if (!ok) return;
              deleteRangeWithConfirmMeta(editor, selection.from, selection.to);
              for (const b of boards) {
                if (!b.viewId) continue;
                try {
                  await deleteWithAuth(`/api/database/deleteView`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viewId: b.viewId }) });
                } catch {}
              }
            });
            return true;
          }
        }

        if (selection.empty) {
          const info = getBoardAfterCaret();
          if (info) {
            showBoardDeleteModal("Are you sure you want to delete this board?").then(async (ok) => {
              if (!ok) return;
              deleteRangeWithConfirmMeta(editor, info.from, info.to);
              if (info.viewId) {
                try {
                  await deleteWithAuth(`/api/database/deleteView`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viewId: info.viewId }) });
                } catch {}
              }
            });
            return true;
          }
        }

        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('boardDeletionGlobalGuard'),
        filterTransaction: (tr, state) => {
          if (tr.getMeta(CONFIRM_META)) return true;
          if (!tr.docChanged) return true;

          const collectBoards = (doc: any) => {
            const list: Array<{ from: number; to: number; viewId: string | null }> = [];
            doc.descendants((node: any, pos: number) => {
              if (node.type?.name === 'reactComponentBlock' && node.attrs?.component === 'board') {
                list.push({ from: pos, to: pos + node.nodeSize, viewId: node.attrs?.viewId ?? null });
              }
            });
            return list;
          };

          const beforeBoards = collectBoards(state.doc);
          const afterBoards = collectBoards(tr.doc);
          const afterIds = new Set(afterBoards.map(b => b.viewId || `${b.from}:${b.to}`));
          const removed = beforeBoards.filter(b => !afterIds.has(b.viewId || `${b.from}:${b.to}`));

          if (removed.length === 0) return true;

          setTimeout(() => {
            const message = removed.length > 1
              ? 'Are you sure you want to delete these boards?'
              : 'Are you sure you want to delete this board?';
            showBoardDeleteModal(message).then(async (ok) => {
              if (!ok) return;
              const viewRef = (window as any)?.__tiptapView;
              if (!viewRef) return;
              const curState = viewRef.state;
              const dispatch = viewRef.dispatch;

              const targets: Array<{ from: number; to: number; viewId: string | null }> = [];
              const targetIds = new Set(removed.map(r => r.viewId).filter(Boolean) as string[]);
              curState.doc.descendants((node: any, pos: number) => {
                if (node.type?.name === 'reactComponentBlock' && node.attrs?.component === 'board') {
                  const vid = node.attrs?.viewId ?? null;
                  if ((vid && targetIds.has(vid)) || (!vid && removed.some(r => !r.viewId))) {
                    targets.push({ from: pos, to: pos + node.nodeSize, viewId: vid });
                  }
                }
              });

              if (targets.length === 0) return;

              targets.sort((a, b) => b.from - a.from);
              let trDel = curState.tr;
              for (const t of targets) {
                trDel = trDel.delete(t.from, t.to);
              }
              if (trDel.docChanged) {
                trDel = trDel.setMeta(CONFIRM_META, true);
                dispatch(trDel);
              }

              for (const t of targets) {
                if (!t.viewId) continue;
                try {
                  await deleteWithAuth(`/api/database/deleteView`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ viewId: t.viewId }),
                  });
                } catch {}
              }
            });
          }, 0);

          return false;
        },
        view(view) {
          (window as any).__tiptapView = view;
          return {};
        },
      }),
    ];
  },
});

export default boardDeletionGuardExtension;


