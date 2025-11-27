"use client";

import { useBoard } from "@/contexts/boardContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import useAddRootPage from "@/hooks/use-addRootPage";
import { useDatabaseProperties } from "@/hooks/use-viewProperty";
import type { Note, ViewCollection } from "@/types/board";
import { useState, useMemo, useRef, useEffect, useCallback, type FocusEvent } from "react";
import { Plus, Lock } from "lucide-react";
import { toast } from "sonner";
import FormAddPropertyDialog, { FORM_PROPERTY_TYPES } from "./FormAddPropertyDialog";
import type { BoardProperty } from "@/types/board";
import { postWithAuth } from "@/lib/api-helpers";
import { cn } from "@/lib/utils";
import FormQuestionCard from "./FormQuestionCard";
import CoverImage from "@/components/tailwind/editor/CoverImage";
import EmojiPicker from "@/components/tailwind/editor/EmojiPicker";
import { EMOJI_COLLECTION } from "@/components/tailwind/editor/editorHeader";
import {
  handleDuplicateQuestion as handleDuplicateProperty,
  updatePropertySchema,
  addPropertyOption,
  deletePropertyOption,
  reorderPropertyOptions,
} from "@/services-frontend/form/formViewService";

interface FormViewProps {
  readonly board: ViewCollection;
  readonly notes: Note[];
}

interface FormQuestion {
  propertyId: string;
  property: BoardProperty;
  isRequired?: boolean;
  description?: string;
}

