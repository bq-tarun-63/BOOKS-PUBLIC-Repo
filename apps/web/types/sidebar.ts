import { type Node as CustomNode } from "@/types/note";
import type { CachedNodes } from "@/hooks/use-cachedNodes";


export interface SidebarProps {
  fallbackNotes: CustomNode[];
  onAddEditor: (
    title: string,
    parentId?: string | null,
    isRestrictedPage?: boolean,
    icon?: string | null,
    isPublicNote?: boolean,
    workAreaId?: string | null,
  ) => void;
  onSelectEditor: (id: string) => void;
  selectedEditor: string | null;
  cachedChildNodes: CachedNodes;
  setCachedChildNodes: React.Dispatch<React.SetStateAction<CachedNodes>>;
  fetchAndCacheChildren: (id: string) => Promise<void>;
  fetchAndCacheChildrenForNode: (id: string) => Promise<string | null>;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onShare: (noteId: string) => void;
}

export interface ScrollableContainerProps {
  children: React.ReactNode;
  preserveScroll?: boolean;
  className?: string;
}