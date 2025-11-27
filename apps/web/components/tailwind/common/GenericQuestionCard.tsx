"use client";

import { useState, useEffect, useRef, type ReactNode, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { GenericFormField, type FormFieldType, type FormFieldOption } from "./GenericFormField";

export interface GenericQuestionCardProps {
  id: string;
  title: string;
  description?: string;
  helperText?: string;
  required?: boolean;
  fieldType: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  options?: FormFieldOption[];
  isLongAnswer?: boolean;
  disabled?: boolean;
  className?: string;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  onAddOption?: (optionName: string) => Promise<void> | void;
  onDeleteOption?: (optionId: string) => Promise<void> | void;
  onReorderOptions?: (optionIds: string[]) => Promise<void> | void;
  showAddOptionButton?: boolean;
  actionsMenu?: ReactNode;
  actionsMenuVisible?: boolean;
  renderCustomField?: () => ReactNode;
  editable?: boolean;
  cardClassName?: string;
}

const CARD_BASE_STYLES =
  "bg-white dark:bg-gray-900 rounded-xl p-3 relative transition-shadow";

export function GenericQuestionCard({
  id,
  title,
  description,
  helperText,
  required = false,
  fieldType,
  value,
  onChange,
  options = [],
  isLongAnswer = false,
  disabled = false,
  className,
  onTitleChange,
  onDescriptionChange,
  onAddOption,
  onDeleteOption,
  onReorderOptions,
  showAddOptionButton = false,
  actionsMenu,
  renderCustomField,
  editable = true,
  cardClassName,
  actionsMenuVisible = false,
}: GenericQuestionCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState(description || "");
  const suppressNextTitleBlur = useRef(false);
  const suppressNextDescriptionBlur = useRef(false);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    setLocalDescription(description || "");
  }, [description]);

  const commitTitleChange = (value: string) => {
    setLocalTitle(value);
    onTitleChange?.(value);
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (suppressNextTitleBlur.current) {
      suppressNextTitleBlur.current = false;
      setIsEditingTitle(false);
      return;
    }
    if (!editable) return;
    const newTitle = e.currentTarget.textContent || title;
    setIsEditingTitle(false);
    commitTitleChange(newTitle);
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!editable) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const newTitle = e.currentTarget.textContent || title;
      suppressNextTitleBlur.current = true;
      commitTitleChange(newTitle);
      setIsEditingTitle(false);
      e.currentTarget.blur();
    }
  };

  const handleDescriptionBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (suppressNextDescriptionBlur.current) {
      suppressNextDescriptionBlur.current = false;
      setIsEditingDescription(false);
      return;
    }
    if (!editable) return;
    const newDescription = e.currentTarget.textContent || "";
    setLocalDescription(newDescription);
    setIsEditingDescription(false);
    onDescriptionChange?.(newDescription);
  };

  const handleDescriptionKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!editable) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const newDescription = e.currentTarget.textContent || "";
      suppressNextDescriptionBlur.current = true;
      onDescriptionChange?.(newDescription);
      setLocalDescription(newDescription);
      setIsEditingDescription(false);
      e.currentTarget.blur();
    }
  };

  return (
    <div className={cn("flex flex-col cursor-grab relative group", className)}>
      <div className={cn(CARD_BASE_STYLES, cardClassName)}>
        <div>
          {/* Question Title */}
          <div className="form-question-title mb-2">
            <div className="flex items-center">
              <div
                contentEditable={editable}
                suppressContentEditableWarning
                onBlur={editable ? handleTitleBlur : undefined}
                onFocus={editable ? () => setIsEditingTitle(true) : undefined}
                onKeyDown={handleTitleKeyDown}
                className={cn(
                  "text-2xl font-semibold outline-none focus:outline-none px-2.5 py-2.5 pr-1 rounded-md",
                  editable ? "cursor-text" : "cursor-default",
                  editable && isEditingTitle && "bg-gray-50 dark:bg-gray-800"
                )}
                style={{ minHeight: "30px" }}
              >
                {localTitle.charAt(0).toUpperCase() + localTitle.slice(1)}
              </div>
              {required && <span className="text-gray-400 text-2xl flex-shrink-0">*</span>}
            </div>
          </div>

          {/* Description */}
          {description !== undefined && (
            <div
              contentEditable={editable}
              suppressContentEditableWarning
              onBlur={editable ? handleDescriptionBlur : undefined}
              onFocus={editable ? () => setIsEditingDescription(true) : undefined}
              onKeyDown={handleDescriptionKeyDown}
              className={cn(
                "text-base text-gray-600 dark:text-gray-400 outline-none focus:outline-none px-2.5 py-1 rounded-md mb-1",
                editable ? "cursor-text" : "cursor-default",
                editable && isEditingDescription && "bg-gray-50 dark:bg-gray-800"
              )}
              style={{ minHeight: "1em" }}
            >
              {localDescription || "Add description"}
            </div>
          )}

          {/* Helper Text */}
          {helperText && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 px-2.5">
              {helperText}
            </div>
          )}

          {/* Input Field */}
          {renderCustomField ? (
            renderCustomField()
          ) : (
            <GenericFormField
              type={fieldType}
              value={value}
              onChange={onChange}
              placeholder="Respondent's answer"
              required={required}
              disabled={disabled}
              options={options}
              isLongAnswer={isLongAnswer}
              onAddOption={onAddOption}
              onDeleteOption={onDeleteOption}
              onReorderOptions={onReorderOptions}
              showAddOptionButton={showAddOptionButton}
            />
          )}
        </div>

        {/* Actions Menu */}
        {actionsMenu && (
          <div className="absolute top-2.5 right-2.5 z-[1000]">
            <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity", actionsMenuVisible && "opacity-100")}>
              {actionsMenu}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

