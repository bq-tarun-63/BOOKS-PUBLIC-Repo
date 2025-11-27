"use client";

import { useBoard } from "@/contexts/boardContext";
import { deleteWithAuth, postWithAuth, getWithAuth } from "@/lib/api-helpers";
import type { BoardProperty, ViewCollection, Note, RollupCalculation, RollupConfig,GitHubPrConfig } from "@/types/board";
import {
  ArrowLeft,
  ChevronRight,
  GripVertical,
  Info,
  Lock,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Calculator,
  ArrowUpRight,
  Search,
  BookOpen,
  Sparkles,
  Copy,
  Trash2,
  Link2,
  Check,
  ChevronDown,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { toast } from "sonner";
import { PROPERTY_TYPES } from "./addPropertyDialog";
import ColorPickerPopup from "./colorPickerPopup";
import DeleteConfirmationModal from "../ui/deleteConfirmationModal";
import { createFormulaRuntime } from "@/lib/formula/evaluator";
import { ObjectId } from "bson";
import type { FormulaPropertyDefinition } from "@/lib/formula/evaluator";
import { formatFormulaValue, type FormulaReturnType } from "@/utils/formatFormulaValue";
import {
  FORMULA_FUNCTION_GROUPS,
  extractFormulaFromElement,
  getFormulaReturnLabel,
  renderFormulaDisplay,
  type FormulaFunctionSpec,
} from "@/utils/formulaReferences";
import FormulaEditorModal from "./FormulaEditorModal";
import { DropdownMenuHeader, DropdownMenuEditableItem, DropdownMenu, DropdownMenuDivider, DropdownMenuToggle, DropdownMenuIcons } from "@/components/tailwind/ui/dropdown-menu";
import { normalizeCalculation } from "@/utils/rollupUtils";
import { GitHubPrPropertySettings } from "./properties/githubPrPropertySettings";


function NumberSelectPopup({
  type,
  anchorEl,
  current,
  onSelect,
  onClose,
}: {
  type: "numberFormat" | "decimalPlaces" | "showAs";
  anchorEl: HTMLElement | null;
  current: { numberFormat: string; decimalPlaces: number; showAs: "number" | "bar" | "ring" };
  onSelect: (value: string | number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  // Update position when anchor element changes or on scroll/resize
  useEffect(() => {
    if (!anchorEl) return;
    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      setCoords({ left: rect.left, top: rect.bottom + 4 });
    };

    // Initial position
    updatePosition();

    // Update position on scroll and resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorEl]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Also check if click is not on the anchor element
        if (anchorEl && !anchorEl.contains(e.target as Node)) {
          onClose();
        }
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc as any);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc as any);
    };
  }, [onClose, anchorEl]);

  const items: Array<{ label: string; value: string | number; selected: boolean }> = (() => {
    if (type === "numberFormat") {
      const values = ["number", "percent", "currency"] as const;
      return values.map((v) => ({ label: v.charAt(0).toUpperCase() + v.slice(1), value: v, selected: current.numberFormat === v }));
    }
    if (type === "decimalPlaces") {
      const values = Array.from({ length: 7 }, (_, i) => i);
      return values.map((v) => ({ label: String(v), value: v, selected: current.decimalPlaces === v }));
    }
    // showAs
    const values = ["number", "bar", "ring"] as const;
    return values.map((v) => ({ label: v.charAt(0).toUpperCase() + v.slice(1), value: v, selected: current.showAs === v }));
  })();

  const popupContent = (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", left: coords.left, top: coords.top, zIndex: 9999 }}
      className="min-w-[220px] rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 shadow-lg p-1"
    >
      {items.map((item) => (
        <button
          key={`${type}-${item.value}`}
          type="button"
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${item.selected ? "bg-gray-100 dark:bg-gray-700" : ""}`}
          onClick={() => onSelect(item.value)}
        >
          <span className="text-gray-900 dark:text-gray-100">{item.label}</span>
          {item.selected && (
            <svg aria-hidden="true" viewBox="0 0 20 20" className="w-4 h-4 fill-current text-gray-600 dark:text-gray-300"><path d="M7.629 13.963 3.666 10l1.178-1.178 2.785 2.785 7.528-7.528L16.334 5z"/></svg>
          )}
        </button>
      ))}
    </div>
  );

  // Use portal to render outside modal hierarchy
  if (typeof window !== "undefined" && anchorEl) {
    return createPortal(popupContent, document.body);
  }

  return null;
}

type PropertySuggestionState = {
  query: string;
  items: Array<{ id: string; name: string }>;
  anchor: { left: number; top: number };
  replaceStart: number;
  replaceLength: number;
  sourceValue: string;
};

const PROPERTY_SUGGESTION_REGEX = /prop\(\s*["']([^"']*)$/;

const defaultGithubPrConfig: GitHubPrConfig = {
  defaultOwner: "",
  defaultRepo: "",
  installationId: undefined,
  statusPropertyId: undefined,
  pendingStatusOptionId: undefined,
  completedStatusOptionId: undefined,
  autoSync: true,
};

function mergeGithubPrConfig(config?: GitHubPrConfig | null): GitHubPrConfig {
  return {
    ...defaultGithubPrConfig,
    ...(config ?? {}),
  };
}


interface EditSinglePropertyModalProps {
  readonly board: ViewCollection;
  readonly propertyId: string;
  readonly property: BoardProperty;
  readonly onClose: () => void;
  readonly onBack: () => void;
}

export default function EditSinglePropertyModal({
  board,
  propertyId,
  property,
  onClose,
  onBack,
}: EditSinglePropertyModalProps) {
  
  const [propertyName, setPropertyName] = useState(property.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [wrapInView, setWrapInView] = useState(true);
  const [localOptions, setLocalOptions] = useState(property.options || []);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [colorPickerOptionId, setColorPickerOptionId] = useState<string | null>(null);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
  // Number property configuration state
  const [numberFormat, setNumberFormat] = useState<string>((property as any).numberFormat ?? "number");
  const [decimalPlaces, setDecimalPlaces] = useState<number>((property as any).decimalPlaces ?? 0);
  const [showAs, setShowAs] = useState<"number" | "bar" | "ring">(((property as any).showAs as any) ?? "number");
  const [progressColor, setProgressColor] = useState<string>((property as any).progressColor ?? "blue");
  const [progressDivideBy, setProgressDivideBy] = useState<number>(Number((property as any).progressDivideBy ?? 100));
  const [showNumberText, setShowNumberText] = useState<boolean>((property as any).showNumberText ?? true);
  const [selectPopup, setSelectPopup] = useState<
    | {
        type: "numberFormat" | "decimalPlaces" | "showAs";
        anchorEl: HTMLElement | null;
      }
    | null
  >(null);
  const [formulaValue, setFormulaValue] = useState(property.formula ?? "");
  const [formulaReturnType, setFormulaReturnType] = useState<FormulaReturnType>(property.formulaReturnType ?? "text");
  const [isSavingFormula, setIsSavingFormula] = useState(false);
  const [formulaPreview, setFormulaPreview] = useState<
    Array<{ noteId: string; title: string; value: string; error?: string }>
  >([]);
  const [formulaValidationError, setFormulaValidationError] = useState<string | null>(null);
  const defaultFunction = FORMULA_FUNCTION_GROUPS[0]?.items[0];
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>(defaultFunction?.id ?? "");
  const [showTypeHints, setShowTypeHints] = useState(false);
  const [previewNoteId, setPreviewNoteId] = useState<string>("");
  const modalRef = useRef<HTMLDivElement>(null);
  const formulaEditorRef = useRef<HTMLDivElement>(null);
  const [propertySuggestions, setPropertySuggestions] = useState<PropertySuggestionState | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [deleteOptionId, setDeleteOptionId] = useState<string | null>(null);
  const [showDeletePropertyConfirm, setShowDeletePropertyConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Relation property configuration state
  const [relationLimit, setRelationLimit] = useState<"single" | "multiple">((property as any).relationLimit ?? "multiple");
  const [showLimitMenu, setShowLimitMenu] = useState(false);
  const limitMenuRef = useRef<HTMLDivElement>(null);
  const limitMenuButtonRef = useRef<HTMLButtonElement>(null);  
  // Rollup property configuration state
  const isRollupType = property.type === "rollup";
  const rollupConfig = (property as any).rollup || {};
  const [rollupRelationId, setRollupRelationId] = useState<string | undefined>(rollupConfig.relationPropertyId);
  const [rollupTargetPropertyId, setRollupTargetPropertyId] = useState<string | undefined>(rollupConfig.targetPropertyId);
  const [rollupCalculation, setRollupCalculation] = useState<RollupCalculation>(normalizeCalculation(rollupConfig.calculation));
  const [rollupSelectedOptions, setRollupSelectedOptions] = useState<string[]>(rollupConfig.selectedOptions || []);
  const [openRollupMenu, setOpenRollupMenu] = useState<"relation" | "property" | "calculation" | null>(null);
  const [calculationSubmenu, setCalculationSubmenu] = useState<"count" | "percent" | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [localSelectedOptions, setLocalSelectedOptions] = useState<string[]>(rollupSelectedOptions);
  const rollupRelationMenuRef = useRef<HTMLDivElement>(null);
  const rollupPropertyMenuRef = useRef<HTMLDivElement>(null);
  const rollupCalculationMenuRef = useRef<HTMLDivElement>(null);
  const rollupCalculationSubmenuRef = useRef<HTMLDivElement>(null);
  const rollupOptionsModalRef = useRef<HTMLDivElement>(null);
  const [loadingTargetProperties, setLoadingTargetProperties] = useState(false);
  const [rollupDataSourceLoading, setRollupDataSourceLoading] = useState<Record<string, boolean>>({});
  const [githubConfig, setGithubConfig] = useState<GitHubPrConfig>(() =>
    mergeGithubPrConfig(property.githubPrConfig),
  );
  const { updateBoard, updateAllNotes, getNotesByDataSourceId, getCurrentDataSourceProperties, updateDataSource, setDataSource, currentView, dataSources, boards ,getDataSource} = useBoard();
  
  // Get properties from current data source
  const boardProperties = getCurrentDataSourceProperties(board._id) || board.properties;
  // Get latest board from context
  const latestBoard = boards.find((b) => b._id === board._id) || board;
  
  // Helper to get dataSourceId from current view ID (not type)
  // IMPORTANT: Always match by view ID first, only use type as fallback
  const getCurrentDataSourceId = (): string | null => {
    const cv = currentView?.[board._id];
    
    let v;
    if (cv?.id) {
      // Prioritize ID match - if cv.id exists, ONLY match by ID
      v = latestBoard.viewsType?.find((vt) => vt.id === cv.id);
    } else if (cv?.type) {
      // Only fallback to type if no ID is available
      v = latestBoard.viewsType?.find((vt) => vt.viewType === cv.type);
    }
    
    const dsId = v?.databaseSourceId;
    return dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
  };
  
  const isDefault = !!property.default;
  const isStatusOrPriorityOrSelect =
    property.type === "status" ||
    property.type === "priority" ||
    property.type === "select" ||
    property.type === "multi_select";
  const isPersonType = property.type === "person";
  const isDateType = property.type === "date";
  const isRelationType = property.type === "relation";
  // Check if two-way relation exists (has syncedPropertyId)
  const hasTwoWayRelation = !!(property as any).syncedPropertyId;
  const linkedDatabaseId = (property as any).linkedDatabaseId;
  // Get linked datasource title
  const linkedDataSource = linkedDatabaseId 
    ? dataSources[typeof linkedDatabaseId === "string" ? linkedDatabaseId : String(linkedDatabaseId)]
    : null;
  const linkedDataSourceTitle = linkedDataSource?.title || "Unknown";
  // getCurrentDataSourceId is already declared above, reuse it
  const currentDataSourceId = getCurrentDataSourceId();
  const boardNotes = currentDataSourceId ? getNotesByDataSourceId(currentDataSourceId) : [];
  const formulaFunctionLookup = useMemo(() => {
    const map = new Map<string, FormulaFunctionSpec>();
    for (const group of FORMULA_FUNCTION_GROUPS) {
      for (const fn of group.items) {
        map.set(fn.id, fn);
      }
    }
    return map;
  }, []);
  const selectedFunction = useMemo(
    () => formulaFunctionLookup.get(selectedFunctionId) ?? defaultFunction ?? null,
    [defaultFunction, formulaFunctionLookup, selectedFunctionId],
  );
  const propertyChipList = useMemo(
    () =>
      Object.entries(boardProperties ?? {})
        .filter(([id]) => id !== propertyId)
        .map(([id, schema]) => ({ id, name: schema.name, type: schema.type })),
    [boardProperties, propertyId],
  );
  const statusProperties = useMemo(
    () =>
      Object.entries(boardProperties ?? {})
        .filter(([, schema]) => schema.type === "status")
        .map(([id, schema]) => ({
          id,
          name: schema.name,
          options: schema.options,
        })),
    [boardProperties],
  );
  const previewNoteOptions = useMemo(() => {
    if (formulaPreview.length > 0) {
      return formulaPreview.map((preview, index) => ({
        id: preview.noteId,
        title: preview.title || `Preview ${index + 1}`,
      }));
    }
    return boardNotes.slice(0, 3).map((note, index) => ({
      id: String(note._id ?? note.id ?? `note-${index}`),
      title: note.title || `Note ${index + 1}`,
    }));
  }, [boardNotes, formulaPreview]);
  const activePreviewEntry = useMemo(() => {
    if (formulaPreview.length === 0) {
      return undefined;
    }
    const fromSelection = formulaPreview.find((preview) => preview.noteId === previewNoteId);
    return fromSelection ?? formulaPreview[0];
  }, [formulaPreview, previewNoteId]);

  // Rollup relation options
  const rollupRelationOptions = useMemo(
    () =>
      Object.entries(boardProperties)
        .filter(([, prop]) => prop.type === "relation")
        .map(([id, prop]) => ({
          id,
          name: prop.name || "Relation",
          linkedDatabaseId: prop.linkedDatabaseId
            ? String(prop.linkedDatabaseId)
            : undefined,
        })),
    [boardProperties],
  );

  // Get selected relation
  const selectedRollupRelation = rollupRelationOptions.find((opt) => opt.id === rollupRelationId);
  const rollupRelationDataSourceId = selectedRollupRelation?.linkedDatabaseId;

  // Get target properties from linked data source
  const rollupTargetProperties = useMemo(() => {
    if (!rollupRelationDataSourceId) return {};
    const dataSource = getDataSource(rollupRelationDataSourceId);
    return dataSource?.properties || {};
  }, [rollupRelationDataSourceId, getDataSource, dataSources]);

  // Get selected target property
  const selectedRollupTargetProperty = rollupTargetPropertyId
    ? rollupTargetProperties[rollupTargetPropertyId]
    : undefined;
  const SelectedTargetPropertyIcon = selectedRollupTargetProperty
    ? PROPERTY_TYPES.find((p) => p.type === selectedRollupTargetProperty.type)?.icon
    : undefined;

  // Helper to get calculation label
  const getCalculationLabel = (calc: RollupCalculation) => {
    if (calc.category === "original") return "Show original";
    if (calc.category === "count") {
      if (calc.value === "all") return "Count all";
      if (calc.value === "per_group") return "Count per group";
      if (calc.value === "empty") return "Count empty";
      if (calc.value === "non_empty") return "Count non empty";
      return "Count";
    }
    if (calc.category === "percent") {
      if (calc.value === "all") return "Percent all";
      if (calc.value === "per_group") return "Percent per group";
      if (calc.value === "empty") return "Percent empty";
      if (calc.value === "non_empty") return "Percent non empty";
      return "Percent";
    }
    return "Select calculation";
  };

  // Ensure rollup data source is loaded
  const ensureRollupDataSource = useCallback(
    async (rawDataSourceId?: string) => {
      if (!rawDataSourceId) return;
      const dataSourceId = String(rawDataSourceId);
      if (getDataSource(dataSourceId)) return;
      if (rollupDataSourceLoading[dataSourceId]) return;

      setRollupDataSourceLoading((prev) => ({ ...prev, [dataSourceId]: true }));
      try {
        const response: any = await getWithAuth(`/api/database/getdataSource/${dataSourceId}`);
        if (response?.success && response.collection?.dataSource) {
          const ds = response.collection.dataSource;
          const normalizedId =
            typeof ds._id === "string" ? ds._id : ds._id?.toString?.() || dataSourceId;
          setDataSource(normalizedId, ds);
        }
      } catch (err) {
        console.error("Failed to load linked database", err);
      } finally {
        setRollupDataSourceLoading((prev) => {
          const next = { ...prev };
          delete next[dataSourceId];
          return next;
        });
      }
    },
    [getDataSource, rollupDataSourceLoading, setDataSource],
  );

  // Load rollup data source when relation is selected
  useEffect(() => {
    if (rollupRelationDataSourceId) {
      void ensureRollupDataSource(rollupRelationDataSourceId);
    }
  }, [rollupRelationDataSourceId, ensureRollupDataSource]);

  // Sync localSelectedOptions with rollupSelectedOptions
  useEffect(() => {
    setLocalSelectedOptions(rollupSelectedOptions);
  }, [rollupSelectedOptions]);

  // Handle click outside for rollup modals
  useEffect(() => {
    if (!openRollupMenu && !calculationSubmenu && !showOptionsModal) return;
    const handleClickOutside = (event: MouseEvent) => {
      const node = event.target as Node;
      const refs = [
        rollupRelationMenuRef.current,
        rollupPropertyMenuRef.current,
        rollupCalculationMenuRef.current,
        rollupCalculationSubmenuRef.current,
        rollupOptionsModalRef.current,
      ];
      const clickedInside = refs.some((ref) => ref && ref.contains(node));
      if (!clickedInside) {
        setOpenRollupMenu(null);
        setCalculationSubmenu(null);
        if (showOptionsModal) {
          setShowOptionsModal(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openRollupMenu, calculationSubmenu, showOptionsModal]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    // Auto-focus the input when editing a new option
    if (editingOptionId) {
      const input = document.querySelector(
        `input[defaultValue="${localOptions.find((o) => o.id === editingOptionId)?.name}"]`,
      ) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }
  }, [editingOptionId, localOptions]);

  useEffect(() => {
    if (property.type === "formula") {
      setFormulaValue(property.formula ?? "");
      setFormulaReturnType(property.formulaReturnType ?? "text");
    }
  }, [property.type, property.formula, property.formulaReturnType]);

  useEffect(() => {
    if (property.type === "github_pr") {
      setGithubConfig(mergeGithubPrConfig(property.githubPrConfig));
    }
  }, [property.githubPrConfig, property.type]);

  useEffect(() => {
    if (property.type !== "formula") return;
    const editor = formulaEditorRef.current;
    if (!editor) return;
    const rendered = renderFormulaDisplay(formulaValue);
    if (editor.innerHTML !== rendered) {
      editor.innerHTML = rendered;
    }
  }, [formulaValue, property.type]);

  const focusFormulaEditor = useCallback(() => {
    const editor = formulaEditorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  useEffect(() => {
    if (property.type !== "formula") return;
    requestAnimationFrame(() => {
      focusFormulaEditor();
    });
  }, [property.type, focusFormulaEditor]);

  const updatePropertySuggestions = useCallback(
    (currentValue: string) => {
      if (property.type !== "formula" || propertyChipList.length === 0) {
        setPropertySuggestions(null);
        return;
      }

      const match = PROPERTY_SUGGESTION_REGEX.exec(currentValue);
      if (!match || match.index === undefined) {
        setPropertySuggestions(null);
        return;
      }

      const editor = formulaEditorRef.current;
      if (!editor || document.activeElement !== editor) {
        setPropertySuggestions(null);
        return;
      }

      const query = match[1] ?? "";
      const normalizedQuery = query.trim().toLowerCase();
      const filtered = propertyChipList
        .filter((chip) =>
          normalizedQuery.length === 0 ? true : chip.name.toLowerCase().includes(normalizedQuery),
        )
        .slice(0, 6)
        .map((chip) => ({ id: chip.id, name: chip.name }));

      if (filtered.length === 0) {
        setPropertySuggestions(null);
        return;
      }

      const selection = window.getSelection();
      let anchor = { left: 0, top: editor.offsetHeight };
      if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(false);
        const rect = range.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        if (rect && editorRect) {
          anchor = {
            left: Math.max(0, rect.left - editorRect.left),
            top: Math.max(0, rect.bottom - editorRect.top),
          };
        }
      }

      setPropertySuggestions({
        query,
        items: filtered,
        anchor,
        replaceStart: match.index,
        replaceLength: match[0].length,
        sourceValue: currentValue,
      });
      setActiveSuggestionIndex(0);
    },
    [property.type, propertyChipList],
  );

  const handleFormulaInput = useCallback(() => {
    const editor = formulaEditorRef.current;
    if (!editor) return;
    const newValue = extractFormulaFromElement(editor);
    if (newValue !== formulaValue) {
      setFormulaValue(newValue);
    }
    updatePropertySuggestions(newValue);
  }, [formulaValue, updatePropertySuggestions]);

  const handleFormulaPaste = useCallback((event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    handleFormulaInput();
  }, [handleFormulaInput]);

  const handleFormulaBlur = useCallback(() => {
    setPropertySuggestions(null);
    handleFormulaInput();
  }, [handleFormulaInput]);

  const applyPropertySuggestion = useCallback(
    (propertyName: string) => {
      if (!propertySuggestions) return;
      const sanitized = propertyName.replace(/"/g, '\\"');
      const replacement = `prop("${sanitized}")`;
      const source = propertySuggestions.sourceValue;
      const nextFormula =
        source.slice(0, propertySuggestions.replaceStart) +
        replacement +
        source.slice(propertySuggestions.replaceStart + propertySuggestions.replaceLength);
      setFormulaValue(nextFormula);
      setPropertySuggestions(null);
      requestAnimationFrame(() => {
        focusFormulaEditor();
      });
    },
    [focusFormulaEditor, propertySuggestions],
  );

  const handleFormulaKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!propertySuggestions || propertySuggestions.items.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveSuggestionIndex((prev) => (prev + 1) % propertySuggestions.items.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev === 0 ? propertySuggestions.items.length - 1 : prev - 1,
        );
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const target = propertySuggestions.items[activeSuggestionIndex] ?? propertySuggestions.items[0];
        if (target) {
          applyPropertySuggestion(target.name);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setPropertySuggestions(null);
      }
    },
    [activeSuggestionIndex, applyPropertySuggestion, propertySuggestions],
  );

  useEffect(() => {
    if (property.type === "formula" && !selectedFunctionId && defaultFunction) {
      setSelectedFunctionId(defaultFunction.id);
    }
  }, [property.type, selectedFunctionId, defaultFunction]);

  useEffect(() => {
    if (property.type !== "formula") {
      return;
    }

    if (!formulaValue.trim()) {
      setFormulaPreview([]);
      setFormulaValidationError(null);
      return;
    }

    const handler = window.setTimeout(() => {
      try {
        const propertyDefinitions = buildFormulaDefinitions(formulaValue, formulaReturnType);

        const runtime = createFormulaRuntime(propertyDefinitions);

        if (!runtime.hasFormulas) {
          setFormulaPreview([]);
          setFormulaValidationError(null);
          return;
        }

        const sampleNotes = boardNotes.slice(0, 3);
        if (sampleNotes.length === 0) {
          setFormulaPreview([]);
          setFormulaValidationError(null);
          return;
        }

        const previewResults = sampleNotes.map((note, index) => {
          const evaluation = runtime.recomputeFormulasForNote({
            ...note,
            databaseProperties: note.databaseProperties ?? {},
            formulaErrors: note.formulaErrors ?? {},
          });
          const result = evaluation.results[propertyId];
          const displayValue = result
            ? formatFormulaValue(result.value, formulaReturnType, { fallback: "—" })
            : "—";

          return {
            noteId: String(note._id ?? note.id ?? `preview-${index}`),
            title: note.title || "Untitled",
            value: displayValue,
            error: result?.error,
          };
        });

        setFormulaPreview(previewResults);
        if (previewResults.length > 0) {
          const firstPreview = previewResults[0]!;
          setPreviewNoteId((current) => {
            if (!current) {
              return firstPreview.noteId;
            }
            const stillExists = previewResults.some((result) => result.noteId === current);
            return stillExists ? current : firstPreview.noteId;
          });
        } else {
          setPreviewNoteId("");
        }
        setFormulaValidationError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid formula";
        setFormulaPreview([]);
        setPreviewNoteId("");
        setFormulaValidationError(message);
      }
    }, 400);

    return () => window.clearTimeout(handler);
  }, [
    property.type,
    formulaValue,
    formulaReturnType,
    boardNotes,
    propertyId,
  ]);

  useEffect(() => {
    if (!previewNoteId && previewNoteOptions.length > 0) {
      const fallbackOption = previewNoteOptions[0];
      if (fallbackOption) {
        setPreviewNoteId(fallbackOption.id);
      }
    }
  }, [previewNoteId, previewNoteOptions]);

  const getPropertyIcon = (type: string) => {
    const propType = PROPERTY_TYPES.find((p) => p.type === type);
    return propType ? propType.icon : null;
  };

  const getPropertyLabel = (type: string) => {
    const propType = PROPERTY_TYPES.find((p) => p.type === type);
    return propType ? propType.label : type;
  };

  const getColorStyles = (colorValue = "default") => {
    const colorMap: Record<string, { bg: string; dot: string }> = {
      default: { bg: "bg-gray-200 dark:bg-gray-700", dot: "bg-gray-500" },
      gray: { bg: "bg-gray-200 dark:bg-gray-700", dot: "bg-gray-500" },
      brown: { bg: "bg-orange-200 dark:bg-orange-900", dot: "bg-orange-600" },
      orange: { bg: "bg-orange-200 dark:bg-orange-800", dot: "bg-orange-600" },
      yellow: { bg: "bg-yellow-200 dark:bg-yellow-800", dot: "bg-yellow-600" },
      green: { bg: "bg-green-200 dark:bg-green-800", dot: "bg-green-600" },
      blue: { bg: "bg-blue-200 dark:bg-blue-800", dot: "bg-blue-600" },
      purple: { bg: "bg-purple-200 dark:bg-purple-800", dot: "bg-purple-600" },
      pink: { bg: "bg-pink-200 dark:bg-pink-800", dot: "bg-pink-600" },
      red: { bg: "bg-red-200 dark:bg-red-800", dot: "bg-red-600" },
    };
    return (colorMap[colorValue] || colorMap.default) as { bg: string; dot: string };
  };

  const getProgressColorValue = (colorName: string | undefined): string => {
    const colorMap: Record<string, string> = {
      default: "rgb(107, 114, 128)", // gray-500
      gray: "rgb(107, 114, 128)",
      brown: "rgb(234, 88, 12)", // orange-600
      orange: "rgb(234, 88, 12)",
      yellow: "rgb(202, 138, 4)", // yellow-600
      green: "rgb(22, 163, 74)", // green-600
      blue: "rgb(37, 99, 235)", // blue-600
      purple: "rgb(147, 51, 234)", // purple-600
      pink: "rgb(219, 39, 119)", // pink-600
      red: "rgb(220, 38, 38)", // red-600
    };
    const key = colorName || "default";
    return (colorMap[key] ?? colorMap.default) as string;
  };

  const buildFormulaDefinitions = (
    nextFormula: string,
    nextReturnType: FormulaReturnType,
  ): Record<string, FormulaPropertyDefinition> => {
    return Object.entries(boardProperties || {}).reduce(
      (acc, [id, schema]) => {
        const definition: FormulaPropertyDefinition = {
          id,
          name: schema.name,
          type: schema.type,
          formula: schema.type === "formula" ? schema.formula ?? "" : undefined,
          formulaReturnType: schema.formulaReturnType,
          options: schema.options,
        };

        if (id === propertyId) {
          definition.formula = nextFormula;
          definition.formulaReturnType = nextReturnType;
        }

        acc[id] = definition;
        return acc;
      },
      {} as Record<string, FormulaPropertyDefinition>,
    );
  };

  const Icon = getPropertyIcon(property.type);

  const handleSaveName = async () => {
    if (!propertyName.trim()) {
      toast.error("Property name cannot be empty");
      return;
    }

    if (propertyName.trim() === property.name) {
      return;
    }

    // Get dataSourceId from current view ID (not type)
    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      toast.error("Data source not found for current view!");
      setIsSavingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const payload: Record<string, any> = {
        dataSourceId: dataSourceId,
        viewId: board._id, // Optional for audit
        propertyId: propertyId,
        newName: propertyName.trim(),
        type: property.type,
        options: property.options || [],
        showProperty: property.showProperty,
      };

      if (property.type === "formula") {
        payload.formula = property.formula ?? "";
        payload.formulaReturnType = property.formulaReturnType ?? "text";
      }

      const res = await postWithAuth("/api/database/updatePropertySchema", payload);

      if ((res as { isError?: boolean })?.isError) {
        throw new Error((res as { message?: string }).message || "Failed to update property name");
      }

      // Update data source in context from API response
      if ((res as { success?: boolean; dataSource?: any }).success && (res as { dataSource?: any }).dataSource) {
        const ds = (res as { dataSource: any }).dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
        if (dsId) {
          setDataSource(dsId, ds);
        }
      }

      toast.success("Property name updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update property name");
      setPropertyName(property.name);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleAddOption = async () => {
    const newOptionId = `opt_${new ObjectId()}`;
    const newOption = {
      id: newOptionId,
      name: "New Option",
      color: "default",
    };

    const updatedOptions = [...localOptions, newOption];
    setLocalOptions(updatedOptions);
    setEditingOptionId(newOptionId);

    // Get dataSourceId from current view ID (not type)
    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      toast.error("Data source not found for current view!");
      setLocalOptions(property.options || []);
      return;
    }

    // Save to backend
    try {
      const res = await postWithAuth("/api/database/updatePropertySchema", {
        dataSourceId: dataSourceId,
        viewId: board._id, // Optional for audit
        propertyId: propertyId,
        newName: propertyName,
        type: property.type,
        options: updatedOptions,
        showProperty: property.showProperty,
      });

      if ((res as { isError?: boolean })?.isError) {
        throw new Error((res as { message?: string }).message || "Failed to add option");
      }

      // Update data source in context from API response
      if ((res as { success?: boolean; dataSource?: any }).success && (res as { dataSource?: any }).dataSource) {
        const ds = (res as { dataSource: any }).dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
        if (dsId) {
          setDataSource(dsId, ds);
        }
      }

      toast.success("Option added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add option");
      setLocalOptions(property.options || []);
    }
  };

  const handleUpdateOption = async (optionId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error("Option name cannot be empty");
      return;
    }

    const updatedOptions = localOptions.map((opt) => (opt.id === optionId ? { ...opt, name: newName.trim() } : opt));
    setLocalOptions(updatedOptions);
    setEditingOptionId(null);

    // Get dataSourceId from current view ID (not type)
    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      toast.error("Data source not found for current view!");
      setLocalOptions(property.options || []);
      return;
    }

    // Save to backend
    try {
      const res = await postWithAuth("/api/database/updatePropertySchema", {
        dataSourceId: dataSourceId,
        viewId: board._id, // Optional for audit
        propertyId: propertyId,
        newName: propertyName,
        type: property.type,
        options: updatedOptions,
        showProperty: property.showProperty,
      });

      if ((res as { isError?: boolean })?.isError) {
        throw new Error((res as { message?: string }).message || "Failed to update option");
      }

      // Update data source in context from API response
      if ((res as { success?: boolean; dataSource?: any }).success && (res as { dataSource?: any }).dataSource) {
        const ds = (res as { dataSource: any }).dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
        if (dsId) {
          setDataSource(dsId, ds);
        }
      }

      toast.success("Option updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update option");
      setLocalOptions(property.options || []);
    }
  };

  const handleDeleteOption = (optionId: string) => {
    setDeleteOptionId(optionId);
  };

  const confirmDeleteOption = async () => {
    if (!deleteOptionId) return;

    const optionToDelete = localOptions.find((opt) => opt.id === deleteOptionId);
    const updatedOptions = localOptions.filter((opt) => opt.id !== deleteOptionId);
    setLocalOptions(updatedOptions);
    setDeleteOptionId(null);
    setIsDeleting(true);

    // Get dataSourceId from current view ID (not type)
    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      toast.error("Data source not found for current view!");
      setLocalOptions(property.options || []);
      setIsDeleting(false);
      return;
    }

    // Save to backend
    try {
      const res = await postWithAuth("/api/database/updatePropertySchema", {
        dataSourceId: dataSourceId,
        viewId: board._id, // Optional for audit
        propertyId: propertyId,
        newName: propertyName,
        type: property.type,
        options: updatedOptions,
        showProperty: property.showProperty,
      });

      if ((res as { isError?: boolean })?.isError) {
        throw new Error((res as { message?: string }).message || "Failed to delete option");
      }

      // Update data source in context from API response
      if ((res as { success?: boolean; dataSource?: any }).success && (res as { dataSource?: any }).dataSource) {
        const ds = (res as { dataSource: any }).dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
        if (dsId) {
          setDataSource(dsId, ds);
        }
      }

      toast.success("Option deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete option");
      setLocalOptions(property.options || []);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleColorChange = async (optionId: string, newColor: string) => {
    const updatedOptions = localOptions.map((opt) => (opt.id === optionId ? { ...opt, color: newColor } : opt));
    setLocalOptions(updatedOptions);
    setColorPickerOptionId(null);
    setColorPickerAnchor(null);

    // Get dataSourceId from current view ID (not type)
    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      toast.error("Data source not found for current view!");
      setLocalOptions(property.options || []);
      return;
    }

    // Save to backend
    try {
      const res = await postWithAuth("/api/database/updatePropertySchema", {
        dataSourceId: dataSourceId,
        viewId: board._id, // Optional for audit
        propertyId: propertyId,
        newName: propertyName,
        type: property.type,
        options: updatedOptions,
        showProperty: property.showProperty,
      });

      if ((res as { isError?: boolean })?.isError) {
        throw new Error((res as { message?: string }).message || "Failed to update option color");
      }

      // Update data source in context from API response
      if ((res as { success?: boolean; dataSource?: any }).success && (res as { dataSource?: any }).dataSource) {
        const ds = (res as { dataSource: any }).dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
        if (dsId) {
          setDataSource(dsId, ds);
        }
      }

      toast.success("Option color updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update option color");
      setLocalOptions(property.options || []);
    }
  };

  const handleDuplicateProperty = async () => {
    toast.info("Duplicate property feature coming soon");
  };

  const insertPropReference = (propName: string) => {
    const sanitized = propName.replace(/"/g, '\\"');
    const tokenFormula = `prop("${sanitized}")`;
    const editor = formulaEditorRef.current;
    const selection = window.getSelection();

    if (editor && selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const wrapper = document.createElement("span");
      wrapper.innerHTML = renderFormulaDisplay(tokenFormula);
      const fragment = document.createDocumentFragment();
      while (wrapper.firstChild) {
        fragment.appendChild(wrapper.firstChild);
      }
      range.insertNode(fragment);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      handleFormulaInput();
      requestAnimationFrame(() => focusFormulaEditor());
      setPropertySuggestions(null);
      return;
    }

    setFormulaValue((prev) => (prev ? `${prev} ${tokenFormula}` : tokenFormula));
    requestAnimationFrame(() => {
      focusFormulaEditor();
    });
    setPropertySuggestions(null);
  };

  const originalFormula = property.formula ?? "";
  const originalFormulaReturnType = property.formulaReturnType ?? "text";
  const isFormulaDirty =
    property.type === "formula" &&
    (formulaValue !== originalFormula || formulaReturnType !== originalFormulaReturnType);

  const handleSaveFormula = async () => {
    if (property.type !== "formula") {
      return;
    }
    // Get dataSourceId from current view ID (not type)
    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      toast.error("Data source not found for current view!");
      setIsSavingFormula(false);
      return;
    }

    setIsSavingFormula(true);
    try {
      const res = await postWithAuth("/api/database/updatePropertySchema", {
        dataSourceId: dataSourceId,
        viewId: board._id, // Optional for audit
        propertyId,
        newName: propertyName,
        type: property.type,
        options: property.options || [],
        showProperty: property.showProperty,
        formula: formulaValue,
        formulaReturnType,
      });

      if ((res as { isError?: boolean })?.isError) {
        throw new Error((res as { message?: string }).message || "Failed to update formula");
      }

      // Update data source in context from API response
      if ((res as { success?: boolean; dataSource?: any }).success && (res as { dataSource?: any }).dataSource) {
        const ds = (res as { dataSource: any }).dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
        if (dsId) {
          setDataSource(dsId, ds);
        }
      }

      const propertyDefinitions = buildFormulaDefinitions(formulaValue, formulaReturnType);
      const runtime = createFormulaRuntime(propertyDefinitions);

      if (runtime.hasFormulas && boardNotes.length > 0) {
        const originalNotesMap = new Map<string, Note>();
        boardNotes.forEach((note, idx) => {
          const key = String(note._id ?? note.id ?? `note-${idx}`);
          originalNotesMap.set(key, note);
        });

        const recomputed = runtime.recomputeFormulasForNotes(
          boardNotes.map((note) => ({
            ...note,
            databaseProperties: note.databaseProperties ?? {},
            formulaErrors: note.formulaErrors ?? {},
          })),
        );

        const mergedNotes = recomputed.map(({ note: computedNote }, idx) => {
          const key = String(computedNote._id ?? (computedNote as Note).id ?? `note-${idx}`);
          const original = originalNotesMap.get(key);

          return {
            ...(original || {}),
            ...computedNote,
            databaseProperties: computedNote.databaseProperties ?? {},
            formulaErrors: computedNote.formulaErrors ?? {},
          } as Note;
        });

        // Get dataSourceId from current view
        // IMPORTANT: Always match by view ID first, only use type as fallback
        const cv = currentView[board._id];
        
        let v;
        if (cv?.id) {
          // Prioritize ID match - if cv.id exists, ONLY match by ID
          v = latestBoard.viewsType?.find((vt) => vt.id === cv.id);
        } else if (cv?.type) {
          // Only fallback to type if no ID is available
          v = latestBoard.viewsType?.find((vt) => vt.viewType === cv.type);
        }
        
        const dsId = v?.databaseSourceId;
        if (dsId) {
          const normalizedDsId = typeof dsId === "string" ? dsId : String(dsId);
          updateAllNotes(normalizedDsId, mergedNotes);
        }
      }

      toast.success("Formula updated");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update formula");
    } finally {
      setIsSavingFormula(false);
    }
  };

  const handleDone = () => {
    if (isSavingFormula) {
      return;
    }
    if (!isFormulaDirty) {
      onClose();
      return;
    }
    if (formulaValidationError) {
      toast.error("Resolve the formula error before finishing");
      return;
    }
    void handleSaveFormula();
  };

  const handleCopyExample = async (code: string) => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(code);
      toast.success("Copied example to clipboard");
    } catch (error) {
      console.error(error);
      toast.error("Unable to copy example");
    }
  };

  const handleDeleteProperty = () => {
    // if (isDefault) {
    //   toast.error("Cannot delete default properties");
    //   return;
    // }
    setShowDeletePropertyConfirm(true);
  };

  const confirmDeleteProperty = async () => {
    setShowDeletePropertyConfirm(false);
    setIsDeleting(true);

    try {
      // Get dataSourceId from current view ID (not type)
      // IMPORTANT: Always match by view ID first, only use type as fallback
      const cv = currentView?.[board._id];
      
      let v;
      if (cv?.id) {
        // Prioritize ID match - if cv.id exists, ONLY match by ID
        v = latestBoard.viewsType?.find((vt) => vt.id === cv.id);
      } else if (cv?.type) {
        // Only fallback to type if no ID is available
        v = latestBoard.viewsType?.find((vt) => vt.viewType === cv.type);
      }
      
      const dataSourceId = v?.databaseSourceId;
      
      if (!dataSourceId) {
        toast.error("Data source not found for current view!");
        setIsDeleting(false);
        return;
      }

      const normalizedDsId = typeof dataSourceId === "string" ? dataSourceId : String(dataSourceId);

      const res = await deleteWithAuth("/api/database/deleteProperty", {
        body: JSON.stringify({
          dataSourceId: normalizedDsId,
          propertyId: propertyId,
        }),
      });

      if ((res as { isError?: boolean })?.isError) {
        throw new Error((res as { message?: string }).message || "Failed to delete property");
      }

      const response = res as { success: boolean; dataSource?: any; notes?: any[] };

      if (!response.success) {
        throw new Error("Failed to delete property");
      }

      // Update data source in context from API response
      if (response.dataSource) {
        const ds = response.dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : normalizedDsId;
        setDataSource(dsId, ds);
      }

      // Update notes in context from API response
      if (response.notes && Array.isArray(response.notes)) {
        updateAllNotes(normalizedDsId, response.notes);
      }

      toast.success("Property deleted");
      onBack();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete property");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle click outside for limit menu
  useEffect(() => {
    if (!showLimitMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const menuEl = limitMenuRef.current;
      const buttonEl = limitMenuButtonRef.current;
      const clickedInsideMenu = menuEl?.contains(target);
      const clickedButton = buttonEl?.contains(target);

      if (!clickedInsideMenu && !clickedButton) {
        setShowLimitMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLimitMenu]);

  const handleSaveRelationSettings = async (partial?: Partial<{
    relationLimit: "single" | "multiple";
  }>) => {
    if (property.type !== "relation") return;
    
    // Update local state if a partial update is passed
    if (partial) {
      if (partial.relationLimit !== undefined) setRelationLimit(partial.relationLimit);
    }

    // Get dataSourceId from current view ID (not type)
    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      console.error("Data source not found for current view!");
      return;
    }
    
    // Store previous state for rollback
    const previousDataSource = dataSources?.[dataSourceId];
    
    // Optimistic update: update data source in context first
    if (dataSources?.[dataSourceId]) {
      const currentDs = dataSources[dataSourceId];
      if (!currentDs) return;
      const updatedProps = {
        ...(currentDs.properties || {}),
        [propertyId]: {
          ...property,
          name: propertyName,
          relationLimit: partial?.relationLimit ?? relationLimit,
        } as any,
      };
      updateDataSource(dataSourceId, { properties: updatedProps });
    }

    // Best-effort persistence via existing endpoint
    try {
      const requestBody: any = {
        dataSourceId: dataSourceId,
        viewId: board._id,
        propertyId,
        newName: propertyName,
        type: property.type,
        options: property.options || [],
        showProperty: property.showProperty,
      };

      // Only include relation-specific fields if property type is "relation"
      if (property.type === "relation") {
        requestBody.relationLimit = partial?.relationLimit ?? relationLimit;
      }

      const res = await postWithAuth("/api/database/updatePropertySchema", requestBody);
      
      // Update data source in context from API response
      if (res?.dataSource) {
        const ds = res.dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
        if (dsId) {
          setDataSource(dsId, ds);
        }
      }
    } catch (e) {
      // Rollback on error
      console.error(e);
      if (previousDataSource) {
        setDataSource(dataSourceId, previousDataSource);
      }
      toast.error("Failed to update relation settings");
    }
  };

  const handleSaveRollupSettings = async (updates: {
    relationId?: string;
    linkedDatabaseId?: string;
    targetPropertyId?: string;
    calculation?: RollupCalculation;
    selectedOptions?: string[];
  }) => {
    if (property.type !== "rollup") return;

    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      toast.error("Data source not found for current view!");
      return;
    }

    const currentConfig = (property as any).rollup || {};
    let nextConfig: RollupConfig = { ...currentConfig };

    // Handle relation change
    if (updates.relationId !== undefined) {
      const relationOption = rollupRelationOptions.find((option) => option.id === updates.relationId);
      const relationDataSourceId = updates.linkedDatabaseId || relationOption?.linkedDatabaseId;

      if (!relationDataSourceId) {
        toast.error("Selected relation is missing linked database");
        return;
      }

      nextConfig = {
        relationPropertyId: updates.relationId,
        relationDataSourceId: String(relationDataSourceId),
        targetPropertyId: undefined, // Reset when relation changes
        calculation: currentConfig.calculation || { category: "original", value: "original" },
        selectedOptions: undefined, // Reset when relation changes
      };

      void ensureRollupDataSource(relationDataSourceId);
      setRollupRelationId(updates.relationId);
      setRollupTargetPropertyId(undefined);
    }

    // Handle property change
    if (updates.targetPropertyId !== undefined) {
      if (!nextConfig.relationPropertyId || !nextConfig.relationDataSourceId) {
        toast.error("Select a relation first");
        return;
      }
      nextConfig.targetPropertyId = updates.targetPropertyId;
      nextConfig.selectedOptions = undefined; // Reset when property changes
      setRollupTargetPropertyId(updates.targetPropertyId);
    }

    // Handle calculation change
    if (updates.calculation !== undefined) {
      nextConfig.calculation = updates.calculation;
      setRollupCalculation(updates.calculation);
      
      // Reset selectedOptions if not per_group
      if (updates.calculation.value !== "per_group") {
        nextConfig.selectedOptions = undefined;
        setRollupSelectedOptions([]);
      }
    }

    // Handle selectedOptions change
    if (updates.selectedOptions !== undefined) {
      nextConfig.selectedOptions = updates.selectedOptions;
      setRollupSelectedOptions(updates.selectedOptions);
    }

    // Store previous state for rollback
    const previousDataSource = dataSources?.[dataSourceId];

    // Optimistic update: update data source in context first
    if (dataSources?.[dataSourceId]) {
      const currentDs = dataSources[dataSourceId];
      if (!currentDs) return;
      const updatedProps = {
        ...(currentDs.properties || {}),
        [propertyId]: {
          ...property,
          name: propertyName,
          rollup: nextConfig,
        } as any,
      };
      updateDataSource(dataSourceId, { properties: updatedProps });
    }

    // Persist to backend
    try {
      const requestBody: any = {
        dataSourceId: dataSourceId,
        viewId: board._id,
        propertyId,
        newName: propertyName,
        type: property.type,
        options: property.options || [],
        showProperty: property.showProperty,
        rollup: {
          relationPropertyId: nextConfig.relationPropertyId,
          relationDataSourceId: nextConfig.relationDataSourceId,
          targetPropertyId: nextConfig.targetPropertyId,
          calculation: nextConfig.calculation,
          selectedOptions: nextConfig.selectedOptions,
        },
      };

      const res = await postWithAuth("/api/database/updatePropertySchema", requestBody);

      // Update data source in context from API response
      if (res?.dataSource) {
        const ds = res.dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
        if (dsId) {
          setDataSource(dsId, ds);
        }
      }
    } catch (e) {
      console.error(e);
      if (previousDataSource) {
        setDataSource(dataSourceId, previousDataSource);
      }
      toast.error("Failed to update rollup settings");
    }
  };

  const handleSaveNumberSettings = async (partial?: Partial<{
    numberFormat: string;
    decimalPlaces: number;
    showAs: "number" | "bar" | "ring";
    progressColor: string;
    progressDivideBy: number;
    showNumberText: boolean;
  }>) => {
    if (property.type !== "number") return;
    // Update local states if a partial update is passed
    if (partial) {
      if (partial.numberFormat !== undefined) setNumberFormat(partial.numberFormat);
      if (partial.decimalPlaces !== undefined) setDecimalPlaces(partial.decimalPlaces);
      if (partial.showAs !== undefined) setShowAs(partial.showAs);
      if (partial.progressColor !== undefined) setProgressColor(partial.progressColor);
      if (partial.progressDivideBy !== undefined) setProgressDivideBy(partial.progressDivideBy);
      if (partial.showNumberText !== undefined) setShowNumberText(partial.showNumberText);
    }

    // Get dataSourceId from current view ID (not type)
    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      console.error("Data source not found for current view!");
      return;
    }
    
    // Store previous state for rollback
    const previousDataSource = dataSources?.[dataSourceId];
    
    // Optimistic update: update data source in context first
    if (dataSources?.[dataSourceId]) {
      const currentDs = dataSources[dataSourceId];
      if (!currentDs) return;
      const updatedProps = {
        ...(currentDs.properties || {}),
        [propertyId]: {
          ...property,
          name: propertyName,
          numberFormat: partial?.numberFormat ?? numberFormat,
          decimalPlaces: partial?.decimalPlaces ?? decimalPlaces,
          showAs: (partial?.showAs ?? showAs) as any,
          progressColor: partial?.progressColor ?? progressColor,
          progressDivideBy: partial?.progressDivideBy ?? progressDivideBy,
          showNumberText: partial?.showNumberText ?? showNumberText,
        } as any,
      };
      updateDataSource(dataSourceId, { properties: updatedProps });
    }

    // Best-effort persistence via existing endpoint
    try {
      const requestBody: any = {
        dataSourceId: dataSourceId,
        viewId: board._id, // Optional for audit
        propertyId,
        newName: propertyName,
        type: property.type,
        options: property.options || [],
        showProperty: property.showProperty,
      };

      // Only include number-specific fields if property type is "number"
      if (property.type === "number") {
        requestBody.numberFormat = partial?.numberFormat ?? numberFormat;
        requestBody.decimalPlaces = partial?.decimalPlaces ?? decimalPlaces;
        requestBody.showAs = partial?.showAs ?? showAs;
        requestBody.progressColor = partial?.progressColor ?? progressColor;
        requestBody.progressDivideBy = partial?.progressDivideBy ?? progressDivideBy;
        requestBody.showNumberText = partial?.showNumberText ?? showNumberText;
      }

      const res = await postWithAuth("/api/database/updatePropertySchema", requestBody);
      
      // Update data source in context from API response
      if (res?.dataSource) {
        const ds = res.dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
        if (dsId) {
          setDataSource(dsId, ds);
        }
      }
    } catch (e) {
      // Rollback on error
      console.error(e);
      if (previousDataSource) {
        setDataSource(dataSourceId, previousDataSource);
      }
    }
  };

  const handleGithubConfigUpdate = async (partial: Partial<GitHubPrConfig>) => {
    if (property.type !== "github_pr") return;
    const dataSourceId = getCurrentDataSourceId();
    if (!dataSourceId) {
      toast.error("Data source not found for current view!");
      return;
    }

    const previousConfig = githubConfig;
    const mergedPartial: Partial<GitHubPrConfig> = { ...partial };
    if ("statusPropertyId" in partial && partial.statusPropertyId !== githubConfig.statusPropertyId) {
      mergedPartial.pendingStatusOptionId = partial.pendingStatusOptionId ?? undefined;
      mergedPartial.completedStatusOptionId = partial.completedStatusOptionId ?? undefined;
    }

    const nextConfig = mergeGithubPrConfig({
      ...githubConfig,
      ...mergedPartial,
    });

    setGithubConfig(nextConfig);

    const previousDataSource = dataSources?.[dataSourceId];

    if (dataSources?.[dataSourceId]) {
      const currentDs = dataSources[dataSourceId];
      const existingProperty = currentDs?.properties?.[propertyId];
      if (currentDs && existingProperty) {
        const updatedProps = {
          ...(currentDs.properties || {}),
          [propertyId]: {
            ...existingProperty,
            name: propertyName || existingProperty.name,
            githubPrConfig: nextConfig,
          },
        };
        updateDataSource(dataSourceId, { properties: updatedProps });
      }
    }

    try {
      const payload: Record<string, any> = {
        dataSourceId,
        viewId: board._id,
        propertyId,
        newName: propertyName,
        type: property.type,
        options: property.options || [],
        showProperty: property.showProperty,
        githubPrConfig: nextConfig,
      };
      const res = await postWithAuth("/api/database/updatePropertySchema", payload);
      if (res?.dataSource) {
        const ds = res.dataSource;
        const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
        if (dsId) {
          setDataSource(dsId, ds);
        }
      }
      toast.success("GitHub sync settings updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update GitHub sync settings");
      setGithubConfig(previousConfig);
      if (previousDataSource) {
        setDataSource(dataSourceId, previousDataSource as any);
      }
    }
  };

  return (
    <div
      ref={modalRef}
      className={`flex flex-col min-w-[290px] max-w-[290px] rounded-lg border bg-background dark:border-gray-700 shadow-sm`}
    >
      {/* Header */}
      <div className="flex-shrink-0">
        <DropdownMenuHeader
          title="Edit property"
          onBack={onBack}
          onClose={onClose}
          showBack={true}
          showClose={true}
        />
      </div>

      {/* Content */}
      <div className="flex-1">
        {/* Property Name and Icon */}
        <div className="px-1 pb-1">
          <div className="px-1">
            <DropdownMenuEditableItem
              icon={Icon ? <Icon className="w-4 h-4 text-muted-foreground" /> : undefined}
              onIconClick={() => {
                // TODO: Handle icon change
                toast.info("Icon change coming soon");
              }}
              iconButtonDisabled={false}
              iconButtonAriaLabel="Change icon"
              inputValue={propertyName}
              inputOnChange={setPropertyName}
              inputOnBlur={handleSaveName}
              inputOnKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveName();
                }
              }}
              inputPlaceholder="Property name"
              inputAriaLabel="Property name"
              inputDisabled={isSavingName}
            />
          </div>
        </div>

        {/* Type Row (disabled for default props) */}
        <div className="px-1">
          <DropdownMenu
            items={[
              {
                id: 'type',
                label: "Type",
                icon: <DropdownMenuIcons.Type />,
                onClick: () => {
                  if (!isDefault) {
                    // TODO: Handle type change
                    toast.info("Type change coming soon");
                  }
                },
                disabled: isDefault,
                count: getPropertyLabel(property.type),
                hasChevron: !isDefault,
                rightElement: isDefault ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : undefined,
              },
            ]}
          />
        </div>

        {/* Rollup property specific options */}
        {isRollupType && (
          <>
            {/* Relation */}
            <div className="px-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenRollupMenu(openRollupMenu === "relation" ? null : "relation")}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Relation</div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      {selectedRollupRelation ? (
                        <span className="text-sm truncate max-w-[120px]">{selectedRollupRelation.name}</span>
                      ) : (
                        <span className="text-sm text-gray-400">Select relation</span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                </button>
                {openRollupMenu === "relation" && (
                  <div
                    ref={rollupRelationMenuRef}
                    className="absolute z-[205] left-0 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1f1f1f]"
                  >
                    <div className="max-h-64 overflow-y-auto p-1">
                      {rollupRelationOptions.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">No relations found</div>
                      ) : (
                        rollupRelationOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setOpenRollupMenu(null);
                              void handleSaveRollupSettings({
                                relationId: option.id,
                                linkedDatabaseId: option.linkedDatabaseId,
                              });
                            }}
                            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              option.id === rollupRelationId ? "bg-gray-100 dark:bg-gray-700" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Link2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              <span className="truncate">{option.name}</span>
                            </div>
                            {option.id === rollupRelationId && <Check className="h-4 w-4 text-blue-500" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Target property */}
            <div className="px-1">
              <div className="relative">
                <button
                  type="button"
                  disabled={!rollupRelationId}
                  onClick={() => setOpenRollupMenu(openRollupMenu === "property" ? null : "property")}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                    <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                      <path d="M12.718 4.625H6.313a3 3 0 0 0 0 6h7.562a1.75 1.75 0 1 1 0 3.5H7.282a2.126 2.126 0 1 0 0 1.25h6.593a3 3 0 1 0 0-6H6.313a1.75 1.75 0 1 1 0-3.5h6.405a2.126 2.126 0 1 0 0-1.25m1.157.625a.875.875 0 1 1 1.75 0 .875.875 0 0 1-1.75 0" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Target property</div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      {selectedRollupTargetProperty ? (
                        <>
                          {SelectedTargetPropertyIcon && (
                            <SelectedTargetPropertyIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          )}
                          <span className="text-sm truncate max-w-[100px]">{selectedRollupTargetProperty.name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {!rollupRelationId ? "Select relation first" : "Select property"}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                </button>
                {openRollupMenu === "property" && !loadingTargetProperties && rollupRelationId && (
                  <div
                    ref={rollupPropertyMenuRef}
                    className="absolute z-[205] left-0 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1f1f1f]"
                  >
                    <div className="max-h-64 overflow-y-auto p-1">
                      {Object.entries(rollupTargetProperties).length === 0 ? (
                        <div className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">No properties available</div>
                      ) : (
                        Object.entries(rollupTargetProperties).map(([id, schema]) => {
                          const PropertyIcon = PROPERTY_TYPES.find((p) => p.type === schema.type)?.icon;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                setOpenRollupMenu(null);
                                void handleSaveRollupSettings({ targetPropertyId: id });
                              }}
                              className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                id === rollupTargetPropertyId ? "bg-gray-100 dark:bg-gray-700" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {PropertyIcon && <PropertyIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                                <span className="truncate font-medium text-gray-900 dark:text-gray-100">{schema.name}</span>
                              </div>
                              {id === rollupTargetPropertyId && <Check className="h-4 w-4 text-blue-500" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Calculate */}
            <div className="px-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenRollupMenu(openRollupMenu === "calculation" ? null : "calculation")}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                    <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                      <path d="M4.78 3.524a.63.63 0 0 1 .583-.399h9.274a.625.625 0 1 1 0 1.25H6.976l5.663 5.163a.625.625 0 0 1 0 .924l-5.663 5.163h7.661a.625.625 0 1 1 0 1.25H5.363a.625.625 0 0 1-.421-1.087L11.29 10 4.942 4.212a.625.625 0 0 1-.162-.688" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Calculate</div>
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <span className="text-sm truncate max-w-[120px]">{getCalculationLabel(rollupCalculation)}</span>
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                </button>
                {openRollupMenu === "calculation" && (
                  <div
                    ref={rollupCalculationMenuRef}
                    className="absolute z-[205] left-0 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1f1f1f]"
                  >
                    <div className="p-1">
                      {/* Show original */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenRollupMenu(null);
                          void handleSaveRollupSettings({
                            calculation: { category: "original", value: "original" },
                            selectedOptions: undefined,
                          });
                        }}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          rollupCalculation.category === "original" ? "bg-gray-100 dark:bg-gray-700" : ""
                        }`}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">Show original</span>
                        {rollupCalculation.category === "original" && <Check className="h-4 w-4 text-blue-500" />}
                      </button>

                      {/* Count with submenu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCalculationSubmenu(calculationSubmenu === "count" ? null : "count")}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            rollupCalculation.category === "count" ? "bg-gray-100 dark:bg-gray-700" : ""
                          }`}
                        >
                          <span className="font-medium text-gray-900 dark:text-gray-100">Count</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        </button>
                        {calculationSubmenu === "count" && (
                          <div
                            ref={rollupCalculationSubmenuRef}
                            className="absolute z-[100] left-0 ml-1 w-[180px] rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1f1f1f]"
                          >
                            <div className="p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenRollupMenu(null);
                                  void handleSaveRollupSettings({
                                    calculation: { category: "count", value: "all" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  rollupCalculation.category === "count" && rollupCalculation.value === "all"
                                    ? "bg-gray-100 dark:bg-gray-700"
                                    : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Count all</span>
                                {rollupCalculation.category === "count" && rollupCalculation.value === "all" && (
                                  <Check className="h-4 w-4 text-blue-500" />
                                )}
                              </button>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleSaveRollupSettings({
                                      calculation: { category: "count", value: "per_group" },
                                      selectedOptions: rollupSelectedOptions,
                                    });
                                    setShowOptionsModal(true);
                                  }}
                                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                    rollupCalculation.category === "count" && rollupCalculation.value === "per_group"
                                      ? "bg-gray-100 dark:bg-gray-700"
                                      : ""
                                  }`}
                                >
                                  <span className="font-medium text-gray-900 dark:text-gray-100">Count per group</span>
                                  <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                </button>
                                {showOptionsModal && rollupCalculation.category === "count" && rollupCalculation.value === "per_group" && (
                                  <div
                                    ref={rollupOptionsModalRef}
                                    className="absolute left-0 z-[200] ml-1 w-[210px] rounded-lg border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-700 dark:bg-[#1f1f1f]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="max-h-64 space-y-1 overflow-y-auto">
                                      {selectedRollupTargetProperty?.options && selectedRollupTargetProperty.options.length > 0 ? (
                                        selectedRollupTargetProperty.options.map((option) => {
                                          const isSelected = localSelectedOptions.includes(option.id);
                                          return (
                                            <button
                                              key={option.id}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                const newOptions = isSelected
                                                  ? localSelectedOptions.filter((id) => id !== option.id)
                                                  : [...localSelectedOptions, option.id];
                                                setLocalSelectedOptions(newOptions);
                                                void handleSaveRollupSettings({ selectedOptions: newOptions });
                                              }}
                                              className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                                isSelected ? "bg-gray-100 dark:bg-gray-700" : ""
                                              }`}
                                            >
                                              <span className="text-gray-900 dark:text-gray-100">{option.name}</span>
                                              {isSelected && <Check className="h-4 w-4 text-blue-500" />}
                                            </button>
                                          );
                                        })
                                      ) : (
                                        <div className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">No options available</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenRollupMenu(null);
                                  void handleSaveRollupSettings({
                                    calculation: { category: "count", value: "empty" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  rollupCalculation.category === "count" && rollupCalculation.value === "empty"
                                    ? "bg-gray-100 dark:bg-gray-700"
                                    : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Count empty</span>
                                {rollupCalculation.category === "count" && rollupCalculation.value === "empty" && (
                                  <Check className="h-4 w-4 text-blue-500" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenRollupMenu(null);
                                  void handleSaveRollupSettings({
                                    calculation: { category: "count", value: "non_empty" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  rollupCalculation.category === "count" && rollupCalculation.value === "non_empty"
                                    ? "bg-gray-100 dark:bg-gray-700"
                                    : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Count non empty</span>
                                {rollupCalculation.category === "count" && rollupCalculation.value === "non_empty" && (
                                  <Check className="h-4 w-4 text-blue-500" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Percent with submenu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCalculationSubmenu(calculationSubmenu === "percent" ? null : "percent")}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            rollupCalculation.category === "percent" ? "bg-gray-100 dark:bg-gray-700" : ""
                          }`}
                        >
                          <span className="font-medium text-gray-900 dark:text-gray-100">Percent</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        </button>
                        {calculationSubmenu === "percent" && (
                          <div
                            ref={rollupCalculationSubmenuRef}
                            className="absolute z-[100] left-0  ml-1 w-[180px] rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1f1f1f]"
                          >
                            <div className="p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenRollupMenu(null);
                                  void handleSaveRollupSettings({
                                    calculation: { category: "percent", value: "all" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  rollupCalculation.category === "percent" && rollupCalculation.value === "all"
                                    ? "bg-gray-100 dark:bg-gray-700"
                                    : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Percent all</span>
                                {rollupCalculation.category === "percent" && rollupCalculation.value === "all" && (
                                  <Check className="h-4 w-4 text-blue-500" />
                                )}
                              </button>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleSaveRollupSettings({
                                      calculation: { category: "percent", value: "per_group" },
                                      selectedOptions: rollupSelectedOptions,
                                    });
                                    setShowOptionsModal(true);
                                  }}
                                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                    rollupCalculation.category === "percent" && rollupCalculation.value === "per_group"
                                      ? "bg-gray-100 dark:bg-gray-700"
                                      : ""
                                  }`}
                                >
                                  <span className="font-medium text-gray-900 dark:text-gray-100">Percent per group</span>
                                  <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                </button>
                                {showOptionsModal && rollupCalculation.category === "percent" && rollupCalculation.value === "per_group" && (
                                  <div
                                    ref={rollupOptionsModalRef}
                                    className="absolute left-0 z-[200] ml-1 w-[210px] rounded-lg border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-700 dark:bg-[#1f1f1f]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="max-h-64 space-y-1 overflow-y-auto">
                                      {selectedRollupTargetProperty?.options && selectedRollupTargetProperty.options.length > 0 ? (
                                        selectedRollupTargetProperty.options.map((option) => {
                                          const isSelected = localSelectedOptions.includes(option.id);
                                          return (
                                            <button
                                              key={option.id}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                const newOptions = isSelected
                                                  ? localSelectedOptions.filter((id) => id !== option.id)
                                                  : [...localSelectedOptions, option.id];
                                                setLocalSelectedOptions(newOptions);
                                                void handleSaveRollupSettings({ selectedOptions: newOptions });
                                              }}
                                              className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                                isSelected ? "bg-gray-100 dark:bg-gray-700" : ""
                                              }`}
                                            >
                                              <span className="text-gray-900 dark:text-gray-100">{option.name}</span>
                                              {isSelected && <Check className="h-4 w-4 text-blue-500" />}
                                            </button>
                                          );
                                        })
                                      ) : (
                                        <div className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">No options available</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenRollupMenu(null);
                                  void handleSaveRollupSettings({
                                    calculation: { category: "percent", value: "empty" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  rollupCalculation.category === "percent" && rollupCalculation.value === "empty"
                                    ? "bg-gray-100 dark:bg-gray-700"
                                    : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Percent empty</span>
                                {rollupCalculation.category === "percent" && rollupCalculation.value === "empty" && (
                                  <Check className="h-4 w-4 text-blue-500" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenRollupMenu(null);
                                  void handleSaveRollupSettings({
                                    calculation: { category: "percent", value: "non_empty" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  rollupCalculation.category === "percent" && rollupCalculation.value === "non_empty"
                                    ? "bg-gray-100 dark:bg-gray-700"
                                    : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Percent non empty</span>
                                {rollupCalculation.category === "percent" && rollupCalculation.value === "non_empty" && (
                                  <Check className="h-4 w-4 text-blue-500" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {property.type === "formula" && (
          <div className="px-2 py-1">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              type="button"
              onClick={() => setIsFormulaModalOpen(true)}
            >
              <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                <Calculator className="w-5 h-5" />
              </div>
              <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Make formula</span>
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400">
                  <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z" />
                </svg>
              </div>
            </button>
          </div>
        )}

        {/* Sort option for select/multi-select */}
        {(property.type === "select" || property.type === "multi_select") && (
          <div className="px-2 py-1">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              type="button"
              onClick={() => toast.info("Sort options coming soon")}
            >
              <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                  <path d="M14.075 3.45a.625.625 0 0 0-.884 0l-3.497 3.5a.625.625 0 0 0 .883.884l2.431-2.431v10.705a.625.625 0 0 0 1.25 0V5.402l2.431 2.43a.625.625 0 1 0 .884-.883zM2.427 12.167a.625.625 0 0 1 .884 0l2.43 2.431V3.893a.625.625 0 0 1 1.25 0v10.705l2.431-2.43a.625.625 0 0 1 .884.883L6.81 16.55a.625.625 0 0 1-.884 0l-3.498-3.498a.625.625 0 0 1 0-.884" />
                </svg>
              </div>
              <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Sort</span>
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <span className="text-sm">Manual</span>
                <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400">
                  <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z" />
                </svg>
              </div>
            </button>
          </div>
        )}

        {/* Divider before AI Autofill for select/multi-select */}
        {(property.type === "select" || property.type === "multi_select") && (
          <div className="relative px-2 py-1 mt-1">
            <div className="absolute top-0 left-3 right-3 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
        )}

        {/* AI Autofill toggle for select/multi-select */}
        {(property.type === "select" || property.type === "multi_select") && (
          <div className="px-2 py-1">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              type="button"
              onClick={() => toast.info("AI autofill coming soon")}
            >
              <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">AI autofill</span>
              <div className="relative flex-shrink-0">
                <div className="flex items-center h-3.5 w-7 rounded-full p-0.5 bg-gray-300 dark:bg-gray-600 transition-colors">
                  <div className="w-3.5 h-3.5 rounded-full bg-white transition-transform" />
                </div>
              </div>
            </button>
          </div>
        )}

        {property.type === "github_pr" && (
          <GitHubPrPropertySettings
            config={githubConfig}
            statusProperties={statusProperties}
            onUpdate={handleGithubConfigUpdate}
          />
        )}

        {/* Person type specific options */}
        {isPersonType && (
          <>
            {/* Limit option */}
            <div className="px-2 py-1">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                type="button"
                onClick={() => toast.info("Limit options coming soon")}
              >
                <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                    <path d="M8.793 6.767c-.816 0-1.472.465-1.71 1.036a.625.625 0 1 1-1.154-.482C6.38 6.242 7.52 5.517 8.794 5.517c1.618 0 3.068 1.181 3.068 2.786a2.62 2.62 0 0 1-.762 1.835l-3.312 3.095h3.637a.625.625 0 1 1 0 1.25h-5.22a.625.625 0 0 1-.427-1.081l4.453-4.163a1.37 1.37 0 0 0 .381-.936c0-.775-.742-1.536-1.818-1.536m7.576 0c-.868 0-1.508.425-1.724.877a.625.625 0 0 1-1.127-.54c.473-.99 1.629-1.587 2.85-1.587.799 0 1.546.247 2.107.675.56.429.962 1.066.962 1.819s-.401 1.39-.962 1.819l-.036.026q.085.056.165.116c.595.448 1.02 1.114 1.02 1.902s-.425 1.454-1.02 1.903c-.595.448-1.388.706-2.236.706-1.287 0-2.488-.6-3.008-1.6a.625.625 0 1 1 1.108-.577c.252.484.952.927 1.9.927.602 0 1.125-.185 1.484-.455.358-.27.522-.595.522-.904 0-.308-.164-.634-.522-.904-.359-.27-.882-.455-1.484-.455h-.554a.625.625 0 0 1 0-1.25h.44a1 1 0 0 1 .114-.01c.549 0 1.023-.17 1.348-.419.323-.247.47-.544.47-.825s-.147-.579-.47-.826c-.325-.247-.8-.418-1.348-.418M3.731 6.22l.005.078v7.56a.625.625 0 0 1-1.25 0V7.21l-1.182.658a.625.625 0 0 1-.608-1.092L2.806 5.6a.625.625 0 0 1 .925.62" />
                  </svg>
                </div>
                <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Limit</span>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <span className="text-sm">No limit</span>
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400">
                    <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Default option */}
            <div className="px-2 py-1">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                type="button"
                onClick={() => toast.info("Default options coming soon")}
              >
                <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                    <path d="M7.755 6.169C8.277 5.519 9.05 5.125 10 5.125s1.723.393 2.245 1.044c.51.635.75 1.474.75 2.346s-.24 1.71-.75 2.346c-.522.65-1.294 1.044-2.245 1.044-.95 0-1.723-.394-2.245-1.044-.51-.635-.75-1.474-.75-2.346s.24-1.711.75-2.346m.975.782c-.293.365-.475.909-.475 1.564s.182 1.198.475 1.564c.281.35.694.576 1.27.576s.989-.226 1.27-.576c.294-.366.475-.909.475-1.564s-.181-1.199-.475-1.564c-.281-.35-.693-.576-1.27-.576-.576 0-.989.225-1.27.576" />
                    <path d="M2.375 10a7.625 7.625 0 1 1 15.25 0 7.625 7.625 0 0 1-15.25 0M10 3.625a6.375 6.375 0 0 0-4.087 11.267c.789-1.397 2.333-2.33 4.087-2.33s3.298.933 4.087 2.33A6.375 6.375 0 0 0 10 3.625M13.049 15.6c-.547-1.049-1.697-1.789-3.05-1.789-1.351 0-2.501.74-3.048 1.789a6.35 6.35 0 0 0 3.049.775 6.34 6.34 0 0 0 3.049-.775" />
                  </svg>
                </div>
                <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Default</span>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <span className="text-sm">No default</span>
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400">
                    <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Notifications option */}
            <div className="px-2 py-1">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                type="button"
                onClick={() => toast.info("Notifications options coming soon")}
              >
                <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                    <path d="M10 2.355a2.35 2.35 0 0 0-2.253 1.686 5.06 5.06 0 0 0-2.803 4.527v1.189c0 .919-.334 1.806-.939 2.498l-.818.935c-.881 1.007-.166 2.583 1.173 2.583h3.02a2.65 2.65 0 0 0 5.24 0h3.02c1.339 0 2.054-1.576 1.173-2.583l-.818-.935a3.8 3.8 0 0 1-.939-2.498v-1.19a5.06 5.06 0 0 0-2.803-4.526A2.35 2.35 0 0 0 10 2.355m1.5 13.418a1.55 1.55 0 0 1-2.998 0zM8.909 4.564A1.104 1.104 0 0 1 10 3.605c.556 0 1.017.415 1.091.96l.049.353.329.138a3.81 3.81 0 0 1 2.337 3.512v1.189c0 1.221.444 2.401 1.248 3.32l.818.936a.307.307 0 0 1-.232.51H4.36a.308.308 0 0 1-.232-.51l.818-.935a5.04 5.04 0 0 0 1.248-3.321v-1.19c0-1.58.963-2.936 2.337-3.511l.33-.138z" />
                  </svg>
                </div>
                <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Notifications</span>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <span className="text-sm">Users only</span>
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400">
                    <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z" />
                  </svg>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Date type specific options */}
        {isDateType && (
          <>
            {/* Date format option */}
            <div className="px-2 py-1">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                type="button"
                onClick={() => toast.info("Date format options coming soon")}
              >
                <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                    <path d="M9.537 8.843a.694.694 0 1 1-1.39 0 .694.694 0 0 1 1.39 0m-.695 3.009a.694.694 0 1 0 0-1.389.694.694 0 0 0 0 1.389m.695 1.62a.695.695 0 1 1-1.39 0 .695.695 0 0 1 1.39 0m1.62-3.935a.694.694 0 1 0 0-1.389.694.694 0 0 0 0 1.389m.695 1.621a.694.694 0 1 1-1.39 0 .694.694 0 0 1 1.39 0m-.695 3.009a.695.695 0 1 0 0-1.39.695.695 0 0 0 0 1.39m3.01-5.324a.694.694 0 1 1-1.39 0 .694.694 0 0 1 1.39 0m-7.639 3.009a.694.694 0 1 0 0-1.389.694.694 0 0 0 0 1.389m.694 1.62a.695.695 0 1 1-1.389 0 .695.695 0 0 1 1.39 0m6.249-1.62a.694.694 0 1 0 0-1.389.694.694 0 0 0 0 1.389" />
                    <path d="M5.25 3.125A2.125 2.125 0 0 0 3.125 5.25v9.5c0 1.174.951 2.125 2.125 2.125h9.5a2.125 2.125 0 0 0 2.125-2.125v-9.5a2.125 2.125 0 0 0-2.125-2.125zm-.875 3.69h11.25v7.935a.875.875 0 0 1-.875.875h-9.5a.875.875 0 0 1-.875-.875z" />
                  </svg>
                </div>
                <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Date format</span>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <span className="text-sm">Month/Day/Year</span>
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400">
                    <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Time format option */}
            <div className="px-2 py-1">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                type="button"
                onClick={() => toast.info("Time format options coming soon")}
              >
                <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current text-gray-500 dark:text-gray-400">
                    <path d="M10.625 5.725a.625.625 0 1 0-1.25 0v3.65H6.4a.625.625 0 1 0 0 1.25H10c.345 0 .625-.28.625-.625z" />
                    <path d="M10 2.375a7.625 7.625 0 1 0 0 15.25 7.625 7.625 0 0 0 0-15.25M3.625 10a6.375 6.375 0 1 1 12.75 0 6.375 6.375 0 0 1-12.75 0" />
                  </svg>
                </div>
                <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Time format</span>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <span className="text-sm">12 hour</span>
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400">
                    <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Notifications option for date */}
            <div className="px-2 py-1">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                type="button"
                onClick={() => toast.info("Notifications options coming soon")}
              >
                <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                    <path d="M5.791 1.886a.625.625 0 1 0-.801-.96L2.138 3.31a.625.625 0 1 0 .802.96zm4.834 3.839a.625.625 0 1 0-1.25 0v3.65H6.4a.625.625 0 0 0 0 1.25H10c.345 0 .625-.28.625-.625z" />
                    <path d="M10 2.375a7.625 7.625 0 1 0 0 15.25 7.625 7.625 0 0 0 0-15.25M3.625 10a6.375 6.375 0 1 1 12.75 0 6.375 6.375 0 0 1-12.75 0M14.13 1.006a.625.625 0 0 0 .079.88l2.851 2.383a.625.625 0 1 0 .802-.96L15.01.927a.625.625 0 0 0-.88.079" />
                  </svg>
                </div>
                <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Notifications</span>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <span className="text-sm">None</span>
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400">
                    <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z" />
                  </svg>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Relation type specific options */}
        {isRelationType && (
          <>
            {/* Related to - Disabled */}
            <div className="px-2 py-1">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 opacity-40 cursor-not-allowed"
                type="button"
                disabled
              >
                <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                    <path d="M18.507 11.112c.362 0 .655.293.655.656v4.369a.656.656 0 0 1-1.311 0V13.35l-4.997 4.997a.655.655 0 1 1-.927-.928l4.997-4.997h-2.786a.655.655 0 1 1 0-1.31z"></path>
                    <path d="M15.5 4.125c1.174 0 2.125.951 2.125 2.125v3.612h-1.25v-.987h-5.75v2.25h1.72a2 2 0 0 0-.103.448l-.01.195.01.195q.024.214.091.412h-1.708v2.25h2.33l-1.25 1.25H4.5a2.125 2.125 0 0 1-2.125-2.125v-7.5c0-1.174.951-2.125 2.125-2.125zM3.625 13.75c0 .483.392.875.875.875h4.875v-2.25h-5.75zm0-2.625h5.75v-2.25h-5.75zm.875-5.75a.875.875 0 0 0-.875.875v1.375h5.75v-2.25zm6.125 2.25h5.75V6.25a.875.875 0 0 0-.875-.875h-4.875z"></path>
                  </svg>
                </div>
                <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Related to</span>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <div className="flex items-center justify-center h-5 w-5 rounded-[0.25em] flex-shrink-0 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                      <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-4 h-4 block fill-gray-500 dark:fill-gray-400 flex-shrink-0">
                        <path d="M10 2.375c-1.778 0-3.415.256-4.63.69-.604.216-1.138.488-1.532.82-.391.331-.713.784-.713 1.347q0 .157.032.304h-.032v9.232c0 .563.322 1.016.713 1.346.394.333.928.605 1.532.82 1.215.435 2.852.691 4.63.691s3.415-.256 4.63-.69c.604-.216 1.138-.488 1.532-.82.391-.331.713-.784.713-1.347V5.536h-.032q.031-.147.032-.304c0-.563-.322-1.016-.713-1.346-.394-.333-.928-.605-1.532-.82-1.215-.435-2.852-.691-4.63-.691M4.375 5.232c0-.053.028-.188.27-.391.238-.201.62-.41 1.146-.599 1.047-.374 2.535-.617 4.209-.617s3.162.243 4.21.617c.526.188.907.398 1.146.599.24.203.269.338.269.391s-.028.188-.27.391c-.238.202-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.397-1.146-.599-.24-.203-.269-.338-.269-.39m11.25 1.718V10c0 .053-.028.188-.27.391-.238.201-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.398-1.146-.599-.24-.203-.269-.338-.269-.391V6.95c.297.17.633.32.995.45 1.215.433 2.852.69 4.63.69s3.415-.257 4.63-.69c.362-.13.698-.28.995-.45m-11.25 7.818v-3.05c.297.17.633.32.995.449 1.215.434 2.852.69 4.63.69s3.415-.256 4.63-.69c.362-.13.698-.279.995-.45v3.05c0 .054-.028.189-.27.392-.238.201-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.398-1.146-.599-.24-.203-.269-.338-.269-.391"></path>
                      </svg>
                    </div>
                    <span className="text-sm font-semibold">{linkedDataSourceTitle}</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Limit Section */}
            <div className="px-2 py-1 relative">
              <button
                ref={limitMenuButtonRef}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                type="button"
                onClick={() => setShowLimitMenu((prev) => !prev)}
              >
                <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                    <path d="M8.793 6.767c-.816 0-1.472.465-1.71 1.036a.625.625 0 1 1-1.154-.482C6.38 6.242 7.52 5.517 8.794 5.517c1.618 0 3.068 1.181 3.068 2.786a2.62 2.62 0 0 1-.762 1.835l-3.312 3.095h3.637a.625.625 0 1 1 0 1.25h-5.22a.625.625 0 0 1-.427-1.081l4.453-4.163a1.37 1.37 0 0 0 .381-.936c0-.775-.742-1.536-1.818-1.536m7.576 0c-.868 0-1.508.425-1.724.877a.625.625 0 0 1-1.127-.54c.473-.99 1.629-1.587 2.85-1.587.799 0 1.546.247 2.107.675.56.429.962 1.066.962 1.819s-.401 1.39-.962 1.819l-.036.026q.085.056.165.116c.595.448 1.02 1.114 1.02 1.902s-.425 1.454-1.02 1.903c-.595.448-1.388.706-2.236.706-1.287 0-2.488-.6-3.008-1.6a.625.625 0 1 1 1.108-.577c.252.484.952.927 1.9.927.602 0 1.125-.185 1.484-.455.358-.27.522-.595.522-.904 0-.308-.164-.634-.522-.904-.359-.27-.882-.455-1.484-.455h-.554a.625.625 0 0 1 0-1.25h.44a1 1 0 0 1 .114-.01c.549 0 1.023-.17 1.348-.419.323-.247.47-.544.47-.825s-.147-.579-.47-.826c-.325-.247-.8-.418-1.348-.418M3.731 6.22l.005.078v7.56a.625.625 0 0 1-1.25 0V7.21l-1.182.658a.625.625 0 0 1-.608-1.092L2.806 5.6a.625.625 0 0 1 .925.62"></path>
                  </svg>
                </div>
                <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Limit</span>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <span className="text-sm">{relationLimit === "single" ? "1 page" : "No limit"}</span>
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400">
                    <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z" />
                  </svg>
                </div>
              </button>

              {/* Limit Dropdown Menu */}
              {showLimitMenu && (
                <div
                  ref={limitMenuRef}
                  className="absolute top-full left-2 right-2 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
                >
                  {[
                    { value: "multiple" as const, label: "No limit" },
                    { value: "single" as const, label: "1 page" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        void handleSaveRelationSettings({ relationLimit: option.value });
                        setShowLimitMenu(false);
                      }}
                      className="w-full flex items-center px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Two-way Relation */}
            <div className="px-2 py-1">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                type="button"
                onClick={() => toast.info("Two-way relation toggle coming soon")}
              >
                <div className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-1.5">
                    Two-way relation
                    <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <span className="text-sm">{hasTwoWayRelation ? "On" : "Off"}</span>
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400">
                    <path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z" />
                  </svg>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Number type specific options */}
        {property.type === "number" && (
          <div className="px-2 py-1">
            {/* Number format */}
            <div className="px-0 py-0">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                type="button"
                onClick={(e) => setSelectPopup({ type: "numberFormat", anchorEl: e.currentTarget })}
              >
                <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Number format</span>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <span className="text-sm capitalize">{numberFormat}</span>
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400"><path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z"/></svg>
                </div>
              </button>
            </div>

            {/* Decimal places */}
            <div className="px-0 py-0">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                type="button"
                onClick={(e) => setSelectPopup({ type: "decimalPlaces", anchorEl: e.currentTarget })}
              >
                <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Decimal places</span>
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <span className="text-sm">{decimalPlaces}</span>
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400"><path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z"/></svg>
                </div>
              </button>
            </div>

            {/* Show as - Visual Selector */}
            <div className="px-0 py-0">
              <div className="px-2 py-2">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Show as</div>
                <div className="flex flex-row justify-between items-center gap-1.5">
                  {/* Number Option */}
                  <button
                    type="button"
                    onClick={() => void handleSaveNumberSettings({ showAs: "number" })}
                    className={`flex-1 flex flex-col justify-center items-center py-2 rounded-md transition-all ${
                      showAs === "number"
                        ? "ring-2 ring-blue-500 dark:ring-blue-400 text-blue-600 dark:text-blue-400"
                        : "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="h-5 mb-1 flex items-center justify-center">
                      <div className="text-base font-medium">42</div>
                    </div>
                    <div className="text-xs leading-none">Number</div>
                  </button>

                  {/* Bar Option */}
                  <button
                    type="button"
                    onClick={() => void handleSaveNumberSettings({ showAs: "bar" })}
                    className={`flex-1 flex flex-col justify-center items-center py-2 rounded-md transition-all ${
                      showAs === "bar"
                        ? "ring-2 ring-blue-500 dark:ring-blue-400 text-blue-600 dark:text-blue-400"
                        : "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="h-5 mb-1 w-full flex items-center justify-center px-2">
                      <div className="relative w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden" style={{ height: "4px" }}>
                        <div
                          className="absolute rounded-full h-full"
                          style={{
                            width: "50%",
                            backgroundColor: getProgressColorValue(progressColor),
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-xs leading-none">Bar</div>
                  </button>

                  {/* Ring Option */}
                  <button
                    type="button"
                    onClick={() => void handleSaveNumberSettings({ showAs: "ring" })}
                    className={`flex-1 flex flex-col justify-center items-center py-2 rounded-md transition-all ${
                      showAs === "ring"
                        ? "ring-2 ring-blue-500 dark:ring-blue-400 text-blue-600 dark:text-blue-400"
                        : "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="h-5 mb-1 flex items-center justify-center">
                      <svg viewBox="0 0 14 14" width="20" height="20" className="flex-shrink-0">
                        <circle
                          cx="7"
                          cy="7"
                          r="6"
                          fill="none"
                          strokeWidth="2"
                          className="stroke-gray-200 dark:stroke-gray-700"
                        />
                        <g transform="rotate(-90 7 7)">
                          <circle
                            cx="7"
                            cy="7"
                            r="6"
                            fill="none"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="37.69911184307752"
                            strokeDashoffset="22.61946710584651"
                            style={{
                              stroke: getProgressColorValue(progressColor),
                            }}
                          />
                        </g>
                      </svg>
                    </div>
                    <div className="text-xs leading-none">Ring</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Conditional progress options for bar/ring */}
            {(showAs === "bar" || showAs === "ring") && (
              <div className="m-2">
                
                <div className="space-y-1 bg-gray-100 dark:bg-offset-gray-900 rounded-lg p-1">
                  {/* Color */}
                  <div className="px-0 py-0 relative">
                  <button
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    type="button"
                    onClick={(e) => {
                      setColorPickerOptionId("__progress_color__");
                      setColorPickerAnchor(e.currentTarget);
                    }}
                  >
                    <span className="flex-1 text-left text-sm text-gray-900 dark:text-gray-100">Color</span>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400">
                        <span className={`inline-block w-4 h-4 rounded-sm ${getColorStyles(progressColor).bg}`} />
                      </div>
                      <span className="text-sm capitalize">{progressColor}</span>
                      <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" className="w-4 h-4 fill-current text-gray-500 dark:text-gray-400"><path d="M6.722 3.238a.625.625 0 1 0-.884.884L9.716 8l-3.878 3.878a.625.625 0 0 0 .884.884l4.32-4.32a.625.625 0 0 0 0-.884z"/></svg>
                    </div>
                  </button>
                  {/* Color Picker Popup for progress color - positioned absolutely relative to parent */}
                  {colorPickerOptionId === "__progress_color__" && colorPickerAnchor && (
                    <div className="absolute z-50 mt-1 left-0 top-full">
                      <ColorPickerPopup
                        currentColor={progressColor}
                        onSelectColor={(color) => {
                          void handleSaveNumberSettings({ progressColor: color });
                          setColorPickerOptionId(null);
                          setColorPickerAnchor(null);
                        }}
                        onClose={() => {
                          setColorPickerOptionId(null);
                          setColorPickerAnchor(null);
                        }}
                        onDelete={() => {
                          setColorPickerOptionId(null);
                          setColorPickerAnchor(null);
                        }}
                        anchorEl={colorPickerAnchor}
                      />
                    </div>
                  )}
                </div>

                  {/* Divide by */}
                  <div className="px-0 py-0">
                    <div className="w-full flex items-center gap-2 px-2 py-1.5 rounded">
                      <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">Divide by</span>
                      <input
                        type="number"
                        value={isNaN(progressDivideBy) ? 0 : progressDivideBy}
                        min={1}
                        onChange={(e) => {
                          const val = Number(e.target.value || 0);
                          setProgressDivideBy(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleSaveNumberSettings({ progressDivideBy });
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        onBlur={() => void handleSaveNumberSettings({ progressDivideBy })}
                        className="w-24 px-2 py-1 text-sm text-right border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  {/* Show number toggle */}
                  <div className="px-0 py-0">
                    <div className="w-full flex items-center gap-2 px-2 py-1.5 rounded">
                      <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">Show number</span>
                      <button
                        type="button"
                        onClick={() => void handleSaveNumberSettings({ showNumberText: !showNumberText })}
                        className="relative flex-shrink-0 flex items-center h-5 w-9 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-1"
                        role="switch"
                        aria-checked={showNumberText}
                      >
                        <div className={`flex items-center h-full w-full rounded-full transition-colors ${showNumberText ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                          <div className={`h-4 w-4 rounded-full bg-white transition-transform ${showNumberText ? "translate-x-4" : "translate-x-0"}`} />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Info text */}
                <div className="px-2 mt-3 mb-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Changes apply to all views showing this property.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Options for status/priority/select */}
        {isStatusOrPriorityOrSelect && localOptions && (
          <div className="px-2 py-1">
            {/* Header with Add button */}
            <div className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">
              <span>Options</span>
              <button
                type="button"
                aria-label="Add an option"
                onClick={handleAddOption}
                className="ml-auto inline-flex items-center justify-center h-5 w-5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Options list */}
            {localOptions.map((option, idx) => {
              const isEditing = editingOptionId === option.id;
              const colorStyles = getColorStyles(option.color || "default");
              return (
                <div 
                  key={option.id || idx} 
                  className="px-2 py-1 relative"
                  onClick={(e) => {
                    setColorPickerOptionId(option.id);
                    setColorPickerAnchor(e.currentTarget);
                  }}
                >
                  <div className="flex items-center justify-between rounded py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition group">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="cursor-grab text-gray-400" aria-hidden="true">
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <div className={`inline-flex items-center h-5 rounded-full px-2 text-sm ${colorStyles.bg}`}>
                        <div className={`w-2 h-2 rounded-full ${colorStyles.dot} mr-1 flex-shrink-0`} />
                        {isEditing ? (
                          <input
                            type="text"
                            defaultValue={option.name}
                            placeholder="Option name"
                            onBlur={(e) => handleUpdateOption(option.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdateOption(option.id, e.currentTarget.value);
                              } else if (e.key === "Escape") {
                                setEditingOptionId(null);
                              }
                            }}
                            className="text-gray-900 dark:text-gray-100 text-xs bg-transparent border-none outline-none min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <button
                            type="button"
                            className="text-gray-900 dark:text-gray-100 text-xs cursor-pointer bg-transparent border-none p-0"
                            onClick={() => setEditingOptionId(option.id)}
                          >
                            {option.name}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Change option color"
                        onClick={(e) => {
                          setColorPickerOptionId(option.id);
                          setColorPickerAnchor(e.currentTarget);
                        }}
                        className="inline-flex items-center justify-center"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </button>
                    </div>
                  </div>
                  {colorPickerOptionId === option.id && colorPickerAnchor && (
                    <div className="absolute z-50 mt-1 left-0 top-full">
                      <ColorPickerPopup
                        currentColor={localOptions.find((opt) => opt.id === colorPickerOptionId)?.color}
                        currentName={localOptions.find((opt) => opt.id === colorPickerOptionId)?.name}
                        onSelectColor={(color) => {
                          handleColorChange(colorPickerOptionId, color);
                        }}
                        onRename={(name) => {
                          handleUpdateOption(colorPickerOptionId, name);
                        }}
                        onClose={() => {
                          setColorPickerOptionId(null);
                          setColorPickerAnchor(null);
                        }}
                        onDelete={() => {
                          handleDeleteOption(colorPickerOptionId);
                          setColorPickerOptionId(null);
                          setColorPickerAnchor(null);
                        }}
                        anchorEl={colorPickerAnchor}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0">
        <div className="p-1">
          <DropdownMenuDivider />
          <DropdownMenu
            items={[
              {
                id: 'wrap-in-view',
                label: "Wrap in view",
                icon: (
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current text-muted-foreground">
                    <path d="M16.625 8A2.625 2.625 0 0 0 14 5.375h-1.42a.625.625 0 1 1 0-1.25H14a3.875 3.875 0 0 1 0 7.75H4.259l3.333 3.333a.625.625 0 0 1-.884.884l-4.4-4.4a.625.625 0 0 1 0-.884l4.4-4.4a.625.625 0 0 1 .884.884l-3.333 3.333H14A2.625 2.625 0 0 0 16.625 8" />
                  </svg>
                ),
                onClick: () => setWrapInView(!wrapInView),
                rightElement: (
                  <DropdownMenuToggle
                    checked={wrapInView}
                    onChange={setWrapInView}
                  />
                ),
              },
              {
                id: 'display-as',
                label: "Display as",
                icon: (
                  <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 20 20" className="w-5 h-5 fill-current text-muted-foreground">
                    <path d="M10.17 6.694a3.307 3.307 0 0 1 3.135 3.303l-.005.17a3.305 3.305 0 0 1-3.3 3.137l-.17-.004a3.307 3.307 0 0 1-3.132-3.133l-.004-.17A3.307 3.307 0 0 1 10 6.69zm-.17 2.2a1.104 1.104 0 0 0 0 2.207 1.103 1.103 0 0 0 0-2.207" />
                    <path d="M10 4.194c3.878 0 7.26 2.075 8.862 5.127l.073.163c.126.333.126.7 0 1.033l-.073.163c-1.602 3.052-4.984 5.126-8.862 5.126-3.757 0-7.049-1.946-8.707-4.843l-.156-.283a1.46 1.46 0 0 1 0-1.359l.156-.283C2.95 6.141 6.243 4.194 10 4.194m0 1.251c-3.33 0-6.196 1.724-7.622 4.214l-.134.243a.21.21 0 0 0 0 .197l.134.243c1.426 2.49 4.292 4.214 7.622 4.214 3.437 0 6.38-1.837 7.756-4.457l.018-.048a.2.2 0 0 0 0-.1l-.018-.049C16.38 7.282 13.437 5.445 10 5.445" />
                  </svg>
                ),
                onClick: () => {
                  // TODO: Handle display as change
                  toast.info("Display as change coming soon");
                },
                count: getPropertyLabel(property.type),
                hasChevron: true,
              },
              {
                id: 'duplicate-property',
                label: "Duplicate property",
                icon: <DropdownMenuIcons.Copy />,
                onClick: handleDuplicateProperty,
                disabled: true,
              },
              {
                id: 'delete-property',
                label: "Delete property",
                icon: <DropdownMenuIcons.Delete />,
                onClick: handleDeleteProperty,
                variant: 'destructive',
              },
            ]}
          />
        </div>
      </footer>

      {/* Simple selection popup for number settings */}
      {selectPopup && (
        <NumberSelectPopup
          type={selectPopup!.type}
          anchorEl={selectPopup!.anchorEl}
          current={{ numberFormat, decimalPlaces, showAs }}
          onSelect={(value) => {
            const popup = selectPopup!;
            if (popup.type === "numberFormat") {
              void handleSaveNumberSettings({ numberFormat: value as string });
            } else if (popup.type === "decimalPlaces") {
              void handleSaveNumberSettings({ decimalPlaces: value as number });
            } else if (popup.type === "showAs") {
              void handleSaveNumberSettings({ showAs: value as any });
            }
            setSelectPopup(null);
          }}
          onClose={() => setSelectPopup(null)}
        />
      )}
      {isFormulaModalOpen && property.type === "formula" && (
        <FormulaEditorModal
          board={board}
          property={property}
          propertyId={propertyId}
          boardNotes={boardNotes}
          formulaValue={formulaValue}
          onFormulaChange={setFormulaValue}
          formulaReturnType={formulaReturnType}
          onReturnTypeChange={(val) => setFormulaReturnType(val)}
          formulaValidationError={formulaValidationError}
          onValidationErrorChange={setFormulaValidationError}
          isSavingFormula={isSavingFormula}
          onDone={() => {
            handleDone();
            setIsFormulaModalOpen(false);
          }}
          isFormulaDirty={isFormulaDirty}
          buildFormulaDefinitions={buildFormulaDefinitions}
          onClose={() => setIsFormulaModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Modals */}
      <DeleteConfirmationModal
        header="Delete Option"
        isOpen={deleteOptionId !== null}
        entity="option"
        title={localOptions.find((opt) => opt.id === deleteOptionId)?.name}
        isDeleting={isDeleting}
        onCancel={() => {
          setDeleteOptionId(null);
          setIsDeleting(false);
        }}
        onConfirm={confirmDeleteOption}
      />

      <DeleteConfirmationModal
        header="Delete Property"
        isOpen={showDeletePropertyConfirm}
        entity="property"
        title={propertyName}
        isDeleting={isDeleting}
        onCancel={() => {
          setShowDeletePropertyConfirm(false);
          setIsDeleting(false);
        }}
        onConfirm={confirmDeleteProperty}
      />
    </div>
  );
}
