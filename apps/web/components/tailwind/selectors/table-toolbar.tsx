"use client";

import React from "react";
import {
  Plus,
  Minus,
  Trash2,
  Rows,
  Columns,
} from "lucide-react";

interface Props {
  editor: any; // or Editor from @tiptap/react
}

export const TableToolbar = ({ editor }: Props) => {
  if (!editor || !editor.isActive("table")) return null;

  return (
    <div className="fixed bottom-10 left-1/2 z-50 flex items-center gap-2 -translate-x-1/2 rounded-xl border border-muted bg-background/90 backdrop-blur-lg px-4 py-2 shadow-2xl">
      <ToolbarButton
        label="Row +"
        icon={<Rows className="h-4 w-4" />}
        onClick={() => editor.chain().focus().addRowAfter().run()}
        intent="neutral"
      />
      <ToolbarButton
        label="Row -"
        icon={<Minus className="h-4 w-4" />}
        onClick={() => editor.chain().focus().deleteRow().run()}
        intent="neutral"
      />
      <ToolbarButton
        label="Col +"
        icon={<Columns className="h-4 w-4" />}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        intent="neutral"
      />
      <ToolbarButton
        label="Col -"
        icon={<Minus className="h-4 w-4" />}
        onClick={() => editor.chain().focus().deleteColumn().run()}
        intent="neutral"
      />
      <ToolbarButton
        label="Delete"
        icon={<Trash2 className="h-4 w-4" />}
        onClick={() => editor.chain().focus().deleteTable().run()}
        intent="neutral"
      />
    </div>
  );
};

interface ToolbarButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  intent : "neutral";
}

const ToolbarButton = ({
  label,
  icon,
  onClick,
  intent,
}: ToolbarButtonProps) => {
  const base = "flex items-center gap-1 text-sm px-3 py-1.5 rounded-md transition-colors";

  const variants = {
    neutral:
      "bg-muted text-muted-foreground hover:bg-muted/70",
  };

  return (
    <button onClick={onClick} className={`${base} ${variants[intent]}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
};
