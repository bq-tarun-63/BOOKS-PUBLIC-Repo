"use client";

import React, { useRef, useState, useEffect } from "react";
import { BoardProperty, ViewCollection } from "@/types/board";
import { GripVertical, ChevronDown, Plus, Ellipsis, Trash2, Check } from "lucide-react";
import { PROPERTY_TYPES } from "./addPropertyDialog";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { useBoard } from "@/contexts/boardContext";
import { toast } from "sonner";

interface AdvancedFilterRule {
  id: string;
  propertyId: string | null;
  operator: string;
  value: string | string[]; // Can be single value or array for multi-select
  booleanOperator?: "AND" | "OR"; // Operator connecting this rule to the previous one
}

interface AdvancedFilterModalProps {
  board: ViewCollection;
  boardProperties: Record<string, BoardProperty>;
  onClose: () => void;
  onApply: (rules: AdvancedFilterRule[]) => void;
  initialRules?: AdvancedFilterRule[];
}

const OPERATORS = [
  { id: "equals", label: "Is" },
  { id: "not_equals", label: "Is not" },
  { id: "contains", label: "Contains" },
  { id: "not_contains", label: "Does not contain" },
  { id: "is_empty", label: "Is empty" },
  { id: "is_not_empty", label: "Is not empty" },
  { id: "greater_than", label: "Greater than" },
  { id: "less_than", label: "Less than" },
  { id: "greater_than_or_equal", label: "Greater than or equal" },
  { id: "less_than_or_equal", label: "Less than or equal" },
];

const VALUE_OPERATORS = ["contains", "not_contains", "equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal"];

