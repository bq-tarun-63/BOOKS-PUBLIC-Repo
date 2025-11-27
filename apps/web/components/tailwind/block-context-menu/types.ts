import { Editor } from "@tiptap/core";
import { Node } from "@tiptap/core";
import React from "react";

export interface MenuItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  keyboardShortcut?: string;
  onClick: (editor: Editor, node: Node, pos: number) => void | Promise<void>;
  hasSubmenu?: boolean;
  submenuItems?: MenuItemConfig[];
  enabled?: (editor: Editor, node: Node, pos: number) => boolean;
  visible?: (editor: Editor, node: Node, pos: number) => boolean;
}

export interface MenuSection {
  id: string;
  label?: string;
  items: MenuItemConfig[];
}

export interface MenuConfig {
  sections: MenuSection[];
  footer?: {
    lastEditedBy?: string;
    lastEditedAt?: string;
  };
}

export type NodeTypeMenuConfig = {
  [nodeType: string]: MenuConfig;
};

