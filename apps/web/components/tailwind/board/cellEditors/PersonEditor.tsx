"use client";

import React from "react";
import BaseCellEditor from "./BaseCellEditor";
import type { CellEditorProps } from "@/types/cellEditor";
import { PersonPropertyInput } from "../properties/inputs/personPropertyInput";

export default function PersonEditor({ value, property, onUpdate, onClose, note, boardId, position, workspaceMembers }: CellEditorProps) {
  const members = workspaceMembers || [];
  const selected = Array.isArray(value) ? value : [];

  return (
    <BaseCellEditor
      value={value}
      property={property}
      note={note}
      boardId={boardId}
      onUpdate={onUpdate}
      onClose={onClose}
      position={position}
      className="p-0"
    >
      <div className="relative">
        <PersonPropertyInput
          value={selected}
          availableMembers={members}
          defaultOpen
          onChange={(sel) => {
            onUpdate(note._id, property.id, sel);
            onClose();
          }}
          onClose={onClose}
        />
      </div>
    </BaseCellEditor>
  );
}


