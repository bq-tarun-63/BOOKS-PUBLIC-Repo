import { Extension } from "@tiptap/core";
import { createContextMenuPlugin } from "./context-menu-plugin";

export const BlockContextMenuExtension = Extension.create({
  name: "blockContextMenu",

  addProseMirrorPlugins() {
    return [createContextMenuPlugin(this.editor)];
  },
});

