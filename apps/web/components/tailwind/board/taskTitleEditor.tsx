"use client";
import React from "react";

interface TaskTitleEditorProps {
  value: string;
  isEditing: boolean;
  onChange: (val: string) => void;
}

export default function TaskTitleEditor({ value, isEditing, onChange }: TaskTitleEditorProps) {
  if (!isEditing) {
    return <h2 className="text-lg font-semibold">{value}</h2>;
  }

  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-lg font-semibold bg-transparent border-b focus:outline-none w-full"
    />
  );
}
