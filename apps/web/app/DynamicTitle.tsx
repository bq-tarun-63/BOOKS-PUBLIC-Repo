"use client";
import { useNoteContext } from "@/contexts/NoteContext";
import { useEffect } from "react";

export default function DynamicTitle() {
  const { activeTitle, editorTitle ,documentTitle} = useNoteContext();

  const title = documentTitle || activeTitle || editorTitle || "Books by Betaque";

  useEffect(() => {
    document.title = title;   
  }, [title]);

  return null; 
}
