import { Check, ChevronDown } from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";

import { Button } from "@/components/tailwind/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tailwind/ui/popover";
export interface BubbleColorMenuItem {
  name: string;
  color: string;
}

const TEXT_COLORS: BubbleColorMenuItem[] = [
  {
    name: "Default",
    color: "var(--novel-black)",
  },
  {
    name: "Purple",
    color: "#9333EA",
  },
  {
    name: "Red",
    color: "#E00000",
  },
  {
    name: "Yellow",
    color: "#EAB308",
  },
  {
    name: "Blue",
    color: "#2563EB",
  },
  {
    name: "Green",
    color: "#008A00",
  },
  {
    name: "Orange",
    color: "#FFA500",
  },
  {
    name: "Pink",
    color: "#BA4081",
  },
  {
    name: "Gray",
    color: "#A8A29E",
  },
];

const HIGHLIGHT_COLORS: BubbleColorMenuItem[] = [
  {
    name: "Default",
    color: "var(--novel-highlight-default)",
  },
  {
    name: "Purple",
    color: "var(--novel-highlight-purple)",
  },
  {
    name: "Red",
    color: "var(--novel-highlight-red)",
  },
  {
    name: "Yellow",
    color: "var(--novel-highlight-yellow)",
  },
  {
    name: "Blue",
    color: "var(--novel-highlight-blue)",
  },
  {
    name: "Green",
    color: "var(--novel-highlight-green)",
  },
  {
    name: "Orange",
    color: "var(--novel-highlight-orange)",
  },
  {
    name: "Pink",
    color: "var(--novel-highlight-pink)",
  },
  {
    name: "Gray",
    color: "var(--novel-highlight-gray)",
  },
];

interface ColorSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ColorSelector = ({ open, onOpenChange }: ColorSelectorProps) => {
  const { editor } = useEditor();

  if (!editor) return null;
  const activeColorItem = TEXT_COLORS.find(({ color }) => editor.isActive("textStyle", { color }));

  const activeHighlightItem = (() => {
    // Check if we're in a callout with background color
    if (editor.isActive("callout")) {
      const calloutAttrs = editor.getAttributes("callout");
      if (calloutAttrs.backgroundColor) {
        return HIGHLIGHT_COLORS.find(({ color }) => color === calloutAttrs.backgroundColor);
      }
    }
    // Otherwise check for highlight mark
    return HIGHLIGHT_COLORS.find(({ color }) => editor.isActive("highlight", { color }));
  })();

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" className="gap-2 rounded-none" variant="ghost">
          <span
            className="rounded-sm px-1"
            style={{
              color: activeColorItem?.color,
              backgroundColor: activeHighlightItem?.color,
            }}
          >
            A
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        sideOffset={5}
        className="my-1 flex max-h-80 w-48 flex-col overflow-hidden overflow-y-auto rounded border p-1 shadow-xl "
        align="start"
      >
        <div className="flex flex-col">
          <div className="my-1 px-2 text-sm font-semibold text-muted-foreground">Color</div>
          {TEXT_COLORS.map(({ name, color }) => (
            <EditorBubbleItem
              key={name}
              onSelect={() => {
                editor.commands.unsetColor();
                name !== "Default" &&
                  editor
                    .chain()
                    .focus()
                    .setColor(color || "")
                    .run();
                onOpenChange(false);
              }}
              className="flex cursor-pointer items-center justify-between px-2 py-1 text-sm hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-sm border px-2 py-px font-medium" style={{ color }}>
                  A
                </div>
                <span>{name}</span>
              </div>
            </EditorBubbleItem>
          ))}
        </div>
        <div>
          <div className="my-1 px-2 text-sm font-semibold text-muted-foreground">Background</div>
          {HIGHLIGHT_COLORS.map(({ name, color }) => (
            <EditorBubbleItem
              key={name}
              onSelect={() => {
                const { state } = editor;
                const { selection } = state;
                const { $from } = selection;
                
                // Check if we're inside a callout node
                let calloutNode: any = null;
                let calloutDepth = -1;
                
                for (let depth = $from.depth; depth > 0; depth--) {
                  const node = $from.node(depth);
                  if (node.type.name === "callout") {
                    calloutNode = node;
                    calloutDepth = depth;
                    break;
                  }
                }
                
                // If inside callout, apply background color as node attribute
                if (calloutNode) {
                  const calloutPos = $from.before(calloutDepth);
                  if (name === "Default") {
                    editor.chain()
                      .setNodeSelection(calloutPos)
                      .updateAttributes("callout", { backgroundColor: null })
                      .run();
                  } else {
                    editor.chain()
                      .setNodeSelection(calloutPos)
                      .updateAttributes("callout", { backgroundColor: color })
                      .run();
                  }
                } else {
                  // For regular blocks, apply highlight mark
                  let blockDepth = $from.depth;
                  let blockNode: any = null;
                  
                  for (let depth = $from.depth; depth > 0; depth--) {
                    const node = $from.node(depth);
                    if (node.type.isBlock && !node.type.name.includes("doc")) {
                      blockNode = node;
                      blockDepth = depth;
                      break;
                    }
                  }
                  
                  if (blockNode) {
                    const blockStart = $from.start(blockDepth);
                    const blockEnd = $from.end(blockDepth);
                    
                    if (name === "Default") {
                      editor.chain()
                        .setTextSelection({ from: blockStart, to: blockEnd })
                        .focus()
                        .unsetHighlight()
                        .run();
                    } else {
                      editor.chain()
                        .setTextSelection({ from: blockStart, to: blockEnd })
                        .focus()
                        .setHighlight({ color })
                        .run();
                    }
                  } else {
                    editor.commands.unsetHighlight();
                    name !== "Default" && editor.chain().focus().setHighlight({ color }).run();
                  }
                }
                onOpenChange(false);
              }}
              className="flex cursor-pointer items-center justify-between px-2 py-1 text-sm hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-sm border px-2 py-px font-medium" style={{ backgroundColor: color }}>
                  A
                </div>
                <span>{name}</span>
              </div>
              {editor.isActive("highlight", { color }) && <Check className="h-4 w-4" />}
            </EditorBubbleItem>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
