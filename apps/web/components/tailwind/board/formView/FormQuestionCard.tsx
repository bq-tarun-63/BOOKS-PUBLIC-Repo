"use client";

import { useState, useRef, useEffect } from "react";
import { Ellipsis, ChevronDown, Paperclip, UploadCloud, Loader2, Download, X } from "lucide-react";
import type { BoardProperty } from "@/types/board";
import FormQuestionOptionsModal from "./FormQuestionOptionsModal";
import { GenericQuestionCard } from "@/components/tailwind/common/GenericQuestionCard";
import { GenericFormField, type FormFieldType } from "@/components/tailwind/common/GenericFormField";
import { cn } from "@/lib/utils";
import type { Members } from "@/types/workspace";
import MemberSelectionModal from "../members";
import { toast } from "sonner";
import { postWithAuth, type ApiErrorResponse } from "@/lib/api-helpers";

interface FormQuestionCardProps {
  propertyId: string;
  property: BoardProperty;
  value: any;
  onChange: (value: any) => void;
  onUpdate?: (updates: {
    isRequired?: boolean;
    description?: string;
    isLongAnswer?: boolean;
    showAs?: "list" | "dropdown";
    maxSelection?: number;
    checkboxLabel?: string;
  }) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onAddOption?: (optionName: string) => void;
  onDeleteOption?: (optionId: string) => void;
  onReorderOptions?: (optionIds: string[]) => void;
  disableResponseInput?: boolean;
  showActionsMenu?: boolean;
  editable?: boolean;
  cardClassName?: string;
  onRename?: (updates: { name?: string }) => void;
  isSelected?: boolean;
  onSelect?: (propertyId: string) => void;
  onDeselect?: () => void;
  availableMembers?: Members[];
}

type FileAttachment = {
  id: string;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: string;
};

