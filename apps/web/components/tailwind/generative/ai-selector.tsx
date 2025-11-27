"use client";

import { Command, CommandInput } from "@/components/tailwind/ui/command";

import { useCompletion } from "ai/react";
import { ArrowUp } from "lucide-react";
import { X } from "lucide-react";
import { useEditor } from "novel";
import { addAIHighlight } from "novel";
import { useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "../ui/button";
import CrazySpinner from "../ui/icons/crazy-spinner";
import Magic from "../ui/icons/magic";
import { ScrollArea } from "../ui/scroll-area";
import AICompletionCommands from "./ai-completion-command";
import AISelectorCommands from "./ai-selector-commands";
//TODO: I think it makes more sense to create a custom Tiptap extension for this functionality https://tiptap.dev/docs/editor/ai/introduction

// Declare the global variable for TypeScript
declare global {
  interface Window {
    __aiPromptContent?: string;
  }
}

interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISelector({ onOpenChange }: AISelectorProps) {
  const { editor } = useEditor();
  const [inputValue, setInputValue] = useState("");

  const { completion, complete, isLoading } = useCompletion({
    // id: "novel",
    api: "/api/generate",
    onResponse: (response) => {
      if (response.status === 429) {
        toast.error("You have reached your request limit for the day.");
        return;
      }
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const hasCompletion = completion.length > 0;

  if (!editor) {
    return null;
  }

  const handleAIComplete = () => {
    // Check if we have a prompt from the global variable
    const globalPrompt = window.__aiPromptContent;

    // Common completion handler to clean up input but keep the selector open
    const handleCompletionFinished = () => {
      // Clear input and global variables
      setInputValue("");
      window.__aiPromptContent = undefined;

      // Don't automatically close - let the user review and close manually
    };

    // If we have completion, use it
    if (completion) {
      return complete(completion, {
        body: { option: "zap", command: inputValue },
      }).then(handleCompletionFinished);
    }

    // If we have a global prompt, use it
    if (globalPrompt) {
      return complete(globalPrompt, {
        body: { option: "zap", command: globalPrompt, prompt: globalPrompt },
      }).then(handleCompletionFinished);
    }

    // Otherwise use the editor selection
    const slice = editor.state.selection.content();
    const text = editor.storage.markdown.serializer.serialize(slice.content);

    // Use inputValue if available, otherwise use empty string
    const command = inputValue || "";

    return complete(text, {
      body: { option: "zap", command: command, prompt: text },
    }).then(handleCompletionFinished);
  };

  return (
    <>
      <div className="h-full flex-col overflow-hidden text-popover-foreground w-[350px] max-w-[90vw] sm:w-full rounded-md border-b bg-background dark:bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Magic className="h-5 w-5 text-[#5E7CE2]" />
            <h3 className="text-lg font-semibold gradient-text">Ask AI</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              editor?.chain().unsetHighlight().focus().run();
              onOpenChange(false);
            }}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Close AI panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <Command className="w-[350px]">
          {hasCompletion && (
            <div className="flex max-h-[400px]">
              <ScrollArea>
                <div className="prose p-2 px-4 prose-sm">
                  <Markdown>{completion}</Markdown>
                </div>
              </ScrollArea>
            </div>
          )}

          {isLoading && (
            <div className="flex h-12 w-full items-center px-4 text-sm font-medium text-muted-foreground ">
              <Magic className="mr-2 h-4 w-4 shrink-0  text-[#5E7CE2] " />
              <span className="gradient-text">AI is thinking</span>
              <div className="ml-2 mt-1">
                <CrazySpinner />
              </div>
            </div>
          )}
          {!isLoading && (
            <>
              <div className="relative">
                <CommandInput
                  value={inputValue}
                  onValueChange={setInputValue}
                  autoFocus
                  placeholder={hasCompletion ? "Tell AI what to do next" : "Ask AI to edit or generate..."}
                  onFocus={() => addAIHighlight(editor)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (inputValue.trim() !== "") {
                        handleAIComplete();
                      }
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#5E7CE2]"
                  onClick={handleAIComplete}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
              {hasCompletion ? (
                <AICompletionCommands
                  onDiscard={() => {
                    editor.chain().unsetHighlight().focus().run();
                    onOpenChange(false);
                  }}
                  completion={completion}
                />
              ) : (
                <AISelectorCommands onSelect={(value, option) => complete(value, { body: { option } })} />
              )}
            </>
          )}
        </Command>
      </div>
    </>
  );
}