export default function FormView({ board, notes }: FormViewProps) {
  const [formTitle, setFormTitle] = useState("Form title");
  const [lastSavedFormTitle, setLastSavedFormTitle] = useState("Form title");
  const [formDescription, setFormDescription] = useState("");
  const [lastSavedFormDescription, setLastSavedFormDescription] = useState("");
  const FORM_DESCRIPTION_PLACEHOLDER = "Description (optional)";
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [propertyDialogPosition, setPropertyDialogPosition] = useState({ top: 0, left: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const addQuestionBtnRef = useRef<HTMLButtonElement>(null);
  const iconButtonRef = useRef<HTMLButtonElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  
  const { addRootPage } = useAddRootPage();
  const { currentWorkspace, workspaceMembers } = useWorkspaceContext();
  const { 
    getCurrentDataSourceProperties, 
    currentView, 
    boards: contextBoards,
    currentDataSource,
    dataSources,
    setDataSource,
    getNotesByDataSourceId,
    updateAllNotes,
    updateBoard,
    propertyOrder,
    setPropertyOrder,
  } = useBoard();
  
  const workspaceId = currentWorkspace?._id || "";

  // Create a dummy note for the hook (form view doesn't edit a specific note)
  const dummyNote: Note = useMemo(() => ({
    _id: "dummy-form-note",
    title: "",
    content: "",
    description: "",
    noteType: "Viewdatabase_Note",
    databaseProperties: {},
    contentPath: "",
    commitSha: "",
    comments: [],
  }), []);

  // Use the existing hook for property operations
  const { handleAddProperty, handleRenameProperty, handleDeleteProperty } = useDatabaseProperties(
    board,
    dummyNote,
    () => {}
  );

  // Get current view from board
  const currentViewData = useMemo(() => {
    const viewData = currentView[board._id];
    const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
    
    let view;
    if (viewData?.id) {
      view = latestBoard.viewsType?.find((vt) => vt.id === viewData.id);
    } else if (viewData?.type) {
      view = latestBoard.viewsType?.find((vt) => vt.viewType === viewData.type);
    }
    
    return { view, viewData };
  }, [currentView, board, contextBoards]);

  useEffect(() => {
    const nextTitle = currentViewData.view?.formTitle || "Form title";
    const nextDescription = currentViewData.view?.formDescription || "";

    setFormTitle(nextTitle);
    setLastSavedFormTitle(nextTitle);
    setFormDescription(nextDescription);
    setLastSavedFormDescription(nextDescription);
  }, [
    currentViewData.view?.formTitle,
    currentViewData.view?.formDescription,
  ]);

  // Get current dataSourceId from current view (for form submission)
  const getCurrentDataSourceId = (): string | null => {
    const dsId = currentViewData.view?.databaseSourceId;
    return dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
  };

  // Initialize form icon and cover from current view (separate from view tab icon/cover)
  const [formIcon, setFormIcon] = useState<string>(currentViewData.view?.formIcon || "");
  const [formCoverImage, setFormCoverImage] = useState<string | null>(currentViewData.view?.formCoverImage || null);

  // Update form icon and cover when view changes
  useEffect(() => {
    setFormIcon(currentViewData.view?.formIcon || "");
    setFormCoverImage(currentViewData.view?.formCoverImage || null);
  }, [currentViewData.view?.formIcon, currentViewData.view?.formCoverImage]);

  // Get properties from current data source
  const boardProperties = useMemo(() => {
    const dataSourceId = currentDataSource[board._id];
    if (dataSourceId && dataSources[dataSourceId]) {
      return dataSources[dataSourceId].properties || {};
    }
    return getCurrentDataSourceProperties(board._id) || board.properties || {};
  }, [currentDataSource, dataSources, board._id, board.properties, getCurrentDataSourceProperties]);

  // Allowed property types for forms (from FormAddPropertyDialog)
  const allowedFormPropertyTypes = useMemo(() => {
    return new Set<BoardProperty["type"]>(
      FORM_PROPERTY_TYPES.map((type) => type.propertyType as BoardProperty["type"])
    );
  }, []);

  // Get form questions (only show properties that are allowed for forms)
  // Sort by property order, maintaining all properties in the order (even non-form ones)
  const formQuestions = useMemo(() => {
    const allFormProperties = Object.entries(boardProperties)
      .filter(([_, property]) => {
        // Only include properties whose type is in the allowed form property types
        return allowedFormPropertyTypes.has(property.type);
      })
      .map(([propertyId, property]) => ({
        propertyId,
        property,
        isRequired: property.formMetaData?.isFiedRequired || false,
        description: property.formMetaData?.Description || "",
      }));

    // Get property order for this board
    const order = propertyOrder[board._id];
    if (!order || order.length === 0) {
      // No order set, return as-is
      return allFormProperties;
    }

    // Sort form properties by their position in the property order
    // Properties not in order will be appended at the end
    const ordered: typeof allFormProperties = [];
    const unordered: typeof allFormProperties = [];

    // First, add properties in order
    for (const propId of order) {
      const formProp = allFormProperties.find((p) => p.propertyId === propId);
      if (formProp) {
        ordered.push(formProp);
      }
    }

    // Then, add properties not in order
    for (const formProp of allFormProperties) {
      if (!order.includes(formProp.propertyId)) {
        unordered.push(formProp);
      }
    }

    return [...ordered, ...unordered];
  }, [boardProperties, allowedFormPropertyTypes, propertyOrder, board._id]);

  // Handle form input change
  const handleInputChange = (propertyId: string, value: any) => {
    setFormResponses((prev) => ({
      ...prev,
      [propertyId]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const missingFields = formQuestions
      .filter((q) => q.isRequired && !formResponses[q.propertyId])
      .map((q) => q.property.name);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(", ")}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const dataSourceId = getCurrentDataSourceId();
      if (!dataSourceId) {
        toast.error("No data source found");
        setIsSubmitting(false);
        return;
      }

      // Get title from responses or use default
      const title = formResponses["title"] || "Untitled";
      
      // Build databaseProperties object (exclude title as it's passed separately)
      const databaseProperties: Record<string, any> = {};
      Object.entries(formResponses).forEach(([propertyId, value]) => {
        if (propertyId !== "title" && value !== undefined && value !== null && value !== "") {
          databaseProperties[propertyId] = value;
        }
      });

      const { page: newPage } = await addRootPage(
        title,
        null,
        false,
        null,
        false,
        dataSourceId,
        databaseProperties,
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

      const existingNotes = getNotesByDataSourceId(dataSourceId) || [];
      updateAllNotes(dataSourceId, [...existingNotes, serverNote]);

      toast.success("Form submitted successfully!");

      // Reset form
      setFormResponses({});

    } catch (error) {
      console.error("Failed to submit form:", error);
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle add property - use the hook
  const handleAddQuestion = async (propertyType: string, label: string, options?: any) => {
    if (propertyType === "relation" && options?.showViewSelector) {
      // Handle relation separately if needed
      setShowAddQuestion(false);
      return null;
    }

    setShowAddQuestion(false);
    // Pass the label as customName so the property uses the label as its name
    const result = await handleAddProperty(propertyType, options, undefined, undefined, label);
    if (result) {
      toast.success("Question added successfully!");
    }
    return result;
  };

  // Handle add question button click
  const handleAddQuestionClick = () => {
    if (addQuestionBtnRef.current && formContainerRef.current) {
      const buttonRect = addQuestionBtnRef.current.getBoundingClientRect();
      const containerRect = formContainerRef.current.getBoundingClientRect();
      
      // Estimate dialog dimensions (max-h-[80vh] from FormAddPropertyDialog, typically ~400-500px)
      const estimatedDialogHeight = 450;
      const estimatedDialogWidth = 288; // w-72 = 18rem = 288px
      const gap = 8;
      const minDistanceFromEdge = 16; // Minimum distance from viewport edges
      
      // Position to the right of the button
      let left = buttonRect.right - containerRect.left + gap;
      
      // Check if there's enough space to the right
      const spaceRight = window.innerWidth - buttonRect.right - minDistanceFromEdge;
      const spaceLeft = buttonRect.left - minDistanceFromEdge;
      
      // If not enough space to the right, position to the left of button
      if (spaceRight < estimatedDialogWidth && spaceLeft >= estimatedDialogWidth) {
        left = buttonRect.left - containerRect.left - estimatedDialogWidth - gap;
      }
      
      // Adjust horizontal position if dialog would overflow right
      if (left + estimatedDialogWidth > containerRect.width - minDistanceFromEdge) {
        left = containerRect.width - estimatedDialogWidth - minDistanceFromEdge;
      }
      
      // Adjust horizontal position if dialog would overflow left
      if (left < minDistanceFromEdge) {
        left = minDistanceFromEdge;
      }
      
      // Calculate top position - align with button center vertically
      let top = buttonRect.top - containerRect.top;
      
      // Adjust vertical position to keep dialog within viewport
      const spaceBelow = window.innerHeight - buttonRect.bottom - minDistanceFromEdge;
      const spaceAbove = buttonRect.top - minDistanceFromEdge;
      
      // If dialog would overflow below, adjust top position
      if (top + estimatedDialogHeight > containerRect.height - minDistanceFromEdge) {
        // Try to position so dialog fits within viewport
        top = Math.max(
          minDistanceFromEdge,
          containerRect.height - estimatedDialogHeight - minDistanceFromEdge
        );
      }
      
      // Ensure dialog doesn't go above container
      top = Math.max(minDistanceFromEdge, top);
      
      setPropertyDialogPosition({ top, left });
    }
    setShowAddQuestion(true);
  };

  // Handle question update (form metadata) - use simple helper
  const handleQuestionUpdate = async (propertyId: string, updates: {
      isRequired?: boolean;
      description?: string;
      isLongAnswer?: boolean;
      showAs?: "list" | "dropdown";
      maxSelection?: number;
      checkboxLabel?: string;
    },
  ) => {
    const targetProperty = boardProperties[propertyId];
    if (!targetProperty) {
      toast.error("Question not found");
      return;
    }

    const currentMeta = targetProperty.formMetaData || {};

    const formMetaData: Record<string, any> = {
      ...currentMeta,
      isFiedRequired: updates.isRequired ?? currentMeta.isFiedRequired ?? false,
      isDescriptionRequired:
        updates.description !== undefined ? !!updates.description : currentMeta.isDescriptionRequired ?? false,
      Description: updates.description !== undefined ? updates.description : currentMeta.Description ?? "",
      isLongAnswerRequired: updates.isLongAnswer ?? currentMeta.isLongAnswerRequired ?? false,
    };

    if (updates.checkboxLabel !== undefined) {
      formMetaData.checkboxLabel = updates.checkboxLabel.trim();
    }

    await updatePropertySchema({
      boardId: board._id,
      propertyId,
      boardProperties,
      getCurrentDataSourceId,
      setDataSource,
      updates: { formMetaData },
    });
  };

  // Handle question rename - use the hook
  const handleQuestionRename = async (propertyId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      toast.error("Question title cannot be empty");
      return;
    }
    await handleRenameProperty(propertyId, trimmedName);
    toast.success("Question renamed");
  };

  // Handle question delete - use the hook
  const handleQuestionDelete = async (propertyId: string) => {
    await handleDeleteProperty(propertyId);
  };

  // Handle question duplicate
  const handleQuestionDuplicate = useCallback((propertyId: string) => {
    handleDuplicateProperty();
  }, []);

  // Handle add option to multi-select/select
  const handleAddOption = async (propertyId: string, optionName: string) => {
    await addPropertyOption({
      boardId: board._id,
      propertyId,
      boardProperties,
      getCurrentDataSourceId,
      setDataSource,
      optionName,
    });
  };

  // Handle delete option from multi-select/select
  const handleDeleteOption = async (propertyId: string, optionId: string) => {
    await deletePropertyOption({
      boardId: board._id,
      propertyId,
      boardProperties,
      getCurrentDataSourceId,
      setDataSource,
      optionId,
    });
  };

  // Handle reorder options in multi-select/select
  const handleReorderOptions = async (propertyId: string, optionIds: string[]) => {
    await reorderPropertyOptions({
      boardId: board._id,
      propertyId,
      boardProperties,
      getCurrentDataSourceId,
      setDataSource,
      optionIds,
    });
  };

  // Generic function to update form metadata (icon, cover, title, description)
  const handleUpdateFormMetadata = async (
    updates: { formIcon?: string; formCoverImage?: string | null; formTitle?: string; formDescription?: string },
    options?: { successMessage?: string; errorMessage?: string }
  ): Promise<boolean> => {
    if (!currentViewData.view?.id) {
      toast.error("Current view not found");
      return false;
    }

    // Store previous values for rollback
    const previousIcon = formIcon;
    const previousCover = formCoverImage;
    const previousTitleValue = formTitle;
    const previousDescriptionValue = formDescription;

    // Optimistically update local state
    if (updates.formIcon !== undefined) {
      setFormIcon(updates.formIcon);
    }
    if (updates.formCoverImage !== undefined) {
      setFormCoverImage(updates.formCoverImage);
    }
    if (updates.formTitle !== undefined) {
      setFormTitle(updates.formTitle);
    }
    if (updates.formDescription !== undefined) {
      setFormDescription(updates.formDescription);
    }

    try {
      const res = await postWithAuth("/api/database/updateViewType", {
        viewId: board._id,
        viewTypeId: currentViewData.view.id,
        title: currentViewData.view.title || "Form",
        icon: currentViewData.view.icon, // Keep view tab icon unchanged
        formIcon: updates.formIcon !== undefined ? updates.formIcon : formIcon,
        formCoverImage: updates.formCoverImage !== undefined ? updates.formCoverImage : formCoverImage,
        formTitle: updates.formTitle !== undefined ? updates.formTitle : formTitle,
        formDescription: updates.formDescription !== undefined ? updates.formDescription : formDescription,
      });

      if (!res.view?.success) {
        toast.error(options?.errorMessage || "Failed to update form metadata");
        // Rollback on failure
        if (updates.formIcon !== undefined) setFormIcon(previousIcon);
        if (updates.formCoverImage !== undefined) setFormCoverImage(previousCover);
        if (updates.formTitle !== undefined) setFormTitle(previousTitleValue);
        if (updates.formDescription !== undefined) setFormDescription(previousDescriptionValue);
        return false;
      }

      // Update board context
      const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
      const updatedViewsType = latestBoard.viewsType.map((vt) =>
        vt.id === currentViewData.view?.id
          ? {
              ...vt,
              ...(updates.formIcon !== undefined && { formIcon: updates.formIcon }),
              ...(updates.formCoverImage !== undefined && {
                formCoverImage: updates.formCoverImage || undefined,
              }),
              ...(updates.formTitle !== undefined && { formTitle: updates.formTitle }),
              ...(updates.formDescription !== undefined && { formDescription: updates.formDescription }),
            }
          : vt
      );
      updateBoard(board._id, { ...latestBoard, viewsType: updatedViewsType });

      if (updates.formTitle !== undefined) {
        setLastSavedFormTitle(updates.formTitle);
      }
      if (updates.formDescription !== undefined) {
        setLastSavedFormDescription(updates.formDescription);
      }

      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      return true;
    } catch (error) {
      console.error("Error updating form metadata:", error);
      toast.error(options?.errorMessage || "Failed to update form metadata");
      // Rollback on error
      if (updates.formIcon !== undefined) setFormIcon(previousIcon);
      if (updates.formCoverImage !== undefined) setFormCoverImage(previousCover);
      if (updates.formTitle !== undefined) setFormTitle(previousTitleValue);
      if (updates.formDescription !== undefined) setFormDescription(previousDescriptionValue);
      return false;
    }
  };

  const getHeadingText = (element: HTMLElement) =>
    (element.textContent ?? "").replace(/\n/g, " ").replace(/\s+/g, " ");

  const handleFormTitleBlur = async (event: FocusEvent<HTMLHeadingElement> | React.KeyboardEvent<HTMLHeadingElement>) => {
    const rawValue = getHeadingText(event.currentTarget);
    const normalizedValue = rawValue.trim() || "Form title";
    setFormTitle(normalizedValue);

    if (normalizedValue === lastSavedFormTitle) {
      return;
    }

    await handleUpdateFormMetadata(
      { formTitle: normalizedValue },
      { errorMessage: "Failed to update form title" }
    );
  };

  const handleFormDescriptionBlur = async (event: FocusEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
    const rawValue = event.currentTarget.textContent ?? "";
    const sanitizedValue = rawValue === FORM_DESCRIPTION_PLACEHOLDER ? "" : rawValue;
    const normalizedValue = sanitizedValue.trim() ? sanitizedValue : "";
    setFormDescription(normalizedValue);

    if (normalizedValue === lastSavedFormDescription) {
      return;
    }

    await handleUpdateFormMetadata(
      { formDescription: normalizedValue },
      { errorMessage: "Failed to update form description" }
    );
  };

  const handleFormDescriptionFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (!formDescription) {
      event.currentTarget.textContent = "";
    }
  };

  const handleFormTitleKeyDown = (event: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleFormTitleBlur(event);
    }
  };

  const handleFormDescriptionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleFormDescriptionBlur(event);
    }
  };

  const isDescriptionEmpty = formDescription.length === 0;
  const descriptionDisplayText = isDescriptionEmpty ? FORM_DESCRIPTION_PLACEHOLDER : formDescription;
  const descriptionClasses = cn(
    "text-base outline-none focus:outline-none cursor-text",
    isDescriptionEmpty ? "text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-400"
  );

  // Handle form icon update (separate from view tab icon)
  const handleFormIconChange = async (newIcon: string) => {
    await handleUpdateFormMetadata(
      { formIcon: newIcon },
      { errorMessage: "Failed to update form icon" }
    );
  };

  // Handle form cover add (separate from view cover) - opens the cover picker
  const handleAddFormCover = () => {
    setShowCoverPicker(true);
  };

  // Handle form cover change (separate from view cover)
  const handleFormCoverChange = async (newCover: string) => {
    await handleUpdateFormMetadata(
      { formCoverImage: newCover },
      {
        successMessage: "Form cover updated successfully!",
        errorMessage: "Failed to update form cover",
      }
    );
  };

  // Handle form cover remove (separate from view cover)
  const handleFormCoverRemove = async () => {
    await handleUpdateFormMetadata(
      { formCoverImage: null },
      {
        successMessage: "Form cover removed successfully!",
        errorMessage: "Failed to remove form cover",
      }
    );
  };

  // Handle form cover upload
  const handleUploadFormCover = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("workspaceId", workspaceId);
    
    try {
      const response = await fetch("/api/upload/cover", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload cover");
      }
      
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading cover:", error);
      // Fallback to base64 if upload fails
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result as string);
          } else {
            reject(new Error("Failed to read file"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  // Function to get a random emoji
  const getRandomEmoji = (): string => {
    const randomIndex = Math.floor(Math.random() * EMOJI_COLLECTION.length);
    return EMOJI_COLLECTION[randomIndex] || "😀";
  };

  const [isHoveringHeader, setIsHoveringHeader] = useState(false);

  // Handler to add a random icon
  const handleAddRandomIcon = async () => {
    const randomEmoji = getRandomEmoji();
    await handleFormIconChange(randomEmoji);
  };

  // Handler to select icon from picker
  const handleSelectEmoji = async (emoji: string) => {
    await handleFormIconChange(emoji);
  };

  // Handler to remove icon
  const handleRemoveIcon = async () => {
    await handleFormIconChange("");
  };

  // Handle drag start for form question cards
  const handleCardDragStart = (e: React.DragEvent, propertyId: string) => {
    e.stopPropagation(); // Prevent drag from bubbling to parent elements
    setDraggedCardId(propertyId);
    e.dataTransfer.effectAllowed = "move";
    
    // Prevent dragging the full element snapshot
    const img = new Image();
    img.src = "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  // Handle drag over
  const handleCardDragOver = (e: React.DragEvent, propertyId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedCardId && draggedCardId !== propertyId) {
      setDragOverCardId(propertyId);
    }
  };

  // Handle drag leave
  const handleCardDragLeave = () => {
    setDragOverCardId(null);
  };

  // Handle drop - reorder form questions
  // Follows the same pattern as propertiesSection.tsx and editPropertiesModal.tsx
  const handleCardDrop = (e: React.DragEvent, dropPropertyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedCardId || draggedCardId === dropPropertyId) {
      setDraggedCardId(null);
      setDragOverCardId(null);
      return;
    }

    // Get current property order - same pattern as propertiesSection.tsx
    const boardPropertyOrder = propertyOrder[board._id];
    const currentOrder = boardPropertyOrder && boardPropertyOrder.length > 0
      ? [...boardPropertyOrder]
      : Object.keys(boardProperties);

    // Find indices of dragged and drop properties in the order
    const draggedIndex = currentOrder.indexOf(draggedCardId);
    const dropIndex = currentOrder.indexOf(dropPropertyId);

    // If either property is not in order, add it (shouldn't happen, but handle it)
    if (draggedIndex === -1) {
      currentOrder.push(draggedCardId);
    }
    if (dropIndex === -1) {
      currentOrder.push(dropPropertyId);
    }

    // Recalculate indices after potential additions
    const finalDraggedIndex = currentOrder.indexOf(draggedCardId);
    const finalDropIndex = currentOrder.indexOf(dropPropertyId);

    // Reorder: remove dragged item and insert at drop position
    const [movedItem] = currentOrder.splice(finalDraggedIndex, 1);
    if (movedItem) {
      currentOrder.splice(finalDropIndex, 0, movedItem);
    }

    // Update property order - setPropertyOrder automatically calls savePropertyOrder API
    setPropertyOrder(board._id, currentOrder);

    setDraggedCardId(null);
    setDragOverCardId(null);
  };

  // Handle drag end
  const handleCardDragEnd = () => {
    setDraggedCardId(null);
    setDragOverCardId(null);
  };

  return (
    <div
      ref={formContainerRef}
      className="relative w-full max-w-4xl mx-auto py-8 px-4"
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Form Cover Image */}
      <CoverImage
        coverUrl={formCoverImage || null}
        onCoverChange={handleFormCoverChange}
        onCoverRemove={handleFormCoverRemove}
        onUploadCover={handleUploadFormCover}
        workspaceId={workspaceId}
        openPicker={showCoverPicker}
        onPickerClose={() => setShowCoverPicker(false)}
      />

      {/* Form Header */}
      <div 
        className={`relative mb-6 ${formCoverImage ? 'pt-0' : 'pt-16'} bg-white text-gray-900 dark:bg-background dark:text-gray-100`}
        onMouseEnter={() => setIsHoveringHeader(true)}
        onMouseLeave={() => setIsHoveringHeader(false)}
      >
        {/* Page Controls - Books by Betaque -style hover buttons */}
        <div
          className="flex items-center gap-0 flex-wrap -ml-px pb-1 pointer-events-auto"
          style={{
            justifyContent: "flex-start",
          }}
        >
          {/* Add Icon - Only show if no icon exists */}
          {!formIcon && (
            <button
              type="button"
              ref={iconButtonRef}
              onClick={handleAddRandomIcon}
              className={`inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-sm transition-opacity duration-100 cursor-pointer
                ${isHoveringHeader ? "opacity-100" : "opacity-0 pointer-events-none"}
                text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800/50`}
              style={{
                userSelect: "none",
                flexShrink: 0,
                lineHeight: "1.2",
                minWidth: 0,
                whiteSpace: "nowrap",
              }}
            >
              <svg
                aria-hidden="true"
                role="graphics-symbol"
                viewBox="2.37 2.37 15.26 15.25"
                className="w-3.5 h-3.5 fill-current flex-shrink-0"
              >
                <path d="M2.375 10a7.625 7.625 0 1 1 15.25 0 7.625 7.625 0 0 1-15.25 0m5.67 1.706a.625.625 0 0 0-1.036.698A3.6 3.6 0 0 0 10.005 14c1.245 0 2.35-.637 2.996-1.596a.625.625 0 0 0-1.036-.698 2.37 2.37 0 0 1-1.96 1.044 2.36 2.36 0 0 1-1.96-1.044m-.68-2.041c.49 0 .88-.46.88-1.02s-.39-1.02-.88-1.02-.88.46-.88 1.02.39 1.02.88 1.02m6.15-1.02c0-.56-.39-1.02-.88-1.02s-.88.46-.88 1.02.39 1.02.88 1.02.88-.46.88-1.02" />
              </svg>
              Add icon
            </button>
          )}

          {/* Add Cover - Only show if no cover exists */}
          {!formCoverImage && (
            <button
              type="button"
              onClick={handleAddFormCover}
              className={`inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-sm transition-opacity duration-100 cursor-pointer
                ${isHoveringHeader ? "opacity-100" : "opacity-0 pointer-events-none"}
                text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800/50`}
              style={{
                userSelect: "none",
                flexShrink: 0,
                lineHeight: "1.2",
                minWidth: 0,
                whiteSpace: "nowrap",
              }}
            >
              <svg
                aria-hidden="true"
                role="graphics-symbol"
                viewBox="2.37 4.12 15.25 11.75"
                className="w-3.5 h-3.5 fill-current flex-shrink-0"
              >
                <path d="M2.375 6.25c0-1.174.951-2.125 2.125-2.125h11c1.174 0 2.125.951 2.125 2.125v7.5a2.125 2.125 0 0 1-2.125 2.125h-11a2.125 2.125 0 0 1-2.125-2.125zm1.25 7.5c0 .483.392.875.875.875h11a.875.875 0 0 0 .875-.875v-2.791l-2.87-2.871a.625.625 0 0 0-.884 0l-4.137 4.136-1.98-1.98a.625.625 0 0 0-.883 0L3.625 12.24zM8.5 9.31a1.5 1.5 0 0 0 1.33-.806 1.094 1.094 0 0 1-.702-2.058A1.5 1.5 0 1 0 8.5 9.31" />
              </svg>
              Add cover
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Emoji / Icon - Only show if set */}
          {formIcon && (
            <div className="h-28 pt-1 text-gray-500 dark:text-gray-400 flex items-center justify-center">
              <div
                className="h-20 w-20 flex items-center justify-center text-[4rem] text-gray-500 dark:text-gray-400 cursor-pointer hover:opacity-100 transition-opacity"
                style={{ opacity: 0.6 }}
                onClick={() => setShowIconPicker(true)}
                onKeyUp={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setShowIconPicker(true);
                  }
                }}
                aria-label="Change form icon"
                role="button"
                tabIndex={0}
              >
                {formIcon}
              </div>
            </div>
          )}

          {/* Form Title */}
          <h1
            contentEditable
            suppressContentEditableWarning
            onBlur={handleFormTitleBlur}
            onKeyDown={handleFormTitleKeyDown}
            className="text-4xl px-2.5 font-semibold leading-tight tracking-tight break-words w-full outline-none cursor-text text-black dark:text-white"
            style={{ minHeight: "1em" }}
          >
            {formTitle}
          </h1>
        </div>
        {/* Form Description */}
        <div className="mb-6 px-6">
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={handleFormDescriptionBlur}
            onKeyDown={handleFormDescriptionKeyDown}
            onFocus={handleFormDescriptionFocus}
            className={descriptionClasses}
            data-placeholder={FORM_DESCRIPTION_PLACEHOLDER}
            style={{ minHeight: "1em" }}
            ref={descriptionRef}
          >
            {descriptionDisplayText}
          </div>
        </div>

        {/* Sharing Info */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-3 mb-6 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Lock className="w-4 h-4 mr-2" />
            <span>Only members at workspace can fill out this form.</span>
          </div>
          <button className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
            Change
          </button>
        </div>
      </div>

      {/* Form Questions */}
      <form onSubmit={handleSubmit} className="space-y-6" onDragStart={(e) => {
        // Only prevent drag on form itself, not on cards
        const target = e.target as HTMLElement;
        if (!target.closest('[draggable="true"]')) {
          e.preventDefault();
        }
      }} onDragOver={(e) => {
        // Only prevent drag over on form itself, not on cards
        const target = e.target as HTMLElement;
        if (!target.closest('[draggable="true"]')) {
          e.preventDefault();
        }
      }}>
        {formQuestions.map((question) => (
          <div
            key={question.propertyId}
            draggable={true}
            onDragStart={(e) => {
              e.stopPropagation();
              handleCardDragStart(e, question.propertyId);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCardDragOver(e, question.propertyId);
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              handleCardDragLeave();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCardDrop(e, question.propertyId);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              handleCardDragEnd();
            }}
            className={cn(
              draggedCardId === question.propertyId ? "opacity-50" : dragOverCardId === question.propertyId ? "opacity-75" : "",
              "transition-opacity"
            )}
            style={{ cursor: draggedCardId === question.propertyId ? "grabbing" : "grab" }}
          >
            <FormQuestionCard
              propertyId={question.propertyId}
              property={question.property}
              value={formResponses[question.propertyId]}
              onChange={(value) => handleInputChange(question.propertyId, value)}
              onUpdate={(updates) => handleQuestionUpdate(question.propertyId, updates)}
              onDelete={() => handleQuestionDelete(question.propertyId)}
              onDuplicate={() => handleQuestionDuplicate(question.propertyId)}
              onAddOption={async (optionName: string) => {
                await handleAddOption(question.propertyId, optionName);
              }}
              onDeleteOption={async (optionId: string) => {
                await handleDeleteOption(question.propertyId, optionId);
              }}
              onReorderOptions={async (optionIds: string[]) => {
                await handleReorderOptions(question.propertyId, optionIds);
              }}
              disableResponseInput
              cardClassName={cn(
                "border border-gray-200 dark:border-gray-700 bg-background shadow-sm",
                draggedCardId === question.propertyId ? "cursor-grabbing" : "cursor-grab"
              )}
              onRename={(rename) => {
                if (rename?.name) {
                  handleQuestionRename(question.propertyId, rename.name);
                }
              }}
              isSelected={selectedCardId === question.propertyId}
              onSelect={(propertyId) => setSelectedCardId(propertyId)}
              onDeselect={() => setSelectedCardId(null)}
              availableMembers={workspaceMembers || []}
            />
          </div>
        ))}

        {/* Add Question Button */}
        <div className="flex justify-center py-4">
          <button
            ref={addQuestionBtnRef}
            type="button"
            onClick={handleAddQuestionClick}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400 transition-colors"
            aria-label="Add question"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

      </form>

      {/* Add Property Dialog */}
      {showAddQuestion && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-transparent z-[190]"
            onClick={() => setShowAddQuestion(false)}
          />
          {/* Dialog positioned relative to button with viewport-aware positioning */}
          <div
            className="absolute z-[200]"
            style={{
              top: `${propertyDialogPosition.top}px`,
              left: `${propertyDialogPosition.left}px`,
              maxHeight: 'calc(100vh - 2rem)',
              maxWidth: 'calc(100vw - 2rem)',
            }}
          >
            <FormAddPropertyDialog
              onSelect={handleAddQuestion}
              onClose={() => setShowAddQuestion(false)}
            />
          </div>
        </>
      )}

      {/* Emoji Picker Modal for Form Icon */}
      {showIconPicker && (
        <EmojiPicker
          onSelect={handleSelectEmoji}
          onClose={() => setShowIconPicker(false)}
          onRemove={formIcon ? handleRemoveIcon : undefined}
          currentEmoji={formIcon}
          anchorRef={iconButtonRef}
        />
      )}
    </div>
  );
}

