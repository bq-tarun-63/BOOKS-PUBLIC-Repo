"use client";

import SimpleEditor from "@/components/tailwind/simple-editor";
import { useParams } from "next/navigation";

interface EditorWrapperProps {
  id: string;
}

function EditorWrapper({ id }: EditorWrapperProps) {
  return <SimpleEditor editorKey={id} />;
}

export default function NotePage() {
  const params = useParams();

  if (!params || !params.id) {
    return <div>Loading...</div>;
  }

  const id = params.id as string;

  return <EditorWrapper id={id} />;
}
