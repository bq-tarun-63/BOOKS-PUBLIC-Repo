"use client";

import type { ReactNode } from "react";
import { useState, useRef, useEffect } from "react";
import { Calendar, Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilePropertyInput } from "@/components/tailwind/board/properties/inputs/filePropertyInput";

export interface FormFieldOption {
  id: string;
  name: string;
  color?: string;
}

export type FormFieldType =
  | "text"
  | "number"
  | "date"
  | "checkbox"
  | "select"
  | "multi_select"
  | "status"
  | "person"
  | "priority"
  | "url"
  | "phone"
  | "email"
  | "place"
  | "file";

export interface GenericFormFieldProps {
  type: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: FormFieldOption[];
  isLongAnswer?: boolean;
  className?: string;
  onAddOption?: (optionName: string) => Promise<void> | void;
  onDeleteOption?: (optionId: string) => Promise<void> | void;
  onReorderOptions?: (optionIds: string[]) => Promise<void> | void;
  showAddOptionButton?: boolean;
}

const INPUT_BASE_STYLES = (disabled: boolean) =>
  `px-3 py-2 text-base rounded-md bg-transparent focus:outline-none focus:ring-2 transition-colors
   ${disabled ? "border border-gray-100 dark:border-gray-600" : "border border-gray-300"}`;

const TEXTAREA_BASE_STYLES = (disabled: boolean) =>
  `w-full min-h-[100px] px-3 py-2 text-base rounded-md bg-transparent focus:outline-none focus:ring-2 resize-y
   ${disabled ? "border border-gray-100 dark:border-gray-600" : "border border-gray-300"}`;

