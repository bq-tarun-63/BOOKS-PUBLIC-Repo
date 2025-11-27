"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import type { Range } from "@tiptap/core";
import { setOpenEmbedModal } from "@/lib/embed-modal-helper";

interface EmbedModalContextValue {
  openEmbedModal: (editor: Editor, range: Range, position?: { top: number; left: number }) => void;
  closeEmbedModal: () => void;
  isOpen: boolean;
  editor: Editor | null;
  range: Range | null;
  position: { top: number; left: number } | null;
}

const EmbedModalContext = createContext<EmbedModalContextValue | undefined>(undefined);

export function EmbedModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [range, setRange] = useState<Range | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const openEmbedModal = useCallback(
    (editorInstance: Editor, rangeInstance: Range, pos?: { top: number; left: number }) => {
      setEditor(editorInstance);
      setRange(rangeInstance);
      setPosition(pos || null);
      setIsOpen(true);
    },
    []
  );

  const closeEmbedModal = useCallback(() => {
    setIsOpen(false);
    // Don't clear editor/range immediately to allow modal to use them on close
    setTimeout(() => {
      setEditor(null);
      setRange(null);
      setPosition(null);
    }, 100);
  }, []);

  // Register the openEmbedModal function globally
  useEffect(() => {
    setOpenEmbedModal(openEmbedModal);
    return () => {
      setOpenEmbedModal(null);
    };
  }, [openEmbedModal]);

  return (
    <EmbedModalContext.Provider
      value={{
        openEmbedModal,
        closeEmbedModal,
        isOpen,
        editor,
        range,
        position,
      }}
    >
      {children}
    </EmbedModalContext.Provider>
  );
}

export function useEmbedModalContext() {
  const context = useContext(EmbedModalContext);
  if (context === undefined) {
    throw new Error("useEmbedModalContext must be used within an EmbedModalProvider");
  }
  return context;
}

