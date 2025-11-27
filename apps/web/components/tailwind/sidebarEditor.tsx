import { defaultExtensions } from "./extensions";
import { Editor } from "@tiptap/core";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  ImageResizer,
  type JSONContent,
} from "novel";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSlashCommand, getSuggestionItems } from "./slash-command";
import { usePromptForPageTitle } from "@/hooks/use-promptForPageTitle";
import { createMentionExtension } from "./mention-command";
import { useNotifications } from "@/hooks/use-notifications";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { Separator } from "./ui/separator";
import { NodeSelector } from "./selectors/node-selector";
import { LinkSelector } from "./selectors/link-selector";
import { MathSelector } from "./selectors/math-selector";
import { TextButtons } from "./selectors/text-buttons";
import { ColorSelector } from "./selectors/color-selector";
import { useNoteContext } from "@/contexts/NoteContext";
import { useDebouncedCallback } from "use-debounce";
import { saveContentOnline } from "@/services-frontend/editor/editorService"; 


interface SidebarEditorProps {
  editorKey: string;
  initialContent: any;
  readOnly?: boolean;
  onContentChange?: (content: any) => void;
  className?: string;
}

const SidebarEditor = ({
  editorKey,
  initialContent,
  readOnly = false,
  onContentChange,
  className = "",
}: SidebarEditorProps) => {
  const [content, setContent] = useState(initialContent);
  const editorRef = useRef<Editor | null>(null);
  const { promptForPageTitle, modal } = usePromptForPageTitle();
  const { mentionUser } = useNotifications();
  const [saveStatus, setSaveStatus] = useState<"Saving..." | "Saved" | "Save Failed" | "Saved Online" | "Unsaved">(
    "Saved",
  );

  const [openNode, setOpenNode] = useState<boolean>(false);
  const [openColor, setOpenColor] = useState<boolean>(false);
  const [openLink, setOpenLink] = useState<boolean>(false);
  const [openAI, setOpenAI] = useState<boolean>(false);
  const {isPremiumUser} = useNoteContext();
  const [aiSelectorOpen, setAISelectorOpen] = useState(false);
  const [isSlashCommandAIOpen, setIsSlashCommandAIOpen] = useState<boolean>(false);
  const [aiSelectorPosition, setAISelectorPosition] = useState<{ left: number; top: number } | null>(null);
  const prevContentRef = useRef<any>(null);

  useEffect(() => {
    let contentToUse = null;

    try {
      const stored = window.localStorage.getItem(`novel-content-${editorKey}`);
      if (stored) {
        contentToUse = JSON.parse(stored);
      }
    } catch (err) {
      console.error("Error reading localStorage:", err);
    }

    if (!contentToUse) {
      contentToUse = initialContent; 
    }

    if (editorRef.current) {
      if (JSON.stringify(contentToUse) !== JSON.stringify(prevContentRef.current)) {
        editorRef.current.commands.setContent(contentToUse, false);
        setContent(contentToUse);
        prevContentRef.current = initialContent;
      }
    } else {
      setContent(contentToUse);
      prevContentRef.current = initialContent;
    }
  }, [initialContent, editorKey]);

  const handleContentChange = (editor: Editor) => {
    const newContent = editor.getJSON();
      setContent(newContent);
      onContentChange?.(newContent);
      
      // Trigger save operations
      if (!readOnly) {
        setSaveStatus("Unsaved");
        debouncedLocalSave(editor);
        debouncedOnlineSave(editor);
      }
  };

  // Local save 
  const debouncedLocalSave = useDebouncedCallback((editor: Editor) => {
    try {
      const json = editor.getJSON();
      const html = editor.getHTML();
      const markdown = editor.storage.markdown?.getMarkdown?.() || '';
      if (JSON.stringify(json) === JSON.stringify(prevContentRef.current)) {
        setSaveStatus("Saved");
        return;
      }
      
      window.localStorage.setItem(`novel-content-${editorKey}`, JSON.stringify(json));
      window.localStorage.setItem(`html-content-${editorKey}`, html);
      window.localStorage.setItem(`markdown-${editorKey}`, markdown);
      window.localStorage.setItem(`offline_content_time-${editorKey}`, JSON.stringify(new Date()));
      
      setSaveStatus("Saved");
    } catch (error) {
      console.error("Error saving locally:", error);
      setSaveStatus("Save Failed");
    }
  }, 1000);

  // Online save 
  const debouncedOnlineSave = useDebouncedCallback(async (editor: Editor) => {
    try {
      const json = editor.getJSON();
      const html = editor.getHTML();
      const markdown = editor.storage.markdown?.getMarkdown?.() || '';
      
      if (JSON.stringify(json) === JSON.stringify(prevContentRef.current)) {
        return;
      }

      const response = await saveContentOnline({
        editorKey,
        content: json,
      });

      if ("isError" in response && response.isError) {
        setSaveStatus("Save Failed");
        return;
      }

      window.localStorage.setItem(`novel-content-${editorKey}`, JSON.stringify(json));
      window.localStorage.setItem(`html-content-${editorKey}`, html);
      window.localStorage.setItem(`markdown-${editorKey}`, markdown);
      
      setSaveStatus("Saved Online");
      prevContentRef.current = json;
      return response;
    } catch (error) {
      setSaveStatus("Save Failed");
    }
  }, 4000);

  const suggestionItems = useMemo(
    () => getSuggestionItems(editorKey, promptForPageTitle),
    [editorKey, promptForPageTitle],
  );

  const slashCommand = useMemo(
    () => getSlashCommand(editorKey, promptForPageTitle),
    [editorKey, promptForPageTitle]
  );

  const extensions = useMemo(
    () => [...defaultExtensions, slashCommand, createMentionExtension(mentionUser)],
    [slashCommand, mentionUser]
  );

  return (
    <>
      <div className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-[#5F5E5B] dark:text-[#9B9B9B] ml-5">     
        <span>{saveStatus}</span>
      </div>

      <EditorRoot>
        <EditorContent
          key={`sidebar-editor-${editorKey}`}
          initialContent={content}
          extensions={extensions}
          editorProps={{
            editable: () => !readOnly,
            attributes: {
              class: "prose prose-sm dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full min-h-[150px] bg-[#f8f8f7] dark:bg-[#202020]",
            },
          }}
          onCreate={({ editor }) => {
            editorRef.current = editor;
            editor.setEditable(!readOnly);
            
            const contentToSet = content;
            editor.commands.setContent(contentToSet, false);
            prevContentRef.current = initialContent;
          }}
          onUpdate={({ editor }) => {
            if (!readOnly) {
              handleContentChange(editor);
              debouncedOnlineSave(editor);
            }
          }}
          slotAfter={<ImageResizer />}
          className={`w-full bg-[#f8f8f7] dark:bg-[#202020] dark:border-gray-700 rounded-md ${className}`}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted  bg-[#f8f8f7] dark:bg-[#202020] px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">No results</EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => {
                if (item.title === "Ask AI" && !isPremiumUser) {
                  return null;
                }
          
                return (
                  <EditorCommandItem
                    value={item.title}
                    onCommand={(val) => item.command?.(val)}
                    className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                    key={item.title}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-[#f8f8f7] dark:bg-[#202020]">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </EditorCommandItem>
                );
              })}
            </EditorCommandList>
          </EditorCommand>

          <GenerativeMenuSwitch
            open={openAI}
            onOpenChange={(open) => {
              setOpenAI(open);
              if (open && isSlashCommandAIOpen) {
                // Close slash command AI when generative menu opens
                setAISelectorOpen(false);
                setIsSlashCommandAIOpen(false);
                setAISelectorPosition(null);
              }
            }}
          >
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <MathSelector />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
          </GenerativeMenuSwitch>
        </EditorContent>
        {modal}
      </EditorRoot>
    </>
  );
};

export default SidebarEditor;