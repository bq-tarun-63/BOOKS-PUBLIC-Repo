"use client";

import { useState, useMemo } from "react";
import { ChevronsRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Node as CustomNode } from "@/types/note";

type TemplateTarget = "private" | "public" | "restricted";

interface TemplatesSidebarProps {
  NodeRenderer: React.ComponentType<{
    nodes: CustomNode[];
    onReorder: (ids: string[]) => void;
    isPublic?: boolean;
  }>;
  ScrollableContainer: React.ComponentType<{
    children: React.ReactNode;
    preserveScroll?: boolean;
    className?: string;
  }>;
  openNodeIds: Set<string>;
  toggleNode: (id: string) => void;
  editorTitles: CustomNode[];
  selectedEditor: string | null;
  onSelectEditor: (id: string) => void;
  onTemplateInstantiate: (template: CustomNode, target: TemplateTarget) => Promise<void>;
  onCreateTemplate: () => Promise<void>;
  isCreatingTemplate: boolean;
  templateMenuOpenId: string | null;
  templateActionLoading: string | null;
  onTemplateMenuToggle: (templateId: string) => void;
}

export default function TemplatesSidebar({
  NodeRenderer,
  ScrollableContainer,
  editorTitles,
  selectedEditor,
  onTemplateInstantiate,
  onCreateTemplate,
  isCreatingTemplate,
  templateMenuOpenId,
  onTemplateMenuToggle,
  templateActionLoading,
}: TemplatesSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Filter template pages - check for isTemplate === true
  const templatePages = useMemo(() => {
    return editorTitles.filter((entry) => entry.isTemplate === true);
  }, [editorTitles]);

  return (
    <div className="relative text-sm leading-5 mb-8">
      <div className="flex items-center justify-between gap-2 py-2 px-2 ml-2 rounded-md group">
        <span className="text-xs text-[#5F5E5B] dark:text-[#9B9B9B] f-500">Templates</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCreateTemplate();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer flex-shrink-0 px-2 py-1 text-xs rounded-md hover:bg-muted/30 border border-gray-200 dark:border-gray-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
            disabled={isCreatingTemplate}
            title="Create template"
          >
            {isCreatingTemplate ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : null}
            <span>Create Template</span>
          </button>
          <div
            className="cursor-pointer hover:bg-muted/30 rounded-md px-1 py-1"
            onClick={toggleDropdown}
          >
            <ChevronsRight
              className={cn(
                "w-4 h-4 text-gray-400 transition-transform duration-300",
                isOpen && "rotate-90"
              )}
            />
          </div>
        </div>
      </div>

      {isOpen && (
        <>
          <ScrollableContainer>
            {templatePages.length === 0 ? (
              <div className="pl-4 py-2 text-xs text-[#5F5E5B] dark:text-[#9B9B9B]">
                No templates available
              </div>
            ) : (
              <ul className="pl-2 space-y-1" id="navigation-items">
                <NodeRenderer nodes={templatePages} onReorder={() => {}} />
              </ul>
            )}
          </ScrollableContainer>
        </>
      )}
    </div>
  );
}