export function GenericFormField({
  type,
  value,
  onChange,
  placeholder = "Respondent's answer",
  required = false,
  disabled = false,
  options = [],
  isLongAnswer = false,
  className,
  onAddOption,
  onDeleteOption,
  onReorderOptions,
  showAddOptionButton = false,
}: GenericFormFieldProps) {
  const renderField = (): ReactNode => {
    switch (type) {
      case "text":
        if (isLongAnswer) {
          return (
            <textarea
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              className={cn(TEXTAREA_BASE_STYLES(disabled), className)}
            />
          );
        }
        return (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={cn(INPUT_BASE_STYLES(disabled), "w-full", className)}
          />
        );

      case "email":
        return (
          <input
            type="email"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={cn(INPUT_BASE_STYLES(disabled), "w-full", className)}
          />
        );

      case "url":
        return (
          <input
            type="url"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={cn(INPUT_BASE_STYLES(disabled), "w-full", className)}
          />
        );

      case "phone":
        return (
          <input
            type="tel"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={cn(INPUT_BASE_STYLES(disabled), "w-full", className)}
          />
        );

      case "place":
        return (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={cn(INPUT_BASE_STYLES(disabled), "w-full", className)}
          />
        );

      case "file":
        return (
          <div className={cn("w-full", className)}>
            <FilePropertyInput
              value={value}
              onChange={(val) => onChange(val)}
            />
          </div>
        );

      case "number":
        return (
          <input
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={cn(INPUT_BASE_STYLES(disabled), "w-full", className)}
          />
        );

      case "checkbox":
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              required={required}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
          </div>
        );

      case "date":
        return <DateField value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} required={required} className={className} />;

      case "select":
      case "status":
      case "priority":
        return (
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={required}
            className={cn(INPUT_BASE_STYLES(disabled), "w-full", className)}
          >
            <option value="">Select an option</option>
            {options.map((option) => (
              <option key={option.id} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
        );

      case "multi_select":
        return <MultiSelectField value={value} onChange={onChange} options={options} disabled={disabled} onAddOption={onAddOption} onDeleteOption={onDeleteOption} onReorderOptions={onReorderOptions} showAddOptionButton={showAddOptionButton} className={className} />;

      default:
        return (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={cn(INPUT_BASE_STYLES(disabled), "w-full", className)}
          />
        );
    }
  };

  return <div className="mt-2">{renderField()}</div>;
}

// Date Field Component - Simple native date input
function DateField({ 
  value, 
  onChange, 
  placeholder = "Select date", 
  disabled = false, 
  required = false,
  className 
}: {
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const [inputValue, setInputValue] = useState(() => {
    if (!value) return "";
    try {
      const date = typeof value === "string" ? new Date(value) : value;
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue || null);
  };

  return (
    <input
      type="date"
      value={inputValue}
      onChange={handleDateChange}
      disabled={disabled}
      required={required}
      className={cn(INPUT_BASE_STYLES(disabled), "w-full", className)}
    />
  );
}

// Multi-Select Field Component with Notion-style UI
function MultiSelectField({
  value,
  onChange,
  options = [],
  disabled = false,
  onAddOption,
  onDeleteOption,
  onReorderOptions,
  showAddOptionButton = false,
  className
}: {
  value: any;
  onChange: (value: any) => void;
  options?: FormFieldOption[];
  disabled?: boolean;
  onAddOption?: (optionName: string) => Promise<void> | void;
  onDeleteOption?: (optionId: string) => Promise<void> | void;
  onReorderOptions?: (optionIds: string[]) => Promise<void> | void;
  showAddOptionButton?: boolean;
  className?: string;
}) {
  const [localOptions, setLocalOptions] = useState<FormFieldOption[]>(options);
  const [newOptionName, setNewOptionName] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
  const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null);
  const [dragOverOptionId, setDragOverOptionId] = useState<string | null>(null);
  const newOptionInputRef = useRef<HTMLInputElement>(null);

  // Update local options when props change
  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  useEffect(() => {
    if (isAddingOption && newOptionInputRef.current) {
      newOptionInputRef.current.focus();
    }
  }, [isAddingOption]);

  const handleCheckboxChange = (optionName: string, checked: boolean) => {
    const currentValues = Array.isArray(value) ? value : [];
    if (checked) {
      onChange([...currentValues, optionName]);
    } else {
      onChange(currentValues.filter((v) => v !== optionName));
    }
  };

  const handleAddOptionClick = () => {
    setIsAddingOption(true);
    setNewOptionName("");
  };

  const handleNewOptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmedName = newOptionName.trim();
      if (trimmedName && onAddOption) {
        // Make API call to add option with the name
        onAddOption(trimmedName);
        setIsAddingOption(false);
        setNewOptionName("");
      }
    } else if (e.key === "Escape") {
      setIsAddingOption(false);
      setNewOptionName("");
    }
  };

  const handleNewOptionBlur = () => {
    const trimmedName = newOptionName.trim();
    if (trimmedName && onAddOption) {
      // Make API call to add option with the name
      onAddOption(trimmedName);
    }
    setIsAddingOption(false);
    setNewOptionName("");
  };

  const handleDeleteOption = (optionId: string) => {
    if (onDeleteOption) {
      onDeleteOption(optionId);
    }
  };

  const handleOptionDragStart = (e: React.DragEvent, optionId: string) => {
    setDraggedOptionId(optionId);
    e.dataTransfer.effectAllowed = "move";
    
    // Prevent dragging the full element snapshot
    const img = new Image();
    img.src = "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleOptionDragOver = (e: React.DragEvent, optionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedOptionId && draggedOptionId !== optionId) {
      setDragOverOptionId(optionId);
    }
  };

  const handleOptionDragLeave = () => {
    setDragOverOptionId(null);
  };

  const handleOptionDrop = (e: React.DragEvent, dropOptionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedOptionId || draggedOptionId === dropOptionId) {
      setDraggedOptionId(null);
      setDragOverOptionId(null);
      return;
    }

    // Reorder options
    const currentOrder = [...localOptions];
    const draggedIndex = currentOrder.findIndex(opt => opt.id === draggedOptionId);
    const dropIndex = currentOrder.findIndex(opt => opt.id === dropOptionId);

    if (draggedIndex !== -1 && dropIndex !== -1) {
      const [moved] = currentOrder.splice(draggedIndex, 1);
      if (moved) {
        currentOrder.splice(dropIndex, 0, moved);
        setLocalOptions(currentOrder);
        
        // Call API to reorder
        if (onReorderOptions) {
          onReorderOptions(currentOrder.map(opt => opt.id));
        }
      }
    }

    setDraggedOptionId(null);
    setDragOverOptionId(null);
  };

  const handleOptionDragEnd = () => {
    setDraggedOptionId(null);
    setDragOverOptionId(null);
  };

  return (
    <div className={cn("space-y-1", className)}>
      {localOptions.map((option, index) => {
        const isChecked = Array.isArray(value) && value.includes(option.name);
        const isHovered = hoveredOptionId === option.id;
        const isDragged = draggedOptionId === option.id;
        const isDragOver = dragOverOptionId === option.id;

        return (
          <div
            key={option.id}
            draggable={!disabled}
            onDragStart={(e) => handleOptionDragStart(e, option.id)}
            onDragOver={(e) => handleOptionDragOver(e, option.id)}
            onDragLeave={handleOptionDragLeave}
            onDrop={(e) => handleOptionDrop(e, option.id)}
            onDragEnd={handleOptionDragEnd}
            onMouseEnter={() => setHoveredOptionId(option.id)}
            onMouseLeave={() => setHoveredOptionId(null)}
            className={cn(
              "flex items-center w-full px-2 py-1 rounded-md transition-colors group",
              isHovered && "bg-gray-50 dark:bg-gray-800/50",
              isDragged && "opacity-50",
              isDragOver && "opacity-75"
            )}
            style={{ cursor: disabled ? "default" : "grab" }}
          >

            {/* Drag handle */}
            {!disabled && (
              <div className="flex items-center justify-center w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              </div>
            )}

            <div className="flex items-center flex-1 min-w-0">
              <label
                className="flex items-center gap-3 flex-1 min-w-0"
                style={{ userSelect: "none", cursor: disabled ? "default" : "grab" }}
              >
                <div className="flex items-center justify-center min-w-[18px] h-[18px] flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(option.name, e.target.checked)}
                    disabled={disabled}
                    className="opacity-0 w-4 h-4 pointer-events-none"
                    style={{ position: "absolute" }}
                  />
                  <span
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded-sm border transition-colors flex-shrink-0",
                      isChecked
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-200 dark:border-gray-600"
                    )}
                  >
                    {isChecked && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-base text-gray-900 dark:text-gray-100">
                  {option.name || <span className="text-base text-gray-400 dark:text-gray-500">Option</span>}
                </div>
              </label>
            </div>

            {/* Delete icon at end - show on hover */}
            {isHovered && onDeleteOption && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteOption(option.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded ml-1"
              >
                <Trash2 className="w-3 h-3 text-red-500 dark:text-red-400" />
              </button>
            )}
          </div>
        );
      })}
      
      {/* New option being added */}
      {isAddingOption && (
        <div className="flex items-center w-full px-2 py-1 rounded-md">
          <div className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center min-w-[18px] h-[18px] flex-shrink-0">
                <input
                  type="checkbox"
                  disabled
                  className="opacity-0 w-[18px] h-[18px] pointer-events-none"
                  style={{ position: "absolute" }}
                />
                <span
                  className="flex items-center justify-center w-[15px] h-[15px] rounded-sm border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  style={{
                    boxShadow: "0 0 0 1.5px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </div>
              <input
                ref={newOptionInputRef}
                type="text"
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                onKeyDown={handleNewOptionKeyDown}
                onBlur={handleNewOptionBlur}
                placeholder="Option name"
                className="flex-1 min-w-0 border-none bg-transparent text-base outline-none text-gray-900 dark:text-gray-100"
                style={{ padding: 0 }}
              />
            </div>
          </div>
        </div>
      )}

      {showAddOptionButton && onAddOption && !isAddingOption && (
        <button
          type="button"
          onClick={handleAddOptionClick}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mt-2 px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          style={{ userSelect: "none", cursor: "pointer" }}
        >
          <Plus className="w-4 h-4" />
          <span>Add option</span>
        </button>
      )}
    </div>
  );
}

