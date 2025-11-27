import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Calculator,
  ChevronRight,
  Copy,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { PROPERTY_TYPES } from "./addPropertyDialog";
import type { ViewCollection, BoardProperty, Note } from "@/types/board";
import { createFormulaRuntime } from "@/lib/formula/evaluator";
import { useBoard } from "@/contexts/boardContext";
import type { FormulaPropertyDefinition } from "@/lib/formula/evaluator";
import { formatFormulaValue } from "@/utils/formatFormulaValue";
import type { FormulaReturnType } from "@/utils/formatFormulaValue";
import {
  FORMULA_FUNCTION_GROUPS,
  extractFormulaFromElement,
  getFormulaReturnLabel,
  renderFormulaDisplay,
  type FormulaFunctionSpec,
} from "@/utils/formulaReferences";


type PropertySuggestionState = {
  query: string;
  items: Array<{ id: string; name: string }>;
  anchor: { left: number; top: number };
  replaceStart: number;
  replaceLength: number;
  sourceValue: string;
};

const PROPERTY_SUGGESTION_REGEX = /prop\(\s*["']([^"']*)$/;


interface FormulaEditorSectionProps {
  board: ViewCollection;
  property: BoardProperty;
  propertyId: string;
  boardNotes: Note[];
  formulaValue: string;
  onFormulaChange: (value: string) => void;
  formulaReturnType: FormulaReturnType;
  onReturnTypeChange: (value: FormulaReturnType) => void;
  formulaValidationError: string | null;
  onValidationErrorChange: (value: string | null) => void;
  isSavingFormula: boolean;
  onDone: () => void;
  isFormulaDirty: boolean;
  buildFormulaDefinitions: (
    formula: string,
    returnType: FormulaReturnType,
  ) => Record<string, FormulaPropertyDefinition>;
  hideHeader?: boolean;
}

export function FormulaEditorSection({
  board,
  property,
  propertyId,
  boardNotes,
  formulaValue,
  onFormulaChange,
  formulaReturnType,
  onReturnTypeChange,
  formulaValidationError,
  onValidationErrorChange,
  isSavingFormula,
  onDone,
  isFormulaDirty,
  buildFormulaDefinitions,
  hideHeader,
}: FormulaEditorSectionProps) {
  const defaultFunction = FORMULA_FUNCTION_GROUPS[0]?.items[0];
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>(defaultFunction?.id ?? "");
  const [showTypeHints, setShowTypeHints] = useState(false);
  const [previewNoteId, setPreviewNoteId] = useState<string>("");
  const [formulaPreview, setFormulaPreview] = useState<
    Array<{ noteId: string; title: string; value: string; error?: string }>
  >([]);
  const formulaEditorRef = useRef<HTMLDivElement>(null);
  const caretOffsetRef = useRef<number | null>(null);
  const [propertySuggestions, setPropertySuggestions] = useState<PropertySuggestionState | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

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

  const filteredFunctionGroups = useMemo(() => {
    const wantedTitles = new Set<string>();
    switch (formulaReturnType) {
      case "number":
        wantedTitles.add("Math");
        wantedTitles.add("Logic & Comparison");
        break;
      case "text":
        wantedTitles.add("Text");
        wantedTitles.add("Logic & Comparison");
        break;
      case "boolean":
        wantedTitles.add("Logic & Comparison");
        break;
      case "date":
        // We don't currently have a Date group; show generic helpers
        wantedTitles.add("Logic & Comparison");
        wantedTitles.add("Text");
        break;
      default:
        break;
    }
    const groups = FORMULA_FUNCTION_GROUPS.filter((g) => wantedTitles.has(g.title));
    // Fallback to all if filter becomes empty (e.g., unknown type)
    return groups.length > 0 ? groups : FORMULA_FUNCTION_GROUPS;
  }, [formulaReturnType]);

  const { getCurrentDataSourceProperties } = useBoard();
  const boardProperties = getCurrentDataSourceProperties(board._id) || board.properties;
  
  const propertyChipList = useMemo(
    () =>
      Object.entries(boardProperties ?? {}).map(([id, schema]) => ({
        id,
        name: schema.name,
        type: schema.type,
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

  useEffect(() => {
    if (!selectedFunctionId && defaultFunction) {
      setSelectedFunctionId(defaultFunction.id);
    }
  }, [selectedFunctionId, defaultFunction]);

  useEffect(() => {
    const editor = formulaEditorRef.current;
    if (!editor) return;
    const rendered = renderFormulaDisplay(formulaValue);
    if (editor.innerHTML !== rendered) {
      editor.innerHTML = rendered;
      // Restore caret if we captured it before render
      if (document.activeElement === editor && caretOffsetRef.current != null) {
        restoreCaretPosition(editor, caretOffsetRef.current);
        caretOffsetRef.current = null;
      }
    }
  }, [formulaValue]);

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
    requestAnimationFrame(() => {
      focusFormulaEditor();
    });
  }, [focusFormulaEditor]);

  useEffect(() => {
    if (!formulaValue.trim()) {
      setFormulaPreview([]);
      onValidationErrorChange(null);
      return;
    }

    const handler = window.setTimeout(() => {
      try {
        const definitions = buildFormulaDefinitions(formulaValue, formulaReturnType);
        const runtime = createFormulaRuntime(definitions);

        if (!runtime.hasFormulas) {
          setFormulaPreview([]);
          onValidationErrorChange(null);
          return;
        }

        const sampleNotes = boardNotes.slice(0, 3);
        if (sampleNotes.length === 0) {
          setFormulaPreview([]);
          onValidationErrorChange(null);
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
            const stillExists = previewResults.some((preview) => preview.noteId === current);
            return stillExists ? current : firstPreview.noteId;
          });
        } else {
          setPreviewNoteId("");
        }
        onValidationErrorChange(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid formula";
        setFormulaPreview([]);
        setPreviewNoteId("");
        onValidationErrorChange(message);
      }
    }, 400);

    return () => window.clearTimeout(handler);
  }, [
    boardNotes,
    formulaReturnType,
    formulaValue,
    propertyId,
    buildFormulaDefinitions,
    onValidationErrorChange,
  ]);

  useEffect(() => {
    if (!previewNoteId && previewNoteOptions.length > 0) {
      const fallback = previewNoteOptions[0];
      if (fallback) {
        setPreviewNoteId(fallback.id);
      }
    }
  }, [previewNoteId, previewNoteOptions]);

  const updatePropertySuggestions = useCallback(
    (currentValue: string) => {
      if (propertyChipList.length === 0) {
        setPropertySuggestions(null);
        return;
      }

      const match = PROPERTY_SUGGESTION_REGEX.exec(currentValue);
      if (!match || match.index === undefined) {
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

      const editor = formulaEditorRef.current;
      if (!editor || document.activeElement !== editor) {
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
    [propertyChipList],
  );

  const handleFormulaInput = useCallback(() => {
    const editor = formulaEditorRef.current;
    if (!editor) return;
    // Capture caret before we trigger any re-render
    caretOffsetRef.current = getCaretCharacterOffsetWithin(editor);
    const newValue = extractFormulaFromElement(editor);
    if (newValue !== formulaValue) {
      onFormulaChange(newValue);
    }
    updatePropertySuggestions(newValue);
  }, [formulaValue, onFormulaChange, updatePropertySuggestions]);

  const handleFormulaPaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      handleFormulaInput();
    },
    [handleFormulaInput],
  );

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
      onFormulaChange(nextFormula);
      setPropertySuggestions(null);
      requestAnimationFrame(() => {
        focusFormulaEditor();
      });
    },
    [focusFormulaEditor, onFormulaChange, propertySuggestions],
  );

  // ——— Caret helpers ———
  function getCaretCharacterOffsetWithin(element: HTMLElement): number {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    let chars = 0;

    function traverse(node: Node): boolean {
      if (node === range.startContainer) {
        chars += range.startOffset;
        return true;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        chars += (node.textContent || "").length;
      } else if (node instanceof HTMLElement) {
        if (node.getAttribute("data-formula-token")) {
          // Treat tokens as an atomic chunk; count their visible text length
          chars += (node.textContent || "").length;
          return false;
        }
      }
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) {
        const found = traverse(children[i]!);
        if (found) return true;
      }
      return false;
    }

    traverse(element);
    return chars;
  }

  function restoreCaretPosition(element: HTMLElement, targetOffset: number) {
    const range = document.createRange();
    let offset = 0;
    let set = false;

    function traverse(node: Node) {
      if (set) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        const next = offset + text.length;
        if (targetOffset <= next) {
          range.setStart(node, Math.max(0, targetOffset - offset));
          range.collapse(true);
          set = true;
          return;
        }
        offset = next;
      } else if (node instanceof HTMLElement) {
        if (node.getAttribute("data-formula-token")) {
          // Skip over token as a whole
          offset += (node.textContent || "").length;
          return;
        }
      }
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) {
        traverse(children[i]!);
        if (set) return;
      }
    }

    traverse(element);
    if (!set) {
      // Fallback to end
      range.selectNodeContents(element);
      range.collapse(false);
    }
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }

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

  const insertPropReference = useCallback(
    (propName: string) => {
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
        return;
      }

      const nextFormula = formulaValue ? `${formulaValue} ${tokenFormula}` : tokenFormula;
      onFormulaChange(nextFormula);
      requestAnimationFrame(() => {
        focusFormulaEditor();
      });
      setPropertySuggestions(null);
    },
    [focusFormulaEditor, formulaValue, handleFormulaInput, onFormulaChange],
  );

  const handleCopyExample = useCallback(async (code: string) => {
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
  }, []);

  return (
    <div className="mt-4  bg-white shadow-sm dark:border-neutral-800 dark:bg-[#101010]">
      {!hideHeader && (
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
              <Calculator className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Edit formula
              </span>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                aria-label="Learn about formulas"
              >
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Return type
              <select
                value={formulaReturnType}
                onChange={(event) => onReturnTypeChange(event.target.value as FormulaReturnType)}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm font-medium text-neutral-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
              </select>
            </label>
            <button
              type="button"
              onClick={onDone}
              disabled={isSavingFormula || (!!formulaValidationError && isFormulaDirty)}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition ${
                isSavingFormula || (!!formulaValidationError && isFormulaDirty)
                  ? "cursor-not-allowed bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500"
                  : "bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
              }`}
            >
              {isSavingFormula ? "Saving..." : "Done"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 px-5 py-5">
        <section className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4 dark:border-neutral-800 dark:bg-[#161616]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm dark:bg-neutral-900 dark:text-blue-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Write, fix, or explain a formula…
                </p>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-400 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Send to AI
                </button>
              </div>
              <div className="relative">
                <div
                  ref={formulaEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  role="textbox"
                  aria-label="Formula expression"
                  onInput={handleFormulaInput}
                  onBlur={handleFormulaBlur}
                  onPaste={handleFormulaPaste}
                  onKeyDown={handleFormulaKeyDown}
                  className="w-full min-h-[80px] max-h-[280px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-neutral-200 bg-white px-3 py-3 font-mono text-sm leading-6 text-neutral-900 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
                {propertySuggestions && propertySuggestions.items.length > 0 && (
                  <div
                    style={{
                      left: propertySuggestions.anchor.left,
                      top: propertySuggestions.anchor.top + 8,
                    }}
                    className="absolute z-20 min-w-[200px] rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <p className="px-2 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Select a property
                    </p>
                    {propertySuggestions.items.map((item, index) => {
                      const isActive = index === activeSuggestionIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            applyPropertySuggestion(item.name);
                          }}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-sm transition ${
                            isActive
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200"
                              : "hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                          }`}
                        >
                          <span className="font-medium">{item.name}</span>
                          {isActive && <span className="text-xs text-blue-500 dark:text-blue-300">↩</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {formulaValidationError ? (
                <div className="flex items-center gap-2 text-xs font-medium text-red-500 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{formulaValidationError}</span>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Use <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs dark:bg-neutral-800">prop("Name")</code> to reference properties. Combine functions like <span className="font-semibold">sum</span>, <span className="font-semibold">concat</span>, or <span className="font-semibold">if</span>.
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <BookOpen className="h-4 w-4" />
            <span>Preview with</span>
            <select
              value={previewNoteId}
              onChange={(event) => setPreviewNoteId(event.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm font-medium text-neutral-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              disabled={previewNoteOptions.length === 0}
            >
              {previewNoteOptions.length === 0 ? (
                <option value="">No notes available</option>
              ) : (
                previewNoteOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setShowTypeHints((prev) => !prev)}
            className={`relative inline-flex items-center rounded-full border border-neutral-300 px-1 py-0.5 text-xs font-medium transition ${
              showTypeHints
                ? "bg-blue-600 text-white dark:border-blue-500"
                : "bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            }`}
          >
            <span
              className={`absolute left-0 top-0 h-full w-1/2 rounded-full bg-blue-500 transition ${
                showTypeHints ? "translate-x-full" : "translate-x-0 opacity-0"
              }`}
            />
            <span className="relative z-10 px-2">Show types</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {propertyChipList.length === 0 ? (
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                Add additional properties to reference them here.
              </span>
            ) : (
              propertyChipList.map((chip) => {
                const label = showTypeHints
                  ? PROPERTY_TYPES.find((prop) => prop.type === chip.type)?.label ?? chip.type
                  : undefined;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => insertPropReference(chip.name)}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                  >
                    <span>{chip.name}</span>
                    {label && (
                      <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">{label}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            Output · {getFormulaReturnLabel(formulaReturnType)}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <Search className="h-4 w-4" />
                Functions
              </div>
            </div>
            <div className="max-h-[34vh] space-y-4 overflow-y-auto px-2 py-3">
              {filteredFunctionGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <p className="px-2 text-xs font-semibold uppercase text-neutral-400 dark:text-neutral-500">
                    {group.title}
                  </p>
                  <div className="flex flex-col gap-1">
                    {group.items.map((fn) => {
                      const isActive = selectedFunction?.id === fn.id;
                      return (
                        <button
                          key={fn.id}
                          type="button"
                          onClick={() => setSelectedFunctionId(fn.id)}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                            isActive
                              ? "bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-500/20 dark:text-blue-200"
                              : "hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                          }`}
                        >
                          <span className="font-medium">{fn.name}</span>
                          <ChevronRight className={`h-4 w-4 ${isActive ? "opacity-100" : "opacity-0"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 max-h-[32vh] overflow-y-auto">
            {selectedFunction ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedFunction.name}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{selectedFunction.signature}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => insertPropReference(selectedFunction.name)}
                    className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm transition hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-neutral-100"
                  >
                    Insert
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{selectedFunction.description}</p>
                <div className="space-y-3">
                  {selectedFunction.examples.map((example, index) => (
                    <div
                      key={`${selectedFunction.id}-example-${index}`}
                      className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"
                    >
                      <div className="flex items-center justify-between gap-3 px-3 py-2">
                        <code className="flex-1 font-mono text-sm text-neutral-800 dark:text-neutral-100">
                          {example.code}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyExample(example.code)}
                          className="inline-flex items-center justify-center rounded-md border border-transparent p-1 text-neutral-400 transition hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200"
                          aria-label="Copy example"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="border-t border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                        = {example.result}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Output preview
                  </div>
                  {activePreviewEntry ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                        {activePreviewEntry.title}
                      </p>
                      {activePreviewEntry.error ? (
                        <p className="flex items-center gap-2 text-sm font-medium text-red-500 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          {activePreviewEntry.error}
                        </p>
                      ) : (
                        <p className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                          {activePreviewEntry.value}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Add a note to this database to preview results.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                Choose a function on the left to see its details.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
