"use client";

import React from "react";
import type { PropertyEditorConfig, CellEditorProps } from "@/types/cellEditor";

// Import all editor components
import TextEditor from "./TextEditor";
import NumberEditor from "./NumberEditor";
import StatusDropdown from "./StatusDropdown";
import DateEditor from "./DateEditor";
import MultiSelectEditor from "./MultiSelectEditor";
import PersonEditor from "./PersonEditor";
import GitHubPrEditor from "./GitHubPrEditor";

// Editor configuration registry
export const PROPERTY_EDITOR_CONFIGS: Record<string, PropertyEditorConfig> = {
  text: {
    type: "text",
    component: TextEditor,
    canEdit: true,
    placeholder: "Enter text...",
  },
  email: {
    type: "email",
    component: TextEditor,
    canEdit: true,
    placeholder: "name@example.com",
  },
  url: {
    type: "url",
    component: TextEditor,
    canEdit: true,
    placeholder: "https://example.com",
  },
  phone: {
    type: "phone",
    component: TextEditor,
    canEdit: true,
    placeholder: "+1 (555) 010-1234",
  },
  number: {
    type: "number",
    component: NumberEditor,
    canEdit: true,
    placeholder: "Enter number...",
  },
  status: {
    type: "status",
    component: StatusDropdown,
    canEdit: true,
  },
  select: {
    type: "select",
    component: StatusDropdown,
    canEdit: true,
  },
  priority: {
    type: "priority",
    component: StatusDropdown,
    canEdit: true,
  },
  multi_select: {
    type: "multi_select",
    component: MultiSelectEditor,
    canEdit: true,
  },
  date: {
    type: "date",
    component: DateEditor,
    canEdit: true,
  },
  checkbox: {
    type: "checkbox",
    component: null as any, // Handled inline, no editor needed
    canEdit: false,
  },
  person: {
    type: "person",
    component: PersonEditor,
    canEdit: true,
  },
  formula: {
    type: "formula",
    component: null as any,
    canEdit: false,
  },
  github_pr: {
    type: "github_pr",
    component: GitHubPrEditor,
    canEdit: true,
  },
  file: {
    type: "file",
    component: null as any,
    canEdit: false,
  },
};

export function getEditorConfig(propertyType: string): PropertyEditorConfig | null {
  return PROPERTY_EDITOR_CONFIGS[propertyType] || null;
}

export function canEditProperty(propertyType: string): boolean {
  const config = getEditorConfig(propertyType);
  return config?.canEdit || false;
}

export function createCellEditor(
  propertyType: string,
  props: CellEditorProps
): React.ReactElement | null {
  const config = getEditorConfig(propertyType);
  
  if (!config || !config.component) {
    return null;
  }

  const EditorComponent = config.component;
  return React.createElement(EditorComponent, props);
}
