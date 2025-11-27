"use client";

import { useEffect, useRef } from "react";
import type { ViewCollection, BoardProperty, Note } from "@/types/board";
import type { FormulaReturnType } from "@/utils/formatFormulaValue";
import type { FormulaPropertyDefinition } from "@/lib/formula/evaluator";
import { X } from "lucide-react";
import { FormulaEditorSection } from "./formulaEditorSection";

interface FormulaEditorModalProps {
  readonly board: ViewCollection;
  readonly property: BoardProperty;
  readonly propertyId: string;
  readonly boardNotes: Note[];
  readonly formulaValue: string;
  readonly onFormulaChange: (value: string) => void;
  readonly formulaReturnType: FormulaReturnType;
  readonly onReturnTypeChange: (value: FormulaReturnType) => void;
  readonly formulaValidationError: string | null;
  readonly onValidationErrorChange: (value: string | null) => void;
  readonly isSavingFormula: boolean;
  readonly onDone: () => void;
  readonly isFormulaDirty: boolean;
  readonly buildFormulaDefinitions: (
    formula: string,
    returnType: FormulaReturnType,
  ) => Record<string, FormulaPropertyDefinition>;
  readonly onClose: () => void;
}

export default function FormulaEditorModal({
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
  onClose,
}: FormulaEditorModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
      <div
        ref={panelRef}
        className="relative z-[101] w-full max-w-[840px] max-h-[85vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-background shadow-lg dark:border-neutral-800"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <p className="m-0 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Edit formula</p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Return type
              <select
                value={formulaReturnType}
                onChange={(e) => onReturnTypeChange(e.target.value as FormulaReturnType)}
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
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X className="h-4 w-4 text-neutral-500" />
            </button>
          </div>
        </div>
        <div>
          <FormulaEditorSection
            board={board}
            property={property}
            propertyId={propertyId}
            boardNotes={boardNotes}
            formulaValue={formulaValue}
            onFormulaChange={onFormulaChange}
            formulaReturnType={formulaReturnType}
            onReturnTypeChange={onReturnTypeChange}
            formulaValidationError={formulaValidationError}
            onValidationErrorChange={onValidationErrorChange}
            isSavingFormula={isSavingFormula}
            onDone={onDone}
            isFormulaDirty={isFormulaDirty}
            buildFormulaDefinitions={buildFormulaDefinitions}
            hideHeader
          />
        </div>
      </div>
    </div>
  );
}


