declare module 'prosemirror-state' {
  export type EditorState = any;
  export type Transaction = any;
  export type Selection = any;
  export type PluginSpec = any;
  export const EditorState: any;
  export const Plugin: any;
  export const PluginKey: any;
}

declare module 'prosemirror-view' {
  export type DecorationAttrs = any;
  export type EditorView = any;
  export const Decoration: any;
  export const DecorationSet: any;
  export const EditorView: any;
}

declare module '@tiptap/pm/state' {
  export type EditorState = any;
  export type Transaction = any;
  export type Selection = any;
  export const Plugin: any;
  export const PluginKey: any;
}

declare module '@tiptap/pm/view' {
  export type EditorView = any;
  export const Decoration: any;
  export const DecorationSet: any;
  export const EditorView: any;
}

declare module 'jsondiffpatch' {
  export const create: any;
  const jsondiffpatch: any;
  export default jsondiffpatch;
}
