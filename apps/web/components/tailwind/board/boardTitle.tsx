"use client";

import React, { useState, useEffect } from "react";

interface BoardTitleProps {
  initialTitle?: string;
  onChange?: (title: string) => void;
}

export default function BoardTitle({
  initialTitle = "My Task Board",
  onChange,
}: BoardTitleProps) {
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);

  // Sync title with initialTitle prop when it changes
  useEffect(() => {
    if (initialTitle && !editing) {
      setTitle(initialTitle);
    }
  }, [initialTitle, editing]);

  const handleBlur = () => {
    setEditing(false);
    onChange?.(title.trim() || "Untitled Board");
  };

  return (
    <div className="mb-4">
      {editing ? (
        <input
          type="text"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleBlur();
          }}
          className="
            w-full
            text-2xl font-semibold tracking-tight
            bg-transparent
            border-b border-transparent
            focus:border-muted-foreground/30
            focus:outline-none
            dark:focus:border-muted
            px-0 py-1
            transition-colors
          "
        />
      ) : (
        <h2
          className="
            text-2xl font-semibold tracking-tight
            cursor-text
            text-foreground
            hover:text-primary
            transition-colors m-1
          "
          onClick={() => setEditing(true)}
        >
          {title}
        </h2>
      )}
    </div>
  );
}
