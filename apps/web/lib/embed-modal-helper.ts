import type { Editor } from "@tiptap/core";
import type { Range } from "@tiptap/core";

type OpenEmbedModalFn = (
  editor: Editor,
  range: Range,
  position?: { top: number; left: number }
) => void;

let openEmbedModalFn: OpenEmbedModalFn | null = null;

export function setOpenEmbedModal(fn: OpenEmbedModalFn | null) {
  openEmbedModalFn = fn;
}

export function openEmbedModal(
  editor: Editor,
  range: Range,
  position?: { top: number; left: number }
) {
  if (openEmbedModalFn) {
    openEmbedModalFn(editor, range, position);
  } else {
    console.warn("EmbedModal not initialized. Falling back to prompt.");
    // Fallback to prompt if modal is not available
    const rawInput = prompt("Please enter a link to embed");
    if (rawInput === null) {
      return;
    }
    // This won't work without the editor/range, but it's a fallback
  }
}

