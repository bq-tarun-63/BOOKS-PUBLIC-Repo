"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";

import { useNoteContext } from "@/contexts/NoteContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { useWorkAreaContext } from "@/contexts/workAreaContext";
import { useMarketplace } from "@/contexts/marketplaceContext";

import { useAuth } from "@/hooks/use-auth";
import useRenderPublishNode from "@/hooks/renderpublishPage";
import useRenderNode from "@/hooks/use-renderNode";
import type { CachedNode } from "@/hooks/use-cachedNodes";

import NoteModal from "@/components/tailwind/ui/updateModal";
import DeleteConfirmationModal from "@/components/tailwind/ui/deleteConfirmationModal";
import MoveToPublicModal from "@/components/tailwind/ui/moveToPublicModal";
import { AddIcon } from "@/components/tailwind/ui/icons/AddIcon";

import { ScrollableContainerProps, SidebarProps } from "@/types/sidebar";
import { type Node as CustomNode } from "@/types/note";

import { isOwner } from "@/services-frontend/user/userServices";
import { postWithAuth, putWithAuth } from "@/lib/api-helpers";
import { defaultEditorContent } from "@/lib/content";
import clsx from "clsx";
import { Skeleton } from "@/components/tailwind/ui/skeleton";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Plus,
  Trash,
  ChevronsLeftRight,
  Home as HomeIcon,
  FileText,
  Store,
} from "lucide-react";
import { DropdownMenu, DropdownMenuIcons, DropdownMenuHeader, DropdownMenuDivider } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";
import InviteButton from "./button/inviteButton";
import { toast } from "sonner";
import SettingsButton from "../settings/settings";
import WorkAreasSidebar from "../sidebar/WorkAreasSidebar";
import TemplatesSidebar from "../sidebar/TemplatesSidebar";


// Dropdown Tooltip component (positions below the button)
const DropdownTooltip = ({
  children,
  content,
  disabled = false,
}: { children: React.ReactNode; content: string; disabled?: boolean }) => {
  
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  if (disabled) return <>{children}</>;

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
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
              top: position.top,
              left: position.left,
              transform: "translateX(-50%)",
            }}
          >
            {content}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-800" />
          </div>,
          document.body,
        )}
    </div>
  );
};



const ScrollableContainer = React.forwardRef<HTMLDivElement, ScrollableContainerProps>(
  ({ children, preserveScroll = true, className }, ref) => {
    return (
      <div
        ref={ref}
        className={`overflow-y-auto ${className || ""}`}
        style={{
          maxHeight: "300px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollBehavior: preserveScroll ? "smooth" : "auto",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {children}
      </div>
    );
  },
);
ScrollableContainer.displayName = "ScrollableContainer";

type TemplateTarget = "private" | "public" | "restricted";

export function Sidebar({
  fallbackNotes,
  onAddEditor,
  onSelectEditor,
  selectedEditor,
  cachedChildNodes,
  setCachedChildNodes,
  fetchAndCacheChildren,
  fetchAndCacheChildrenForNode,
  isOpen,
  onClose,
  onOpen,
  onShare,
}: SidebarProps) {

  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { notes, updateNote, deleteNote, moveNote, setNotes ,childrenNotes , setChildrenNotes} = useNoteContext();
  const { workspaceMembers, currentWorkspace, setCurrentWorkspace } = useWorkspaceContext();
  const { workAreas } = useWorkAreaContext();
  const { fetchProfile } = useMarketplace();
  
  const [newEditorTitle, setNewEditorTitle] = useState<string>("");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState<string>("");
  const [parentIdForNewPage, setParentIdForNewPage] = useState<string | null>(null);
  const [updateId, setUpdateId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [movePageId, setMovePageId] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dropdownOpen, setdropdownOpen] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [publishedPageisOpen, setPublishedPageisOpen] = useState<boolean>(false);
  const [reviewPageisOpen, setReviewPageisOpen] = useState<boolean>(false);
  const [sharedPageisOpen, setSharedPageisOpen] = useState<boolean>(false);
  const [isPublicPage, setIsPublicPage] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isRestrictedPage, setIsRestrictedPage] = useState<boolean>(false);
  const [movePageLoading, setMovePageLoading] = useState<boolean>(false);
  const [templateMenuOpenId, setTemplateMenuOpenId] = useState<string | null>(null);
  const [templateActionLoading, setTemplateActionLoading] = useState<string | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState<boolean>(false);
  const [templateAddSubmenuOpen, setTemplateAddSubmenuOpen] = useState<boolean>(false);
  const [workspaceDropDownOpen, setworkspaceDropDownOpen] = useState<boolean>(false);
  
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);
  const [openNodeIds, setOpenNodeIds] = useState<Set<string>>(new Set());
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [sidebarScrollPosition, setSidebarScrollPosition] = useState(0);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);


  const [pages, setPages] = useState([]);
  const expandTimeoutRef = useRef<number | null>(null);
  // Track if we've already expanded the path for this selected editor
  const expandedPathsRef = useRef<Set<string>>(new Set());

// Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        workspaceDropdownRef.current && 
        !workspaceDropdownRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.workspace-trigger')
      ) {
        setworkspaceDropDownOpen(false);
      }
    };

    if (workspaceDropDownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [workspaceDropDownOpen]);

  let editorTitles: CustomNode[] = (notes.length > 0 ? notes : fallbackNotes) ?? [];

  if (editorTitles.length === 0 || notes.length === 0) {
    const rootNodesRaw = window.localStorage.getItem("rootNodes");
    if (rootNodesRaw) {
      const rootNodes = JSON.parse(rootNodesRaw);
      editorTitles = [...rootNodes];
    }
  }


  // Restore scroll position after operations
  const preserveScrollPosition = useCallback((callback: () => void) => {
    const currentScroll = sidebarRef.current?.scrollTop || 0;
    callback();
    // Use requestAnimationFrame for smoother scroll restoration
    requestAnimationFrame(() => {
      if (sidebarRef.current && sidebarRef.current.scrollTop !== currentScroll) {
        sidebarRef.current.scrollTop = currentScroll;
      }
    });
  },[]);

  useEffect(() => {
    const adminEmailsEnv = process.env.ADMINS || "";
    const adminEmails = adminEmailsEnv.split(",").map((email) => email.trim().toLowerCase());

    try {
      const userString = window.localStorage.getItem("auth_user");
      const user = userString ? JSON.parse(userString) : null;
      const email = user?.email;
      if (email) {
        // Store the current user's email in localStorage
        localStorage.setItem("currentUserEmail", email);
        if (email && adminEmails.includes(email)) {
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error("Failed to parse user-auth from localStorage", error);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as HTMLElement)) {
        setdropdownOpen(false);
        setEditData(null);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Close submenu when dropdown closes
  useEffect(() => {
    if (!dropdownOpen) {
      setTemplateAddSubmenuOpen(false);
    }
  }, [dropdownOpen]);

  useEffect(() => {
    if (!templateMenuOpenId) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-template-menu]")) {
        setTemplateMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [templateMenuOpenId]);

  // function to handle dropdown toggle
  const handleDropdownToggle = useCallback(
    (e: React.MouseEvent, nodeId: CustomNode | CachedNode | null) => {
      e.stopPropagation();
      if (sidebarRef.current) {
        setSidebarScrollPosition(sidebarRef.current.scrollTop);
      }
      setdropdownOpen(true);
      if (nodeId) {
        const rect = e.currentTarget.getBoundingClientRect();
        const dropdownHeight = 200;
        const windowHeight = window.innerHeight;
        const positionBelow = rect.bottom + dropdownHeight <= windowHeight;

        setDropdownPosition({
          top: positionBelow ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight,
          left: rect.left + window.scrollX,
        });
        setEditData(nodeId as unknown as Record<string, unknown>);
      }
    },
    [editData],
  );

  // function to handle Dropdown Action
  const handleDropdownAction = useCallback(
    (action: string, Data: Record<string, unknown> | null) => {
      preserveScrollPosition(() => {
        setdropdownOpen(false);
        setTemplateAddSubmenuOpen(false); // Close submenu when dropdown closes
        if (action === "rename" && Data) {
          setEditData(Data);
          setParentIdForNewPage(Data.parentId as string);
          setUpdateId(Data.id as string);
          setNewEditorTitle(Data.title as string);
          setSelectedEmoji(Data.icon as string);
          setShowModal(true);
        }
        if (action === "share" && Data) {
          onShare(Data.id as string);
          setEditData(null);
        }
        if (action === "duplicate" && Data) {
          setEditData(null);
        }
        if (action === "deletion" && Data) {
          setConfirmDeleteId(Data.id as string);
          setConfirmDeleteTitle(Data.title as string);
        }
        if (action === "movePage" && Data) {
          setMovePageId(Data.id as string);
          setNewEditorTitle(Data.title as string);
          setIsPublicPage(Data.isPublicNote as boolean);
        }
      });
    },
    [onShare],
  );

  const handleTemplateMenuToggle = useCallback((templateId: string) => {
    setTemplateMenuOpenId((prev) => (prev === templateId ? null : templateId));
  }, []);

  const handleTemplateInstantiate = useCallback(
    async (template: CustomNode, target: TemplateTarget) => {
      const identifier = `${template.id}-${target}`;
      setTemplateActionLoading(identifier);
      try {
        const response = await postWithAuth("/api/template/duplicate", {
          templateId: template.id,
          target,
        });
        console.log("Response from template duplicate **********-->" , response.clonedRootNoteIds[0]);
        if (
          response &&
          typeof response === "object" &&
          "isError" in response &&
          (response as any).isError
        ) {
          toast.error((response as any).message || "Failed to create page from template");
          console.log("Error from template duplicate **********-->" , (response as any).message);
          return;
        }
        console.log("Priting the new template **********-->" , response.clonedRootNoteIds[0]);
        toast.success(`Template added to ${target} pages`);
        if(response.clonedRootNoteIds && response.clonedRootNoteIds.length > 0){
          const newNoteId = response.clonedRootNoteIds[0];
          router.push(`/notes/${newNoteId}`);
        }
        else{
          toast.error("Failed to create page from template");
          console.log("Error from template duplicate **********-->" , "No new page created");
        }

        // const created = response as Record<string, any>;
        // const createdAt = created.createdAt ? new Date(created.createdAt).toISOString() : new Date().toISOString();
        // const updatedAt = created.updatedAt ? new Date(created.updatedAt).toISOString() : createdAt;

        // const instantiatedId = created.id || created._id || created.noteId || template.id;

        // Don't set content in localStorage here - let the advanced editor handle content fetching
        // The editor will automatically fetch content when navigating to the new page
        // Setting content here can interfere with the editor's content loading logic

        // const normalizedNode: CustomNode = {
        //   id: instantiatedId,
        //   title: created.title || template.title,
        //   parentId: created.parentId ?? null,
        //   gitPath: created.gitPath || created.contentPath || "",
        //   contentPath: created.contentPath,
        //   commitSha: created.commitSha || "",
        //   createdAt,
        //   updatedAt,
        //   content: created.content,
        //   icon: created.icon || template.icon || "",
        //   children: created.children || [],
        //   userId: created.userId?.toString?.() ?? created.userId,
        //   userEmail: created.userEmail ?? template.userEmail,
        //   isPublicNote: created.isPublicNote ?? false,
        //   isPublish: created.isPublish ?? false,
        //   approvalStatus: created.approvalStatus || "Publish",
        //   isRestrictedPage: created.isRestrictedPage ?? false,
        //   noteType: created.noteType || "original",
        //   isTemplate: false,
        //   workAreaId: created.workAreaId || "",
        // };

        // // Update notes: add the duplicated page, but preserve the original template
        // setNotes((prev) => {
        //   // Check if template exists in current notes
        //   const templateExists = prev.some((node) => node.id === template.id);
          
        //   // Remove any existing node with the same ID as the duplicated page (to avoid duplicates)
        //   const withoutDuplicate = prev.filter((node) => node.id !== normalizedNode.id);
          
        //   // Ensure the original template is preserved with isTemplate: true
        //   let withPreservedTemplate = withoutDuplicate.map((node) => {
        //     // If this is the original template, ensure it keeps isTemplate: true
        //     if (node.id === template.id) {
        //       return { ...node, isTemplate: true };
        //     }
        //     return node;
        //   });
          
        //   // If template doesn't exist, add it back with isTemplate: true
        //   if (!templateExists) {
        //     const templateNode = { ...template, isTemplate: true };
        //     withPreservedTemplate = [...withPreservedTemplate, templateNode];
        //   }
          
        //   // Add the new duplicated page (with isTemplate: false)
        //   return [...withPreservedTemplate, normalizedNode];
        // });

        // // Update localStorage: preserve template, add duplicate
        // const storedRootNodes = window.localStorage.getItem("rootNodes");
        // if (storedRootNodes) {
        //   try {
        //     const parsed = JSON.parse(storedRootNodes) as CustomNode[];
        //     // Check if template exists
        //     const templateExists = parsed.some((node) => node.id === template.id);
            
        //     // Remove any existing node with the same ID as the duplicated page
        //     const withoutDuplicate = parsed.filter((node) => node.id !== normalizedNode.id);
            
        //     // Ensure the original template is preserved with isTemplate: true
        //     let withPreservedTemplate = withoutDuplicate.map((node) => {
        //       if (node.id === template.id) {
        //         return { ...node, isTemplate: true };
        //       }
        //       return node;
        //     });
            
        //     // If template doesn't exist, add it back
        //     if (!templateExists) {
        //       const templateNode = { ...template, isTemplate: true };
        //       withPreservedTemplate = [...withPreservedTemplate, templateNode];
        //     }
            
        //     // Add the new duplicated page
        //     window.localStorage.setItem("rootNodes", JSON.stringify([...withPreservedTemplate, normalizedNode]));
        //   } catch (error) {
        //     console.error("Failed to update rootNodes cache after template instantiation:", error);
        //   }
        // } else {
        //   // If no rootNodes exist, create with both template and duplicate
        //   const templateNode = { ...template, isTemplate: true };
        //   window.localStorage.setItem("rootNodes", JSON.stringify([templateNode, normalizedNode]));
        // }
        
      } catch (error) {
        console.error("Failed to instantiate template:", error);
        toast.error("Failed to create page from template");
      } finally {
        setTemplateActionLoading(null);
        setTemplateMenuOpenId(null);
      }
    },
    [router, setNotes],
  );

  const handleCreateTemplate = useCallback(async () => {
    if (isCreatingTemplate) return;
    setTemplateMenuOpenId(null);
    setIsCreatingTemplate(true);
    try {
      const response = await postWithAuth("/api/template/create", {});
      if (
        response &&
        typeof response === "object" &&
        "isError" in response &&
        (response as any).isError
      ) {
        toast.error((response as any).message || "Failed to create template");
        return;
      }

      const created = response as Record<string, any>;
      const createdAt = created.createdAt ? new Date(created.createdAt).toISOString() : new Date().toISOString();
      const updatedAt = created.updatedAt ? new Date(created.updatedAt).toISOString() : createdAt;

      const templateId = created.id || created._id || created.noteId;
      if (!templateId) {
        throw new Error("Template creation response missing identifier");
      }

      let offlineTemplateContent = defaultEditorContent;
      if (created.content) {
        try {
          const rawTemplateContent =
            typeof created.content === "string" ? JSON.parse(created.content) : created.content;
          offlineTemplateContent = rawTemplateContent?.online_content ?? rawTemplateContent ?? defaultEditorContent;
        } catch (error) {
          console.error("Failed to parse template content:", error);
          offlineTemplateContent = defaultEditorContent;
        }
      }

      const templateContentSerialized = JSON.stringify(offlineTemplateContent);
      const nowIso = new Date().toISOString();

      window.localStorage.setItem(`novel-content-${templateId}`, templateContentSerialized);
      window.localStorage.setItem(`offline_content_time-${templateId}`, JSON.stringify(nowIso));
      window.localStorage.setItem(`last_content_update_time-${templateId}`, JSON.stringify(nowIso));
      window.localStorage.setItem(`content-loaded-${templateId}`, "true");
      window.localStorage.removeItem(`pending-title-${templateId}`);

      const normalizedTemplate: CustomNode = {
        id: templateId,
        title: created.title || "Untitled template",
        parentId: created.parentId ?? null,
        gitPath: created.gitPath || created.contentPath || "",
        contentPath: created.contentPath,
        commitSha: created.commitSha || "",
        createdAt,
        updatedAt,
        content: created.content,
        icon: created.icon || "",
        children: created.children || [],
        userId: created.userId?.toString?.() ?? created.userId,
        userEmail: created.userEmail || user?.email,
        isPublicNote: created.isPublicNote ?? false,
        isPublish: created.isPublish ?? false,
        approvalStatus: created.approvalStatus || "Publish",
        isRestrictedPage: created.isRestrictedPage ?? false,
        noteType: created.noteType || "original",
        isTemplate: true,
        workAreaId: created.workAreaId || "",
      };

      setNotes((prev) => {
        const filtered = prev.filter((node) => node.id !== normalizedTemplate.id);
        return [...filtered, normalizedTemplate];
      });

      const storedRootNodes = window.localStorage.getItem("rootNodes");
      if (storedRootNodes) {
        try {
          const parsed = JSON.parse(storedRootNodes) as CustomNode[];
          const filtered = parsed.filter((node) => node.id !== normalizedTemplate.id);
          window.localStorage.setItem("rootNodes", JSON.stringify([...filtered, normalizedTemplate]));
        } catch (error) {
          console.error("Failed to update rootNodes cache after creating template:", error);
        }
      } else {
        window.localStorage.setItem("rootNodes", JSON.stringify([normalizedTemplate]));
      }

      toast.success("Template created");
      router.push(`/notes/${normalizedTemplate.id}`);
    } catch (error) {
      console.error("Failed to create template:", error);
      toast.error("Failed to create template");
    } finally {
      setIsCreatingTemplate(false);
    }
  }, [isCreatingTemplate, router, setNotes, user]);

  const handleupdate = () => {
    if (newEditorTitle.trim() && updateId) {
      preserveScrollPosition(() => {
        setIsLoading(true);
        try {
          updateNote(updateId, newEditorTitle.trim(), parentIdForNewPage, selectedEmoji);
        } finally {
          setTimeout(() => {
            setIsLoading(false);
            setNewEditorTitle("");
            setSelectedEmoji("");
            setShowModal(false);
            setParentIdForNewPage(null);
            setEditData(null);
          }, 800);
        }
      });
    }
  };


  useEffect(() => {

    setChildrenNotes(cachedChildNodes);

  },[cachedChildNodes])

  // Function to find the path from a node to root
  const findPathToRoot = useCallback(
    async (nodeId: string, path: Set<string> = new Set()): Promise<Set<string>> => {
      path.add(nodeId);

      // Look through all cached nodes to find the parent
      for (const [parentId, children] of Object.entries(cachedChildNodes)) {
        const isChild = children.some((child) => child.id === nodeId);
        if (isChild) {
          // Add this parent to the path and continue up the tree
          return findPathToRoot(parentId, path);
        }
      }

      // Also check root nodes
      const rootNode = editorTitles.find((node) => node.children?.some((child) => child._id === nodeId));

      if (rootNode) {
        path.add(rootNode.id);
      } else {
        // Maybe the parent isn't loaded yet, so look for possible parent
        const possibleParent = await fetchAndCacheChildrenForNode(nodeId);
        if (possibleParent) {
          return findPathToRoot(possibleParent, path);
        }
      }

      return path;
    },
    [cachedChildNodes, editorTitles, fetchAndCacheChildrenForNode],
  );

  const handleAdd = (
    parentIdForNewPage: string | null,
    newEditorTitle: string,
    isRestrictedPage: boolean,
    isPublicPage: boolean,
    editData: Record<string, unknown> | null,
    workAreaId: string | null = null,
  ) => {
    setShowModal(false);
    const title = newEditorTitle.trim() || "Untitled";
    if (title.trim()) {
      preserveScrollPosition(() => {
        setIsLoading(true);
        try {
          onAddEditor(title.trim(), parentIdForNewPage, isRestrictedPage, selectedEmoji, isPublicPage, workAreaId);
        } finally {
          // Allow a slight delay for a better UX
          setTimeout(() => {
            setIsLoading(false);
            setNewEditorTitle("");
            setSelectedEmoji("");
            setIsPublicPage(false);
            setIsRestrictedPage(false);
          }, 800);
        }
      });
    }
  };

  const handleModalSubmit = () => {
    handleAdd(parentIdForNewPage, newEditorTitle, isRestrictedPage, isPublicPage, editData);
  };

  const toggleNode = useCallback(
    (id: string) => {
      preserveScrollPosition(() => {
        setOpenNodeIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
            // If opening and not in cache, fetch children
            // For work areas, children are already in the node, so we cache them directly
            if (id.startsWith("workarea-")) {
              // Find the work area node and cache its children
              const workAreaNode = editorTitles.find(n => n.id === id);
              if (workAreaNode && workAreaNode.children && !cachedChildNodes[id]) {
                const childrenAsCached = workAreaNode.children.map(child => ({
                  id: child._id,
                  title: child.title,
                  parentId: id,
                  icon: child.icon || "",
                  children: [],
                  hasChildren: false,
                  userId: child.userId,
                  userEmail: child.userEmail,
                }));
                setCachedChildNodes((prev) => ({
                  ...prev,
                  [id]: childrenAsCached,
                }));
              }
            } else if (!cachedChildNodes[id]) {
              fetchAndCacheChildren(id);
            }
          }
          return newSet;
        });
      });
    },
    [cachedChildNodes, fetchAndCacheChildren, editorTitles, setCachedChildNodes],
  );

  // Wrap onSelectEditor to handle work area IDs
  // Work areas should toggle expand/collapse instead of navigating
  const handleSelectEditor = useCallback((id: string) => {
    if (id.startsWith("workarea-")) {
      // Work areas toggle expand/collapse instead of navigating
      toggleNode(id);
    } else {
      onSelectEditor(id);
    }
  }, [onSelectEditor, toggleNode]);

  const selectedworkspace = currentWorkspace?.name;


  // Define filtered pages before useEffect
  const templatePages = editorTitles.filter((entry) => entry.isTemplate);

  const privatePages = editorTitles.filter(
    (entry) =>
      !entry.isTemplate &&
      entry.userEmail === user?.email &&
      entry.isPublish === false &&
      entry.isPublicNote === false &&
      (!entry.workAreaId || entry.workAreaId === "" || entry.workAreaId === null) // Exclude work area pages
  );

  const sharedPages = editorTitles.filter(
    (entry) =>
      !entry.isTemplate &&
      entry.userEmail !== user?.email &&
      entry.isPublish === false &&
      entry.isPublicNote === false,
  );

  const inReviewPages = editorTitles.filter(
    (entry) => !entry.isTemplate && entry.isPublish == true && entry.approvalStatus == "pending",
  );

  const publishedPages = editorTitles.filter(
    (entry) => !entry.isTemplate && entry.isPublish == true && entry.approvalStatus == "accepted",
  );
  
  const publicPages = editorTitles.filter(
    (entry) =>
      !entry.isTemplate &&
      entry.isPublicNote === true &&
      entry.isPublish === false &&
      entry.noteType !== "Viewdatabase_Note",
  );

  // Initial fetching of top-level nodes' children
  useEffect(() => {
    editorTitles.forEach((node) => {
      if (node.children && node.children.length > 0 && !cachedChildNodes[node.id]) {
        // Pre-cache children for root nodes
        const children = node.children.map((child) => ({
          id: child._id,
          title: child.title,
          parentId: node.id,
          icon: child.icon || "",
          children: [],
          userId: child.userId,
          userEmail: child.userEmail,
        }));

        setCachedChildNodes((prev) => ({
          ...prev,
          [node.id]: children,
        }));
      }
    });
  }, [editorTitles, cachedChildNodes, setCachedChildNodes]);


  const toggleDropdownForSharedPage = async () => {
    const nextOpen = !sharedPageisOpen;
    preserveScrollPosition(() => {
      setSharedPageisOpen(nextOpen);
      // Reload data **only when opening**
      if (nextOpen) {
        const data: any = sharedPages;
        setPages(data);
      }
    });
  };

  const toggleDropdownForReviewPage = async () => {
    const nextOpen = !reviewPageisOpen;
    setReviewPageisOpen(nextOpen);
    // Reload data **only when opening**
    if (nextOpen) {
      const data: any = inReviewPages;
      setPages(data);
    }
  };

  const toggleDropdownForPublishedPage = async () => {
    const nextOpen = !publishedPageisOpen;
    setPublishedPageisOpen(nextOpen);
    // Reload data **only when opening**
    if (nextOpen) {
      const data: any = publishedPages; 
      setPages(data);
    }
  };

  const handleReorderRoot = async (ids: string[]) => {
    try {
      localStorage.setItem("rootOrder", JSON.stringify({ ids, time: Date.now() }));

      const cached = localStorage.getItem("rootNodes");
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as CustomNode[];
          const map = new Map(parsed.map((n: CustomNode) => [n.id, n]));
          const ordered = ids.map((id) => map.get(id)).filter(Boolean) as CustomNode[];
          const rest = parsed.filter((n: CustomNode) => !ids.includes(n.id));
          localStorage.setItem("rootNodes", JSON.stringify([...ordered, ...rest]));
        } catch (e) {
          console.error("Error updating local cache:", e);
        }
      }

      const response = await putWithAuth("/api/note/reorderRootNotes", {
        orderedIds: ids,
      });
    } catch (err) {
      console.error("reorder failed", err);
    }
  };

  const NodeRenderer = ({
    nodes,
    onReorder,
    isPublic,
  }: {
    nodes: CustomNode[];
    onReorder: (ids: string[]) => void;
    isPublic?: boolean;
  }) => {
    const [ordered, setOrdered] = useState<CustomNode[]>(nodes);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

    useEffect(() => {
      setOrdered(nodes);
    }, [nodes]);

    const handleDragStart = (e: React.DragEvent, index: number) => {
      dragItem.current = index;
      setDraggingIdx(index);
      const node = ordered[index];
      if (node) {
        e.dataTransfer.setData("text/plain", node.id);
      }

      (e.currentTarget as HTMLElement).style.opacity = "0.5";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      dragOverItem.current = index;
    };

    const handleDragEnd = (e: React.DragEvent) => {
      (e.currentTarget as HTMLElement).style.opacity = "1";

      if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
        const newOrder = [...ordered];
        const [moved] = newOrder.splice(dragItem.current, 1);
        if (moved) {
          newOrder.splice(dragOverItem.current, 0, moved);

          setOrdered(newOrder);

          onReorder(newOrder.map((n) => n.id));
        }
      }

      dragItem.current = null;
      dragOverItem.current = null;
      setDraggingIdx(null);
    };

    const renderedNodes = useRenderNode({
      editorTitles: ordered,
      openNodeIds,
      selectedEditor,
      onSelectEditor: handleSelectEditor,
      toggleNode,
      onAddEditor: (parentId: string) => {
        setParentIdForNewPage(parentId);
        isPublic ? setIsPublicPage(true) : setIsPublicPage(false);
        // Check if parentId is a work area by checking against workAreas list
        const isWorkArea = workAreas.some(
          (wa) => wa._id === parentId
        );
        
        let workAreaId: string | null = null;
        let actualParentId: string | null = null;
        
        if (isWorkArea) {
          // Creating a root page in a work area: parentId = null, workAreaId = workAreaId
          workAreaId = parentId;
          actualParentId = null;
        } else {
          // Creating a child page: check if parent page belongs to a work area
          const parentNode = editorTitles.find((node) => node.id === parentId);
          workAreaId = parentNode?.workAreaId || null;
          actualParentId = parentId; // Use the actual parent page ID
        }
        
        setShowModal(isPublic ? true : false);
        if (isPublic) {
          setShowModal(true);
        } else {
          handleAdd(actualParentId, "Untitled", false, isPublic as boolean, null, workAreaId);
        }
      },
      childrenNotes,
      cachedChildNodes,
      setCachedChildNodes,
      onDropdownToggle: handleDropdownToggle,
    });

    return (
      <>
        {renderedNodes.map((child, index) => {
          const node = ordered[index];
          if (!node) return null;

          return React.cloneElement(child as React.ReactElement<any>, {
            draggable: true,
            onDragStart: (e: React.DragEvent) => handleDragStart(e, index),
            onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
            onDragEnd: handleDragEnd,
            onDragLeave: () => {},
            className: clsx((child as React.ReactElement<any>).props.className, draggingIdx === index && "opacity-50"),
            key: node.id,
          });
        })}
      </>
    );
  };

  const PublishNodeRenderer = ({ nodes }: { nodes: CustomNode[] }) => {
    const renderedNodes = useRenderPublishNode({
      editorTitles: nodes,
      openNodeIds,
      selectedEditor,
      onSelectEditor: handleSelectEditor,
      toggleNode,
    });
    return <>{renderedNodes}</>;
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    if (dropdownOpen) {
      sidebar.style.overflowY = "scroll";
      sidebar.style.pointerEvents = "none";
      sidebar.scrollTop = sidebarScrollPosition;
    } else {
      sidebar.style.overflowY = "auto";
      sidebar.style.pointerEvents = "auto";
      sidebar.scrollTop = sidebarScrollPosition;
    }
  }, [dropdownOpen, sidebarScrollPosition]);

  // Expand the path to the selected node when it changes
  useEffect(() => {
    if (selectedEditor && selectedEditor !== "notes") {
      // Skip expansion if the selected note is from review/published sections
      const isReviewNote = inReviewPages.some(note => note.id === selectedEditor);
      const isPublishedNote = publishedPages.some(note => note.id === selectedEditor);
      
      if (isReviewNote || isPublishedNote) {
        return; // Don't expand private hierarchy for review/published notes
      }

      // Skip if we've already expanded this path recently
      // But only if we have a record that the content is already loaded
      const hasLoadedContent = window.localStorage.getItem(`content-loaded-${selectedEditor}`);
      if (expandedPathsRef.current.has(selectedEditor) && hasLoadedContent) {
        console.log(`Path for ${selectedEditor} already expanded, skipping redundant expansion`);
        return;
      }

      const expandPath = async () => {
        // Add to expanded paths set to prevent redundant expansions
        expandedPathsRef.current.add(selectedEditor);

        // After 5 seconds, allow this path to be expanded again if needed
        expandTimeoutRef.current = window.setTimeout(() => {
          expandedPathsRef.current.delete(selectedEditor);
        }, 5000);

        // First, ensure we have the children of all root nodes
        // But only fetch if we don't already have them cached
        const rootNodePromises = editorTitles
          .filter((node) => node.children && node.children.length > 0 && !cachedChildNodes[node.id])
          .map((node) => fetchAndCacheChildren(node.id));

        if (rootNodePromises.length > 0) {
          await Promise.all(rootNodePromises);
        }

        // Get the path to root
        const pathToRoot = await findPathToRoot(selectedEditor);

        // Update open node IDs
        setOpenNodeIds((prev) => {
          let changed = false;
          const newSet = new Set(prev);
          pathToRoot.forEach((id) => {
            if (id !== selectedEditor && !newSet.has(id)) {
              newSet.add(id);
              changed = true;
            }
          });
          return changed ? newSet : prev;
        });

        // Ensure we fetch any missing nodes in the path
        // But only if they're not already cached
        const missingNodes = Array.from(pathToRoot).filter((id) => id && id !== "notes" && !cachedChildNodes[id]);

        if (missingNodes.length > 0) {
          await Promise.all(missingNodes.map((id) => fetchAndCacheChildren(id)));
        }
      };

      expandPath();
    }
    return () => { 
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }    
    }
  }, [selectedEditor, editorTitles, cachedChildNodes, fetchAndCacheChildren, findPathToRoot, inReviewPages, publishedPages]);


  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          role="button"
          tabIndex={0}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed top-0 bottom-0 z-50 w-60 bg-[#f8f8f7] shadow-[inset_-1px_0_0_0_#eeeeec] dark:bg-[#202020] dark:sidebar-shadow transition-transform transform",
          {
            "-translate-x-full": !isOpen,
            "translate-x-0": isOpen,
          },
        )}
        style={{ width: "250px" }}
      >
        <div ref={sidebarRef} className="absolute inset-0 z-10 overflow-auto pr-2 pb-10">
          <div className="flex justify-between p-4 pr-0 pl-2">
            <div className="flex items-center gap-2 w-full justify-stretch">
              {currentWorkspace ? (
                <>
                  <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-zinc-600 flex items-center justify-center">
                    <span className="text-md font-medium">
                      {currentWorkspace?.icon || selectedworkspace?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h1 className="text-xl font-semibold text-gray-700/70 dark:text-[#9B9B9B] truncate txt-eclips pl-1">
                    {selectedworkspace}
                  </h1>
                </>
              ) : (
                <>
                  <Skeleton className="w-8 h-8 rounded-md" />
                  <Skeleton className="h-6 w-32 rounded" />
                </>
              )}
              <button
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setworkspaceDropDownOpen(!workspaceDropDownOpen)}
              >
                <ChevronDown className="w-4 h-4 text-gray-800 dark:text-gray-200" />
              </button>
            </div>
            <button
              type="button"
              className=" p-2 mr-1 border  border-gray-200 dark:border-gray-600 rounded-lg"
              onClick={onClose}
            >
              <ChevronsLeft className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            </button>
          </div>

          {/* Home Link */}
          <div className="pl-2 pb-2">
            <button
              onClick={() => {
                onSelectEditor("home");
                router.push("/notes/home");
              }}
              className={clsx(
                "w-full group flex gap-2 pl-1 pr-2 items-center justify-between p-1 rounded-lg transition-all duration-200 cursor-pointer",
                "hover:bg-gray-100 hover:dark:bg-[#2c2c2c]",
                (selectedEditor === "home" || pathname === "/notes/home") && "font-bold bg-gray-100 dark:bg-[#2c2c2c]"
              )}
            >
              <div className="flex gap-2 pl-1 items-center relative flex-1 min-w-0">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <HomeIcon className="w-4 h-4" />
                </div>
                <span
                  className={clsx(
                    "ml-2 truncate txt-eclips min-w-0 text-sm",
                    (selectedEditor === "home" || pathname === "/notes/home")
                      ? "text-[#5F5E5B] dark:text-white"
                      : "text-[#5F5E5B] dark:text-[#9B9B9B]"
                  )}
                >
                  Home
                </span>
              </div>
            </button>
          </div>

          {/* Marketplace Link */}
          <div className="pl-2 pb-2">
            <button
              onClick={async () => {
                // Fetch profile when navigating to marketplace
                await fetchProfile();
                router.push("/marketplace");
              }}
              className={clsx(
                "w-full group flex gap-2 pl-1 pr-2 items-center justify-between p-1 rounded-lg transition-all duration-200 cursor-pointer",
                "hover:bg-gray-100 hover:dark:bg-[#2c2c2c]",
                (pathname === "/profile" || pathname === "/marketplace" || pathname?.startsWith("/marketplace/")) && "font-bold bg-gray-100 dark:bg-[#2c2c2c]"
              )}
            >
              <div className="flex gap-2 pl-1 items-center relative flex-1 min-w-0">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <span
                  className={clsx(
                    "ml-2 truncate txt-eclips min-w-0 text-sm",
                    (pathname === "/profile" || pathname === "/marketplace" || pathname?.startsWith("/marketplace/"))
                      ? "text-[#5F5E5B] dark:text-white"
                      : "text-[#5F5E5B] dark:text-[#9B9B9B]"
                  )}
                >
                  Marketplace
                </span>
              </div>
            </button>
          </div>

          {/*Render Work Areas */}
          <WorkAreasSidebar 
              NodeRenderer={NodeRenderer}
              ScrollableContainer={ScrollableContainer}
              openNodeIds={openNodeIds}
              toggleNode={toggleNode}
              editorTitles={editorTitles}
              onReorder={handleReorderRoot}
              onAddPage={(workAreaId) => {
                // Create a root page in the work area: parentId = null, workAreaId = workAreaId
                handleAdd(null, "Untitled", false, false, null, workAreaId);
              }}
            />

          {/*Render Public Pages */}
          <div className="relative text-sm leading-5 mb-8 ">
            <div className="flex items-center justify-between ">
              <span className="pl-4 text-xs text-[#5F5E5B] dark:text-[#9B9B9B] f-500">Public Pages</span>
              <button
                type="button"
                className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded sidebar-add-button"
                onClick={() => {
                  setParentIdForNewPage(null);
                  setShowModal(true);
                  setIsPublicPage(true);
                  setNewEditorTitle("Untitled");
                  setEditData(null);
                }}
              >
                <AddIcon className="w-6 h-6" />
              </button>
            </div>
            <ScrollableContainer>
              <ul className="pl-2 space-y-1" id="navigation-items">
                <NodeRenderer nodes={publicPages} onReorder={handleReorderRoot} isPublic={true} />
              </ul>
            </ScrollableContainer>
          </div>

          {/*Render Private Pages */}
          <div className="relative text-sm leading-5 mb-8 ">
            <div className="flex items-center justify-between ">
              <span className="pl-4 text-xs text-[#5F5E5B] dark:text-[#9B9B9B] f-500">Private Pages</span>
              <button
                type="button"
                className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded sidebar-add-button"
                onClick={() => {
                  handleAdd(null, "Untitled", false, false, null);
                }}
              >
                <AddIcon className="w-6 h-6" />
              </button>
            </div>
            <ScrollableContainer>
              <ul className="pl-2 space-y-1" id="navigation-items">
                <NodeRenderer nodes={privatePages} onReorder={handleReorderRoot} />
              </ul>
            </ScrollableContainer>
          </div>

          {/*Render shared Pages */}

          <div className="relative text-sm leading-5 mb-8">
            <div
              className="flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 py-2 px-2 ml-2 rounded-md"
              onClick={toggleDropdownForSharedPage}
            >
              <span className="text-xs text-[#5F5E5B] dark:text-[#9B9B9B]">Shared pages</span>
              <ChevronsRight
                className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                  sharedPageisOpen ? "rotate-90" : ""
                }`}
              />
          </div>

          {sharedPageisOpen && (
            <>
              <ScrollableContainer>
                <ul className="pl-2 space-y-1" id="navigation-items">
                  <NodeRenderer nodes={sharedPages} onReorder={handleReorderRoot} />
                </ul>
              </ScrollableContainer>
            </>
          )}
        </div>

    

        {/*Render Template Pages */}
        <TemplatesSidebar
          NodeRenderer={NodeRenderer}
          ScrollableContainer={ScrollableContainer}
          openNodeIds={openNodeIds}
          toggleNode={toggleNode}
          editorTitles={editorTitles}
          selectedEditor={selectedEditor}
          onSelectEditor={onSelectEditor}
          onTemplateInstantiate={handleTemplateInstantiate}
          onCreateTemplate={handleCreateTemplate}
          isCreatingTemplate={isCreatingTemplate}
          templateMenuOpenId={templateMenuOpenId}
          templateActionLoading={templateActionLoading}
          onTemplateMenuToggle={handleTemplateMenuToggle}
        />

        {/*Render inReview Pages */}
        {isAdmin && (
          <div className="relative text-sm leading-5 mb-8">
            <div
                className="flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 py-2 px-2 ml-2 rounded-md"
                onClick={toggleDropdownForReviewPage}
              >
                <span className="text-xs text-[#5F5E5B] dark:text-[#9B9B9B]">Review pages</span>
                <ChevronsRight
                  className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                    reviewPageisOpen ? "rotate-90" : ""
                  }`}
                />
              </div>

              {reviewPageisOpen && (
                <>
                  <ScrollableContainer>
                    <ul className="pl-2 space-y-1" id="navigation-items">
                      <PublishNodeRenderer nodes={inReviewPages} />
                    </ul>
                  </ScrollableContainer>
                </>
              )}
            </div>
          )}

          {/*Render published Pages */}
          {isAdmin && (
            <div className="relative text-sm leading-5 mb-8">
              <div
                className="flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 py-2 px-2 ml-2 rounded-md"
                onClick={toggleDropdownForPublishedPage}
              >
                <span className="text-xs text-[#5F5E5B] dark:text-[#9B9B9B]">Published pages</span>
                <ChevronsRight
                  className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                    publishedPageisOpen ? "rotate-90" : ""
                  }`}
                />
              </div>

              {publishedPageisOpen && (
                <>
                  <ScrollableContainer>
                    <ul className="pl-2 space-y-1" id="navigation-items">
                      <PublishNodeRenderer nodes={publishedPages} />
                    </ul>
                  </ScrollableContainer>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Modal */}
      {showModal && (
        <NoteModal
          isLoading={isLoading}
          title={newEditorTitle}
          setTitle={setNewEditorTitle}
          selectedEmoji={selectedEmoji}
          setSelectedEmoji={setSelectedEmoji}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          setIsRestrictedPage={setIsRestrictedPage}
          isRestrictedPage={isRestrictedPage}
          isPublicPage={isPublicPage}
          onClose={() => {
            setShowModal(false);
            setEditData(null);
            setNewEditorTitle("");
            setSelectedEmoji("");
            setParentIdForNewPage(null);
            setIsPublicPage(false);
            setIsRestrictedPage(false);
          }}
          onSubmit={editData ? handleupdate : handleModalSubmit}
          isEdit={!!editData}
        />
      )}

      {/*Deletion Modal */}
      {confirmDeleteId && (
        <DeleteConfirmationModal
        header="Delete Note"
          title={confirmDeleteTitle}
          entity="note"
          isOpen={!!confirmDeleteId}
          isDeleting={isDeleting}
          onCancel={() => {
            setConfirmDeleteId(null);
            setConfirmDeleteTitle("");
          }}
          onConfirm={async () => {
            if (deleteNote && confirmDeleteId) {
              setConfirmDeleteId(null);
              setConfirmDeleteTitle("");
              setIsDeleting(true);
              try {
                await deleteNote(confirmDeleteId);
              } catch (err) {
                console.error("Error deleting editor:", err);
              } finally {
                setIsDeleting(false);
                setConfirmDeleteId(null);
                setConfirmDeleteTitle("");
              }
            }
          }}
        />
      )}

      {/* Move Page Modal */}
      {movePageId && (
        <MoveToPublicModal
          isLoading={movePageLoading}
          editorTitle={newEditorTitle}
          isPublicPage={isPublicPage}
          onCancel={() => {
            setMovePageId(null);
            setIsRestrictedPage(false);
            setNewEditorTitle("");
          }}
          onConfirm={async () => {
            try {
              setMovePageId(null);
              setMovePageLoading(true);
              await moveNote(movePageId, isPublicPage, isRestrictedPage);
            } catch (err) {
              console.error("error in moving Note", err);
            } finally {
              setMovePageId(null);
              setIsRestrictedPage(false);
              setNewEditorTitle("");
              setMovePageLoading(false);
            }
          }}
          isRestrictedPage={isRestrictedPage}
          setIsRestrictedPage={setIsRestrictedPage}
        />
      )}

      {/*dropdown model */}
      {dropdownOpen && editData && (() => {
        const userOwnsNote = isOwner(editData?.userEmail as string, false, user);
        const isPublicNote = editData?.isPublicNote as boolean | undefined;
        
        // Build menu items array with conditional logic
        const menuItems: DropdownMenuItemProps[] = [];
        
        // Rename - always shown, disabled if !userOwnsNote
        menuItems.push({
          id: 'rename',
          label: "Rename",
          icon: <DropdownMenuIcons.Rename />,
          onClick: () => {
            if (userOwnsNote) {
              handleDropdownAction("rename", editData);
            }
          },
          disabled: !userOwnsNote,
        });
        
        // Share - only if !isPublicNote, disabled if !userOwnsNote
        if (!isPublicNote) {
          menuItems.push({
            id: 'share',
            label: "Share",
            icon: <DropdownMenuIcons.Share />,
            onClick: () => {
              if (userOwnsNote) {
                handleDropdownAction("share", editData);
              }
            },
            disabled: !userOwnsNote,
          });
        }
        
        // Move to Private/Public - always shown, text changes based on isPublicNote, disabled if !userOwnsNote
        menuItems.push({
          id: 'move-page',
          label: `Move to ${isPublicNote ? "Private" : "Public"} Pages`,
          icon: <DropdownMenuIcons.Move />,
          onClick: () => {
            if (userOwnsNote) {
              handleDropdownAction("movePage", editData);
            }
          },
          disabled: !userOwnsNote,
        });
        
        // Delete - always shown, disabled if !userOwnsNote, destructive variant
        menuItems.push({
          id: 'delete',
          label: "Delete",
          icon: <DropdownMenuIcons.Delete />,
          variant: 'destructive',
          onClick: () => {
            if (userOwnsNote) {
              handleDropdownAction("deletion", editData);
            }
          },
          disabled: !userOwnsNote,
        });
        
        return (
          <div
            ref={dropdownRef}
            className="fixed w-55 bg-white dark:bg-zinc-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-zinc-700"
            style={{
              top: `${Math.max(0, dropdownPosition.top)}px`,
              left: `${dropdownPosition.left}px`,
              maxHeight: "calc(100vh - 20px)",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setdropdownOpen(false);
                setTemplateAddSubmenuOpen(false);
              }
            }}
            role="menu"
            tabIndex={-1}
          >
            <div className="py-2">
              {/* Title header using DropdownMenuHeader */}
              <DropdownMenuHeader
                title={editData?.title ? String(editData.title) : "page"}
                onClose={() => {
                  setdropdownOpen(false);
                  setTemplateAddSubmenuOpen(false);
                }}
                showBack={false}
                showClose={true}
              />
              
              {/* Horizontal divider */}
              <DropdownMenuDivider />
              
              {/* Template Add button - keep separate as it has submenu */}
              {(editData?.isTemplate as boolean) && (
                <>
                  <div className="w-full relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemplateAddSubmenuOpen(!templateAddSubmenuOpen);
                      }}
                      className="flex items-center justify-between gap-4 w-full text-left px-4 py-2 text-sm transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <Plus className="h-4 w-4" />
                        Add
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform ${templateAddSubmenuOpen ? "rotate-90" : ""}`} />
                    </button>
                    
                    {/* Submenu for Add options */}
                    {templateAddSubmenuOpen && (
                      <div className="ml-2">
                        {(["private", "public", "restricted"] as TemplateTarget[]).map((option) => {
                          const template = editData as unknown as CustomNode;
                          const isBusy = templateActionLoading?.startsWith(`${template.id}-${option}`);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setTemplateAddSubmenuOpen(false);
                                setdropdownOpen(false);
                                await handleTemplateInstantiate(template, option);
                              }}
                              disabled={!!isBusy}
                              className="flex items-center gap-4 w-full text-left px-4 py-2 text-sm transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <div className="w-4 h-4" />
                              )}
                              Add to {option.charAt(0).toUpperCase() + option.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <DropdownMenuDivider />
                </>
              )}
              
              {/* Menu items using generic component */}
              <DropdownMenu items={menuItems} />
            </div>
          </div>
        );
      })()}
      {/* Loader overlay for deletion */}
      {(isDeleting || movePageLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="flex items-center gap-2 text-white text-lg">
            <Loader2 className="w-6 h-6 animate-spin" />
            {isDeleting ? "Deleting page..." : movePageLoading ? "Moving Page..." : "Loading..."}
          </div>
        </div>
      )}
      {/* switch workspace model */}
      {workspaceDropDownOpen && (
      <div
        ref={workspaceDropdownRef}
        className={clsx(
          "fixed z-[9999] w-60 bg-[#f8f8f7] dark:bg-zinc-800 shadow-lg border border-gray-200 dark:border-zinc-700 rounded-md",
          {
            "left-[250px]": isOpen,
            "left-0": !isOpen,
          }
        )}
        style={{
          top: '50px',  // Fixed 50px from top
          left: '5px',
        }}
      >
        <div className="p-3 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-start gap-2">
            {currentWorkspace ? (
              <>
                <div className="w-8 h-8 rounded-md bg-gray-300 dark:bg-zinc-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium">
                    {currentWorkspace?.icon || selectedworkspace?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedworkspace}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">reventlabs.com <span className="pl-2">{workspaceMembers.length} members</span></p>
                </div>
              </>
            ) : (
              <>
                <Skeleton className="w-8 h-8 rounded-md flex-shrink-0" />
                <div>
                  <Skeleton className="h-4 w-24 rounded mb-2" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="border-b">
          <InviteButton/>
        </div>
        <div className="border-b">
          <SettingsButton/>
        </div>
        <div className="">
          <button
            onClick={() => {
              setNotes([]);
              router.push("/organization/workspace");
              setworkspaceDropDownOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 fill-current" />
            Switch Workspace
          </button>
        </div>
      </div>
    )}
    </>
  );
}
