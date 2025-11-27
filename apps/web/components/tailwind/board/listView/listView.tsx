"use client";
import { useBoard } from "@/contexts/boardContext";
import useAddRootPage from "@/hooks/use-addRootPage";
import useBoardFunctions from "@/hooks/use-board";
import type { Note, ViewCollection } from "@/types/board";
import { Calendar, CheckSquare, Flag, Type, User, Plus, ChevronRight, Calculator, ListChecks, Tag, Star, FileText, GitPullRequest, Mail, Link, Phone, Paperclip, Download } from "lucide-react";
import { formatFormulaValue } from "@/utils/formatFormulaValue";
import { normalizeGitHubPrValue, getGitHubPrStatusMeta } from "@/utils/githubPr";
import type { JSONContent } from "novel";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GroupSection from "./GroupSection";
import MainHeaderRow from "./MainHeaderRow";
import RightSidebar from "../rightSidebar";
import GroupActionBar from "./GroupActionBar";
import { useGroupEditing } from "../../../../services-frontend/boardServices/useGroupEditing";
import { applySorting } from "@/utils/sortingCard";
import { AddPropertyDialog } from "../addPropertyDialog";
import { useDatabaseProperties } from "@/hooks/use-viewProperty";
import CellEditor from "../cellEditors/CellEditor";
import { canEditProperty } from "../cellEditors/CellEditorRegistry";
import type { EditingCell } from "@/types/cellEditor";
import { postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";
import DeleteConfirmationModal from "@/components/tailwind/ui/deleteConfirmationModal";
import { getColorStyles } from "@/utils/colorStyles";
import { getRelationIdsFromValue } from "@/utils/relationUtils";
import { computeRollupData, getRollupComparableValue } from "@/utils/rollupUtils";
import { applyAdvancedFilters } from "@/utils/advancedFilterUtils";

import PropertyHeaderDropdown from "../PropertyHeaderDropdown";
import EditSinglePropertyModal from "../editSinglePropertyModal";
import { createHandlers } from "./listViewHandlers";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import useNoteActions from "@/hooks/use-updateNode";
import { RelationViewSelector } from "../properties/inputs/relationViewSelector";
import { RelationConfigModal } from "@/components/tailwind/ui/modals/relationConfigModal";
import { getWithAuth } from "@/lib/api-helpers";
interface ListViewProps {
  readonly board: ViewCollection;
  readonly notes: Note[];
}

interface PropertyColumn {
  id: string;
  name: string;
  type: string;
  width: number;
  icon: React.ReactNode;
}

export default function ListView({ board, notes }: ListViewProps) {
  // CSS for dynamic column widths
  const getColumnStyle = (width: number) => ({ width: `${width}px` });
  const [selectedTask, setSelectedTask] = useState<Note | null>(null);
  const [rightSidebarContent, setRightSidebarContent] = useState<JSONContent | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRowTitle, setNewRowTitle] = useState("");
  // Initialize after localNotes and updateNote are defined
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const [propertyDialogPosition, setPropertyDialogPosition] = useState({ top: 0, left: 0 });
  const [insertionTarget, setInsertionTarget] = useState<{ targetPropertyId: string; side: 'left' | 'right'; anchorElement?: HTMLElement } | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [propertyHeaderDropdown, setPropertyHeaderDropdown] = useState<{
    propertyId: string;
    anchorElement: HTMLElement;
  } | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const previousCardIdRef = useRef<string | null>(null);
  const addPropertyBtnRef = useRef<HTMLButtonElement>(null);
  const { addRootPage } = useAddRootPage();
  
  // Relation property state
  const [showRelationViewSelector, setShowRelationViewSelector] = useState(false);
  const [relationViews, setRelationViews] = useState<any[]>([]);
  const [loadingRelationViews, setLoadingRelationViews] = useState(false);
  const [showRelationConfigModal, setShowRelationConfigModal] = useState(false);
  const [pendingRelationData, setPendingRelationData] = useState<{
    viewId: string;
    viewTitle: string;
    databaseSourceId: string;
  } | null>(null);
  const { updateNote, updateAllNotes, updateBoard, getFilters, getAdvancedFilters, propertyOrder, setPropertyOrder, getSortBy, setBoardSortBy, getGroupBy, setGroupBy, searchQuery, setBoardFilters, getCurrentDataSourceProperties, currentView, boards: contextBoards, currentDataSource, getPropertyVisibility, dataSources, getRelationNoteTitle, getNotesByDataSourceId, getDataSource } = useBoard();
  const [localNotes, setLocalNotes] = useState<Note[]>(notes);
  
  // Get current dataSourceId from current view ID (not type)
  // IMPORTANT: Always match by view ID first, only use type as fallback
  const getCurrentDataSourceId = (): string | null => {
    const currentViewData = currentView[board._id];
    const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
    
    let view;
    if (currentViewData?.id) {
      // Prioritize ID match - if currentViewData.id exists, ONLY match by ID
      view = latestBoard.viewsType?.find((vt) => vt.id === currentViewData.id);
    } else if (currentViewData?.type) {
      // Only fallback to type if no ID is available
      view = latestBoard.viewsType?.find((vt) => vt.viewType === currentViewData.type);
    }
    
    const dsId = view?.databaseSourceId;
    return dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
  };
  
  // Get properties from current data source - make it reactive to dataSources changes
  const boardProperties = useMemo(() => {
    return getCurrentDataSourceProperties(board._id) || board.properties;
  }, [getCurrentDataSourceProperties, board._id, board.properties, dataSources]);
  const groupEditing = useGroupEditing({boardId: board._id, localNotes, setLocalNotes, updateNote, updateAllNotes,
    onNoteDeleted: (noteIdsToDelete) => {
      // Close sidebar if selected task is being deleted
      if (selectedTask && noteIdsToDelete.includes(selectedTask._id)) {
        setSelectedTask(null);
        setRightSidebarContent(null);
      }
      setEditingCell(null);
    },
  });
  const { selectedNotes, setSelectedNotes, groupEditingPropertyId, handleSelectNote, handleSelectAll, openGroupEditor, applyGroupUpdate, clearGroupEditing,
    requestDeleteSelected,
    confirmDeleteSelected,
    cancelDelete,
    showDeleteConfirm,
    isDeleting,
    pendingDeletion,
  } = groupEditing;
  
  const { workspaceMembers, currentWorkspace } = useWorkspaceContext();
  // Column resize state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ propertyId: string; startX: number; startWidth: number } | null>(null);

  const handleColumnResizeMouseDown = (e: React.MouseEvent, propertyId: string, baseWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = baseWidth;
    resizingRef.current = { propertyId, startX, startWidth };

    const onMouseMove = (ev: MouseEvent) => {
      const state = resizingRef.current;
      if (!state) return;
      const dx = ev.clientX - state.startX;
      const newWidth = Math.min(600, Math.max(80, state.startWidth + dx));
      setColumnWidths((prev) => ({ ...prev, [propertyId]: newWidth }));
    };
    const onMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const downloadAttachment = useCallback(
    async (file: { url: string; name?: string }) => {
      try {
        const response = await fetch(file.url);
        if (!response.ok) {
          throw new Error("Failed to download file");
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = file.name || "attachment";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        console.error("Download failed", error);
        toast.error("Unable to download file. Please try again.");
      }
    },
    [],
  );

  // Property management hooks - create a dummy note if no notes exist
  const dummyNote: Note = {
    _id: 'temp',
    title: '',
    content: '',
    description: '',
    noteType: 'Viewdatabase_Note',
    databaseProperties: {},
    contentPath: '',
    commitSha: '',
    comments: []
  };
  
  const { handleAddProperty, handleUpdateProperty } = useDatabaseProperties(
    board, 
    selectedTask || notes[0] || dummyNote, 
    (updatedNote) => {
      if (selectedTask) {
        setSelectedTask(updatedNote);
      }
      const noteIndex = localNotes.findIndex(n => n._id === updatedNote._id);
      if (noteIndex !== -1) {
        const newNotes = [...localNotes];
        newNotes[noteIndex] = updatedNote;
        setLocalNotes(newNotes);
        const dataSourceId = getCurrentDataSourceId();
        if (dataSourceId) {
          updateNote(dataSourceId, updatedNote._id, updatedNote);
        }
      }
    }
  );

  // Drag and drop state for column reordering
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState<number | null>(null);

  // Drag and drop state for rows
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<"above" | "below" | null>(null);
  // Inline title edit state
  const [editingTitleNoteId, setEditingTitleNoteId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>("");
  const titleClickTimerRef = useRef<number | null>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const { UpdateNote } = useNoteActions();
  // Group UI state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };
  const [showAddRowForGroup, setShowAddRowForGroup] = useState<Record<string, boolean>>({});
  const [newRowTitleForGroup, setNewRowTitleForGroup] = useState<Record<string, string>>({});

  const createNoteInGroup = async ({ propertyId, value, title, groupName }: { propertyId: string | null; value: any; title: string; groupName: string }) => {
    const tempId = `temp-${Date.now()}`;
    const groupedPropertyId = propertyId || getGroupBy(board._id);

    const optimisticNote: Note = {
      _id: tempId,
      title,
      content: "",
      description: "",
      noteType: "Viewdatabase_Note",
      databaseProperties: groupedPropertyId ? { [groupedPropertyId]: value } : {},
      contentPath: "",
      commitSha: "",
      comments: [],
    };

    setLocalNotes((prev) => [...prev, optimisticNote]);
    setNewRowTitleForGroup((prev) => ({ ...prev, [groupName]: '' }));
    setShowAddRowForGroup((prev) => ({ ...prev, [groupName]: false }));

    try {
      // Get dataSourceId from context (already tracked and synced)
      const dsId = currentDataSource[board._id];
      const dataSourceId: string | undefined = (dsId ? String(dsId) : board._id) as string | undefined;

      // Build databaseProperties object (only if both propertyId and value exist, matching old behavior)
      const databasePropertiesToPass = groupedPropertyId && value ? { [groupedPropertyId]: value } : {};
      
      const { page: newPage } = await addRootPage(
        title,
        null,
        false,
        null,
        false,
        dataSourceId,
        databasePropertiesToPass,
        undefined,
      );

      const serverNote: Note = {
        _id: newPage.id,
        title: newPage.title,
        content: newPage.content,
        description: newPage.description || "",
        noteType: newPage.noteType || "Viewdatabase_Note",
        databaseProperties: newPage.databaseProperties || {},
        contentPath: newPage.contentPath || "",
        commitSha: newPage.commitSha || "",
        comments: newPage.comments || [],
      };

      setLocalNotes((prev) => prev.map((note) => (note._id === tempId ? serverNote : note)));
      const currentDsId = getCurrentDataSourceId();
      if (currentDsId) {
        updateAllNotes(currentDsId, [...notes, serverNote]);
      }
      
    } catch (error) {
      setLocalNotes((prev) => prev.filter((note) => note._id !== tempId));
    }
  };
  

  // Lock body scroll while editing a title
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    if (editingTitleNoteId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = prevOverflow || '';
    }
    return () => {
      document.body.style.overflow = prevOverflow || '';
    };
  }, [editingTitleNoteId]);

  // Handle contentEditable focus and initial content setting
  useEffect(() => {
    if (editingTitleNoteId && contentEditableRef.current) {
      const el = contentEditableRef.current;
      el.focus();
      // Only set initial content, don't update while typing
      if (el.textContent !== editingTitleValue) {
        el.textContent = editingTitleValue;
      }
    }
  }, [editingTitleNoteId]); // Remove editingTitleValue from dependencies

  // Update note title locally (for real-time sidebar updates)
  const updateNoteTitleLocally = (noteId: string, newTitle: string) => {
    const updatedNote = { ...notes.find((n) => n._id === noteId) || selectedTask, title: newTitle } as Note;
    
    setLocalNotes((prev) => 
      prev.map((note) => (note._id === noteId ? updatedNote : note))
    );

    // Update sidebar if this note is open
    if (selectedTask?._id === noteId) {
      setSelectedTask(updatedNote);
    }

    // Update context immediately for real-time sync
    const dataSourceId = getCurrentDataSourceId();
    if (dataSourceId && updatedNote._id) {
      updateNote(dataSourceId, noteId, updatedNote);
    }
  };

  useEffect(() => {
    setLocalNotes(notes);
  }, [board, notes]);

  // Update dropdown position on scroll and prevent body scroll
  useEffect(() => {
    if (!propertyHeaderDropdown) return;

    const updatePosition = () => {
      const rect = propertyHeaderDropdown.anchorElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 300; // Approximate dropdown height
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If not enough space below but enough space above, position above
      const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
      
      setDropdownPosition({
        top: shouldPositionAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.left,
      });
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const dropdown = document.querySelector('[data-dropdown="property-header"]');
      
      // Close if clicking outside the dropdown and not on the anchor element
      if (dropdown && !dropdown.contains(target) && !propertyHeaderDropdown.anchorElement.contains(target)) {
        setPropertyHeaderDropdown(null);
        setDropdownPosition(null);
      }
    };

    // Set initial position
    updatePosition();

    // Prevent body scroll when dropdown is open
    document.body.style.overflow = 'hidden';

    // Add event listeners
    const scrollContainer = document.querySelector('.overflow-x-auto.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updatePosition);
    }
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      // Restore body scroll
      document.body.style.overflow = 'unset';
      
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updatePosition);
      }
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [propertyHeaderDropdown]);

  const { handleCardClick, handleCloseSidebar } = useBoardFunctions({
    board,
    setSelectedTask,
    setRightSidebarContent,
    setIsClosing,
    previousCardIdRef,
  });

  const handleEditCard = async (noteId: string, newTitle: string) => {
    setLocalNotes((prev) => prev.map((note) => (note._id === noteId ? { ...note, title: newTitle } : note)));

    try {
      await UpdateNote(noteId, newTitle, null, "");
      const noteToUpdate = notes.find((note) => note._id === noteId);

      if (noteToUpdate) {
        const updatedNote = { ...noteToUpdate, title: newTitle };
        const dataSourceId = getCurrentDataSourceId();
        if (dataSourceId) {
          updateNote(dataSourceId, noteId, updatedNote);
        }
      }
    } catch (err) {
      console.error("Failed to update task:", err);
      setLocalNotes(notes);
    }
  };

  const persistNoteTitleChangeHandler = async (noteId: string, newTitle: string) => {
    await handleEditCard(noteId, newTitle);
  };


  // Apply filters to notes
  const filteredNotes = useMemo(() => {

    let result = localNotes;

    // Apply search query first
    const query = searchQuery[board._id] || "";
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      result = result.filter((note) => {
        const titleMatch = note.title.toLowerCase().includes(searchLower);
        
        return titleMatch;
      });
    }

    // Get current view to access settings for advanced filters
    const currentViewData = currentView[board._id];
    const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
    let view;
    if (currentViewData?.id) {
      const currentViewId = typeof currentViewData.id === "string" ? currentViewData.id : String(currentViewData.id);
      view = latestBoard.viewsType?.find((v) => {
        const viewId = typeof v.id === "string" ? v.id : String(v.id);
        return viewId === currentViewId;
      });
    } else if (currentViewData?.type) {
      view = latestBoard.viewsType?.find((v) => v.viewType === currentViewData.type);
    }

    // Check for advanced filters - apply them first if they exist (separate from regular filters)
    const advancedFilters = getAdvancedFilters(board._id);
    if (advancedFilters.length > 0) {
      // Apply advanced filters using the utility function, then continue with normal filters
      result = applyAdvancedFilters(
        result,
        advancedFilters,
        boardProperties,
        getNotesByDataSourceId,
        getDataSource
      );
    }

    // Apply property filters for this specific board (using viewTypeId) - regular filters
    const boardFilters = getFilters(board._id);
    if (!boardFilters || Object.keys(boardFilters).length === 0) {
      return result;
    }

    return result.filter((note) => {
      const noteProps = note.databaseProperties || {};
      console.log("Checking note:", note.title, "with props:", noteProps);
      
      return Object.entries(boardFilters).every(([propId, filterValues]) => {
        const propSchema = boardProperties?.[propId];
        
        // Handle rollup properties
        if (propSchema?.type === "rollup") {
          const rollupResult = computeRollupData(
            note,
            propSchema,
            boardProperties,
            getNotesByDataSourceId,
            getDataSource,
          );
          
          const rollupValue = getRollupComparableValue(rollupResult);
          
          if (rollupValue === null) {
            return false; // Exclude notes with invalid rollup
          }
          
          const filterArray = Array.isArray(filterValues)
            ? filterValues
            : [filterValues];
          
          // Convert rollup value to string for comparison
          const rollupValueStr = String(rollupValue);
          return filterArray.some(filterVal => {
            const filterStr = String(filterVal);
            // For count/percent, allow numeric comparison
            if (typeof rollupValue === "number" && !isNaN(Number(filterStr))) {
              return rollupValue === Number(filterStr);
            }
            // For text values, check if filter matches
            return rollupValueStr.toLowerCase().includes(filterStr.toLowerCase()) ||
                   filterStr.toLowerCase().includes(rollupValueStr.toLowerCase());
          });
        }
        
        const noteValue = noteProps[propId];

        if (!filterValues || (Array.isArray(filterValues) && filterValues.length === 0)) {
          return true;
        }

        if (noteValue === undefined || noteValue === null || noteValue === "") {
          return false;
        }

        const filterArray = Array.isArray(filterValues)
          ? filterValues
          : [filterValues];

        // Case 1: multi-select, person, or relation properties (noteValue is array or single value)
        const relationLimit = propSchema?.relationLimit || "multiple";
        
        if (propSchema?.type === "relation") {
          const linkedDatabaseId = propSchema?.linkedDatabaseId;

          const noteIdToTitleMap = new Map<string, string>();
          if (linkedDatabaseId) {
            const relatedNotes = getNotesByDataSourceId(linkedDatabaseId);
            relatedNotes.forEach((note: any) => {
              noteIdToTitleMap.set(String(note._id), note.title || "");
            });
          }

          const noteIds = getRelationIdsFromValue(noteValue, relationLimit);
          return noteIds.some((noteId) => {
            const noteTitle = noteIdToTitleMap.get(noteId) || "";
            return filterArray.includes(noteTitle);
          });
        } else if (Array.isArray(noteValue)) {
          // For other array types (person, etc.)
          const hasMatch = noteValue.some((val) => {
            // Handle person properties (objects with userId)
            if (typeof val === "object" && val.userId) {
              return filterArray.includes(val.userName);
            }
            // Handle string values
            return filterArray.includes(val);
          });
          return hasMatch;
        }

        // Case 2: single value properties (string, number, status, etc.)
        const hasMatch = filterArray.includes(noteValue);
        return hasMatch;
      });
    });
  }, [localNotes, getFilters, board._id, searchQuery[board._id], boardProperties, getNotesByDataSourceId, getDataSource, currentView, contextBoards]);

  // Apply sorting to notes - using the same utility as BoardView
  const sortedNotes = useMemo(() => {
    const boardSorts = getSortBy(board._id);
    if (!boardSorts || boardSorts.length === 0) {
      return filteredNotes;
    }

    return applySorting(filteredNotes, boardSorts, boardProperties, {
      getNotesByDataSourceId,
      getDataSource,
    });
  }, [filteredNotes, getSortBy, board._id, boardProperties, getNotesByDataSourceId, getDataSource]);

  // Group notes if groupBy is set - same logic as BoardView
  const groupedNotes = useMemo(() => {
    const groupByPropertyId = getGroupBy(board._id);
    if (!groupByPropertyId) {
      return { ungrouped: sortedNotes };
    }

    const groups: Record<string, Note[]> = {};
    const property = boardProperties?.[groupByPropertyId];
    if (!property) return { ungrouped: sortedNotes };

    sortedNotes.forEach((note) => {
      let groupValue = note.databaseProperties?.[groupByPropertyId];
      
      // Handle person type grouping (array of objects)
      if (property?.type === "person" && Array.isArray(groupValue)) {
        if (groupValue.length === 0) {
          groupValue = "Unassigned";
        } else {
          // Use the first person's name for grouping
          const firstPerson = groupValue[0];
          groupValue = firstPerson.userName || firstPerson.userEmail || "Unnamed User";
        }
      }
      // Handle relation type grouping (value is now only noteId: string or string[])
      if (property?.type === "relation") {
        const relationLimit = property.relationLimit || "multiple";
        const linkedDatabaseId = property.linkedDatabaseId;
        const relationIds = getRelationIdsFromValue(groupValue, relationLimit);
        if (relationIds.length === 0) {
          groupValue = "No relations";
        } else {
            groupValue = getRelationNoteTitle(relationIds[0]!, linkedDatabaseId || "", "Untitled");
        }
      }
      
      const groupKey = groupValue ? String(groupValue) : "No " + (property?.name || "Group");
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      // TypeScript assertion - we just initialized it above
      const group = groups[groupKey];
      if (group) {
        group.push(note);
      }
    });

    return groups;
  }, [sortedNotes, getGroupBy, board._id, boardProperties, getRelationNoteTitle]);

  // Define property columns based on board properties and property order
  const propertyColumns: PropertyColumn[] = useMemo(() => {
    const columns: PropertyColumn[] = [];

    // Get the property order for this board (including title)
    const currentPropertyOrder = (propertyOrder[board._id]?.length ?? 0) > 0 
      ? propertyOrder[board._id] 
      : ["title", ...Object.keys(boardProperties || {})];

    // Get visible property IDs from settings (propertyVisibility)
    const visiblePropertyIds = getPropertyVisibility(board._id) || [];  
    const shouldShowAllProperties = visiblePropertyIds.length === 0;

    // Add properties in the specified order
    for (const propertyId of currentPropertyOrder || []) {
      if (propertyId === "title") {
        // Add title column (always visible)
        columns.push({
          id: "title",
          name: "Title",
          type: "text",
          width: 200,
          icon: <Type className="w-4 h-4" />,
        });
        continue;
      }

      // Add other properties
      const property = boardProperties?.[propertyId];
      if (!property) continue;

      // Show property based on propertyVisibility settings
      // Otherwise, only show if propertyId is in visiblePropertyIds
      if (shouldShowAllProperties) {
        // When showing all, exclude default properties
        // if (property.default) {
        //   continue;
        // }
      } else {
        // When visibility array has values, only show properties in that array
        if (!visiblePropertyIds.includes(propertyId)) {
          continue;
        }
      }

      let icon: React.ReactNode;
      let width: number;

      switch (property.type) {
        case "text": {
          icon = <Type className="w-4 h-4" />;
          width = 200;
          break;
        }
        case "status": {
          icon = <Tag className="w-4 h-4" />;
          width = 120;
          break;
        }
        case "person": {
          icon = <User className="w-4 h-4" />;
          width = 140;
          break;
        }
        case "date": {
          icon = <Calendar className="w-4 h-4" />;
          width = 120;
          break;
        }
        case "priority": {
          icon = <Star className="w-4 h-4" />;
          width = 100;
          break;
        }
        case "checkbox": {
          icon = <CheckSquare className="w-4 h-4" />;
          width = 100;
          break;
        }
        case "formula": {
          icon = <Calculator className="w-4 h-4" />;
          width = 200;
          break;
        }
        case "select": {
          icon = <Tag className="w-4 h-4" />;
          width = 100;
          break;
        }
        case "multi_select": {
          icon = <ListChecks className="w-4 h-4" />;
          width = 100;
          break;
        }
        case "email": {
          icon = <Mail className="w-4 h-4" />;
          width = 220;
          break;
        }
        case "url": {
          icon = <Link className="w-4 h-4" />;
          width = 240;
          break;
        }
        case "phone": {
          icon = <Phone className="w-4 h-4" />;
          width = 180;
          break;
        }
        case "rollup": {
          icon = <Calculator className="w-4 h-4" />;
          width = 150;
          break;
        }
        case "relation": {
          icon = <FileText className="w-4 h-4" />;
          width = 150;
          break;
        }
        case "github_pr": {
          icon = <GitPullRequest className="w-4 h-4" />;
          width = 220;
          break;
        }
        case "file": {
          icon = <Paperclip className="w-4 h-4" />;
          width = 200;
          break;
        }
        default: {
          icon = <Type className="w-4 h-4" />;
          width = 150;
        }
      }

      columns.push({
        id: propertyId,
        name: property.name,
        type: property.type,
        width,
        icon,
      });
    }

    // Ensure we always have at least the title column
    if (columns.length === 0) {
      columns.push({
        id: "title",
        name: "Title",
        type: "text",
        width: 200,
        icon: <Type className="w-4 h-4" />,
      });
    }

    return columns;
  }, [boardProperties, propertyOrder, board._id, getPropertyVisibility]);

  const totalColumnsWidth = useMemo(() => {
    return propertyColumns.reduce((sum, col) => sum + (columnWidths[col.id] ?? col.width), 0);
  }, [propertyColumns, columnWidths]);

  // Initialize column widths when property columns change (without clobbering user changes)
  useEffect(() => {
    setColumnWidths((prev) => {
      const next = { ...prev };
      for (const col of propertyColumns) {
        if (next[col.id] == null) {
          next[col.id] = col.width;
        }
      }
      return next;
    });
  }, [propertyColumns]);

  const handleAddNewRow = async () => {
    if (!newRowTitle.trim()) return;

    const title = newRowTitle.trim();
    const tempId = `temp-${Date.now()}`;

    // Create optimistic note
    const optimisticNote: Note = {
      _id: tempId,
      title,
      content: "",
      description: "",
      noteType: "Viewdatabase_Note",
      databaseProperties: {},
      contentPath: "",
      commitSha: "",
      comments: [],
    };

    // Add optimistic note locally
    setLocalNotes((prev) => [...prev, optimisticNote]);
    setNewRowTitle("");
    setShowAddRow(false);

    try {
      // Get dataSourceId from context (already tracked and synced)
      const dsId = currentDataSource[board._id];
      const dataSourceId: string | undefined = (dsId ? String(dsId) : board._id) as string | undefined;

      const { page: newPage } = await addRootPage(
        title,
        null, // parentId
        false, // isRestrictedPage
        null, // icon
        false, // isPublicNote
        dataSourceId, // dataSourceId instead of board._id
        {}, // databaseProperties (empty for new row)
      );

      // Replace optimistic note with real note
      const serverNote: Note = {
        _id: newPage.id,
        title: newPage.title,
        content: newPage.content,
        description: newPage.description || "",
        noteType: newPage.noteType || "Viewdatabase_Note",
        databaseProperties: newPage.databaseProperties || {},
        contentPath: newPage.contentPath || "",
        commitSha: newPage.commitSha || "",
        comments: newPage.comments || [],
      };

      // Update local notes
      setLocalNotes((prev) => prev.map((note) => (note._id === tempId ? serverNote : note)));

      // Update board context
      const currentDsId = getCurrentDataSourceId();
      if (currentDsId) {
        updateAllNotes(currentDsId, [...notes, serverNote]);
      }

      console.log("Created new task:", serverNote);
    } catch (error) {
      console.error("Failed to create new task:", error);
      // Remove optimistic note on error
      setLocalNotes((prev) => prev.filter((note) => note._id !== tempId));
    }
  };

  // Wrapper to select all based on current grouping using hook's handler
  const handleSelectAllWrapper = () => {
    const allNotes = Object.values(groupedNotes).flat();
    handleSelectAll(allNotes as Note[]);
  };

  // Cell editing handlers
  const handleCellClick = (e: React.MouseEvent, note: Note, property: PropertyColumn) => {
    e.stopPropagation();
    
    // Only open editor for editable properties
    if (!canEditProperty(property.type)) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setEditingCell({
      noteId: note._id,
      propertyId: property.id,
      position: {
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  const handleOpenGroupEditor = (propertyId: string, anchorEl: HTMLElement) => {
    openGroupEditor(propertyId, anchorEl, (cell) => setEditingCell(cell));
  };

  const handleCellUpdate = async (noteId: string, propertyId: string, value: any) => {
    // If in group mode, apply to all selected rows
    if (groupEditingPropertyId && propertyId === groupEditingPropertyId) {
      await applyGroupUpdate(propertyId, value);
      return;
    }
    const note = localNotes.find(n => n._id === noteId);
    if (!note) return;

    // Get dataSourceId from current view ID (not type)
    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      toast.error("Data source not found for current view!");
      return;
    }

    // Store previous state for rollback
    const previousNote = note;

    // Optimistic update - update local state immediately
    const updatedNote = {
      ...note,
      databaseProperties: {
        ...note.databaseProperties,
        [propertyId]: value,
      },
    };

    // Update local state immediately for better UX
    setLocalNotes(prev => prev.map(n => n._id === noteId ? updatedNote : n));
    
    // Update note in context
    updateNote(dataSourceId, noteId, updatedNote);

    // Use the same API logic as the hook
    try {
      console.log("Updating property value:", { propertyId, value, dataSourceId, noteId });
      const res = await postWithAuth(`/api/database/updatePropertyValue`, {
        dataSourceId: dataSourceId,
        viewId: board._id, // Optional for audit
        pageId: noteId,
        propertyId: propertyId,
        value,
      });

      const propertyType = board?.properties[propertyId]?.type || "";
      // if (propertyType === "person") {
      //   console.log("propertyType is person", propertyType);
      //   const assignedUsers = value;
      //   const assignedUsersEmail = assignedUsers.map((user: any) => user.userEmail);
      // }

      if (!res.success) {
        toast.error("Failed to change property value!");
        // Rollback on error
        setLocalNotes(prev => prev.map(n => n._id === noteId ? previousNote : n));
        updateNote(dataSourceId, noteId, previousNote);
        return;
      }

      console.log("Property update response:", res);
      
      // Update with server response to ensure consistency
      const serverUpdatedNote: Note = {
        ...note,
        title: res.page.title,
        databaseProperties: {
          ...note.databaseProperties,
          ...res.page.databaseProperties,
        },
      };

      // Update local state with server response
      setLocalNotes(prev => prev.map(n => n._id === noteId ? serverUpdatedNote : n));
      // Reuse existing dataSourceId from above
      if (dataSourceId) {
        updateNote(dataSourceId, noteId, serverUpdatedNote);
      }

    } catch (err) {
      toast.error("Could not update property value!");
      console.error("Failed to update property value:", err);
      // Rollback on error
      setLocalNotes(prev => prev.map(n => n._id === noteId ? previousNote : n));
      updateNote(dataSourceId, noteId, previousNote);
    }
  };

  const handleCloseEditor = () => {
    setEditingCell(null);
    clearGroupEditing();
  };

  // Property header dropdown handlers
  const handlePropertyHeaderClick = (e: React.MouseEvent, property: PropertyColumn) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 300; // Approximate dropdown height
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // If not enough space below but enough space above, position above
    const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
    
    setPropertyHeaderDropdown({
      propertyId: property.id,
      anchorElement: target,
    });
    setDropdownPosition({
      top: shouldPositionAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: rect.left,
    });
  };

  // Helper to get current viewTypeId
  const getCurrentViewTypeId = (): string | null => {
    const currentViewData = currentView[board._id];
    const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
    
    let view;
    if (currentViewData?.id) {
      view = latestBoard.viewsType?.find((v) => v.id === currentViewData.id);
    } else if (currentViewData?.type) {
      view = latestBoard.viewsType?.find((v) => v.viewType === currentViewData.type);
    }
    
    return view?.id ? (typeof view.id === "string" ? view.id : String(view.id)) : null;
  };

  // Create handlers from the handlers file - updated to use viewTypeId
  const currentViewTypeId = getCurrentViewTypeId();
  const handlers = createHandlers({
    boardProperties,
    board,
    setGroupBy: async (viewTypeId: string, propertyId: string | undefined) => {
      // Update context immediately
      setGroupBy(viewTypeId, propertyId);
      
      // Also update API
      try {
        const { updateGroupByPropertyId } = await import("@/services-frontend/boardServices/databaseSettingsService");
        const res = await updateGroupByPropertyId(viewTypeId, propertyId);
        
        // Update board's viewType settings in context
        if (res.viewType) {
          const updatedViewsType = board.viewsType.map((v) =>
            v.id === viewTypeId ? { ...v, settings: res.viewType?.settings } : v
          );
          updateBoard(board._id, { ...board, viewsType: updatedViewsType });
        }
      } catch (err) {
        console.error("Failed to update group by:", err);
        // Error toast is already shown in the service
      }
    },
    setBoardSortBy: async (viewTypeId: string, sorts: Array<{ propertyId: string; direction: 'ascending' | 'descending' }>) => {
      // Update context immediately
      setBoardSortBy(viewTypeId, sorts);
      
      // Also update API
      try {
        const { updateSorts } = await import("@/services-frontend/boardServices/databaseSettingsService");
        const res = await updateSorts(viewTypeId, sorts);
        
        // Update board's viewType settings in context
        if (res.viewType) {
          const updatedViewsType = board.viewsType.map((v) =>
            v.id === viewTypeId ? { ...v, settings: res.viewType?.settings } : v
          );
          updateBoard(board._id, { ...board, viewsType: updatedViewsType });
        }
      } catch (err) {
        console.error("Failed to update sorts:", err);
        // Error toast is already shown in the service
      }
    },
    setEditingPropertyId,
    setShowPropertyDialog,
    updateBoard,
    setPropertyOrder,
    groupBy: currentViewTypeId ? { [currentViewTypeId]: getGroupBy(board._id) } : {},
    sortBy: currentViewTypeId ? { [currentViewTypeId]: getSortBy(board._id) } : {},
    propertyOrder,
  });

  const {
    handlePropertySort,
    handlePropertyFilter,
    handlePropertyGroup,
    handlePropertyHide,
    handlePropertyEdit,
    handlePropertyWrapInView,
    handlePropertyDisplayAs,
    handlePropertyInsertLeft,
    handlePropertyInsertRight,
    handleRemoveSortFromProperty,
  } = handlers;

  // Filter modal handlers
  const handleApplyFilters = async (newFilters: Record<string, string[]>) => {
    const viewTypeId = getCurrentViewTypeId();
    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }
    
    // Store previous state for rollback
    const previousFilters = getFilters(board._id);
    const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
    const previousBoard = latestBoard;
    
    // Optimistic update: update context first
    setBoardFilters(viewTypeId, newFilters);
    const optimisticViewsType = latestBoard.viewsType.map((v) => {
      const vId = typeof v.id === "string" ? v.id : String(v.id);
      if (vId === viewTypeId) {
        return {
          ...v,
          settings: {
            ...v.settings,
            filters: Object.entries(newFilters).map(([propertyId, values]) => ({
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
      // Import service
      const { updateFilters } = await import("@/services-frontend/boardServices/databaseSettingsService");
      
      // Update API
      const res = await updateFilters(viewTypeId, newFilters);
      
      // Update board's viewType settings in context with server response
      if (res.viewType) {
        const updatedViewsType = latestBoard.viewsType.map((v) => {
          const vId = typeof v.id === "string" ? v.id : String(v.id);
          return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
        });
        updateBoard(board._id, { ...latestBoard, viewsType: updatedViewsType });
      }
      
      toast.success("Filters updated successfully");
    } catch (err) {
      console.error("Failed to update filters:", err);
      // Rollback on error
      setBoardFilters(viewTypeId, previousFilters);
      updateBoard(board._id, previousBoard);
      // Error toast is already shown in the service
    }
    
    setPropertyHeaderDropdown(null);
    setDropdownPosition(null);
  };

  // Helper to insert newly created property id into order relative to a target
  const insertPropertyIntoOrder = (newPropertyId: string) => {
    if (!insertionTarget) return;
    // Prefer what is actually rendered to avoid losing columns
    const renderedOrder = [
      "title",
      ...propertyColumns.filter((c) => c.id !== "title").map((c) => c.id),
    ];
    const existingOrder = propertyOrder[board._id];
    const baseOrder = (existingOrder && existingOrder.length > 0)
      ? existingOrder
      : renderedOrder;
    // Remove if already present to avoid duplicates
    const filtered = baseOrder.filter((id) => id !== newPropertyId);
    const targetIndex = filtered.findIndex((id) => id === insertionTarget.targetPropertyId);
    if (targetIndex === -1) {
      // Fallback: append after title
      const titleIndex = filtered.indexOf("title");
      const insertIndex = titleIndex >= 0 ? titleIndex + 1 : 0;
      filtered.splice(insertIndex, 0, newPropertyId);
    } else {
      const insertIndex = insertionTarget.side === 'left' ? targetIndex : targetIndex + 1;
      filtered.splice(insertIndex, 0, newPropertyId);
    }
    setPropertyOrder(board._id, filtered);
    setInsertionTarget(null);
  };

  // Deselect all when clicking outside table/editor/toolbar
  useEffect(() => {
    // Deselect all when clicking outside table/editor/toolbar
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedNotes.size === 0) return;
      const target = event.target as HTMLElement;
      const withinTable = !!target.closest('.overflow-x-auto.overflow-y-auto');
      const withinEditor = !!target.closest('[data-cell-editor]');
      const withinToolbar = !!target.closest('[data-group-toolbar]');
      if (!withinTable && !withinEditor && !withinToolbar) {
        setSelectedNotes(new Set());
        clearGroupEditing();
        setEditingCell(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedNotes]);

  // Keep AddPropertyDialog positioned next to its anchor while scrolling/resizing
  useEffect(() => {
    if (!showPropertyDialog) return;
    const anchor: HTMLElement | null = insertionTarget?.anchorElement || addPropertyBtnRef.current;
    if (!anchor) return;

    const updateDialogPosition = () => {
      const rect = anchor.getBoundingClientRect();
      setPropertyDialogPosition({ top: rect.bottom + 4, left: rect.left });
    };

    updateDialogPosition();
    const scrollContainer = document.querySelector('.overflow-x-auto.overflow-y-auto');
    const events = ['scroll', 'resize'] as const;
    events.forEach((evt) => window.addEventListener(evt, updateDialogPosition));
    if (scrollContainer) scrollContainer.addEventListener('scroll', updateDialogPosition);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt as any, updateDialogPosition));
      if (scrollContainer) scrollContainer.removeEventListener('scroll', updateDialogPosition);
    };
  }, [showPropertyDialog, insertionTarget]);

  // Column drag and drop handlers
  const handleColumnDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = "move";

    // Create a custom drag image that matches Books by Betaque 's style
    const dragElement = e.currentTarget as HTMLElement;
    const rect = dragElement.getBoundingClientRect();

    // Create a canvas element for the drag image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = rect.width;
    canvas.height = rect.height;

    if (ctx) {
      // Draw a semi-transparent version of the column with Books by Betaque -like styling
      ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle border
      ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

      // Draw column name with proper styling
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(propertyColumns[index]?.name || "", 8, 22);
    }

    e.dataTransfer.setDragImage(canvas, rect.width / 2, rect.height / 2);
  };

  const handleColumnDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumnIndex(index);
  };

  const handleColumnDragLeave = () => {
    setDragOverColumnIndex(null);
  };

  const handleColumnDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedColumnIndex === null || draggedColumnIndex === dropIndex) {
      setDraggedColumnIndex(null);
      setDragOverColumnIndex(null);
      return;
    }

    // Get current property order (including title column)
    const currentOrder = propertyOrder[board._id] || ["title", ...Object.keys(boardProperties || {})];

    // Create new order by moving the dragged item
    const newOrder = [...currentOrder];
    const [movedItem] = newOrder.splice(draggedColumnIndex, 1);
    if (movedItem) {
      newOrder.splice(dropIndex, 0, movedItem);
    }

    // Update the property order
    setPropertyOrder(board._id, newOrder);

    setDraggedColumnIndex(null);
    setDragOverColumnIndex(null);
  };

  // Row drag and drop handlers
  const handleRowDragStart = useCallback((e: React.DragEvent, noteId: string) => {
    e.stopPropagation();
    setDraggedNoteId(noteId);
    e.dataTransfer.effectAllowed = "move";
    
    // Set opacity for dragged element
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleRowDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedNoteId(null);
    setDragOverNoteId(null);
    setDragPosition(null);
    
    // Restore opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }, []);

  const handleRowDragOver = useCallback((e: React.DragEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedNoteId || draggedNoteId === noteId) return;
    
    const bounds = e.currentTarget.getBoundingClientRect();
    const offset = e.clientY - bounds.top;
    const position = offset < bounds.height / 2 ? "above" : "below";
    
    setDragOverNoteId(noteId);
    setDragPosition(position);
  }, [draggedNoteId]);

  const handleRowDragLeave = useCallback(() => {
    // Only clear if leaving the drop zone entirely
    setDragOverNoteId(null);
    setDragPosition(null);
  }, []);

  const handleRowDrop = useCallback(async (e: React.DragEvent, dropTargetNoteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedNoteId || draggedNoteId === dropTargetNoteId) return;
    
    const draggedNote = filteredNotes.find(n => n._id === draggedNoteId);
    const targetNote = filteredNotes.find(n => n._id === dropTargetNoteId);
    
    if (!draggedNote || !targetNote) return;
    
    const draggedIndex = filteredNotes.findIndex(n => n._id === draggedNoteId);
    const targetIndex = filteredNotes.findIndex(n => n._id === dropTargetNoteId);
    
    // Reorder notes optimistically
    const newNotes = [...filteredNotes];
    const [moved] = newNotes.splice(draggedIndex, 1);
    
    if (!moved) return;
    
    const insertIndex = dragPosition === "above" ? targetIndex : targetIndex + 1;
    const adjustedIndex = draggedIndex < insertIndex ? insertIndex - 1 : insertIndex;
    
    newNotes.splice(adjustedIndex, 0, moved);
    
    // Update local state immediately
    setLocalNotes(newNotes);
    
    // Save new order to backend
    try {
      const sortProps = getSortBy(board._id);
      if (sortProps && Array.isArray(sortProps) && sortProps.length > 0) {
        // If there's a sort property, we need to update the values for all affected notes
        // For now, we'll just log the new order
        console.log("Reordered notes in list view:", newNotes.map(n => ({ id: n._id, title: n.title })));
      }
    } catch (error) {
      console.error("Failed to save note order:", error);
      // Rollback on error
      setLocalNotes(filteredNotes);
    }
    
    setDraggedNoteId(null);
    setDragOverNoteId(null);
    setDragPosition(null);
  }, [draggedNoteId, dragPosition, filteredNotes, board._id, getSortBy]);
  
  // Helper function to get color styles for an option 
  const getOptionColorStyles = (
    propSchema: { options?: { name: string; color?: string }[] },
    optionValue: string,
  ): { bg: string; text: string; dot: string } => {
    let color = "default";
    if (propSchema.options && typeof optionValue === "string") {
      const option = propSchema.options.find((opt) => opt.name === optionValue);
      if (option?.color) {
        color = option.color;
      }
    }
    return getColorStyles(color);
  };

  const renderPropertyValue = (note: Note, property: PropertyColumn) => {
    // Handle title column specially
    if (property.id === "title") {
      const isEditingTitle = editingTitleNoteId === note._id;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', position: 'relative' }}>
          <div style={{ flexGrow: 1, minWidth: 0, overflow: isEditingTitle ? 'visible' : 'hidden', position: 'relative' }}>
            {isEditingTitle ? (
              // Edit mode - inline contentEditable div (like board view)
              <div
                data-property-id="title"
                contentEditable
                suppressContentEditableWarning={true}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                }}
                onInput={(e) => {
                  const newValue = e.currentTarget.textContent || "";
                  setEditingTitleValue(newValue);
                  updateNoteTitleLocally(note._id, newValue);
                }}
                onBlur={(e) => {
                  const newValue = e.currentTarget.textContent?.trim() || "";
                  setEditingTitleNoteId(null);
                  const valueToSave = newValue || note.title;
                  handleEditCard(note._id, valueToSave);
                  if (!newValue) {
                    setEditingTitleValue(note.title);
                    updateNoteTitleLocally(note._id, note.title);
                  }
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const newValue = (e.currentTarget as HTMLDivElement).textContent?.trim() || "";
                    setEditingTitleNoteId(null);
                    const valueToSave = newValue || note.title;
                    handleEditCard(note._id, valueToSave);
                    if (!newValue) {
                      setEditingTitleValue(note.title);
                      updateNoteTitleLocally(note._id, note.title);
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setEditingTitleNoteId(null);
                    setEditingTitleValue(note.title);
                    updateNoteTitleLocally(note._id, note.title);
                  }
                  // Allow all other keys (including space) to work normally
                }}
                className="text-sm font-medium break-words outline-none rounded px-1 focus-visible:ring-2 dark:ring-gray-700 py-1 ring-blue-500 whitespace-pre-wrap"
                style={{ 
                  minHeight: "1.25rem", 
                  maxWidth: "100%", 
                  maxHeight: "200px", 
                  overflow: "auto",
                  width: "100%",
                  display: "block"
                }}
                ref={contentEditableRef}
              />
            ) : (
              // Display mode - one-line clipped text
              <span
                data-property-id="title"
                onClick={(e) => {
                  e.stopPropagation();
                  if (titleClickTimerRef.current) {
                    window.clearTimeout(titleClickTimerRef.current);
                  }
                  titleClickTimerRef.current = window.setTimeout(() => {
                    handleCardClick(note);
                  }, 200);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (titleClickTimerRef.current) {
                    window.clearTimeout(titleClickTimerRef.current);
                  }
                  setEditingTitleNoteId(note._id);
                  setEditingTitleValue(note.title);
                }}
                style={{
                  display: 'block',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  whiteSpace: 'nowrap',
                  wordBreak: 'normal',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 500,
                }}
              >
                {note.title}
              </span>
            )}
          </div>
          {/* Open button - visible on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick(note);
            }}
            className="open-sidebar-btn opacity-0 transition-opacity flex items-center justify-center flex-shrink-0"
            aria-label={`Open ${note.title}`}
            title="Open in sidebar"
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '3px',
              color: 'rgba(55, 53, 47, 0.65)',
              transition: 'background 20ms ease-in 0s',
            }}
          > 
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    const value = note.databaseProperties?.[property.id];
    // Get property schema from boardProperties - this already has the options with colors!
    const propSchema = boardProperties?.[property.id];

    // Skip empty value check for rollup and formula properties (they compute their own values)
    if (property.type !== "rollup" && property.type !== "formula" && !value && value !== false) {
      return <span style={{ color: 'var(--c-texTer, #9b9a97)' }}></span>;
    }

    switch (property.type) {
      case "status": {
        const statusValue = String(value || "");
        const fallbackColor = { bg: 'rgba(206,205,202,0.5)', text: 'rgb(55,53,47)', dot: 'rgb(155,154,151)' };
        
        // propSchema already has the options with colors from boardProperties
        const colorStyles = getOptionColorStyles(propSchema || {}, statusValue) ?? fallbackColor;

        return (
          <div className="flex flex-nowrap gap-x-2 gap-y-[6px] max-w-fit">
            <div className="flex text-sm items-center shirink-0 min-w-0 max-w-full h-[20px] m-0 rounded-[10px] px-[7px] pr-[9px] whitespace-nowrap overflow-hidden text-ellipsis" 
              style={{ 
                color: colorStyles.text, 
                background: colorStyles.bg, 
              }}>
              <div className="inline-flex items-center h-[20px] leading-[20px] whitespace-nowrap overflow-hidden text-ellipsis">
                <div className="flex items-center">
                  <div className="inline-flex shrink-0 rounded-full h-[8px] w-[8px] mr-[5px]" 
                  style={{ 
                    backgroundColor: colorStyles.dot, 
                  }}></div>
                </div>
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                  {statusValue || ""}
                </span>
              </div>
            </div>
          </div>
        );
      }

      case "checkbox": {
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={() => {
                // Handle checkbox update
                const dataSourceId = getCurrentDataSourceId();
                if (dataSourceId) {
                  updateNote(dataSourceId, note._id, {
                    ...note,
                    databaseProperties: {
                      ...note.databaseProperties,
                      [property.id]: !value,
                    },
                  });
                }
              }}
              style={{
                border: '1px solid rgb(196, 196, 196)',
                backgroundColor: value ? 'var(--c-bluIcoAccPri)' : 'transparent',
              }}
              className="w-[16px] h-[16px] rounded-[3px] cursor-pointer"
              aria-label={`Toggle ${property.name}`}
            />
          </div>
        );
      }

      case "date": {
        if (!value) {
          return <span style={{ color: 'var(--c-texTer, #9b9a97)' }}></span>;
        }
        
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return <span style={{ color: 'var(--c-texTer, #9b9a97)' }}></span>;
        }
        
        return (
          <div style={{ lineHeight: '1.5', whiteSpace: 'nowrap', wordBreak: 'normal' }}>
            <div style={{ lineHeight: '1.5', whiteSpace: 'nowrap', wordBreak: 'normal', display: 'inline' }}>
              {date.toLocaleDateString()}
            </div>
          </div>
        );
      }

      case "priority": {
        const priorityValue = String(value || "");
        const fallbackColor = { bg: 'rgba(206,205,202,0.5)', text: 'rgb(55,53,47)', dot: 'rgb(155,154,151)' };
        
        // propSchema already has the options with colors from boardProperties
        const priorityColorStyles = getOptionColorStyles(propSchema || {}, priorityValue) ?? fallbackColor;

        return (
          <div  className="w-full flex justify-between items-center">
            <div className="flex flex-nowrap items-center gap-x-2 gap-y-[6px]">
              <div className="flex items-center shrink-0 min-w-0 max-w-full h-[20px] m-0 rounded-[3px] px-[6px] leading-[120%] text-sm whitespace-nowrap overflow-hidden text-ellipsis"
                style={{ 
                  color: priorityColorStyles.text, 
                  background: priorityColorStyles.bg, 
                }}
              >
                <div className="inline-flex items-center h-[20px] leading-[20px] whitespace-nowrap overflow-hidden text-ellipsis">
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {priorityValue}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "select": {
        const selectValue = String(value || "");
        const fallbackColor = { bg: 'rgba(206,205,202,0.5)', text: 'rgb(55,53,47)', dot: 'rgb(155,154,151)' };
        const selectColorStyles = getOptionColorStyles(propSchema || {}, selectValue) ?? fallbackColor;

        return (
          <div className="flex flex-nowrap gap-y-[6px] gap-x-2 max-w-fit">
            <div className="flex items-center shrink-0 min-w-0 max-w-full h-[20px] m-0 rounded-[3px] px-[6px] leading-[120%] text-sm whitespace-nowrap overflow-hidden text-ellipsis" 
              style={{ 
                color: selectColorStyles.text, 
                background: selectColorStyles.bg, 
              }}
            >
              <div className="inline-flex items-center h-[20px] leading-[20px] whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                  {selectValue || ""}
                </span>
              </div>
            </div>
          </div>
        );
      }

      case "multi_select": {
        const multiSelectValues = Array.isArray(value) ? value : (value ? [value] : []);
        if (multiSelectValues.length === 0) {
          return <span className="text-sm text-[color:var(--c-texTer,#9b9a97)]"></span>;
        }
        const fallbackColor = { bg: 'rgba(206,205,202,0.5)', text: 'rgb(55,53,47)', dot: 'rgb(155,154,151)' };

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '100%' }}>
            {multiSelectValues.slice(0, 3).map((item: any, idx: number) => {
              const itemValue = String(item);
              const itemColorStyles = getOptionColorStyles(propSchema || {}, itemValue) ?? fallbackColor;
              return (
                <div
                  key={idx}
                  className="flex items-center shrink-0 min-w-0 max-w-full h-[20px] m-0 rounded-[3px] px-[6px] leading-[120%] text-sm whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{ 
                    color: itemColorStyles.text, 
                    background: itemColorStyles.bg, 
                  }}
                >
                  {itemValue}
                </div>
              );
            })}
            {multiSelectValues.length > 3 && (
              <span className="text-[12px] text-[color:var(--c-texTer,#9b9a97)]" >
                +{multiSelectValues.length - 3}
          </span>
            )}
          </div>
        );
      }
      case "email": {
        const emailValue = String(value || "").trim();
        if (!emailValue) {
          return <span className="text-sm text-[color:var(--c-texTer,#9b9a97)]">—</span>;
        }
        return (
          <a
            href={`mailto:${emailValue}`}
            className="text-sm text-blue-600 dark:text-blue-400 truncate max-w-[220px]"
            title={emailValue}
          >
            {emailValue}
          </a>
        );
      }
      case "url": {
        const rawUrl = String(value || "").trim();
        if (!rawUrl) {
          return <span className="text-sm text-[color:var(--c-texTer,#9b9a97)]">—</span>;
        }
        const sanitizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
        const displayUrl = rawUrl.replace(/^https?:\/\//i, "");
        return (
          <a
            href={sanitizedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 truncate max-w-[260px]"
            title={rawUrl}
          >
            {displayUrl}
          </a>
        );
      }
      case "phone": {
        const phoneValue = String(value || "").trim();
        if (!phoneValue) {
          return <span className="text-sm text-[color:var(--c-texTer,#9b9a97)]">—</span>;
        }
        return (
          <a
            href={`tel:${phoneValue.replace(/\s+/g, "")}`}
            className="text-sm text-blue-600 dark:text-blue-400"
            title={phoneValue}
          >
            {phoneValue}
          </a>
        );
      }
      case "person": {
        const membersArray = Array.isArray(value) ? value : [];
        if (membersArray.length === 0) {
          return <span style={{ fontSize: '14px', color: 'var(--c-texTer, #9b9a97)' }}>—</span>;
        }
        // helper: give a color from a palette based on index
        const colorList = [
          '#ffd966','#b4a7d6','#a2c4c9','#93c47d','#f6b26b',
          '#e06666','#6fa8dc','#8e7cc3','#f9cb9c','#6d9eeb',
        ];
        function getInitial(m: any) {
          if (m.userName && m.userName.length > 0) return m.userName[0].toUpperCase();
          if (m.userEmail && m.userEmail.length > 0) return m.userEmail[0].toUpperCase();
          return '?';
        }
        return (
          <div className="flex items-center gap-[6px] min-w-0">
            {membersArray.slice(0, 2).map((member: any, idx: number) => (
              <div
                key={member.userId || idx}       
                className="flex items-center gap-1 rounded-full px-2 py-0 h-[22px] text-sm font-medium"
                style={{
                  background: 'var(--ca-butHovBac, #f3f2ef)',
                }}
              >
                <div  className="flex items-center justify-center w-4 h-4 rounded-full text-white font-bold mr-1"
                style={{
                  background: colorList[idx % colorList.length],
                  color: '#fff',
                }}>{getInitial(member)}</div>
                <span className="whitespace-nowrap max-w-[80px] overflow-hidden text-ellipsis text-[13px]" style={{ color: "var(--c-texPri)" }}>
                  {member.userName || member.userEmail || ''}
                </span>
              </div>
            ))}
            {membersArray.length > 2 && (
              <span className="text-[12px] font-semibold text-[#9b9a97] bg-[#eee] rounded-[8px] px-[7px] h-[20px] flex items-center" style={{ color: 'var(--c-texTer, #9b9a97)', background: '#eee'}}>
                +{membersArray.length - 2}
              </span>
            )}
          </div>
        );
      }

      case "relation": {
        const relationLimit = propSchema?.relationLimit || "multiple";
        const linkedDatabaseId = propSchema?.linkedDatabaseId;
        const noteIds = getRelationIdsFromValue(value, relationLimit);
        
        if (noteIds.length === 0) {
          return <span style={{ fontSize: '14px', color: 'var(--c-texTer, #9b9a97)' }}>—</span>;
        }
        
        return (
          <div className="flex items-center gap-[6px] min-w-0 flex-wrap">
            {noteIds.slice(0, 2).map((noteId: string, idx: number) => {
              // Get current title from context (updates automatically when note changes)
              const relTitle = getRelationNoteTitle(
                noteId,
                linkedDatabaseId || "",
                "Untitled"
              );
              
              // Get note from context to display icon
              const note = getNotesByDataSourceId(linkedDatabaseId || "").find((n: any) => String(n._id) === noteId);
              const noteIcon = (note as any)?.icon;
              
              return (
                <div
                  key={noteId}
                  className="flex items-center gap-1 rounded px-2 py-0.5 h-[22px] text-sm font-medium"
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: 'rgb(37, 99, 235)',
                  }}
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis text-[13px]">
                    {relTitle}
                  </span>
                </div>
              );
            })}
            {noteIds.length > 2 && (
              <span 
                className="text-[12px] font-semibold rounded-[8px] px-[7px] h-[20px] flex items-center" 
                style={{ 
                  color: 'var(--c-texTer, #9b9a97)', 
                  background: '#eee'
                }}
              >
                +{noteIds.length - 2}
              </span>
            )}
          </div>
        );
      }

      case "github_pr": {
        const pr = normalizeGitHubPrValue(value);
        if (!pr.owner && !pr.repo && !pr.pullNumber && !pr.title) {
          return <span className="text-xs text-[color:var(--c-texTer,#9b9a97)]">Link a PR</span>;
        }
        const statusMeta = getGitHubPrStatusMeta(pr);
        const statusStyles =
          statusMeta.tone === "success"
            ? { background: "rgba(16,185,129,0.2)", color: "rgb(5, 122, 85)" }
            : statusMeta.tone === "muted"
              ? { background: "rgba(156,163,175,0.2)", color: "rgb(75,85,99)" }
              : { background: "rgba(59,130,246,0.15)", color: "rgb(37, 99, 235)" };
        const label =
          pr.title || (pr.number ?? pr.pullNumber ? `#${pr.number ?? pr.pullNumber}` : "Linked PR");

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "240px" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--c-texPri)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                color: "var(--c-texTer)",
              }}
            >
              <span
                style={{
                  padding: "0 8px",
                  borderRadius: "999px",
                  fontWeight: 600,
                  lineHeight: "18px",
                  ...statusStyles,
                }}
              >
                {statusMeta.label}
              </span>
              {pr.owner && pr.repo && (
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "140px",
                  }}
                >
                  {pr.owner}/{pr.repo}
                </span>
              )}
            </div>
          </div>
        );
      }

      case "file": {
        const attachments = Array.isArray(value) ? value : value ? [value] : [];
        if (attachments.length === 0) {
          return <span className="text-xs text-[color:var(--c-texTer,#9b9a97)]">No files</span>;
        }
        return (
          <div className="flex flex-wrap items-center gap-2">
            {attachments.slice(0, 2).map((file: any) => (
              <div key={file.id || file.url} className="flex items-center gap-1">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/20"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="max-w-[120px] truncate">{file.name || "Attachment"}</span>
                </a>
                <button
                  type="button"
                  className="rounded p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    void downloadAttachment(file);
                  }}
                  aria-label="Download attachment"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {attachments.length > 2 && (
              <span className="text-[12px] font-semibold text-[color:var(--c-texTer,#9b9a97)]">
                +{attachments.length - 2}
              </span>
            )}
          </div>
        );
      }

      case "text": {
        return (
          <span style={{ fontSize: '14px', color: 'var(--c-texPri)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '200px' }}>
            {String(value || "")}
          </span>
        );
      }

      case "number": {
        const numValue = typeof value === "number" ? value : Number(value) || 0;
        const showAs = (propSchema as any)?.showAs || "number";
        const progressColor = (propSchema as any)?.progressColor || "blue";
        const progressDivideByRaw = (propSchema as any)?.progressDivideBy;
        const showNumberText = (propSchema as any)?.showNumberText !== false; // default true
        const divideBy = progressDivideByRaw && progressDivideByRaw !== 0 ? progressDivideByRaw : 100;
        const numberNode = showNumberText ? (
          <span style={{ fontSize: '14px', color: 'var(--c-texPri)', fontWeight: 500 }}>
            {String(numValue)}
          </span>
        ) : null;
        
        if (showAs === "bar") {
          // Calculate percentage: (value / divideBy) * 100, capped at 100%
          // Example: value=50, divideBy=100 → (50/100) * 100 = 50%
          // Example: value=100, divideBy=10 → (100/10) * 100 = 1000%, capped at 100%
          const percentage = Math.min(100, Math.max(0, (numValue / divideBy) * 100));
          const colorStyles = getColorStyles(progressColor);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
              {numberNode}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(229, 231, 235, 0.5)',
                    overflow: 'hidden',
                    height: '4px',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${percentage}%`,
                      backgroundColor: colorStyles.dot,
                      transition: 'width 0.5s ease-out',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        }
        
        if (showAs === "ring") {
          // Calculate percentage: (value / divideBy) * 100, capped at 100%
          const percentage = Math.min(100, Math.max(0, (numValue / divideBy) * 100));
          const colorStyles = getColorStyles(progressColor);
          const circumference = 2 * Math.PI * 6; // radius = 6
          const offset = circumference - (percentage / 100) * circumference;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {numberNode}
              <svg viewBox="0 0 14 14" width="20" height="20" style={{ flexShrink: 0 }}>
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  fill="none"
                  strokeWidth="2"
                  style={{ stroke: 'rgba(229, 231, 235, 0.5)' }}
                />
                <g transform="rotate(-90 7 7)">
                  <circle
                    cx="7"
                    cy="7"
                    r="6"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                      stroke: colorStyles.dot,
                      transition: 'stroke-dashoffset 0.5s ease-out',
                    }}
                  />
                </g>
              </svg>
            </div>
          );
        }
        
        // Default: show as number
        return (
          <span style={{ fontSize: '14px', color: 'var(--c-texPri)' }}>
            {String(numValue)}
          </span>
        );
      }

      case "formula": {
        const formulaReturnType = propSchema?.formulaReturnType;
        const formatted = formatFormulaValue(value, formulaReturnType);
        const errorMessage = note.formulaErrors?.[property.id];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
            <span
              style={{
                fontSize: '14px',
                color: errorMessage ? '#dc2626' : 'var(--c-texPri)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={typeof formatted === 'string' ? formatted : undefined}
            >
              {formatted}
            </span>
            {errorMessage && (
              <span
                style={{
                  fontSize: '12px',
                  color: '#dc2626',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={errorMessage}
              >
                {errorMessage}
              </span>
            )}
          </div>
        );
      }

      case "rollup": {
        const rollupResult = computeRollupData(
          note,
          propSchema,
          boardProperties,
          getNotesByDataSourceId,
          getDataSource,
        );

        if (rollupResult.state !== "ready") {
          return (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {rollupResult.message || "—"}
            </span>
          );
        }

        const { calculation, values, count, countFraction, percent } = rollupResult;

        if (calculation?.category === "count") {
          if (calculation.value === "per_group") {
            return (
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {countFraction || `${count ?? 0}/${rollupResult.totalCount ?? 0}`}
              </span>
            );
          }
          return (
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {count ?? 0}
            </span>
          );
        }

        if (calculation?.category === "percent") {
          return (
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {percent ?? 0}%
            </span>
          );
        }

        // Original - show all values in one row with truncate
        if (values && values.length > 0) {
          return (
            <span
              className="text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis block max-w-full truncate"
              title={values.join(', ')}
            >
              {values.join(', ')}
            </span>
          );
        }

        return (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            No related values
          </span>
        );
      }

      default:
        return <span style={{ fontSize: '14px', color: 'var(--c-texPri)' }}>{String(value)}</span>;
    }
  };

  const renderNoteRow = (note: Note, noteIndex: number) => {
    const isDragging = draggedNoteId === note._id;
    const isDropTarget = dragOverNoteId === note._id;
    const showIndicator = isDropTarget && dragPosition;
    const isEditingTitle = editingTitleNoteId === note._id;
    
    return (
      <div
        key={note._id}
        draggable
        className="flex hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group border-b border-gray-100 dark:border-gray-800 w-full text-left relative flex-shrink-0"
        style={{
          opacity: isDragging ? 0.5 : 1,
          height: isEditingTitle ? 'auto' : '33px',
          minHeight: '33px'
        }}
        onDragStart={(e) => handleRowDragStart(e, note._id)}
        onDragEnd={handleRowDragEnd}
        onDragOver={(e) => handleRowDragOver(e, note._id)}
        onDragLeave={handleRowDragLeave}
        onDrop={(e) => handleRowDrop(e, note._id)}
        onClick={(e) => {
          // Only open sidebar if clicking on title column or empty space
          const target = e.target as HTMLElement;
          const isTitleColumn = target.closest('[data-property-id="title"]');
          if (isTitleColumn) {
            handleCardClick(note);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick(note);
          }
        }}
      >
      {/* Drop indicator above */}
      {showIndicator && dragPosition === "above" && (
        <div style={{ 
          position: 'absolute', 
          top: '-1px', 
          left: 0, 
          right: 0, 
          height: '2px', 
          background: 'rgb(35, 131, 226)', 
          zIndex: 100 
        }} />
      )}
       {/* Drop indicator below */}
       {showIndicator && dragPosition === "below" && (
         <div style={{ 
           position: 'absolute', 
           bottom: '-1px', 
           left: 0, 
           right: 0, 
           height: '2px', 
           background: 'rgb(35, 131, 226)', 
           zIndex: 100 
         }} />
       )}
       
       {/* Checkbox - appears on hover before the first column */}
       <div className="flex items-center h-full">
         <input
           type="checkbox"
           checked={selectedNotes.has(note._id)}
           onChange={(e) => {
             e.stopPropagation();
             handleSelectNote(note._id);
           }}
           className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-opacity ${
             selectedNotes.has(note._id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
           }`}
           aria-label={`Select task: ${note.title}`}
         />
       </div>

      {/* Property columns */}
        {propertyColumns.map((property, colIndex) => (
        <div
          key={property.id}
            className="flex items-center min-w-0 flex-shrink-0"
            data-property-id={property.id}
            style={{
              display: 'flex',
              width: `${columnWidths[property.id] ?? property.width}px`,
              height: '100%',
              position: 'relative',
              borderInlineEnd: '1px solid var(--ca-borSecTra, rgba(55, 53, 47, 0.16))',
              opacity: 1
            }}
          >
            <div style={{ 
              display: 'flex', 
              overflowX: 'clip', 
              height: isEditingTitle && property.id === 'title' ? 'auto' : '100%', 
              width: `${columnWidths[property.id] ?? property.width}px`, 
              opacity: 1 
            }} className="cell-wrapper">
              <div
                className={`${canEditProperty(property.type) ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : 'cursor-default'}`}
                onClick={(e) => handleCellClick(e, note, property)}
                style={{
                  userSelect: 'none',
                  transition: 'background 20ms ease-in',
                  position: 'relative',
                  display: 'block',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  overflow: isEditingTitle && property.id === 'title' ? 'visible' : 'clip',
                  width: '100%',
                  whiteSpace: isEditingTitle && property.id === 'title' ? 'pre-wrap' : 'nowrap',
                  height: isEditingTitle && property.id === 'title' ? 'auto' : '36px',
                  minHeight: '36px',
                  paddingTop: '7.5px',
                  paddingBottom: '7.5px',
                  paddingInline: '8px',
                  borderRadius: '3px'
                }}
        >
          {renderPropertyValue(note, property)}
              </div>
            </div>
        </div>
      ))}
      
      {/* Empty space for scrollbar */}
      <div className="w-16 flex-shrink-0" />
    </div>
  );
  };

  // Early return if no board
  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">No board data</p>
          <p className="text-sm text-muted-foreground">Please select a valid board</p>
        </div>
      </div>
    );
  }

  const isGrouped = getGroupBy(board._id) && Object.keys(groupedNotes).length > 1;

  return (
    <>
      <style>{`
        .cell-wrapper:hover .open-sidebar-btn {
          opacity: 1 !important;
        }
        .cell-wrapper:hover .open-sidebar-btn:hover {
          background: rgba(55, 53, 47, 0.08);
        }
      `}</style>
      <div 
        className="flex h-full bg-white dark:bg-[#191919]" 
        style={{ 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: 'var(--c-bacPri, #ffffff)',
          flexGrow: 1,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          maxHeight: 'inherit',
          width: '100%',
          overflow: 'hidden'
        }}
      >
        {/* Main List View */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedNotes.size > 0 && (
          <div data-group-toolbar className="mb-2">
            <GroupActionBar
              selectedCount={selectedNotes.size}
              properties={propertyColumns.map((p) => ({ id: p.id, name: p.name, type: p.type, icon: p.icon }))}
              onOpenEditor={handleOpenGroupEditor}
              onDeleteSelected={requestDeleteSelected}
              onClearSelection={() => {
                setSelectedNotes(new Set());
                handleCloseEditor();
              }}
            />
          </div>
        )}
        {/* Table Container with proper horizontal scrolling */}
        <div 
          className="flex-1 overflow-x-auto overflow-y-auto" 
          style={{ 
            marginTop: '4px',
            minWidth: 0,
            maxWidth: '100%'
          }}
        >
          <div 
            className="min-w-full" 
            style={{ 
              width: `${Math.max(totalColumnsWidth + 36, 708)}px` // 36px for checkbox column, min 708px
            }}
          >
            {/* Table Header - MainHeaderRow */}
            <MainHeaderRow
              propertyColumns={propertyColumns}
              columnWidths={columnWidths}
              boardId={board._id}
              filters={getFilters(board._id)}
              sortBy={getSortBy(board._id)}
              selectedAllChecked={selectedNotes.size === Object.values(groupedNotes).flat().length && Object.values(groupedNotes).flat().length > 0}
              onToggleSelectAll={handleSelectAllWrapper}
              draggedColumnIndex={draggedColumnIndex}
              dragOverColumnIndex={dragOverColumnIndex}
              onDragStart={handleColumnDragStart}
              onDragOver={handleColumnDragOver}
              onDragLeave={handleColumnDragLeave}
              onDrop={handleColumnDrop}
              onPropertyHeaderClick={handlePropertyHeaderClick}
              onColumnResizeMouseDown={handleColumnResizeMouseDown}
              onClickAddProperty={() => {
                if (addPropertyBtnRef.current) {
                  const rect = addPropertyBtnRef.current.getBoundingClientRect();
                  setPropertyDialogPosition({ top: rect.bottom + 4, left: rect.left });
                }
                setInsertionTarget(null);
                setShowPropertyDialog(true);
              }}
              addPropertyBtnRef={addPropertyBtnRef}
            />

            {/* Table Body - Books by Betaque  style */}
            <div>
              {Object.values(groupedNotes).flat().length === 0 ? (
                <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <p className="text-lg font-medium">No tasks yet</p>
                    <p className="text-sm">Click "New task" to get started</p>
                  </div>
                </div>
              ) : isGrouped ? (
                Object.entries(groupedNotes).map(([groupName, groupNotes]) => (
                  <GroupSection
                    key={groupName}
                    groupName={groupName}
                    groupNotes={groupNotes as Note[]}
                    collapsed={!!collapsedGroups[groupName]}
                    onToggleCollapse={toggleGroupCollapse}
                    renderNoteRow={(note, idx) => renderNoteRow(note, idx)}
                    propertyColumns={propertyColumns}
                    columnWidths={columnWidths}
                    filters={getFilters(board._id)}
                    sortBy={getSortBy(board._id)}
                    boardId={board._id}
                    showAddRowForGroup={showAddRowForGroup}
                    setShowAddRowForGroup={setShowAddRowForGroup}
                    newRowTitleForGroup={newRowTitleForGroup}
                    setNewRowTitleForGroup={setNewRowTitleForGroup}
                    groupByPropertyId={getGroupBy(board._id)}
                    boardProperties={boardProperties}
                    workspaceMembers={workspaceMembers}
                    onCreateInGroup={createNoteInGroup}
                    draggedColumnIndex={draggedColumnIndex}
                    dragOverColumnIndex={dragOverColumnIndex}
                    onDragStart={handleColumnDragStart}
                    onDragOver={handleColumnDragOver}
                    onDragLeave={handleColumnDragLeave}
                    onDrop={handleColumnDrop}
                    onPropertyHeaderClick={handlePropertyHeaderClick}
                    onColumnResizeMouseDown={handleColumnResizeMouseDown}
                    onClickAddProperty={() => {
                      if (addPropertyBtnRef.current) {
                        const rect = addPropertyBtnRef.current.getBoundingClientRect();
                        setPropertyDialogPosition({ top: rect.bottom + 4, left: rect.left });
                      }
                      setInsertionTarget(null);
                      setShowPropertyDialog(true);
                    }}
                    addPropertyBtnRef={addPropertyBtnRef}
                    groupAllSelected={(groupNotes as Note[]).length > 0 && (groupNotes as Note[]).every(n => selectedNotes.has(n._id))}
                    onToggleGroupSelect={() => {
                      setSelectedNotes((prev) => {
                        const next = new Set(prev);
                        const allSelected = (groupNotes as Note[]).every(n => next.has(n._id));
                        if (allSelected) {
                          (groupNotes as Note[]).forEach(n => next.delete(n._id));
                        } else {
                          (groupNotes as Note[]).forEach(n => next.add(n._id));
                        }
                        return next;
                      });
                    }}
                  />
                ))
              ) : (
                // Render ungrouped notes
                Object.values(groupedNotes).flat().map((note, idx) => renderNoteRow(note, idx))
              )}
            </div>

            {/* Add New Task Row - simple single row */}
            {!showAddRow ? (
              <div className="flex border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 h-9 group mb-2">
                <button
                  type="button"
                  onClick={() => setShowAddRow(true)}
                  className="flex items-center gap-1.5 pl-4 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors w-full text-left"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 2.74a.66.66 0 0 1 .66.66v3.94h3.94a.66.66 0 0 1 0 1.32H8.66v3.94a.66.66 0 0 1-1.32 0V8.66H3.4a.66.66 0 0 1 0-1.32h3.94V3.4A.66.66 0 0 1 8 2.74" />
                  </svg>
                  New task
                </button>
              </div>
            ) : (
              <div className="flex border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 h-9 mb-2">
                {/* Title input spanning across */}
                <div className="flex-1 flex items-center px-2 pl-5">
                  <input
                    type="text"
                    value={newRowTitle}
                    onChange={(e) => setNewRowTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddNewRow();
                      } else if (e.key === "Escape") {
                        setShowAddRow(false);
                        setNewRowTitle("");
                      }
                    }}
                    placeholder="Task name"
                    className="w-full bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Property Dialog - Fixed positioning below the + button */}
      {showPropertyDialog && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-transparent z-[190]"
            onClick={() => setShowPropertyDialog(false)}
          />
          {/* Dialog positioned below the + button */}
          <div 
            className="fixed z-[200] border border-gray-200 rounded-md shadow-xl dark:border-[#3c3c3c]"
            style={{
              top: `${propertyDialogPosition.top}px`, 
              left: `${propertyDialogPosition.left}px`
            }}
          >
            <AddPropertyDialog
              onSelect={async (propertyType, options?: any) => {
                if (propertyType === "relation" && options?.showViewSelector) {
                  // Don't create property yet - fetch views first, then show selector
                  setShowPropertyDialog(false);
                  setLoadingRelationViews(true);
                  setShowRelationViewSelector(true);
                  
                  try {
                    // Call get all views API immediately
                    const workspaceId = currentWorkspace?._id;
                    const routeId = (workspaceId && workspaceId.trim() !== "") 
                      ? workspaceId 
                      : "all";
                    
                    const url = routeId === "all" 
                      ? `/api/database/createProperty/relation/allViews/all`
                      : `/api/database/createProperty/relation/allViews/${encodeURIComponent(routeId)}`;
                    
                    const response: any = await getWithAuth(url);
                    
                    if (response && !response.isError && response.success && Array.isArray(response.views)) {
                      // Filter out current view if needed
                      let filteredViews = response.views;
                      if (board._id) {
                        filteredViews = response.views.filter((view: any) => 
                          String(view._id) !== String(board._id) && String(view.id) !== String(board._id)
                        );
                      }
                      setRelationViews(filteredViews);
                    } else if (response && response.isError) {
                      toast.error(response.message || "Failed to fetch views");
                    }
                  } catch (err) {
                    toast.error("Failed to fetch views");
                  } finally {
                    setLoadingRelationViews(false);
                  }
                  
                  return null;
                }
                const created = await handleAddProperty(propertyType);
                if (created?.id) {
                  insertPropertyIntoOrder(created.id);
                }
                setShowPropertyDialog(false);
                return created;
              }}
              onClose={() => setShowPropertyDialog(false)}
            />
          </div>
        </>
      )}

      {/* Relation View Selector */}
      {showRelationViewSelector && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-transparent z-[190]"
            onClick={() => {
              setShowRelationViewSelector(false);
              setRelationViews([]);
            }}
          />
          {/* Dialog positioned same as AddPropertyDialog */}
          <div 
            className="fixed z-[200] border border-gray-200 rounded-md shadow-xl dark:border-[#3c3c3c]"
            style={{
              top: `${propertyDialogPosition.top}px`, 
              left: `${propertyDialogPosition.left}px`
            }}
          >
            <RelationViewSelector
              key={`relation-selector-${showRelationViewSelector}`}
              isOpen={true}
              loading={loadingRelationViews}
              views={relationViews}
              onClose={() => {
                setShowRelationViewSelector(false);
                setRelationViews([]);
              }}
              onSelectView={async (viewId, viewTitle) => {
                try {
                  // Find the selected view to get its databaseSourceId
                  const selectedView = relationViews.find((v: any) => 
                    String(v._id) === String(viewId) || String(v.id) === String(viewId)
                  );
                  
                  // Extract databaseSourceId from the view's viewsType array
                  let databaseSourceId: string | null = null;
                  if (selectedView?.viewsType && Array.isArray(selectedView.viewsType) && selectedView.viewsType.length > 0) {
                    const firstViewType = selectedView.viewsType[0];
                    databaseSourceId = firstViewType?.databaseSourceId 
                      ? (typeof firstViewType.databaseSourceId === "string" 
                          ? firstViewType.databaseSourceId 
                          : String(firstViewType.databaseSourceId))
                      : null;
                  }
                  
                  if (!databaseSourceId) {
                    toast.error("Could not find database source for selected view");
                    return;
                  }
                  
                  // Store the pending relation data and show config modal
                  setPendingRelationData({
                    viewId,
                    viewTitle,
                    databaseSourceId,
                  });
                  setShowRelationViewSelector(false);
                  setShowRelationConfigModal(true);
                } catch (err) {
                  toast.error("Failed to load notes for selected view");
                } finally {
                  setRelationViews([]);
                }
              }}
            />
          </div>
        </>
      )}

      {/* Relation Configuration Modal */}
      {showRelationConfigModal && pendingRelationData && (
        <>
          <div 
            className="fixed inset-0 bg-transparent z-[190]"
            onClick={() => {
              setShowRelationConfigModal(false);
              setPendingRelationData(null);
            }}
          />
          <div 
            className="fixed z-[200] border border-gray-200 rounded-md shadow-xl dark:border-[#3c3c3c]"
            style={{
              top: `${propertyDialogPosition.top}px`, 
              left: `${propertyDialogPosition.left}px`
            }}
          >
            <RelationConfigModal
              isOpen={showRelationConfigModal}
              selectedViewTitle={pendingRelationData.viewTitle}
              onClose={() => {
                setShowRelationConfigModal(false);
                setPendingRelationData(null);
              }}
              onConfirm={async (config) => {
                try {
                  const { viewId, viewTitle, databaseSourceId } = pendingRelationData;
                  
                  // Create the relation property with configuration
                  const created = await handleAddProperty(
                    "relation",
                    [{ id: viewId, name: viewTitle }],
                    databaseSourceId,
                    {
                      relationLimit: config.relationLimit,
                      twoWayRelation: config.twoWayRelation,
                    },
                    config.propertyName
                  );
                  
                  if (created?.id) {
                    insertPropertyIntoOrder(created.id);
                  }
                  
                  setShowRelationConfigModal(false);
                  setPendingRelationData(null);
                } catch (err) {
                  toast.error("Failed to create relation property");
                  console.error(err);
                }
              }}
            />
          </div>
        </>
      )}

      {/* Cell Editor */}
      {editingCell && (
        <div data-cell-editor>
          <CellEditor
            isVisible={true}
            value={groupEditingPropertyId ? undefined : localNotes.find(n => n._id === editingCell.noteId)?.databaseProperties?.[editingCell.propertyId]}
            property={{
              // Spread full property schema first (includes decimalPlaces, showAs, etc.)
              ...(boardProperties?.[editingCell.propertyId] || {}),
              // Override with specific fields to ensure correct values
              id: editingCell.propertyId,
              name: propertyColumns.find(p => p.id === editingCell.propertyId)?.name || boardProperties?.[editingCell.propertyId]?.name || '',
              type: propertyColumns.find(p => p.id === editingCell.propertyId)?.type || boardProperties?.[editingCell.propertyId]?.type || '',
              options: boardProperties?.[editingCell.propertyId]?.options || [],
              placeholder: `Enter ${propertyColumns.find(p => p.id === editingCell.propertyId)?.name?.toLowerCase() || 'value'}...`
            }}
            note={localNotes.find(n => n._id === editingCell.noteId)!}
            boardId={board._id}
            onUpdate={handleCellUpdate}
            onClose={handleCloseEditor}
            position={editingCell.position}
            workspaceMembers={workspaceMembers}
          />
        </div>
      )}

      {/* Property Header Dropdown */}
      {propertyHeaderDropdown && dropdownPosition && (
        <>
          {/* Backdrop overlay for click outside detection */}
          <div 
            className="fixed inset-0 bg-transparent z-[9998]"
            onClick={() => {
              setPropertyHeaderDropdown(null);
              setDropdownPosition(null);
            }}
          />
          
          <div 
            className="fixed z-[9999]"
            data-dropdown="property-header"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <PropertyHeaderDropdown
            property={{
              id: propertyHeaderDropdown.propertyId,
              name: boardProperties?.[propertyHeaderDropdown.propertyId]?.name || propertyHeaderDropdown.propertyId,
              type: boardProperties?.[propertyHeaderDropdown.propertyId]?.type || 'text',
            }}
            boardProperty={boardProperties?.[propertyHeaderDropdown.propertyId]}
            onClose={() => {
              setPropertyHeaderDropdown(null);
              setDropdownPosition(null);
            }}
            onSort={(direction) => handlePropertySort(propertyHeaderDropdown.propertyId, direction)}
            onFilter={handlePropertyFilter}
            onGroup={() => handlePropertyGroup(propertyHeaderDropdown.propertyId)}
            onHide={() => handlePropertyHide(propertyHeaderDropdown.propertyId)}
            onEdit={() => handlePropertyEdit(propertyHeaderDropdown.propertyId)}
            onWrapInView={handlePropertyWrapInView}
            onDisplayAs={handlePropertyDisplayAs}
            onInsertLeft={() => {
              const rect = propertyHeaderDropdown.anchorElement.getBoundingClientRect();
              setPropertyDialogPosition({ top: rect.bottom + 4, left: rect.left });
              setInsertionTarget({ targetPropertyId: propertyHeaderDropdown.propertyId, side: 'left', anchorElement: propertyHeaderDropdown.anchorElement });
              setShowPropertyDialog(true);
            }}
            onInsertRight={() => {
              const rect = propertyHeaderDropdown.anchorElement.getBoundingClientRect();
              setPropertyDialogPosition({ top: rect.bottom + 4, left: rect.left });
              setInsertionTarget({ targetPropertyId: propertyHeaderDropdown.propertyId, side: 'right', anchorElement: propertyHeaderDropdown.anchorElement });
              setShowPropertyDialog(true);
            }}
            hasFilters={!!getFilters(board._id)?.[propertyHeaderDropdown.propertyId]?.length}
            hasSorts={!!getSortBy(board._id)?.find(s => s.propertyId === propertyHeaderDropdown.propertyId)}
            isGrouped={getGroupBy(board._id) === propertyHeaderDropdown.propertyId}
            onRemoveSort={() => handleRemoveSortFromProperty(propertyHeaderDropdown.propertyId)}
            board={board}
            filters={getFilters(board._id) || {}}
            sortBy={getSortBy(board._id) || []}
            onApplyFilters={handleApplyFilters}
            onApplySort={(newSorts) => {
              // Get current viewTypeId
              const currentViewData = currentView[board._id];
              const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
              let view;
              if (currentViewData?.id) {
                view = latestBoard.viewsType?.find((v) => v.id === currentViewData.id);
              } else if (currentViewData?.type) {
                view = latestBoard.viewsType?.find((v) => v.viewType === currentViewData.type);
              }
              const viewTypeId = view?.id ? (typeof view.id === "string" ? view.id : String(view.id)) : null;
              if (viewTypeId) {
                setBoardSortBy(viewTypeId, newSorts);
              }
            }}
          />
          </div>
        </>
      )}


      {/* Edit Property Modal */}
      {editingPropertyId && boardProperties?.[editingPropertyId] && (
        <EditSinglePropertyModal
          board={board}
          propertyId={editingPropertyId}
          property={boardProperties[editingPropertyId]!}
          onClose={() => setEditingPropertyId(null)}
          onBack={() => setEditingPropertyId(null)}
        />
      )}

      {/* Right Sidebar */}
      {selectedTask && (
        <RightSidebar
          note={selectedTask}
          initialContent={rightSidebarContent}
          board={board}
          onClose={handleCloseSidebar}
          isClosing={isClosing}
          onUpdate={(updatedNote) => {
            setSelectedTask(updatedNote);
            setLocalNotes((prev) => prev.map((note) => (note._id === updatedNote._id ? updatedNote : note)));
            // Update context with dataSourceId
            const dataSourceId = getCurrentDataSourceId();
            if (dataSourceId) {
              updateNote(dataSourceId, updatedNote._id, updatedNote);
            }
          }}
          updateNoteTitleLocally={updateNoteTitleLocally}
          persistNoteTitleChange={persistNoteTitleChangeHandler}
        />
      )}

      {/* Group Delete Confirmation Modal */}
      <DeleteConfirmationModal
        header="Delete Tasks"
        isOpen={showDeleteConfirm}
        onCancel={cancelDelete}
        onConfirm={confirmDeleteSelected}
        isDeleting={isDeleting}
        entity={pendingDeletion?.count === 1 ? "task" : "tasks"}
        count={pendingDeletion?.count || selectedNotes.size}
        singleTitle={
          pendingDeletion?.count === 1 && pendingDeletion.noteIds.length > 0
            ? localNotes.find((n) => n._id === pendingDeletion.noteIds[0])?.title
            : selectedNotes.size === 1
              ? localNotes.find((n) => selectedNotes.has(n._id))?.title
              : undefined
        }
      />
      </div>
    </>
  );
}
