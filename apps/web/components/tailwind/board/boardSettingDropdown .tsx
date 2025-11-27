"use client";

import CardPropertiesEditor from "@/components/tailwind/board/boardView/cardPropertiesEditor";
import { useBoard } from "@/contexts/boardContext";
import { deleteWithAuth, postWithAuth } from "@/lib/api-helpers";
import type { BoardProperty, Note, ViewCollection } from "@/types/board";
import {
  updateFilters,
  updateSorts,
  updatePropertyVisibility,
  updateGroupByPropertyId,
  toggleLock,
} from "@/services-frontend/boardServices/databaseSettingsService";
import {
  Calendar,
  Clock,
  LayoutGrid,
  List,
  FileText,
} from "lucide-react";
import { DropdownMenu, DropdownMenuIcons, DropdownMenuHeader, DropdownMenuSearch, DropdownMenuSectionHeading, DropdownMenuEditableItem } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import EditPropertiesModal from "./editPropertiesModal";
import EditSinglePropertyModal from "./editSinglePropertyModal";
import FilterPropertiesModal from "./filterPropertiesModal";
import { Editor } from "@tiptap/core";
import GroupByPropertiesModal from "./groupByPropertiesModal";
import GroupModal from "./groupModal";
import LayoutSettingsModal from "./layoutSettingsModal";
import SortModal from "./sortPropertiesModel";
import DeleteConfirmationModal from "../ui/deleteConfirmationModal";
import { EMOJI_CATEGORIES } from "../editor/EmojiPicker";
import DataSourceSettingModal from "./dataSourceSettingModel";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { handleDeleteForm, handleSubmitScreen } from "@/services-frontend/form/formViewService";
import FormAddPropertyDialog from "./formView/FormAddPropertyDialog";
import { useDatabaseProperties } from "@/hooks/use-viewProperty";

interface BoardSettingsDropdownProps {
  board: ViewCollection;
  boardProperties: Record<string, BoardProperty>;
  onClose: () => void;
  editor?: Editor | null;
}

