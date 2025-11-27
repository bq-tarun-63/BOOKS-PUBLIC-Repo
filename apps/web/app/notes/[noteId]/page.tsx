"use client";

import TailwindAdvancedEditor from "@/components/tailwind/advanced-editor";
import { useShare } from "@/contexts/ShareContext";
import { useParams } from "next/navigation";

interface EditorWrapperProps {
  noteId: string;
}

function EditorWrapper({ noteId }: EditorWrapperProps) {
  const { shareNoteId } = useShare();
  return <TailwindAdvancedEditor editorKey={noteId} shareNoteId={shareNoteId} />;
}

export default function NotePage() {
  const params = useParams();

  if (!params || !params.noteId) {
    return <div>Loading...</div>;
  }

  const noteId = params.noteId as string;

  return <EditorWrapper noteId={noteId} />;
}
