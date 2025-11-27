import { defaultExtensions } from "./extensions";
import { Editor } from "@tiptap/core";
import {
  EditorContent,
  EditorRoot,
  type JSONContent,
} from "novel";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getSlashCommand } from "./slash-command";
import { usePromptForPageTitle } from "@/hooks/use-promptForPageTitle";
import { createMentionExtension } from "./mention-command";
import { useNotifications } from "@/hooks/use-notifications";

interface HistoryEditorProps {
  editorKey: string;
  initialContent: any;
  readOnly: boolean;
  onContentChange?: (content: any) => void;
  isLoading?: boolean;
}

const HistoryEditor = ({ 
  editorKey, 
  initialContent, 
  readOnly, 
  onContentChange,
  isLoading = false,
}: HistoryEditorProps) => {
  const [content, setContent] = useState(initialContent);
  const editorRef = useRef<Editor | null>(null);
  const { promptForPageTitle, modal } = usePromptForPageTitle();
  const { mentionUser } = useNotifications();
  

  useEffect(() => {
    if (editorRef.current && initialContent) {
      // Force set the content in the editor
      editorRef.current.commands.setContent(initialContent, false);
      setContent(initialContent);
    }
  }, [initialContent, editorKey]); // Add editorKey to dependencies

  const slashCommand = useMemo(() => getSlashCommand(editorKey, promptForPageTitle), [editorKey, promptForPageTitle]);

  const extensions = useMemo(
    () => [...defaultExtensions, slashCommand, createMentionExtension(mentionUser)],
    [slashCommand, mentionUser]
  );
  if (isLoading) {
    return (
      <div className="w-full h-full bg-background dark:bg-background p-4 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-medium">Loading commit content...</span>
        </div>
      </div>
    );
  }

  return (
    <EditorRoot>
      <EditorContent
        key={`history-editor-${editorKey}-${JSON.stringify(initialContent)}`} // Force re-render when content changes
        initialContent={initialContent}
        extensions={extensions}
        editorProps={{
          editable: () => false, // Always read-only for history
          attributes: {
            class: "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
          },
        }}
        onCreate={({ editor }) => {
          editorRef.current = editor;
          editor.setEditable(false);
          // Ensure content is set correctly on creation
          if (initialContent) {
            editor.commands.setContent(initialContent, false);
          }
        }}
        className="w-full h-full bg-background dark:bg-background p-4"
      />
    </EditorRoot>
  );
};

export default HistoryEditor;