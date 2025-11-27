"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardProperties, RollupCalculation } from "@/types/board";
import type { RollupComputation } from "@/utils/rollupUtils";
import { normalizeCalculation } from "@/utils/rollupUtils";
import { ChevronDown, ChevronRight, Check, Loader2, Link2 } from "lucide-react";

import { PROPERTY_TYPES } from "../../addPropertyDialog";

interface RelationOption {
  id: string;
  name: string;
  linkedDatabaseId?: string;
}

interface RollupPropertyInputProps {
  relationOptions: RelationOption[];
  selectedRelationId?: string;
  targetProperties?: BoardProperties;
  selectedPropertyId?: string;
  calculation?: RollupCalculation;
  selectedOptions?: string[];
  loadingProperties?: boolean;
  disabled?: boolean;
  rollupResult?: RollupComputation;
  onChange: (updates: {
    relationId?: string;
    linkedDatabaseId?: string;
    targetPropertyId?: string;
    calculation?: RollupCalculation;
    selectedOptions?: string[];
  }) => void;
}

export function RollupPropertyInput({
  relationOptions,
  selectedRelationId,
  targetProperties,
  selectedPropertyId,
  calculation,
  selectedOptions = [],
  loadingProperties,
  disabled,
  rollupResult,
  onChange,
}: RollupPropertyInputProps) {
  // Normalize calculation to object format (supports backward compatibility)
  const normalizedCalculation = useMemo(() => normalizeCalculation(calculation), [calculation]);
  
  // Helper to get display label for calculation
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
  
  const [openMenu, setOpenMenu] = useState<"relation" | "property" | "calculation" | null>(null);
  const [calculationSubmenu, setCalculationSubmenu] = useState<"count" | "percent" | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [localSelectedOptions, setLocalSelectedOptions] = useState<string[]>(selectedOptions || []);
  const relationMenuRef = useRef<HTMLDivElement>(null);
  const propertyMenuRef = useRef<HTMLDivElement>(null);
  const calculationMenuRef = useRef<HTMLDivElement>(null);
  const calculationSubmenuRef = useRef<HTMLDivElement>(null);
  const calculationSectionRef = useRef<HTMLDivElement>(null);
  const optionsModalRef = useRef<HTMLDivElement>(null);
  const countPerGroupButtonRef = useRef<HTMLButtonElement>(null);
  const percentPerGroupButtonRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const builderModalRef = useRef<HTMLDivElement>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [optionsModalPosition, setOptionsModalPosition] = useState<"count" | "percent" | null>(null);

  // Sync localSelectedOptions with prop when it changes
  useEffect(() => {
    setLocalSelectedOptions(selectedOptions || []);
  }, [selectedOptions]);

  // Reset local state when modal opens
  useEffect(() => {
    if (showOptionsModal) {
      setLocalSelectedOptions(selectedOptions || []);
    }
  }, [showOptionsModal, selectedOptions]);

  const selectedRelation = relationOptions.find((option) => option.id === selectedRelationId);
  const propertyEntries = useMemo(() => Object.entries(targetProperties || {}), [targetProperties]);
  const selectedPropertyName = selectedPropertyId
    ? targetProperties?.[selectedPropertyId]?.name ?? "Unknown"
    : undefined;
  const selectedProperty = selectedPropertyId ? targetProperties?.[selectedPropertyId] : undefined;
  const SelectedPropertyIcon = selectedProperty
    ? PROPERTY_TYPES.find((p) => p.type === selectedProperty.type)?.icon
    : undefined;

  // For per_group calculations, use the selected target property itself for grouping
  const isPerGroupCalculation =
    (normalizedCalculation.category === "count" || normalizedCalculation.category === "percent") &&
    normalizedCalculation.value === "per_group";
  
  // Check if the selected property can be used for grouping (select, multi_select, status)
  const canGroupBySelectedProperty = selectedProperty &&
    (selectedProperty.type === "select" || 
     selectedProperty.type === "multi_select" || 
     selectedProperty.type === "status");

  useEffect(() => {
    if (!isBuilderOpen && !openMenu && !calculationSubmenu && !showOptionsModal) return;
    const handleClickOutside = (event: MouseEvent) => {
      const node = event.target as Node;
      const refs = [
        previewRef.current,
        builderModalRef.current,
        relationMenuRef.current,
        propertyMenuRef.current,
        calculationMenuRef.current,
        calculationSubmenuRef.current,
        optionsModalRef.current,
        countPerGroupButtonRef.current,
        percentPerGroupButtonRef.current,
      ];
      const clickedInside = refs.some((ref) => ref && ref.contains(node));
      if (!clickedInside) {
        if (isBuilderOpen) {
          setIsBuilderOpen(false);
        }
        setOpenMenu(null);
        setCalculationSubmenu(null);
        if (showOptionsModal) {
          // Save current selections before closing
          onChange({ selectedOptions: localSelectedOptions });
          setShowOptionsModal(false);
          setOptionsModalPosition(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isBuilderOpen, openMenu, calculationSubmenu, showOptionsModal, localSelectedOptions, onChange]);

  const renderListContainer = (children: React.ReactNode, ref: React.RefObject<HTMLDivElement>) => (
    <div
      ref={ref}
      className="absolute z-[205] mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1f1f1f]"
    >
      <div className="max-h-64 overflow-y-auto p-1">{children}</div>
    </div>
  );

  const renderOptionsModal = () => {
    if (!showOptionsModal) return null;
    
    // Show message if property doesn't support grouping
    if (!selectedProperty || !canGroupBySelectedProperty) {
      return (
        <div 
          className="absolute z-[240] top-full left-0 mt-2 w-[280px] rounded-lg border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-[#1f1f1f]" 
          ref={optionsModalRef}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              No options available
            </h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsModal(false);
                setOptionsModalPosition(null);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          <div className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
            The selected property does not support grouping. Please select a property with options (select, multi_select, or status).
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsModal(false);
                setOptionsModalPosition(null);
              }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className="absolute z-[240] top-full left-0 mt-2 w-[280px] rounded-lg border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-[#1f1f1f]" 
        ref={optionsModalRef}
        onClick={(e) => e.stopPropagation()}
      >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Select options from {selectedProperty.name}
            </h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsModal(false);
                setOptionsModalPosition(null);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {selectedProperty.options && selectedProperty.options.length > 0 ? (
              selectedProperty.options.map((option) => {
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
                      // Update local state immediately for UI feedback
                      setLocalSelectedOptions(newOptions);
                      // Update parent state immediately on each selection
                      onChange({ selectedOptions: newOptions });
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
              <div className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
                No options available
              </div>
            )}
          </div>
        </div>
    );
  };

  const disabledRelation = disabled || relationOptions.length === 0;
  const disabledProperty = disabled || !selectedRelationId;

  const content = rollupResult?.state === "ready" ? rollupResult : null;

  return (
    <div className="relative w-full " ref={previewRef}>
      {/* Preview - always visible */}
      {!selectedRelationId ? (
        <button
          type="button"
          onClick={() => setIsBuilderOpen(true)}
          className="w-[250px] hover:bg-gray-200 rounded-md px-3 py-2 text-left text-sm text-gray-500 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400"
        >
          Configure rollup
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsBuilderOpen(true)}
          className="w-[250px] hover:bg-gray-200 rounded-md p-2 text-left text-sm text-gray-600 transition hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
        >
          {content ? (
            content.calculation?.category === "count" ? (
              content.calculation.value === "per_group" ? (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {content.countFraction ?? `${content.count ?? 0}/${content.totalCount ?? 0}`}
                </span>
              ) : (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {content.count ?? 0}
                </span>
              )
            ) : content.calculation?.category === "percent" ? (
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {content.percent ?? 0}%
              </span>
            ) : (
              <div className="flex flex-row flex-wrap gap-1 text-gray-900 dark:text-gray-100">
                {(content.values || []).length > 0 ? (
                  (content.values || []).map((val, idx) => (
                    <span key={`rollup-preview-${idx}`} className="truncate max-w-full">
                      {val}
                      {idx < (content.values || []).length - 1 && <span className="mx-1">,</span>}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">No related values yet</span>
                )}
              </div>
            )
          ) : rollupResult?.message ? (
            <span>{rollupResult.message}</span>
          ) : (
            <span>Rollup configured</span>
          )}
        </button>
      )}

      {/* Builder Modal - absolute positioned below preview */}
      {isBuilderOpen && (
        <div className="relative" ref={builderModalRef}>
          <div className="absolute z-[220] top-full left-0 mt-2 flex max-h-[80vh] w-[280px] flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-[#1f1f1f]">
            {/* Relation */}
            <div className="space-y-1">
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                Relation
              </div>
              <div className="relative">
                <button
                  type="button"
                  disabled={disabledRelation}
                  onClick={() => setOpenMenu(openMenu === "relation" ? null : "relation")}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60  dark:bg-[#1f1f1f] dark:text-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="truncate">
                      {selectedRelation ? selectedRelation.name : disabledRelation ? "No relation available" : "Select an existing relation…"}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </button>
                {openMenu === "relation" &&
                  renderListContainer(
                    relationOptions.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">No relations found</div>
                    ) : (
                      relationOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setOpenMenu(null);
                            onChange({ relationId: option.id, linkedDatabaseId: option.linkedDatabaseId });
                          }}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            option.id === selectedRelationId ? "bg-gray-100 dark:bg-gray-700" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="truncate">{option.name}</span>
                          </div>
                          {option.id === selectedRelationId && <Check className="h-4 w-4 text-blue-500" />}
                        </button>
                      ))
                    ),
                    relationMenuRef,
                  )}
              </div>
            </div>

            {/* Property */}
            <div className="space-y-1">
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                Property
              </div>
              <div className="relative">
                <button
                  type="button"
                  disabled={disabledProperty}
                  onClick={() => setOpenMenu(openMenu === "property" ? null : "property")}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#1f1f1f] dark:text-gray-100"
                >
                  <div className="flex items-center gap-2">
                    {SelectedPropertyIcon && (
                      <SelectedPropertyIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                    <span className="truncate">
                      {selectedPropertyName
                        ? selectedPropertyName
                        : !selectedRelationId
                          ? "Select relation first…"
                          : loadingProperties
                            ? "Loading properties…"
                            : propertyEntries.length === 0
                              ? "No properties available"
                              : "Select a property…"}
                    </span>
                  </div>
                  {loadingProperties ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
                {openMenu === "property" &&
                  !disabledProperty &&
                  !loadingProperties &&
                  renderListContainer(
                    propertyEntries.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">No properties to roll up</div>
                    ) : (
                      propertyEntries.map(([id, schema]) => {
                        const PropertyIcon = PROPERTY_TYPES.find((p) => p.type === schema.type)?.icon;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              onChange({ targetPropertyId: id });
                            }}
                            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              id === selectedPropertyId ? "bg-gray-100 dark:bg-gray-700" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {PropertyIcon && <PropertyIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                              <span className="truncate font-medium text-gray-900 dark:text-gray-100">{schema.name}</span>
                            </div>
                            {id === selectedPropertyId && <Check className="h-4 w-4 text-blue-500" />}
                          </button>
                        );
                      })
                    ),
                    propertyMenuRef,
                  )}
              </div>
            </div>

            {/* Calculation */}
            <div className="space-y-1" ref={calculationSectionRef}>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                Calculate
              </div>
              <div className="relative">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setOpenMenu(openMenu === "calculation" ? null : "calculation")}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#1f1f1f] dark:text-gray-100"
                >
                  <span className="truncate">
                    {getCalculationLabel(normalizedCalculation)}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </button>
                {openMenu === "calculation" && (
                  <div
                    ref={calculationMenuRef}
                    className="absolute z-[205] mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1f1f1f]"
                  >
                    <div className="p-1">
                      {/* Show original */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          onChange({
                            calculation: { category: "original", value: "original" },
                            selectedOptions: undefined,
                          });
                        }}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          normalizedCalculation.category === "original" ? "bg-gray-100 dark:bg-gray-700" : ""
                        }`}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">Show original</span>
                        {normalizedCalculation.category === "original" && <Check className="h-4 w-4 text-blue-500" />}
                      </button>

                      {/* Count with submenu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setCalculationSubmenu(calculationSubmenu === "count" ? null : "count");
                          }}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            normalizedCalculation.category === "count"
                              ? "bg-gray-100 dark:bg-gray-700"
                              : ""
                          }`}
                        >
                          <span className="font-medium text-gray-900 dark:text-gray-100">Count</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        </button>
                        {calculationSubmenu === "count" && (
                          <div
                            ref={calculationSubmenuRef}
                            className="absolute z-[100] left-0 ml-1 w-[180px] rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1f1f1f]"
                          >
                            <div className="p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenMenu(null);
                                  onChange({
                                    calculation: { category: "count", value: "all" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  normalizedCalculation.category === "count" && normalizedCalculation.value === "all" ? "bg-gray-100 dark:bg-gray-700" : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Count all</span>
                                {normalizedCalculation.category === "count" && normalizedCalculation.value === "all" && <Check className="h-4 w-4 text-blue-500" />}
                              </button>
                              <div className="relative">
                                <button
                                  ref={countPerGroupButtonRef}
                                  type="button"
                                  onClick={() => {
                                    onChange({
                                      calculation: { category: "count", value: "per_group" },
                                      selectedOptions: selectedOptions,
                                    });
                                    // Open options modal
                                    setShowOptionsModal(true);
                                    setOptionsModalPosition("count");
                                  }}
                                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                    normalizedCalculation.category === "count" && normalizedCalculation.value === "per_group" ? "bg-gray-100 dark:bg-gray-700" : ""
                                  }`}
                                >
                                  <span className="font-medium text-gray-900 dark:text-gray-100">Count per group</span>
                                  <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                </button>
                                {showOptionsModal && optionsModalPosition === "count" && renderOptionsModal()}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenMenu(null);
                                  onChange({
                                    calculation: { category: "count", value: "empty" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  normalizedCalculation.category === "count" && normalizedCalculation.value === "empty" ? "bg-gray-100 dark:bg-gray-700" : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Count empty</span>
                                {normalizedCalculation.category === "count" && normalizedCalculation.value === "empty" && <Check className="h-4 w-4 text-blue-500" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenMenu(null);
                                  onChange({
                                    calculation: { category: "count", value: "non_empty" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  normalizedCalculation.category === "count" && normalizedCalculation.value === "non_empty" ? "bg-gray-100 dark:bg-gray-700" : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Count non empty</span>
                                {normalizedCalculation.category === "count" && normalizedCalculation.value === "non_empty" && <Check className="h-4 w-4 text-blue-500" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Percent with submenu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setCalculationSubmenu(calculationSubmenu === "percent" ? null : "percent");
                          }}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            normalizedCalculation.category === "percent"
                              ? "bg-gray-100 dark:bg-gray-700"
                              : ""
                          }`}
                        >
                          <span className="font-medium text-gray-900 dark:text-gray-100">Percent</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        </button>
                        {calculationSubmenu === "percent" && (
                          <div
                            ref={calculationSubmenuRef}
                            className="absolute z-[100] left-0 ml-1 w-[180px] rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1f1f1f]"
                          >
                            <div className="max-h-64 p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenMenu(null);
                                  onChange({
                                    calculation: { category: "percent", value: "all" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  normalizedCalculation.category === "percent" && normalizedCalculation.value === "all" ? "bg-gray-100 dark:bg-gray-700" : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Percent all</span>
                                {normalizedCalculation.category === "percent" && normalizedCalculation.value === "all" && <Check className="h-4 w-4 text-blue-500" />}
                              </button>
                              <div className="relative">
                                <button
                                  ref={percentPerGroupButtonRef}
                                  type="button"
                                  onClick={() => {
                                    onChange({
                                      calculation: { category: "percent", value: "per_group" },
                                      selectedOptions: selectedOptions,
                                    });
                                    // Open options modal
                                    setShowOptionsModal(true);
                                    setOptionsModalPosition("percent");
                                  }}
                                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                    normalizedCalculation.category === "percent" && normalizedCalculation.value === "per_group" ? "bg-gray-100 dark:bg-gray-700" : ""
                                  }`}
                                >
                                  <span className="font-medium text-gray-900 dark:text-gray-100">Percent per group</span>
                                  <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                </button>
                                {showOptionsModal && optionsModalPosition === "percent" && renderOptionsModal()}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenMenu(null);
                                  onChange({
                                    calculation: { category: "percent", value: "empty" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  normalizedCalculation.category === "percent" && normalizedCalculation.value === "empty" ? "bg-gray-100 dark:bg-gray-700" : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Percent empty</span>
                                {normalizedCalculation.category === "percent" && normalizedCalculation.value === "empty" && <Check className="h-4 w-4 text-blue-500" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCalculationSubmenu(null);
                                  setOpenMenu(null);
                                  onChange({
                                    calculation: { category: "percent", value: "non_empty" },
                                    selectedOptions: undefined,
                                  });
                                }}
                                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  normalizedCalculation.category === "percent" && normalizedCalculation.value === "non_empty" ? "bg-gray-100 dark:bg-gray-700" : ""
                                }`}
                              >
                                <span className="font-medium text-gray-900 dark:text-gray-100">Percent non empty</span>
                                {normalizedCalculation.category === "percent" && normalizedCalculation.value === "non_empty" && <Check className="h-4 w-4 text-blue-500" />}
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

          </div>
        </div>
      )}
    </div>
  );
}

export type { RelationOption as RollupRelationOption };