export default function BoardSettingsDropdown({ board: boardProp, boardProperties, onClose, editor }: BoardSettingsDropdownProps) {
  const boardId = boardProp._id;
  const [showPropertiesEditor, setShowPropertiesEditor] = useState(false);
  const [showEditPropertiesModal, setShowEditPropertiesModal] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [showGroupBySelector, setShowGroupBySelector] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSavingIcon, setIsSavingIcon] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [showAddQuestionDialog, setShowAddQuestionDialog] = useState(false);
  const [addQuestionDialogPosition, setAddQuestionDialogPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const { groupBy, setGroupBy, getGroupBy, filters, setBoardFilters, getFilters, sortBy, setBoardSortBy, getSortBy, currentView, updateBoard, boards, getCurrentDataSourceProperties, dataSources, setPropertyVisibility, getPropertyVisibility, propertyVisibility } =
    useBoard();
  const { currentWorkspace } = useWorkspaceContext();
  
  // Get the latest board from context
  const board = boards.find((b) => b._id === boardId) || boardProp;
  const dummyNote = useMemo<Note>(() => ({
    _id: `board-settings-dummy-${boardId}`,
    title: "",
    content: "",
    description: "",
    noteType: "Viewdatabase_Note",
    databaseProperties: {},
    contentPath: "",
    commitSha: "",
    comments: [],
  }), [boardId]);
  const { handleAddProperty } = useDatabaseProperties(board, dummyNote, () => {});
  
  // Get properties from current data source instead of board
  const currentDataSourceProperties = getCurrentDataSourceProperties(boardId);
  // Use data source properties if available, otherwise fallback to prop (for backward compatibility)
  const effectiveBoardProperties = currentDataSourceProperties && Object.keys(currentDataSourceProperties).length > 0 
    ? currentDataSourceProperties 
    : boardProperties;
  
  // Get current view - stores both id and type
  const currentViewData = currentView[board._id];
  const boardView = currentViewData?.type || board.viewsType?.[0]?.viewType || "board";
  const isFormsView = (boardView as string) === "forms";
  
  // IMPORTANT: Always match by view ID first, only use type as fallback
  let currentViewObj;
  if (currentViewData?.id) {
    // Prioritize ID match - if currentViewData.id exists, ONLY match by ID
    currentViewObj = board.viewsType?.find((v) => v.id === currentViewData.id);
  } else if (currentViewData?.type) {
    // Only fallback to type if no ID is available
    currentViewObj = board.viewsType?.find((v) => v.viewType === currentViewData.type);
  }
  // Fallback to first view if nothing found
  if (!currentViewObj) {
    currentViewObj = board.viewsType?.[0];
  }
  
  // Get current view's title - must match by ID if ID exists
  const getCurrentViewTitle = () => {
    if (currentViewData?.id) {
      // Find view by ID specifically
      const viewById = board.viewsType?.find((v) => v.id === currentViewData.id);
      return viewById?.title || boardView.charAt(0).toUpperCase() + boardView.slice(1);
    }
    // Fallback to type match if no ID
    return currentViewObj?.title || boardView.charAt(0).toUpperCase() + boardView.slice(1);
  };
  
  // Get current view's icon - must match by ID if ID exists
  const getCurrentViewIcon = () => {
    if (currentViewData?.id) {
      // Find view by ID specifically
      const viewById = board.viewsType?.find((v) => v.id === currentViewData.id);
      return viewById?.icon || "";
    }
    // Fallback to type match if no ID
    return currentViewObj?.icon || "";
  };
  
  const [viewName, setViewName] = useState(getCurrentViewTitle());
  const [lastSavedTitle, setLastSavedTitle] = useState(getCurrentViewTitle());
  const [currentViewIcon, setCurrentViewIcon] = useState(getCurrentViewIcon());
  const [lastSavedIcon, setLastSavedIcon] = useState(getCurrentViewIcon());
  
  // Get view icon
  const getViewIcon = (view: string) => {
    switch (view) {
      case "board":
        return LayoutGrid;
      case "list":
        return List;
      case "calendar":
        return Calendar;
      case "timeline":
        return Clock;
      case "forms":
        return FileText;
      default:
        return LayoutGrid;
    }
  };
  
  const CurrentViewIcon = getViewIcon(boardView);
  
  // Get current viewTypeId
  const currentViewTypeId = currentViewObj?.id ? (typeof currentViewObj.id === "string" ? currentViewObj.id : String(currentViewObj.id)) : null;
  
  // Get settings for current view (using viewTypeId)
  const selectedGroupByProperty = currentViewTypeId ? groupBy[currentViewTypeId] : undefined;
  const propertyVisibilityForBoard = currentViewTypeId ? (propertyVisibility[currentViewTypeId] || []) : [];
  const visiblePropertiesCount = propertyVisibilityForBoard.length;
  const filtersForBoard = currentViewTypeId ? (filters[currentViewTypeId] || {}) : {};
  const filterCount = Object.keys(filtersForBoard).reduce((acc, key) => acc + (filtersForBoard[key]?.length || 0), 0);
  const sortsForBoard = currentViewTypeId ? (sortBy[currentViewTypeId] || []) : [];

  const modalRef = useRef<HTMLDivElement>(null);
  const iconButtonRef = useRef<HTMLButtonElement>(null);
  const [emojiSearchTerm, setEmojiSearchTerm] = useState("");
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>("Recent");
  const emojiCategoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filteredEmojis = useMemo(() => {
    if (!emojiSearchTerm) return EMOJI_CATEGORIES;
    
    const filtered: Record<string, string[]> = {};
    Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
      const matches = emojis.filter((emoji) => emoji.includes(emojiSearchTerm));
      if (matches.length > 0) {
        filtered[category] = matches;
      }
    });
    return filtered;
  }, [emojiSearchTerm]);

  const scrollToEmojiCategory = useCallback((category: string) => {
    const element = emojiCategoryRefs.current[category];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Sync viewName, lastSavedTitle, and icon when board or current view changes from context (from external sources)
  useEffect(() => {
    if (isSavingName || isSavingIcon || isEditingName) return; // Don't sync while saving or typing
    
    const latestBoard = boards.find((b) => b._id === boardId) || board;
    const currentViewDataFromContext = currentView[boardId];
    
    // Find view by ID first if ID exists, otherwise by type
    let view;
    if (currentViewDataFromContext?.id) {
      // Find view by ID specifically
      view = latestBoard.viewsType?.find((v) => v.id === currentViewDataFromContext.id);
    } else if (currentViewDataFromContext?.type) {
      // Fallback to type match if no ID
      view = latestBoard.viewsType?.find((v) => v.viewType === currentViewDataFromContext.type);
    }
    
    // Final fallback to first view
    if (!view) {
      view = latestBoard.viewsType?.[0];
    }
    
    const newTitle = view?.title || (view?.viewType ? view.viewType.charAt(0).toUpperCase() + view.viewType.slice(1) : "") || "Board";
    const newIcon = view?.icon || "";
    
    // Only sync if the title changed from an external source (not from our optimistic update)
    if (newTitle !== viewName) {
      setViewName(newTitle);
      setLastSavedTitle(newTitle);
    }
    
    // Sync icon if it changed from an external source
    if (newIcon !== currentViewIcon) {
      setCurrentViewIcon(newIcon);
      setLastSavedIcon(newIcon);
    }
  }, [boards, boardId, currentView, board.viewsType, boardView, isSavingName, isSavingIcon, isEditingName]);

  const handleEditCard = () => setShowPropertiesEditor(true);
  const handleEditProperties = () => setShowEditPropertiesModal(true);
  const handleGroupByCard = () => setShowGroupBySelector(true);
  const handleFilterCard = () => setShowFilterModal(true);
  const handleSortCard = () => setShowSortModal(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLayout = () => {
    setShowLayoutModal(true);
  };

  const handlePropertyClick = (propertyId: string) => {
    setEditingPropertyId(propertyId);
  };

  const handleBackToEditProperties = () => {
    setEditingPropertyId(null);
  };

  const handleDataSources = () => {   
    setShowDataSourceModal(true);
  }

  const handleSubGroup = () => {
    toast.info("Sub-group coming soon");
  };

  const handleConditionalColor = () => {
    toast.info("Conditional color coming soon");
  };

  const handleAutomations = () => {
    toast.info("Automations coming soon");
  };

  const handleMoreSettings = () => {
    toast.info("More settings coming soon");
  };

  const handleManageDataSources = () => {
    toast.info("Manage data sources coming soon");
  };

  const handleLockDatabase = () => {
    toast.info("Lock database coming soon");
  };

  const handleCopyLink = async () => {
    try {
      const url = typeof globalThis !== "undefined" && globalThis.window ? globalThis.window.location.href : "";
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleViewNameChange = (newName: string) => {
    setViewName(newName);
    // Optimistically update the current view's title in viewsType
    const updatedViewsType = board.viewsType.map((view) =>
      (view.id === currentViewData?.id || (!view.id && view.viewType === currentViewData?.type)) ? { ...view, title: newName } : view
    );
    updateBoard(board._id, { ...board, viewsType: updatedViewsType });
  };

  const handleIconChange = async (newIcon: string) => {
    if (newIcon === lastSavedIcon) return;
    
    try {
      setIsSavingIcon(true);
      
      // Find view by ID first if ID exists
      let viewToUpdate;
      if (currentViewData?.id) {
        viewToUpdate = board.viewsType?.find((v) => v.id === currentViewData.id);
      } else if (currentViewData?.type) {
        viewToUpdate = board.viewsType?.find((v) => v.viewType === currentViewData.type);
      }
      
      if (!viewToUpdate || !viewToUpdate.id) {
        toast.error("Current view not found or missing ID");
        setCurrentViewIcon(lastSavedIcon);
        return;
      }
      
      // Optimistically update local state
      setCurrentViewIcon(newIcon);
      const optimisticViewsType = board.viewsType.map((view) =>
        view.id === viewToUpdate.id ? { ...view, icon: newIcon } : view
      );
      updateBoard(board._id, { ...board, viewsType: optimisticViewsType });
      
      const res = await postWithAuth("/api/database/updateViewType", {
        viewId: board._id,
        viewTypeId: viewToUpdate.id,
        title: viewToUpdate.title || lastSavedTitle,
        icon: newIcon,
      });
      
      if (!res.view?.success) {
        toast.error("Failed to update view icon");
        // Rollback on failure
        setCurrentViewIcon(lastSavedIcon);
        const rollbackViewsType = board.viewsType.map((view) =>
          view.id === viewToUpdate.id ? { ...view, icon: lastSavedIcon } : view
        );
        updateBoard(board._id, { ...board, viewsType: rollbackViewsType });
        return;
      }
      // Update last saved icon on success
      setLastSavedIcon(newIcon);
      const updatedViewsType = board.viewsType.map((view) =>
        view.id === viewToUpdate.id ? { ...view, icon: newIcon } : view
      );
      updateBoard(board._id, { ...board, viewsType: updatedViewsType });
      toast.success("View icon updated");
    } catch {
      toast.error("Failed to update view icon");
      // Rollback on error
      setCurrentViewIcon(lastSavedIcon);
      // Find view again for rollback
      let viewToUpdate;
      if (currentViewData?.id) {
        viewToUpdate = board.viewsType?.find((v) => v.id === currentViewData.id);
      } else if (currentViewData?.type) {
        viewToUpdate = board.viewsType?.find((v) => v.viewType === currentViewData.type);
      }
      if (viewToUpdate) {
        const rollbackViewsType = board.viewsType.map((view) =>
          view.id === viewToUpdate.id ? { ...view, icon: lastSavedIcon } : view
        );
        updateBoard(board._id, { ...board, viewsType: rollbackViewsType });
      }
    } finally {
      setIsSavingIcon(false);
    }
  };

  const handleRemoveIcon = async () => {
    await handleIconChange("");
  };

  const handleRenameView = async () => {
    const trimmed = viewName.trim();
    if (!trimmed || trimmed === lastSavedTitle) return;
    
    try {
      setIsSavingName(true);
      
      // Find view by ID first if ID exists
      let viewToUpdate;
      if (currentViewData?.id) {
        viewToUpdate = board.viewsType?.find((v) => v.id === currentViewData.id);
      } else if (currentViewData?.type) {
        viewToUpdate = board.viewsType?.find((v) => v.viewType === currentViewData.type);
      }
      
      if (!viewToUpdate || !viewToUpdate.id) {
        toast.error("Current view not found or missing ID");
        setViewName(lastSavedTitle);
        return;
      }
      
      const res = await postWithAuth("/api/database/updateViewType", {
        viewId: board._id,
        viewTypeId: viewToUpdate.id,
        title: trimmed,
        icon: currentViewIcon || "",
      });
      
      if (!res.view?.success) {
        toast.error("Failed to update view name");
        // Rollback on failure
        setViewName(lastSavedTitle);
        const rollbackViewsType = board.viewsType.map((view) =>
          view.id === viewToUpdate.id ? { ...view, title: lastSavedTitle } : view
        );
        updateBoard(board._id, { ...board, viewsType: rollbackViewsType });
        return;
      }
      // Update last saved title on success
      setLastSavedTitle(trimmed);
      const updatedViewsType = board.viewsType.map((view) =>
        view.id === viewToUpdate.id ? { ...view, title: trimmed } : view
      );
      updateBoard(board._id, { ...board, viewsType: updatedViewsType });
      toast.success("View name updated");
    } catch {
      toast.error("Failed to update view name");
      // Rollback on error
      setViewName(lastSavedTitle);
      // Find view again for rollback
      let viewToUpdate;
      if (currentViewData?.id) {
        viewToUpdate = board.viewsType?.find((v) => v.id === currentViewData.id);
      } else if (currentViewData?.type) {
        viewToUpdate = board.viewsType?.find((v) => v.viewType === currentViewData.type);
      }
      if (viewToUpdate) {
        const rollbackViewsType = board.viewsType.map((view) =>
          view.id === viewToUpdate.id ? { ...view, title: lastSavedTitle } : view
        );
        updateBoard(board._id, { ...board, viewsType: rollbackViewsType });
      }
    } finally {
      setIsSavingName(false);
      setIsEditingName(false);
    }
  };

  const { removeBoard } = useBoard();

  useEffect(() => {
    function handleOutsideclick(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleOutsideclick);
    return () => document.removeEventListener("mousedown", handleOutsideclick);
  }, [onClose]);

  const handleDeleteBoard = async () => {
    try {
      setIsDeleting(true);

      await deleteWithAuth("/api/database/deleteView", {
        body: JSON.stringify({
          viewId: board._id,
        }),
      });
      toast.success("Board deleted!");
      if (editor) {
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            // Iterate over all nodes
            tr.doc.descendants((node, pos) => {
              // Check if this is a reactComponentBlock for the board
              if (node.type.name === "reactComponentBlock" && node.attrs?.viewId === boardId) {
                tr.delete(pos, pos + node.nodeSize);
              }
            });
            return true;
          })
          .run();
      }

      removeBoard(board._id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete board");
    } finally {
      setIsDeleting(false);
    }
  };

  // Get data source name for Source item
  const getDataSourceName = () => {
    const dataSourceId = currentViewObj?.databaseSourceId;
    if (!dataSourceId) {
      return "No source";
    }
    const normalizedId = typeof dataSourceId === "string" ? dataSourceId : String(dataSourceId);
    const dataSource = dataSources[normalizedId];
    if (dataSource?.title) {
      return dataSource.title;
    }
    return normalizedId.slice(-6);
  };

  // Get group by property name
  const getGroupByPropertyName = () => {
    if (!selectedGroupByProperty) return undefined;
    const prop = effectiveBoardProperties[selectedGroupByProperty];
    if (!prop?.name) return undefined;
    return prop.name.slice(0, 1).toUpperCase() + prop.name.slice(1);
  };

  // Build menu items array
  const menuItems: DropdownMenuItemProps[] = useMemo(() => {
    const items: DropdownMenuItemProps[] = [];
    
    // Layout
    items.push({
      id: 'layout',
      label: "Layout",
      icon: <CurrentViewIcon className="h-4 w-4 text-muted-foreground" />,
      onClick: handleLayout,
      hasChevron: true,
      count: boardView.charAt(0).toUpperCase() + boardView.slice(1),
    });
    
    // Property visibility
    items.push({
      id: 'property-visibility',
      label: "Property visibility",
      icon: <DropdownMenuIcons.Eye />,
      onClick: handleEditCard,
      hasChevron: true,
      count: visiblePropertiesCount > 0 ? visiblePropertiesCount : undefined,
    });
    
    // Filter
    items.push({
      id: 'filter',
      label: "Filter",
      icon: <DropdownMenuIcons.Filter />,
      onClick: handleFilterCard,
      hasChevron: true,
      count: filterCount > 0 ? filterCount : undefined,
    });
    
    // Sort
    items.push({
      id: 'sort',
      label: "Sort",
      icon: <DropdownMenuIcons.Sort />,
      onClick: handleSortCard,
      hasChevron: true,
      count: sortsForBoard.length > 0 ? sortsForBoard.length : undefined,
    });
    
    // Group (conditional - only if not calendar)
    if (boardView !== "calendar") {
      items.push({
        id: 'group',
        label: "Group",
        icon: <DropdownMenuIcons.Group />,
        onClick: handleGroupByCard,
        hasChevron: true,
        count: getGroupByPropertyName(),
      });
    }
    
    // Sub-group
    items.push({
      id: 'sub-group',
      label: "Sub-group",
      icon: <DropdownMenuIcons.Group />,
      onClick: handleSubGroup,
      hasChevron: true,
    });
    
    // Conditional color
    items.push({
      id: 'conditional-color',
      label: "Conditional color",
      icon: <DropdownMenuIcons.Zap />,
      onClick: handleConditionalColor,
      hasChevron: true,
    });
    
    // Copy link to view (no chevron)
    items.push({
      id: 'copy-link',
      label: "Copy link to view",
      icon: <DropdownMenuIcons.Link />,
      onClick: handleCopyLink,
      hasChevron: false,
    });
    
    return items;
  }, [
    boardView,
    CurrentViewIcon,
    visiblePropertiesCount,
    filterCount,
    sortsForBoard.length,
    selectedGroupByProperty,
    effectiveBoardProperties,
    getGroupByPropertyName,
    handleLayout,
    handleEditCard,
    handleFilterCard,
    handleSortCard,
    handleGroupByCard,
    handleSubGroup,
    handleConditionalColor,
    handleCopyLink,
  ]);

  // Build data source menu items
  const dataSourceMenuItems: DropdownMenuItemProps[] = useMemo(() => {
    const items: DropdownMenuItemProps[] = [];
    
    // Source
    items.push({
      id: 'source',
      label: "Source",
      icon: <DropdownMenuIcons.Database />,
      onClick: handleDataSources,
      hasChevron: true,
      count: getDataSourceName(),
    });
    
    // Edit properties
    items.push({
      id: 'edit-properties',
      label: "Edit properties",
      icon: <DropdownMenuIcons.EditProperties />,
      onClick: handleEditProperties,
      hasChevron: true,
    });
    
    // Automations
    items.push({
      id: 'automations',
      label: "Automations",
      icon: <DropdownMenuIcons.Zap />,
      onClick: handleAutomations,
      hasChevron: true,
    });
    
    // More settings
    items.push({
      id: 'more-settings',
      label: "More settings",
      icon: <DropdownMenuIcons.Ellipsis />,
      onClick: handleMoreSettings,
      hasChevron: true,
    });
    
    return items;
  }, [handleDataSources, handleEditProperties, handleAutomations, handleMoreSettings, currentViewObj, dataSources, getDataSourceName]);

  // Build bottom actions menu items
  const bottomMenuItems: DropdownMenuItemProps[] = useMemo(() => {
    const items: DropdownMenuItemProps[] = [];
    
    // Manage data sources
    items.push({
      id: 'manage-data-sources',
      label: "Manage data sources",
      icon: <DropdownMenuIcons.Database />,
      onClick: handleManageDataSources,
      hasChevron: true,
    });
    
    // Lock database (no chevron)
    items.push({
      id: 'lock-database',
      label: "Lock database",
      icon: <DropdownMenuIcons.Lock />,
      onClick: handleLockDatabase,
      hasChevron: false,
    });
    
    // Delete Board (destructive)
    items.push({
      id: 'delete-board',
      label: "Delete Board",
      icon: <DropdownMenuIcons.Delete />,
      onClick: () => setShowDeleteConfirm(true),
      variant: 'destructive',
      hasChevron: false,
    });
    
    return items;
  }, [handleManageDataSources, handleLockDatabase]);


  const handleAddFormProperty = useCallback(
    (propertyType: string, label: string) => {
      if (!handleAddProperty) return null;
      return handleAddProperty(propertyType, undefined, undefined, undefined, label);
    },
    [handleAddProperty],
  );

  const handleNewQuestion = useCallback((event?: React.MouseEvent<HTMLButtonElement>) => {
    if (!isFormsView) {
      return;
    }
    if (!modalRef.current) {
      return;
    }
    const containerRect = modalRef.current.getBoundingClientRect();
    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      setAddQuestionDialogPosition({
        top: rect.bottom - containerRect.top + 8,
        left: rect.left - containerRect.left,
      });
    } else {
      const rect = modalRef.current.getBoundingClientRect();
      setAddQuestionDialogPosition({
        top: rect.top - containerRect.top,
        left: rect.right - containerRect.left + 8,
      });
    }
    setShowAddQuestionDialog(true);
  }, [isFormsView]);

  const handleSubmitscreen = useCallback(handleSubmitScreen, []);

  const handleDeleteView = useCallback(handleDeleteForm, []);

  const formMenuItems: DropdownMenuItemProps[] = useMemo(() => {
    if (!isFormsView) {
      return [];
    }
    return [
      {
        id: "new-question",
        label: "New question",
        icon: <DropdownMenuIcons.Plus />,
        onClick: handleNewQuestion,
      },
      {
        id: "automations",
        label: "Automations",
        icon: <DropdownMenuIcons.Zap />,
        hasChevron: true,
        onClick: handleAutomations,
      },
      {
        id: "submit-screen",
        label: "Submit screen",
        icon: <DropdownMenuIcons.Paintbrush />,
        hasChevron: true,
        onClick: handleSubmitscreen,
      },
    ];
  }, [handleAutomations, handleNewQuestion, handleSubmitscreen, isFormsView]);

  const formDataSourceItems: DropdownMenuItemProps[] = useMemo(() => {
    if (!isFormsView) {
      return [];
    }
    return [
      {
        id: "source",
        label: "Source",
        icon: <DropdownMenuIcons.Database />,
        hasChevron: true,
        count: getDataSourceName(),
        disabled: true,
        onClick: () => {},
      },
    ];
  }, [getDataSourceName, handleDataSources, isFormsView]);

  const formBottomMenuItems: DropdownMenuItemProps[] = useMemo(() => {
    if (!isFormsView) {
      return [];
    }
    return [
      {
        id: "delete-form",
        label: "Delete form",
        icon: <DropdownMenuIcons.Delete />,
        variant: "destructive",
        onClick: () => setShowDeleteConfirm(true),
      },
    ];
  }, [isFormsView, setShowDeleteConfirm]);

  // Early returns for modals - must be AFTER all hooks
  if (showPropertiesEditor) {
    return (
      <div className="absolute right-full top-0 mr-2">
        <CardPropertiesEditor
          board={board}
          boardProperties={effectiveBoardProperties}
          onClose={() => setShowPropertiesEditor(false)}
        />
      </div>
    );
  }

  if (showGroupBySelector) {
    return (
      <div className="absolute right-full top-0 mr-2">
        <GroupModal
          board={board}
          boardProperties={effectiveBoardProperties}
          onClose={() => setShowGroupBySelector(false)}
        />
      </div>
    );
  }

  if (showFilterModal) {
    return (
      <div className="absolute right-full top-0 mr-2">
        <FilterPropertiesModal
          board={board}
          boardProperties={effectiveBoardProperties}
          filters={filtersForBoard}
          onApply={async (selectedFilters) => {
            if (!currentViewTypeId) {
              toast.error("View type ID not found");
              return;
            }
            
            // Store previous state for rollback
            const previousFilters = filtersForBoard;
            const latestBoard = boards.find((b) => b._id === board._id) || board;
            const previousBoard = latestBoard;
            
            // Optimistic update: update context first
            setBoardFilters(currentViewTypeId, selectedFilters);
            const optimisticViewsType = latestBoard.viewsType.map((v) => {
              const vId = typeof v.id === "string" ? v.id : String(v.id);
              if (vId === currentViewTypeId) {
                return {
                  ...v,
                  settings: {
                    ...v.settings,
                    filters: Object.entries(selectedFilters).map(([propertyId, values]) => ({
                      propertyId,
                      value: values,
                    })),
                  },
                };
              }
              return v;
            });
            updateBoard(board._id, { ...latestBoard, viewsType: optimisticViewsType });
            
            try {
              const res = await updateFilters(currentViewTypeId, selectedFilters);
              
              if (res.viewType) {
                const updatedViewsType = latestBoard.viewsType.map((v) => {
                  const vId = typeof v.id === "string" ? v.id : String(v.id);
                  return vId === currentViewTypeId ? { ...v, settings: res.viewType?.settings } : v;
                });
                updateBoard(board._id, { ...latestBoard, viewsType: updatedViewsType });
              }
            } catch (err) {
              console.error("Failed to update filters:", err);
              // Rollback on error
              setBoardFilters(currentViewTypeId, previousFilters);
              updateBoard(board._id, previousBoard);
            }
            
            setShowFilterModal(false);
          }}
          onClose={() => setShowFilterModal(false)}
        />
      </div>
    );
  }

  if (showSortModal) {
    return (
      <div className="absolute right-full top-0 mr-2">
        <SortModal
          board={board}
          boardProperties={effectiveBoardProperties}
          sorts={sortsForBoard}
          onClose={() => setShowSortModal(false)}
          onApply={async (sorts) => {
            if (!currentViewTypeId) {
              toast.error("View type ID not found");
              return;
            }
            
            // Store previous state for rollback
            const previousSorts = sortsForBoard;
            const latestBoard = boards.find((b) => b._id === board._id) || board;
            const previousBoard = latestBoard;
            
            // Optimistic update: update context first
            setBoardSortBy(currentViewTypeId, sorts);
            const optimisticViewsType = latestBoard.viewsType.map((v) => {
              const vId = typeof v.id === "string" ? v.id : String(v.id);
              if (vId === currentViewTypeId) {
                return {
                  ...v,
                  settings: {
                    ...v.settings,
                    sorts: sorts.map((s) => ({
                      propertyId: s.propertyId,
                      direction: s.direction,
                    })),
                  },
                };
              }
              return v;
            });
            updateBoard(board._id, { ...latestBoard, viewsType: optimisticViewsType });
            
            try {
              // Update API using service
              const res = await updateSorts(currentViewTypeId, sorts);
              
              // Update board's viewType settings in context with server response
              if (res.viewType) {
                const updatedViewsType = latestBoard.viewsType.map((v) => {
                  const vId = typeof v.id === "string" ? v.id : String(v.id);
                  return vId === currentViewTypeId ? { ...v, settings: res.viewType?.settings } : v;
                });
                updateBoard(board._id, { ...latestBoard, viewsType: updatedViewsType });
              }
              
              toast.success("Sorts updated successfully");
            } catch (err) {
              console.error("Failed to update sorts:", err);
              // Rollback on error
              setBoardSortBy(currentViewTypeId, previousSorts);
              updateBoard(board._id, previousBoard);
              // Error toast is already shown in the service
            }
            
            // setShowSortModal(false);
          }}
        />
      </div>
    );
  }

  if (showLayoutModal) {
    return <LayoutSettingsModal board={board} onClose={() => setShowLayoutModal(false)} />;
  }

  if (showDataSourceModal) {
    return (
      <DataSourceSettingModal
        isOpen={true}
        onClose={() => setShowDataSourceModal(false)}
        onBack={() => setShowDataSourceModal(false)}
        board={board}
        view={currentViewData ? { id: currentViewData.id || '', type: currentViewData.type } : {}}
        workspaceId={currentWorkspace?._id}
        excludeViewId={"viewName.datasource.id"}
      />
    );
  }

  if(showEditPropertiesModal && !editingPropertyId ) {
    return(
      <EditPropertiesModal
        board={board}
        boardProperties={effectiveBoardProperties}
        onClose={() => setShowEditPropertiesModal(false)}
        onPropertyClick={handlePropertyClick}
      />
    );
  }

  if(showEditPropertiesModal && editingPropertyId){
    const prop = boardProperties[editingPropertyId];
    if (!prop) return null;
    return (
      <div className="absolute right-full top-0 mr-2">
        <EditSinglePropertyModal
          board={board}
          propertyId={editingPropertyId}
          property={prop}
          onClose={() => {
            setShowEditPropertiesModal(false);
            setEditingPropertyId(null);
          }}
          onBack={handleBackToEditProperties}
        />
      </div>
    );
  }

  return (
    <div ref={modalRef} className="relative bg-background shadow-lg rounded-md w-72 border border-border z-50">
      {/* Header */}
      <DropdownMenuHeader
        title="View settings"
        onClose={onClose}
        showBack={false}
        showClose={true}
        className="px-1"
      />

      <div className="flex flex-col p-1">
        {/* View name - using generic editable item component */}
        <DropdownMenuEditableItem
          iconButtonRef={iconButtonRef}
          icon={currentViewIcon || <CurrentViewIcon className="h-4 w-4 text-muted-foreground" />}
          onIconClick={() => setShowEmojiPicker(true)}
          iconButtonDisabled={isSavingIcon}
          iconButtonAriaLabel="Change view icon"
          inputValue={viewName}
          inputOnChange={handleViewNameChange}
          inputOnFocus={() => setIsEditingName(true)}
          inputOnBlur={handleRenameView}
          inputOnKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          inputPlaceholder="View name"
          inputAriaLabel="View name"
          inputDisabled={isSavingName}
        >
          {/* Emoji Picker - positioned relative to button */}
          {showEmojiPicker && iconButtonRef.current && (() => {
              if (!iconButtonRef.current) return null;
              
              const buttonRect = iconButtonRef.current.getBoundingClientRect();
              const maxPickerWidth = 408;
              const pickerHeight = 390;
              const gap = 8;
              const minPickerWidth = 300; // Minimum width to ensure readability
              
              // Calculate available space in viewport
              const spaceBelow = window.innerHeight - buttonRect.bottom;
              const spaceAbove = buttonRect.top;
              const spaceRight = window.innerWidth - buttonRect.left;
              const spaceLeft = buttonRect.left;
              
              // Determine picker width based on available space
              const availableWidth = Math.min(spaceRight, spaceLeft + buttonRect.width);
              const pickerWidth = Math.max(minPickerWidth, Math.min(maxPickerWidth, availableWidth - 16)); // 16px for margins
              
              // Determine vertical position (below or above)
              const showBelow = spaceBelow >= pickerHeight || spaceBelow >= spaceAbove;
              
              // Calculate top position relative to button (which is relative to parent)
              let top: number;
              if (showBelow) {
                top = buttonRect.height + gap;
              } else {
                top = -(pickerHeight + gap);
              }
              
              // Calculate left position relative to button
              let left = 0;
              
              // Adjust if not enough space on the right
              if (spaceRight < pickerWidth) {
                // Align to right edge of button
                left = buttonRect.width - pickerWidth;
                // Ensure it doesn't go too far left (keep at least 8px from viewport edge)
                const minLeft = -(buttonRect.left) + gap;
                if (left < minLeft) {
                  left = minLeft;
                }
              }
              
              return (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-[60] bg-black/20 dark:bg-black/40" 
                    onClick={() => {
                      setShowEmojiPicker(false);
                      setEmojiSearchTerm("");
                    }}
                  />
                  {/* Picker */}
                  <div
                    className="absolute z-[61] bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden h-[390px] max-h-[70vh] flex flex-col"
                    style={{
                      top: `${top}px`,
                      left: `${left}px`,
                      width: `${pickerWidth}px`,
                      minWidth: '300px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Tabs */}
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 px-2 overflow-x-auto hide-scrollbar">
                      <div className="flex gap-1 py-1.5">
                        {Object.keys(EMOJI_CATEGORIES).map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setActiveEmojiCategory(category);
                              scrollToEmojiCategory(category);
                            }}
                            className={`px-2 h-7 rounded-md text-sm transition-colors whitespace-nowrap ${
                              activeEmojiCategory === category
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            {category}
                            {activeEmojiCategory === category && (
                              <div className="h-0.5 bg-gray-900 dark:bg-white mt-1" />
                            )}
                          </button>
                        ))}
                      </div>
                      {currentViewIcon && (
                        <button
                          type="button"
                          onClick={() => {
                            handleRemoveIcon();
                            setShowEmojiPicker(false);
                            setEmojiSearchTerm("");
                          }}
                          className="px-2 h-7 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Search */}
                    <div className="px-2 py-2">
                      <DropdownMenuSearch
                        placeholder="Filter…"
                        value={emojiSearchTerm}
                        onChange={setEmojiSearchTerm}
                        variant="subtle"
                      />
                    </div>

                    {/* Emoji Grid */}
                    <div className="flex-1 overflow-y-auto px-3 pb-2">
                      {Object.entries(filteredEmojis).map(([category, emojis]) => (
                        <div 
                          key={category} 
                          className="mb-4"
                          ref={(el) => { emojiCategoryRefs.current[category] = el }}
                        >
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2 pt-2">
                            {category}
                          </div>
                          <div className="grid grid-cols-12 gap-1">
                            {emojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  handleIconChange(emoji);
                                  setShowEmojiPicker(false);
                                  setEmojiSearchTerm("");
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-2xl"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
        </DropdownMenuEditableItem>

        {/* Menu items using generic component */}
        <DropdownMenu items={isFormsView ? formMenuItems : menuItems} />
      </div>

      {/* Data source settings section */}
      <div className="px-4 pt-2 pb-1 border-t">
        <DropdownMenuSectionHeading>Data source settings</DropdownMenuSectionHeading>
      </div>

      <div className="flex flex-col p-1">
        {/* Data source menu items */}
        <DropdownMenu items={isFormsView ? formDataSourceItems : dataSourceMenuItems} />
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col p-1 border-t">
        {/* Bottom menu items */}
        <DropdownMenu items={isFormsView ? formBottomMenuItems : bottomMenuItems}/>
      </div>

      {/* Modals */}
      {showPropertiesEditor && (
        <div className="absolute right-full top-0 mr-2">
          <CardPropertiesEditor
            board={board}
            boardProperties={effectiveBoardProperties}
            onClose={() => setShowPropertiesEditor(false)}
          />
        </div>
      )}



      {showGroupBySelector && (
        <div className="absolute right-full top-0 mr-2">
          <GroupByPropertiesModal
            board={board}
            boardProperties={effectiveBoardProperties}
            selectedPropertyId={selectedGroupByProperty}
            onSelect={(propId) => {
              setGroupBy(board._id, propId);
              setShowGroupBySelector(false);
            }}
            onClose={() => setShowGroupBySelector(false)}
          />
        </div>
      )}

      {showFilterModal && (
        <div className="absolute right-full top-0 mr-2">
          <FilterPropertiesModal
            board={board}
            boardProperties={effectiveBoardProperties}
            filters={filtersForBoard}
            onApply={(newFilters) => {
              setBoardFilters(board._id, newFilters);
              setShowFilterModal(false);
            }}
            onClose={() => setShowFilterModal(false)}
          />
        </div>
      )}

      {showSortModal && (
        <div className="absolute right-full top-0 mr-2">
          <SortModal
            board={board}
            boardProperties={effectiveBoardProperties}
            sorts={sortsForBoard}
            onApply={(newSorts) => {
              setBoardSortBy(board._id, newSorts);
              setShowSortModal(false);
            }}
            onClose={() => setShowSortModal(false)}
          />
        </div>
      )}

      {showLayoutModal && (
        <div className="absolute right-full top-0 mr-2">
          <LayoutSettingsModal board={board} onClose={() => setShowLayoutModal(false)} />
        </div>
      )}

      {isFormsView ? (
        <DeleteConfirmationModal
          header="Delete Form"
          isOpen={showDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteView}
          isDeleting={isDeleting}
          title={viewName}
          entity="view"
        />
      ) : (
        <DeleteConfirmationModal
          header="Delete Board"
          isOpen={showDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteBoard}
          isDeleting={isDeleting}
          title={board.title}
          entity="board"
        />
      )}

      {showAddQuestionDialog && (
        <>
          <div
            className="absolute inset-0 z-[1400]"
            onClick={() => setShowAddQuestionDialog(false)}
          />
          <div
            className="absolute z-[1401] mb-5"
            style={{
              top: addQuestionDialogPosition.top || 0,
              left: addQuestionDialogPosition.left || 0,
            }}
          >
            <FormAddPropertyDialog
              onSelect={async (type, label) => {
                const result = await handleAddFormProperty(type, label);
                return result;
              }}
              onClose={() => setShowAddQuestionDialog(false)}
            />
          </div>
        </>
      )}

    </div>
  );
}