export default function FormQuestionCard({
  propertyId,
  property,
  value,
  onChange,
  onUpdate,
  onDelete,
  onDuplicate,
  onAddOption,
  onDeleteOption,
  onReorderOptions,
  disableResponseInput = false,
  showActionsMenu = true,
  editable = true,
  cardClassName,
  onRename,
  isSelected = false,
  onSelect,
  onDeselect,
  availableMembers = [],
}: FormQuestionCardProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [questionTitle, setQuestionTitle] = useState(property.name);
  const [questionDescription, setQuestionDescription] = useState(property.formMetaData?.Description || "");
  const [checkboxLabelValue, setCheckboxLabelValue] = useState(property.formMetaData?.checkboxLabel || "");
  const [lastCommittedCheckboxLabel, setLastCommittedCheckboxLabel] = useState(
    property.formMetaData?.checkboxLabel || "",
  );
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null);
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputModalPosition, setInputModalPosition] = useState<{ top: number; left: number } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const inputButtonRef = useRef<HTMLButtonElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use prop for selection state if provided, otherwise use local state
  const isCardSelected = isSelected;

  const isRequired = property.formMetaData?.isFiedRequired || false;
  const hasDescription = !!property.formMetaData?.Description;
  const isLongAnswer = property.formMetaData?.isLongAnswerRequired || false;
  const isMultiSelect = property.type === "multi_select";
  const isCheckboxType = property.type === "checkbox";
  const isPersonType = property.type === "person";
  const isFileType = property.type === "file";
  const personValue = Array.isArray(value) ? value : [];

  // Property type is already filtered to form-compatible types, so we can use it directly
  const fieldType = property.type as FormFieldType;

  const isApiErrorResponse = (response: unknown): response is ApiErrorResponse => {
    return Boolean(response && typeof response === "object" && "isError" in response);
  };

  const getFileAttachments = (rawValue: any = value): FileAttachment[] => {
    if (Array.isArray(rawValue)) {
      return rawValue as FileAttachment[];
    }
    if (rawValue && typeof rawValue === "object") {
      return [rawValue as FileAttachment];
    }
    return [];
  };

  const generateAttachmentId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const getAttachmentKey = (attachment: FileAttachment) => attachment.id ?? attachment.url ?? "";

  const allowedFileExtensions = [".png", ".jpg", ".jpeg", ".pdf", ".txt"];
  const allowedMimeTypes = new Set(["image/png", "image/jpeg", "application/pdf", "text/plain"]);

  const handleDownloadAttachment = async (attachment: FileAttachment) => {
    try {
      const response = await fetch(attachment.url);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.name || "attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Download failed", error);
      toast.error("Unable to download file. Please try again.");
    }
  };

  const handleRemoveAttachment = (attachment: FileAttachment) => {
    if (disableResponseInput) return;
    const keyToRemove = attachment.id ?? attachment.url;
    if (!keyToRemove) return;
    const next = getFileAttachments().filter((file) => (file.id ?? file.url) !== keyToRemove);
    onChange(next);
  };

  const uploadFileAttachment = async (file: File) => {
    try {
      setIsUploadingFile(true);
      const arrayBuffer = await file.arrayBuffer();
      const response = await postWithAuth<{ url: string }>(
        "/api/note/upload",
        arrayBuffer,
        {
          headers: {
            "content-type": file.type || "application/octet-stream",
            "x-vercel-filename": encodeURIComponent(`forms/files/${file.name}`),
          },
        },
      );

      if (!response || isApiErrorResponse(response)) {
        throw new Error(response?.message || "Failed to upload file");
      }

      const descriptor: FileAttachment = {
        id: generateAttachmentId(),
        name: file.name,
        url: response.url,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      };

      const next = [...getFileAttachments(), descriptor];
      onChange(next);
      toast.success(`${file.name} uploaded`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disableResponseInput) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const hasAllowedExtension = allowedFileExtensions.some((ext) => lowerName.endsWith(ext));
    const hasAllowedMime = file.type ? allowedMimeTypes.has(file.type) : false;

    if (!hasAllowedExtension && !hasAllowedMime) {
      toast.error("Only PNG, JPG, PDF, or TXT files are allowed.");
      event.target.value = "";
      return;
    }

    await uploadFileAttachment(file);
    event.target.value = "";
  };

  const handleFileUploadButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disableResponseInput) {
      return;
    }
    fileInputRef.current?.click();
  };

  useEffect(() => {
    setQuestionTitle(property.name);
  }, [property.name]);

  useEffect(() => {
    setQuestionDescription(property.formMetaData?.Description || "");
  }, [property.formMetaData?.Description]);

  useEffect(() => {
    const nextLabel = property.formMetaData?.checkboxLabel || "";
    setCheckboxLabelValue(nextLabel);
    setLastCommittedCheckboxLabel(nextLabel);
  }, [property.formMetaData?.checkboxLabel]);

  const commitCheckboxLabelChange = () => {
    if (!isCheckboxType) return;
    const normalizedLabel = checkboxLabelValue.trim();
    setCheckboxLabelValue(normalizedLabel);
    if (normalizedLabel === lastCommittedCheckboxLabel) {
      return;
    }
    onUpdate?.({ checkboxLabel: normalizedLabel });
    setLastCommittedCheckboxLabel(normalizedLabel);
  };

  // Close modal when card becomes unselected
  useEffect(() => {
    if (!isCardSelected && showOptions) {
      setShowOptions(false);
      setModalPosition(null);
    }
  }, [isCardSelected, showOptions]);

  useEffect(() => {
    if (!showOptions) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Don't close if clicking inside the container (card or modal)
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }
      // Close modal only if clicking outside the container
      setShowOptions(false);
      setModalPosition(null);
      onDeselect?.();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showOptions]);

  const getHelperText = () => {
    if (isMultiSelect) {
      return "(Respondents can select as many as they like)";
    }
    return undefined;
  };

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!showActionsMenu) return;
    const target = event.target as HTMLElement;
    // Don't toggle modal if clicking the options button (it has its own handler)
    if (optionsButtonRef.current?.contains(target)) return;
    // Don't toggle modal if clicking on the editable title (contentEditable div)
    if (target.isContentEditable && target.closest(".form-question-title")) return;
    if (target.closest(".form-question-title [contenteditable='true']")) return;
    // Don't toggle if clicking on the modal itself
    const modalElement = target.closest('[class*="absolute z-[200]"]');
    if (modalElement) return;
    
    // Stop propagation to prevent click outside handler from firing
    event.stopPropagation();
    // event.preventDefault();
    
    // Simple toggle: if open, close it; if closed, open it
    if (showOptions) {
      setShowOptions(false);
      setModalPosition(null);
      onDeselect?.();
    } else {
      // Notify parent to select this card (which will deselect others)
      onSelect?.(propertyId);
      
      // Open modal below the horizontal more button
      if (!containerRef.current || !optionsButtonRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = optionsButtonRef.current.getBoundingClientRect();
      const modalWidth = 290;
      
      const relativeTop = buttonRect.bottom - containerRect.top;
      const relativeLeft = buttonRect.right - containerRect.left;
      
      let left = relativeLeft - modalWidth;
      if (left < 8) {
        left = buttonRect.left - containerRect.left;
      }
      
      const containerWidth = containerRect.width;
      if (left + modalWidth > containerWidth - 8) {
        left = containerWidth - modalWidth - 8;
      }
      
      setModalPosition({
        top: relativeTop + 8,
        left,
      });
      setShowOptions(true);
    }
  };

  const actionsMenu =
    showActionsMenu &&
    (
      <button
        type="button"
        ref={optionsButtonRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (showOptions) {
            setShowOptions(false);
            setModalPosition(null);
            onDeselect?.();
          } else {
            // Notify parent to select this card (which will deselect others)
            onSelect?.(propertyId);
            
            if (!containerRef.current || !optionsButtonRef.current) return;
            
            const containerRect = containerRef.current.getBoundingClientRect();
            const buttonRect = optionsButtonRef.current.getBoundingClientRect();
            const modalWidth = 290;
            
            const relativeTop = buttonRect.bottom - containerRect.top;
            const relativeLeft = buttonRect.right - containerRect.left;
            
            let left = relativeLeft - modalWidth;
            if (left < 8) {
              left = buttonRect.left - containerRect.left;
            }
            
            const containerWidth = containerRect.width;
            if (left + modalWidth > containerWidth - 8) {
              left = containerWidth - modalWidth - 8;
            }
            
            setModalPosition({
              top: relativeTop + 8,
              left,
            });
            setShowOptions(true);
          }
        }}
        className={cn(
          "p-1.5 rounded-md transition-colors text-gray-500 dark:text-gray-400",
          !isCardSelected && "group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-500/10",
          isCardSelected && "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100"
        )}
        aria-label="Edit question"
      >
        <Ellipsis className="w-4 h-4" />
      </button>
    );

  const checkboxDisplayLabel = checkboxLabelValue.trim() || property.name;

  const renderCheckboxField = () => (
    <div className="mt-2 px-2.5">
      <label className="flex items-center gap-3 text-base text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disableResponseInput}
          className="w-4 h-4 rounded border-gray-200 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
        />
        {editable ? (
          <input
            type="text"
            value={checkboxLabelValue}
            onChange={(e) => setCheckboxLabelValue(e.target.value)}
            onBlur={commitCheckboxLabelChange}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitCheckboxLabelChange();
                (event.currentTarget as HTMLInputElement).blur();
              }
            }}
            placeholder="Option label"
            className="flex-1 min-w-0 border-none bg-transparent text-base text-gray-900 dark:text-gray-100 outline-none border-b border-transparent focus:border-gray-200 dark:focus:border-gray-600 pb-1"
          />
        ) : (
          <span className="flex-1 min-w-0 text-gray-900 dark:text-gray-100">{checkboxDisplayLabel}</span>
        )}
      </label>
    </div>
  );


  const handleInputButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableResponseInput) return;
    
    // Only open modal for person type
    if (!isPersonType) return;
    
    if (!containerRef.current || !inputButtonRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const buttonRect = inputButtonRef.current.getBoundingClientRect();
    const modalWidth = 320;
    
    const relativeTop = buttonRect.bottom - containerRect.top + 8;
    const relativeLeft = buttonRect.left - containerRect.left;
    
    let left = relativeLeft;
    const containerWidth = containerRect.width;
    if (left + modalWidth > containerWidth - 8) {
      left = containerWidth - modalWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }
    
    setInputModalPosition({
      top: relativeTop,
      left,
    });
    setShowInputModal(true);
  };

  const shouldRenderCustomField = isCheckboxType || isPersonType || isFileType;
  const renderCustomFieldContent = () => {
    if (isCheckboxType) {
      return renderCheckboxField();
    }
    if (isPersonType) {
      return renderPersonField();
    }
    if (isFileType) {
      return renderFileField();
    }
    return null;
  };

  const renderFileField = () => {
    const attachments = getFileAttachments();
    return (
      <div className="space-y-3">
          <div className="flex flex-col gap-2">
            {attachments.map((file) => (
              <div
                key={getAttachmentKey(file)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-transparent dark:text-gray-200"
              >
                <Paperclip className="h-4 w-4 text-gray-500" />
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {file.name || "Attachment"}
                </a>
                <button
                  type="button"
                  className="rounded p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDownloadAttachment(file);
                  }}
                  aria-label="Download attachment"
                >
                  <Download className="h-4 w-4" />
                </button>
                {!disableResponseInput && (
                  <button
                    type="button"
                    className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemoveAttachment(file);
                    }}
                    aria-label="Remove attachment"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        <>
          <button
            type="button"
            onClick={handleFileUploadButtonClick}
            disabled={disableResponseInput || isUploadingFile}
            className="inline-flex items-center gap-2 !mt-0 rounded-md border disabled:border-gray-100 border-gray-300 bg-white px-3 py-2 text-sm font-medium disabled:text-gray-400 text-gray-700 transition hover:bg-gray-50  dark:border-gray-600 dark:bg-transparent dark:text-gray-100 dark:hover:bg-white/10"
          >
            {isUploadingFile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {isUploadingFile ? "Uploading..." : "Upload file"}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInputChange} />
        </>
      </div>
    );
  };

  // Render person field as a button that opens member selection modal
  const renderPersonField = () => {
    const displayValue = personValue.length > 0 
      ? personValue.map((m: Members) => m.userName).join(", ")
      : "";
    
    return (
      <div className="mt-2">
        <button
          ref={inputButtonRef}
          type="button"
          onClick={handleInputButtonClick}
          disabled={disableResponseInput}
          className={cn(
              "w-full min-h-[44px] px-3 py-2 text-base rounded-md flex items-center justify-between gap-2 text-left transition-colors",
              disableResponseInput
                ? "border border-gray-100 dark:border-gray-600 bg-white dark:bg-transparent"
                : "border border-gray-300 bg-white dark:bg-transparent",
            )}
          >
          <span className={cn(
            "flex-1 min-w-0 truncate",
            displayValue ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-400"
          )}>
            {displayValue || "Respondent's answer"}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>
      </div>
    );
  };

  // Render unified input field directly (no modal for regular inputs)
  const renderUnifiedInputField = () => {
    return (
      <div className="mt-2">
        <GenericFormField
          type={fieldType}
          value={value}
          onChange={onChange}
          placeholder="Respondent's answer"
          required={isRequired}
          disabled={disableResponseInput}
          options={property.options || []}
          isLongAnswer={isLongAnswer}
          onAddOption={onAddOption}
          onDeleteOption={onDeleteOption}
          onReorderOptions={onReorderOptions}
          showAddOptionButton={isMultiSelect && !!onAddOption}
        />
      </div>
    );
  };

  const computedCardClassName = cn(
    cardClassName,
    showActionsMenu && "transition-colors duration-200 border border-blue-100 dark:border-gray-800",
    showActionsMenu && !isCardSelected && " group-hover:border-2 group-hover:border-blue-200 group-hover:dark:border-gray-800 dark:group-hover:border-1",
    isCardSelected && "border-blue-600 dark:border-blue-500 shadow-sm ring-1 ring-blue-100 dark:ring-blue-500/30"
  );

  return (
    <div 
      ref={containerRef} 
      className="relative group" 
      onClick={handleCardClick}
      onMouseDown={(e) => {
        // Only stop propagation for clicks, not drags
        const target = e.target as HTMLElement;
        // If clicking on interactive elements, don't interfere
        if (target.closest('input') || target.closest('button') || target.isContentEditable) {
          return;
        }
      }}
    >
      <GenericQuestionCard
        id={propertyId}
        title={questionTitle}
        description={hasDescription ? questionDescription : undefined}
        helperText={getHelperText()}
        required={isRequired}
        fieldType={fieldType}
        value={value}
        onChange={onChange}
        options={property.options || []}
        isLongAnswer={isLongAnswer}
        disabled={disableResponseInput}
        editable={editable}
        cardClassName={computedCardClassName}
        renderCustomField={shouldRenderCustomField ? renderCustomFieldContent : renderUnifiedInputField}
        onTitleChange={(newTitle) => {
          const trimmedTitle = newTitle.trim();
          const nextTitle = trimmedTitle || "Untitled";
          setQuestionTitle(nextTitle);
          if (nextTitle !== property.name) {
            onRename?.({ name: nextTitle });
          }
        }}
        onDescriptionChange={(newDescription) => {
          const normalizedDescription = newDescription.trim();
          setQuestionDescription(normalizedDescription);
          if (normalizedDescription !== (property.formMetaData?.Description || "")) {
            onUpdate?.({ description: normalizedDescription });
          }
        }}
        onAddOption={onAddOption}
        onDeleteOption={onDeleteOption}
        onReorderOptions={onReorderOptions}
        showAddOptionButton={isMultiSelect && !!onAddOption}
        actionsMenu={actionsMenu || undefined}
        actionsMenuVisible={isCardSelected}
      />

      {/* Options Modal */}
      {showOptions && showActionsMenu && modalPosition && (
        <FormQuestionOptionsModal
          isOpen={showOptions}
          onClose={() => {
            setShowOptions(false);
            setModalPosition(null);
            onDeselect?.();
          }}
          property={property}
          propertyId={propertyId}
          position={modalPosition}
          onUpdate={(updates) => {
            onUpdate?.(updates);
          }}
          onDelete={() => {
            onDelete?.();
            setShowOptions(false);
            setModalPosition(null);
            onDeselect?.();
          }}
          onDuplicate={() => {
            onDuplicate?.();
            setShowOptions(false);
            setModalPosition(null);
            onDeselect?.();
          }}
        />
      )}

      {/* Person Selection Modal - only for person type */}
      {showInputModal && inputModalPosition && isPersonType && (
        <>
          <div
            className="fixed inset-0 z-[1400]"
            onClick={() => setShowInputModal(false)}
          />
          <div
            className="absolute z-[1401]"
            style={{
              top: `${inputModalPosition.top}px`,
              left: `${inputModalPosition.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MemberSelectionModal
              isOpen={showInputModal}
              onClose={() => setShowInputModal(false)}
              members={availableMembers}
              selectedMembers={personValue}
              onSelectMember={(selected) => {
                onChange(selected);
                setShowInputModal(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

