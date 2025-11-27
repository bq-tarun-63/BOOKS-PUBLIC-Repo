import { EditorBubble, removeAIHighlight, useEditor } from "novel";
import { Fragment, type ReactNode, useEffect } from "react";
import { Button } from "../ui/button";
import Magic from "../ui/icons/magic";
import { AISelector } from "./ai-selector";
import { useNoteContext } from "@/contexts/NoteContext";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";

interface GenerativeMenuSwitchProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const GenerativeMenuSwitch = ({ children, open, onOpenChange }: GenerativeMenuSwitchProps) => {
  const { editor } = useEditor();
  const { isPremiumUser } = useNoteContext();

  const Tooltip = ({
    children,
    content,
    disabled = false,
  }: { children: React.ReactNode; content: string; disabled?: boolean }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
  
    if (disabled) return <>{children}</>;
  
    const handleMouseEnter = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top + rect.height / 2,
          left: rect.right + 8,
        });
      }
      setIsVisible(true);
    };
  
    const handleMouseLeave = () => {
      setIsVisible(false);
    };
  
    return (
      <div className="relative block w-full">
        <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          {children}
        </div>
        {isVisible &&
          typeof window !== "undefined" &&
          createPortal(
            <div
              className="fixed px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap z-[9999] pointer-events-none"
              style={{
                top: position.top - 40,
                left: position.left -100,
                transform: "translateY(-50%)",
              }}
            >
              {content}
              <div className="absolute bottom-[-4px] left-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800" />
              </div>,
            document.body,
          )}
      </div>
    );
  };
  

  useEffect(() => {
    if (!open && editor) removeAIHighlight(editor);
  }, [open, editor]);

  if (!editor) {
    return null;
  }

  return (
    <EditorBubble
      tippyOptions={{
        placement: open ? "bottom-start" : "top",
        onHidden: () => {
          onOpenChange(false);
          editor.chain().unsetHighlight().run();
        },
      }}
      className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border bg-background dark:bg-background "
    >
      {open && <AISelector open={open} onOpenChange={onOpenChange} />}
      {!open && (
        <Fragment>
          <Tooltip content="AI assistance is exclusive to premium users" disabled={isPremiumUser}>
          <Button
            className={`gap-1 rounded-none ${!isPremiumUser ? "cursor-not-allowed" : ""}`}
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isPremiumUser) return;
              onOpenChange(true);
            }}                
            size="sm"
          >
            <Magic className="h-5 w-5 text-[#5E7CE2]" />
            <span className="gradient-text">Ask AI</span>
          </Button>
          </Tooltip>
          {children}
        </Fragment>
      )}
    </EditorBubble>
  );
};

export default GenerativeMenuSwitch;