export default function AdvancedFilterModal({
  board,
  boardProperties,
  onClose,
  onApply,
  initialRules = [],
}: AdvancedFilterModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { workspaceMembers } = useWorkspaceContext();
  const { getNotesByDataSourceId, getDataSource, getRelationNoteTitle, setNotesState, setDataSource } = useBoard();
  const [rules, setRules] = useState<AdvancedFilterRule[]>(() => {
    if (initialRules && initialRules.length > 0) {
      return initialRules;
    }
    // Start with one rule
    return [
      {
        id: `rule-${Date.now()}`,
        propertyId: null,
        operator: "contains",
        value: "",
      },
    ];
  });

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [onClose]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        closeAllDropdowns();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch relation notes when a relation property is selected
  useEffect(() => {
    const fetchRelationNotes = async () => {
      for (const rule of rules) {
        if (!rule.propertyId) continue;
        const prop = boardProperties[rule.propertyId];
        if (prop?.type === "relation" && prop.linkedDatabaseId) {
          const normalizedDataSourceId = typeof prop.linkedDatabaseId === "string" 
            ? prop.linkedDatabaseId 
            : String(prop.linkedDatabaseId);
          
          // Check if notes are already in context
          const existingNotes = getNotesByDataSourceId(normalizedDataSourceId);
          if (existingNotes.length === 0) {
            // Fetch notes from API
            try {
              const { getWithAuth } = await import("@/lib/api-helpers");
              const response: any = await getWithAuth(
                `/api/database/getdataSource/${normalizedDataSourceId}`
              );
              
              if (response?.success && response.collection) {
                // Store data source in context if not already there
                if (response.collection.dataSource) {
                  const ds = response.collection.dataSource;
                  const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : normalizedDataSourceId;
                  
                  const existingDataSource = getDataSource(normalizedDataSourceId);
                  if (!existingDataSource) {
                    setDataSource(dsId, ds);
                  }
                }
                
                // Store notes in context
                const fetchedNotes = response.collection.notes || [];
                if (fetchedNotes.length > 0) {
                  setNotesState(normalizedDataSourceId, fetchedNotes);
                }
              }
            } catch (error) {
              console.error("Failed to fetch relation notes:", error);
            }
          }
        }
      }
    };
    
    fetchRelationNotes();
  }, [rules, boardProperties, getNotesByDataSourceId, getDataSource, setNotesState, setDataSource]);

  const toggleDropdown = (key: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const closeAllDropdowns = () => {
    setOpenDropdowns({});
  };

  const getPropertyIcon = (type: string) => {
    const found = PROPERTY_TYPES.find((p) => p.type === type);
    return found?.icon || null;
  };

  const getPropertyOptions = () => {
    return Object.entries(boardProperties).map(([id, prop]) => ({
      id,
      name: prop.name,
      type: prop.type,
      icon: getPropertyIcon(prop.type),
    }));
  };

  const getOperatorOptions = (propertyId: string | null) => {
    if (!propertyId) return OPERATORS;
    const prop = boardProperties[propertyId];
    if (!prop) return OPERATORS;

    const type = prop.type;
    if (["text", "title", "rich_text"].includes(type)) {
      return OPERATORS.filter((op) => ["contains", "not_contains", "equals", "not_equals", "is_empty", "is_not_empty"].includes(op.id));
    }
    if (["number", "formula"].includes(type)) {
      return OPERATORS;
    }
    if (["select", "status", "priority"].includes(type)) {
      return OPERATORS.filter((op) => ["equals", "not_equals", "is_empty", "is_not_empty"].includes(op.id));
    }
    // Multi-value properties support "contains" and "not_contains" operators
    if (["multi_select", "person", "relation"].includes(type)) {
      return OPERATORS.filter((op) => ["contains", "not_contains", "equals", "not_equals", "is_empty", "is_not_empty"].includes(op.id));
    }
    // Rollup properties
    if (type === "rollup") {
      const calculation = prop.rollup?.calculation;
      if (calculation?.category === "original") {
        // Original category: only contains, not_contains, is_empty, is_not_empty
        return OPERATORS.filter((op) => ["contains", "not_contains", "is_empty", "is_not_empty"].includes(op.id));
      } else if (calculation?.category === "count" || calculation?.category === "percent") {
        // Count/Percent category: numeric operators with input field
        return OPERATORS.filter((op) => ["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal", "is_empty", "is_not_empty"].includes(op.id));
      }
    }
    return OPERATORS;
  };

  // Helper to get target property for rollup
  const getTargetPropertyForRollup = (prop: BoardProperty) => {
    if (prop.type !== "rollup" || !prop.rollup) return null;
    const rollupConfig = prop.rollup;
    if (rollupConfig.targetPropertyId && rollupConfig.relationDataSourceId) {
      const targetDataSource = getDataSource(String(rollupConfig.relationDataSourceId));
      return targetDataSource?.properties?.[rollupConfig.targetPropertyId];
    }
    return null;
  };

  // Check if property supports multiple values
  const supportsMultipleValues = (propertyId: string | null): boolean => {
    if (!propertyId) return false;
    const prop = boardProperties[propertyId];
    if (!prop) return false;
    if (["multi_select", "person", "relation"].includes(prop.type)) {
      return true;
    }
    if (prop.type === "rollup") {
      const targetProp = getTargetPropertyForRollup(prop);
      if (targetProp && ["multi_select", "person", "relation"].includes(targetProp.type)) {
        return true;
      }
    }
    return false;
  };

  const getValueOptions = (propertyId: string | null, operator: string) => {
    if (!propertyId) return [];
    const prop = boardProperties[propertyId];
    if (!prop) return [];

    // Handle select, status, priority, multi_select
    if (prop.type === "select" || prop.type === "status" || prop.type === "priority") {
      return (prop.options || []).map((opt: any) => ({
        id: opt.id || opt.value || opt,
        label: opt.name || opt.label || opt,
        value: opt.id || opt.value || opt,
      }));
    }
    if (prop.type === "multi_select") {
      return (prop.options || []).map((opt: any) => ({
        id: opt.id || opt.value || opt,
        label: opt.name || opt.label || opt,
        value: opt.id || opt.value || opt,
      }));
    }
    
    // Handle person property
    if (prop.type === "person") {
      const personOptions =
        (prop.options && prop.options.length > 0
          ? prop.options.map((opt: any) => ({
              id: opt.id || opt.value || opt.email || opt.userId || opt,
              label: opt.name || opt.label || opt.email || opt.userName || opt,
              value: opt.id || opt.value || opt.email || opt.userId || opt,
            }))
          : []) ||
        [];

      if (personOptions.length > 0) {
        return personOptions;
      }

      return workspaceMembers.map((member: any) => ({
        id: member._id || member.id || member.userId || member.userEmail,
        label: member.name || member.userName || member.email || member.userEmail || "Unknown",
        value: member._id || member.id || member.userId || member.userEmail,
      }));
    }
    
    // Handle relation property
    if (prop.type === "relation" && prop.linkedDatabaseId) {
      const normalizedDataSourceId = typeof prop.linkedDatabaseId === "string" 
        ? prop.linkedDatabaseId 
        : String(prop.linkedDatabaseId);
      const notes = getNotesByDataSourceId(normalizedDataSourceId);
      return notes.map((note: any) => ({
        id: note._id || note.id || "",
        label: note.title || "Untitled",
        value: note._id || note.id || "",
      }));
    }
    
    // Handle rollup property
    if (prop.type === "rollup" && prop.rollup) {
      const rollupConfig = prop.rollup;
      const calculation = rollupConfig.calculation;
      
      // If calculation is "original", show options from target property
      if (calculation?.category === "original" && rollupConfig.targetPropertyId && rollupConfig.relationDataSourceId) {
        const targetDataSource = getDataSource(String(rollupConfig.relationDataSourceId));
        const targetProperty = targetDataSource?.properties?.[rollupConfig.targetPropertyId];
        
        if (targetProperty) {
          // If target property has options (select, status, priority, multi_select), show them
          if (targetProperty.type === "select" || targetProperty.type === "status" || targetProperty.type === "priority") {
            return (targetProperty.options || []).map((opt: any) => ({
              id: opt.id || opt.value || opt,
              label: opt.name || opt.label || opt,
              value: opt.id || opt.value || opt,
            }));
          }
          if (targetProperty.type === "multi_select") {
            return (targetProperty.options || []).map((opt: any) => ({
              id: opt.id || opt.value || opt,
              label: opt.name || opt.label || opt,
              value: opt.id || opt.value || opt,
            }));
          }
          // If target property is relation, show related notes
          if (targetProperty.type === "relation" && targetProperty.linkedDatabaseId) {
            const normalizedTargetDataSourceId = typeof targetProperty.linkedDatabaseId === "string" 
              ? targetProperty.linkedDatabaseId 
              : String(targetProperty.linkedDatabaseId);
            const targetNotes = getNotesByDataSourceId(normalizedTargetDataSourceId);
            return targetNotes.map((note: any) => ({
              id: note._id || note.id || "",
              label: note.title || "Untitled",
              value: note._id || note.id || "",
            }));
          }
          // If target property is person, show workspace members
          if (targetProperty.type === "person") {
            return workspaceMembers.map((member: any) => ({
              id: member._id || member.id || member.userId,
              label: member.name || member.userName || member.email || member.userEmail || "Unknown",
              value: member._id || member.id || member.userId,
            }));
          }
        }
      }
      // For count, percent, or other rollup calculations, return empty array (will show input field)
      return [];
    }
    
    return [];
  };

  const needsValue = (operator: string) => {
    return VALUE_OPERATORS.includes(operator);
  };

  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}-${Math.random()}`,
        propertyId: null,
        operator: "contains",
        value: "",
        booleanOperator: "AND",
      },
    ]);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<AdvancedFilterRule>) => {
    setRules((prev) => prev.map((r) => {
      if (r.id === ruleId) {
        const updated = { ...r, ...updates };
        // If property changed, reset value
        if (updates.propertyId !== undefined && updates.propertyId !== r.propertyId) {
          updated.value = supportsMultipleValues(updates.propertyId) ? [] : "";
        }
        return updated;
      }
      return r;
    }));
  };

  // Get current selected values as array
  const getSelectedValues = (rule: AdvancedFilterRule): string[] => {
    if (Array.isArray(rule.value)) {
      return rule.value;
    }
    return rule.value ? [rule.value] : [];
  };

  // Toggle value in multi-select
  const toggleValue = (ruleId: string, value: string) => {
    setRules((prev) => prev.map((r) => {
      if (r.id === ruleId) {
        const currentValues = getSelectedValues(r);
        const newValues = currentValues.includes(value)
          ? currentValues.filter(v => v !== value)
          : [...currentValues, value];
        return { ...r, value: supportsMultipleValues(r.propertyId) ? newValues : (newValues[0] || "") };
      }
      return r;
    }));
  };

  const handleApply = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Validate all rules
    const validRules = rules.filter((rule) => {
      if (!rule.propertyId || rule.propertyId === "") return false;
      if (VALUE_OPERATORS.includes(rule.operator)) {
        if (Array.isArray(rule.value)) {
          return rule.value.length > 0;
        }
        return rule.value !== null && rule.value !== "";
      }
      return true;
    });

    if (validRules.length === 0) {
      toast.error("Please add at least one valid filter rule");
      return;
    }

    onApply(validRules);
    onClose();
  };

  return (
    <div
      ref={modalRef}
      className="flex flex-col p-2 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg relative"
      style={{
        width: "600px",
        maxWidth: "90vw",
        maxHeight: "80vh",
        zIndex: 1000,
      }}
    >

      {/* Content */}
      <div className="flex-1">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "[boolean-start] 60px [boolean-end property-start] minmax(min-content, 120px) [property-end operator-start] 110px [operator-end value-start] auto [value-end menu-start] 32px [menu-end]",
            gridAutoRows: "minmax(32px, auto)",
            padding: "8px 8px 0px",
            placeItems: "start stretch",
          }}
        >
          {rules.map((rule, ruleIndex) => {
            const propertyDropdownKey = `property-${rule.id}`;
            const operatorDropdownKey = `operator-${rule.id}`;
            const valueDropdownKey = `value-${rule.id}`;
            const menuDropdownKey = `menu-${rule.id}`;

            const selectedProperty = rule.propertyId ? boardProperties[rule.propertyId] : null;
            const PropertyIcon = selectedProperty ? getPropertyIcon(selectedProperty.type) : null;
            const operatorOptions = getOperatorOptions(rule.propertyId);
            const selectedOperator = operatorOptions.find((op) => op.id === rule.operator);
            const valueOptions = getValueOptions(rule.propertyId, rule.operator);

            return (
              <React.Fragment key={rule.id}>
                {/* "Where" Label - only for first rule */}
                {ruleIndex === 0 && (
                  <div
                    className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis justify-self-end pr-1"
                    style={{ gridColumn: "boolean-start / boolean-end", lineHeight: "32px" }}
                  >
                    Where
                  </div>
                )}

                {/* Boolean Operator - only for rules after first */}
                {ruleIndex > 0 && (
                  <div
                    className="flex items-center justify-end pr-1"
                    style={{ gridColumn: "boolean-start / boolean-end" }}
                  >
                    <select
                      value={rule.booleanOperator || "AND"}
                      onChange={(e) => handleUpdateRule(rule.id, { booleanOperator: e.target.value as "AND" | "OR" })}
                      className="px-2 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 bg-background dark:bg-gray-900 text-gray-700 dark:text-gray-300 h-8"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                )}

                {/* Property Selector */}
                <div
                  className="flex relative"
                  style={{ gridColumn: "property-start / property-end" }}
                >
                  <div data-popup-origin="true" className="contents">
                    <button
                      onClick={() => toggleDropdown(propertyDropdownKey)}
                      className="inline-flex items-center gap-1.5 h-8 px-2 rounded border border-gray-300 dark:border-gray-600 bg-background dark:bg-gray-900 text-sm font-medium justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full max-w-full"
                      type="button"
                      aria-expanded={openDropdowns[propertyDropdownKey]}
                      aria-haspopup="dialog"
                    >
                      <div className="flex items-center min-w-0">
                        <div className="flex items-center justify-center mr-1.5 w-4 h-4 flex-shrink-0">
                          {selectedProperty && PropertyIcon ? (
                            <PropertyIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <GripVertical className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                          )}
                        </div>
                        <div className="whitespace-nowrap overflow-hidden text-ellipsis text-gray-700 dark:text-gray-300">
                          {selectedProperty ? capitalize(selectedProperty.name) : "Select property"}
                        </div>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                    </button>
                  </div>
                  {openDropdowns[propertyDropdownKey] && (
                    <div className="absolute top-full left-0 mt-1 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg z-50 min-w-[200px] max-h-60 overflow-y-auto">
                      {getPropertyOptions().map((option) => {
                        const OptionIcon = option.icon;
                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              handleUpdateRule(rule.id, { propertyId: option.id, operator: "contains", value: "" });
                              closeAllDropdowns();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          >
                            {OptionIcon && (
                              <OptionIcon className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                            )}
                            <span className="truncate">{capitalize(option.name)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Operator and Value - Combined in nested grid */}
                <div
                  className="grid items-center gap-2 relative"
                  style={{
                    gridColumn: "operator-start / value-end",
                    gridTemplateColumns: "max-content auto",
                    gridAutoFlow: "column",
                    gridAutoColumns: "1fr",
                  }}
                >
                  {/* Operator */}
                  <div className="relative">
                    <div data-popup-origin="true" className="contents">
                      <button
                        onClick={() => toggleDropdown(operatorDropdownKey)}
                        disabled={!rule.propertyId}
                        className="inline-flex items-center gap-1.5 h-8 px-2 rounded border border-gray-300 dark:border-gray-600 bg-background dark:bg-gray-900 text-sm font-medium justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        type="button"
                        aria-expanded={openDropdowns[operatorDropdownKey]}
                        aria-haspopup="dialog"
                      >
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis">
                          {selectedOperator?.label || "Operator"}
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                      </button>
                    </div>
                    {openDropdowns[operatorDropdownKey] && rule.propertyId && (
                      <div className="absolute top-full left-0 mt-1 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg z-50 min-w-[180px] max-h-60 overflow-y-auto">
                        {operatorOptions.map((op) => (
                          <button
                            key={op.id}
                            onClick={() => {
                              handleUpdateRule(rule.id, { operator: op.id, value: "" });
                              closeAllDropdowns();
                            }}
                            className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Value */}
                  {needsValue(rule.operator) ? (
                    selectedProperty?.type === "date" ? (
                      <input
                        type="date"
                        value={typeof rule.value === "string" ? rule.value : ""}
                        onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                        disabled={!rule.propertyId}
                        className="w-full h-8 px-2 rounded border border-gray-300 dark:border-gray-600 bg-background dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    ) : (selectedProperty?.type === "rollup" && 
                         (selectedProperty.rollup?.calculation?.category === "count" || 
                          selectedProperty.rollup?.calculation?.category === "percent")) ? (
                      <input
                        type="text"
                        value={typeof rule.value === "string" || typeof rule.value === "number" ? String(rule.value) : ""}
                        onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                        placeholder="e.g., 1, 1/2, 1 1/2, 75%"
                        disabled={!rule.propertyId}
                        className="w-full h-8 px-2 rounded border border-gray-300 dark:border-gray-600 bg-background dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    ) : valueOptions.length > 0 ? (
                      <div className="relative">
                        <div data-popup-origin="true" className="contents">
                          <button
                            onClick={() => toggleDropdown(valueDropdownKey)}
                            disabled={!rule.propertyId}
                            className="w-full inline-flex items-center justify-between gap-1.5 h-8 px-2 rounded border border-gray-300 dark:border-gray-600 bg-background dark:bg-gray-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed max-w-[400px]"
                            type="button"
                            aria-expanded={openDropdowns[valueDropdownKey]}
                            aria-haspopup="dialog"
                          >
                            <div className="flex min-w-0 text-gray-600 dark:text-gray-400 overflow-hidden">
                              {(() => {
                                const selectedValues = getSelectedValues(rule);
                                if (selectedValues.length === 0) {
                                  const prop = rule.propertyId ? boardProperties[rule.propertyId] : null;
                                  if (prop?.type === "relation") {
                                    return "Select pages";
                                  }
                                  if (supportsMultipleValues(rule.propertyId)) {
                                    return "Select values";
                                  }
                                  return "Select value";
                                }
                                if (supportsMultipleValues(rule.propertyId)) {
                                  const labels = selectedValues.map(val => {
                                    const opt = valueOptions.find((o) => o.value === val || o.id === val);
                                    return opt ? opt.label : val;
                                  });
                                  return labels.length > 2 
                                    ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`
                                    : labels.join(", ");
                                }
                                // Single value
                                const selectedOption = valueOptions.find((opt) => opt.value === rule.value || opt.id === rule.value);
                                return selectedOption ? selectedOption.label : rule.value;
                              })()}
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                          </button>
                        </div>
                        {openDropdowns[valueDropdownKey] && rule.propertyId && (
                          <div className="absolute top-full left-0 mt-1 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg z-50 min-w-[180px] max-h-60 overflow-y-auto">
                            {valueOptions.map((opt) => {
                              const selectedValues = getSelectedValues(rule);
                              const isSelected = selectedValues.includes(opt.value) || selectedValues.includes(opt.id);
                              const isMultiSelect = supportsMultipleValues(rule.propertyId);
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    if (isMultiSelect) {
                                      toggleValue(rule.id, opt.value);
                                    } else {
                                      handleUpdateRule(rule.id, { value: opt.value });
                                      closeAllDropdowns();
                                    }
                                  }}
                                  className={`w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-2 ${
                                    isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""
                                  }`}
                                >
                                  {isMultiSelect && (
                                    <div className={`w-4 h-4 flex items-center justify-center border rounded ${
                                      isSelected 
                                        ? "bg-blue-600 border-blue-600" 
                                        : "border-gray-300 dark:border-gray-600"
                                    }`}>
                                      {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                  )}
                                  <span className="flex-1">{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={rule.value}
                        onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                        placeholder="Value"
                        disabled={!rule.propertyId}
                        className="w-full h-8 px-2 rounded border border-gray-300 dark:border-gray-600 bg-background dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    )
                  ) : (
                    <div className="w-full h-8 flex items-center text-sm text-gray-500 dark:text-gray-400 px-2">
                      —
                    </div>
                  )}
                </div>

                {/* Menu (Ellipsis) */}
                <div
                  className="flex items-center justify-center relative"
                  style={{ gridColumn: "menu-start / menu-end" }}
                >
                  <div data-popup-origin="true" className="contents">
                    <button
                      onClick={() => toggleDropdown(menuDropdownKey)}
                      className="inline-flex items-center justify-center flex-shrink-0 rounded h-8 w-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      type="button"
                      aria-label="Edit filter actions"
                      aria-expanded={openDropdowns[menuDropdownKey]}
                      aria-haspopup="dialog"
                    >
                      <Ellipsis className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                  {openDropdowns[menuDropdownKey] && (
                    <div className="absolute top-full right-0 mt-1 bg-background dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-lg z-50 min-w-[150px]">
                      <div className="gap-px relative p-1 flex flex-col">
                        <button
                          onClick={() => {
                            handleDeleteRule(rule.id);
                            closeAllDropdowns();
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-700 dark:text-gray-300 min-h-[28px]"
                          role="menuitem"
                          tabIndex={0}
                        >
                          <Trash2 className="w-5 h-5 flex-shrink-0" />
                          <div className="flex-1">Delete filter</div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {/* Add filter rule button */}
          <div
            className="gap-px relative p-1 flex flex-col"
            style={{ gridColumn: "property-start / menu-end", marginTop: "1px" }}
          >
            <div className="absolute top-[-1px] left-3 right-3 h-px bg-gray-200 dark:bg-gray-700" />
            <div data-popup-origin="true" className="contents">
              <button
                onClick={handleAddRule}
                className="w-full flex rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                type="button"
                aria-expanded={false}
                aria-haspopup="dialog"
              >
                <div className="flex items-center gap-2 w-full min-h-[28px] text-sm px-2 h-8">
                  <div className="flex items-center justify-center min-w-[20px] min-h-[20px]">
                    <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis text-gray-600 dark:text-gray-400">
                      <div className="flex gap-1.5 items-center">
                        Add filter rule
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-2 flex items-center justify-between gap-2">
        {/* Clear Advanced Filter Button */}
        {rules.length > 0 && (
          <button
            onClick={async () => {
              // Clear all advanced filters by applying empty array
              const hasValidRules = rules.some((rule) => {
                if (!rule.propertyId || rule.propertyId === "") return false;
                if (VALUE_OPERATORS.includes(rule.operator)) {
                  return rule.value !== null && rule.value !== "";
                }
                return true;
              });
              if (hasValidRules) {
                // Apply empty array to clear filters
                onApply([]);
                toast.success("Advanced filters cleared");
              }
              onClose();
            }}
            className="px-4 py-2 text-sm rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 transition-colors"
            type="button"
          >
            Clear advanced filter
          </button>
        )}
        {/* Action Buttons */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            type="button"
            className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
