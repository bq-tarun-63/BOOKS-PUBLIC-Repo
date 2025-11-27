"use client";
import React from "react";

interface TaskPropertiesEditorProps {
  description: string;
  isEditing: boolean;
  onChange: (val: string) => void;
}

export default function TaskPropertiesEditor({ description, isEditing, onChange }: TaskPropertiesEditorProps) {
  if (!isEditing) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {description || "No description provided."}
      </p>
    );
  }

  return (
    <textarea
      value={description}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Add a description..."
      className="w-full p-2 rounded border bg-transparent"
    />
  );
}
