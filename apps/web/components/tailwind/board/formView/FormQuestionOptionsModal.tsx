"use client";

import { Asterisk, AlignLeft, List, Hash, Database, Link2, ArrowUpDown, Copy, Trash2, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef, useMemo, useCallback, type Dispatch, type SetStateAction } from "react";
import type { BoardProperty } from "@/types/board";
import { DropdownMenu } from "@/components/tailwind/ui/dropdown-menu";
import type { DropdownMenuItemProps } from "@/components/tailwind/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface FormQuestionOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: BoardProperty;
  propertyId: string;
  position?: { top: number; left: number };
  onUpdate: (updates: {
    isRequired?: boolean;
    description?: string;
    isLongAnswer?: boolean;
    showAs?: "list" | "dropdown";
    maxSelection?: number;
    questionType?: string;
  }) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export default function FormQuestionOptionsModal({
  isOpen,
  onClose,
  property,
  propertyId,
  position,
  onUpdate,
  onDelete,
  onDuplicate,
}: FormQuestionOptionsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isRequired, setIsRequired] = useState(property.formMetaData?.isFiedRequired || false);
  const [hasDescription, setHasDescription] = useState(!!property.formMetaData?.Description);
  const [description, setDescription] = useState(property.formMetaData?.Description || "");
  const [isLongAnswer, setIsLongAnswer] = useState(property.formMetaData?.isLongAnswerRequired || false);
  const [showAs, setShowAs] = useState<"list" | "dropdown">("list");
  const [maxSelection, setMaxSelection] = useState<number | "unlimited">("unlimited");

  // Store initial values to detect changes
  const initialValuesRef = useRef<{
    isRequired: boolean;
    hasDescription: boolean;
    description: string;
    isLongAnswer: boolean;
    showAs?: "list" | "dropdown";
    maxSelection?: number | "unlimited";
  } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialIsRequired = property.formMetaData?.isFiedRequired || false;
      const initialHasDescription = !!property.formMetaData?.Description;
      const initialDescription = property.formMetaData?.Description || "";
      const initialIsLongAnswer = property.formMetaData?.isLongAnswerRequired || false;

      setIsRequired(initialIsRequired);
      setHasDescription(initialHasDescription);
      setDescription(initialDescription);
      setIsLongAnswer(initialIsLongAnswer);

      // Store initial values for comparison
      initialValuesRef.current = {
        isRequired: initialIsRequired,
        hasDescription: initialHasDescription,
        description: initialDescription,
        isLongAnswer: initialIsLongAnswer,
        showAs: "list",
        maxSelection: "unlimited",
      };
    } else {
      // Reset when modal closes
      initialValuesRef.current = null;
    }
  }, [isOpen, property.formMetaData]);

  // Track if we've initialized to prevent calling update on mount
  const hasInitializedRef = useRef(false);

  // Call update immediately when values change
  const handleUpdate = useCallback(() => {
    if (!initialValuesRef.current || !hasInitializedRef.current) return;

    const initial = initialValuesRef.current;
    
    // Check if there are any changes
    const hasChanges =
      isRequired !== initial.isRequired ||
      hasDescription !== initial.hasDescription ||
      (hasDescription && description !== initial.description) ||
      (!hasDescription && initial.hasDescription) ||
      isLongAnswer !== initial.isLongAnswer;

    // Only call onUpdate if there are actual changes
    if (hasChanges) {
      onUpdate({
        isRequired,
        description: hasDescription ? description : undefined,
        isLongAnswer,
        showAs: property.type === "select" || property.type === "multi_select" ? showAs : undefined,
        maxSelection: maxSelection === "unlimited" ? undefined : maxSelection,
      });
    }
  }, [isRequired, hasDescription, description, isLongAnswer, showAs, maxSelection, property.type, onUpdate]);

  // Reset initialization flag when modal opens
  useEffect(() => {
    if (isOpen) {
      // Set a small delay to mark as initialized after state is set
      const timer = setTimeout(() => {
        hasInitializedRef.current = true;
      }, 100);
      return () => clearTimeout(timer);
    } else {
      hasInitializedRef.current = false;
    }
  }, [isOpen]);

  // Call update immediately when any value changes (after initialization)
  useEffect(() => {
    if (!isOpen || !hasInitializedRef.current) return;
    handleUpdate();
  }, [isRequired, hasDescription, description, isLongAnswer, isOpen, handleUpdate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSelectType = property.type === "select" || property.type === "multi_select";
  const isMultiSelect = property.type === "multi_select";
  const isTextType = property.type === "text" || property.type === "email" || property.type === "url" || property.type === "phone";

  const handleToggle =
    (setter: Dispatch<SetStateAction<boolean>>) =>
    (checked?: boolean) => {
      setter((prev) => (typeof checked === "boolean" ? checked : !prev));
    };

  const renderSwitch = (
    checked: boolean,
    setter: Dispatch<SetStateAction<boolean>>,
    onToggle?: (checked: boolean) => void,
    disabled?: boolean,
  ) => (
    <label
      className="relative inline-flex items-center cursor-pointer"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => {
          e.stopPropagation();
          handleToggle(setter)(e.target.checked);
          onToggle?.(e.target.checked);
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="sr-only peer"
      />
      <div className="w-7 h-4 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  );

  const renderChevronText = (text: string) => (
    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm">
      <span>{text}</span>
      <ChevronRight className="w-4 h-4" />
    </div>
  );

  const menuItems = useMemo(() => {
    const items: DropdownMenuItemProps[] = [];
    const dividerAfter: number[] = [];

    items.push({
      id: "required",
      label: "Required",
      icon: <Asterisk className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />,
      onClick: () => handleToggle(setIsRequired)(),
      rightElement: renderSwitch(isRequired, setIsRequired),
    });

    items.push({
      id: "description",
      label: "Description",
      icon: <AlignLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />,
      onClick: () => {
        const next = !hasDescription;
        setHasDescription(next);
        if (!next) {
          setDescription("");
        }
      },
      rightElement: renderSwitch(hasDescription, setHasDescription, (checked) => {
        if (!checked) {
          setDescription("");
        }
      }),
    });

    if (isSelectType) {
      items.push({
        id: "show-options",
        label: "Show options as",
        icon: <List className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />,
        onClick: () => setShowAs((prev) => (prev === "list" ? "dropdown" : "list")),
        rightElement: renderChevronText(showAs === "list" ? "List view" : "Dropdown"),
      });
    }

    if (isMultiSelect) {
      items.push({
        id: "max-selection",
        label: "Max selection",
        icon: <Hash className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />,
        onClick: () => {
          // Placeholder for future max selection modal
        },
        rightElement: renderChevronText(maxSelection === "unlimited" ? "Unlimited" : String(maxSelection)),
      });
    }

    if (isTextType) {
      items.push({
        id: "long-answer",
        label: "Long answer",
        icon: <AlignLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />,
        onClick: () => handleToggle(setIsLongAnswer)(),
        rightElement: renderSwitch(isLongAnswer, setIsLongAnswer),
      });
    }

    dividerAfter.push(items.length - 1);

    items.push({
      id: "question-type",
      label: "Question type",
      icon: (
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          <div className="w-4 h-4 border-2 border-gray-400 dark:border-gray-500 rounded" />
        </div>
      ),
      onClick: () => {},
      rightElement: renderChevronText(property.type),
    });

    if (property.type === "relation") {
      items.push({
        id: "view-linked",
        label: "View linked property",
        icon: <Database className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />,
        onClick: () => {},
        hasChevron: true,
      });
    }

    items.push({
      id: "sync-name",
      label: "Sync with property name",
      icon: <Link2 className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />,
      onClick: () => {},
      rightElement: (
        <label
          className="relative inline-flex items-center cursor-default opacity-70"
          onClick={(e) => e.stopPropagation()}
        >
          <input type="checkbox" checked readOnly className="sr-only peer" />
          <div className="w-7 h-4 bg-blue-600 rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all" />
        </label>
      ),
    });

    dividerAfter.push(items.length - 1);

    items.push({
      id: "move-question",
      label: "Move question",
      icon: <ArrowUpDown className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />,
      onClick: () => {},
      hasChevron: true,
    });

    items.push({
      id: "duplicate-question",
      label: "Duplicate question",
      icon: <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />,
      onClick: () => onDuplicate(),
    });

    items.push({
      id: "delete-question",
      label: "Delete question",
      icon: <Trash2 className="w-5 h-5" />,
      onClick: () => onDelete(),
      variant: "destructive",
    });

    return { items, dividerAfter };
  }, [
    isRequired,
    hasDescription,
    showAs,
    maxSelection,
    isLongAnswer,
    property.type,
    isSelectType,
    isMultiSelect,
    isTextType,
    onDelete,
    onDuplicate,
  ]);

  return (
    <div
      ref={modalRef}
      className="absolute z-[200] bg-white dark:bg-[#242424] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-[290px] max-h-[80vh] overflow-hidden"
      style={{
        borderRadius: "10px",
        top: position?.top ? `${position.top}px` : undefined,
        left: position?.left ? `${position.left}px` : undefined,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center px-4 py-3.5 border-b border-gray-200 dark:border-gray-700">
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Question options</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <DropdownMenu items={menuItems.items} dividerAfter={menuItems.dividerAfter} />
        </div>
      </div>
    </div>
  );
}


