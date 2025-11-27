"use client";

import React from "react";
import { createCellEditor, canEditProperty } from "./CellEditorRegistry";
import type { CellEditorProps } from "@/types/cellEditor";

interface CellEditorWrapperProps extends CellEditorProps {
  isVisible: boolean;
}

export default function CellEditor({ isVisible, ...props }: CellEditorWrapperProps) {
  if (!isVisible) {
    return null;
  }

  const { property } = props;
  
  // Check if this property type can be edited
  if (!canEditProperty(property.type)) {
    return null;
  }

  // Create the appropriate editor component
  const editor = createCellEditor(property.type, props);
  
  if (!editor) {
    return null;
  }

  return editor;
}
