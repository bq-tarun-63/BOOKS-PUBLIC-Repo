"use client";

import EditIcon from "@/components/tailwind/ui/icons/editIcon";
import EllipsisIcon from "@/components/tailwind/ui/icons/ellipsisIcon";
import UserIcon from "@/components/tailwind/ui/icons/userIcon";
import { useNoteContext } from "@/contexts/NoteContext";
import { useBoard } from "@/contexts/boardContext";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { getPropertyValue } from "@/services-frontend/boardServices/boardServices";
import type { Note, ViewCollection } from "@/types/board";
import type { Members } from "@/types/workspace";
import { Calendar, FileText, Mail, Link as LinkIcon, Phone, Paperclip, Download } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState, useMemo } from "react";
import TaskDropdownMenu from "../taskDropdownMenu";
import { formatFormulaValue, isFormulaValueEmpty } from "@/utils/formatFormulaValue";
import { getColorStyles } from "@/utils/colorStyles";
import { getRelationIdsFromValue } from "@/utils/relationUtils";
import { computeRollupData } from "@/utils/rollupUtils";

interface BoardCardProps {
  card: Note;
  board: ViewCollection;
  onEdit: (newTitle: string) => void;
  onDelete: () => void;
  onOpenSidebar: (card: Note) => void;
  updateNoteTitleLocally?: (noteId: string, newTitle: string) => void;
  columnColors?: {
    dotColor: string;
    textColor: string;
    bgColor: string;
    badgeColor: string;
  };
}

export default function BoardCard({
  card,
  board,
  onEdit,
  onDelete,
  onOpenSidebar,
  updateNoteTitleLocally,
  columnColors,
}: BoardCardProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>(card.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const { propertyOrder, getCurrentDataSourceProperties, getPropertyVisibility, getRelationNoteTitle, getNotesByDataSourceId, getDataSource } = useBoard();
  
  // Get properties from current data source
  const boardProperties = getCurrentDataSourceProperties(board._id) || board.properties;
  
  // Get visible property IDs using the helper function which properly handles viewTypeId lookup
  const visiblePropertyIds = getPropertyVisibility(board._id) || [];

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[BoardCard] Property visibility debug:', {
        boardId: board._id,
        visiblePropertyIds,
        boardPropertiesKeys: Object.keys(boardProperties || {}),
        boardProperties,
      });
    }
  }, [board._id, visiblePropertyIds, boardProperties]);

  // Helper function to get color styles for an option
  const getOptionColorStyles = (
    propSchema: { options?: { name: string; color?: string }[] },
    optionValue: string,
  ): { bg: string; text: string } => {
    const option = propSchema.options?.find((opt) => opt.name === optionValue);
    const color = option?.color || "default";

    const colorMap: Record<string, { bg: string; text: string }> = {
      default: { bg: "bg-gray-200 dark:bg-gray-700", text: "text-gray-900 dark:text-gray-100" },
      gray: { bg: "bg-gray-200 dark:bg-gray-700", text: "text-gray-900 dark:text-gray-100" },
      brown: { bg: "bg-orange-200 dark:bg-orange-900", text: "text-orange-900 dark:text-orange-100" },
      orange: { bg: "bg-orange-200 dark:bg-orange-800", text: "text-orange-900 dark:text-orange-100" },
      yellow: { bg: "bg-yellow-200 dark:bg-yellow-800", text: "text-yellow-900 dark:text-yellow-100" },
      green: { bg: "bg-green-200 dark:bg-green-800", text: "text-green-900 dark:text-green-100" },
      blue: { bg: "bg-blue-200 dark:bg-blue-800", text: "text-blue-900 dark:text-blue-100" },
      purple: { bg: "bg-purple-200 dark:bg-purple-800", text: "text-purple-900 dark:text-purple-100" },
      pink: { bg: "bg-pink-200 dark:bg-pink-800", text: "text-pink-900 dark:text-pink-100" },
      red: { bg: "bg-red-200 dark:bg-red-800", text: "text-red-900 dark:text-red-100" },
    };

    return colorMap[color] || colorMap.default!;
  };

  useEffect(() => {
    if (!isEditing) {
      setEditValue(card.title || "");
    }
  }, [card.title, isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { workspaceMembers } = useWorkspaceContext();
  const { sharedWith, iscurrentNotPublic } = useNoteContext();

  let mentionMembers: Members[] = [];

  if (!iscurrentNotPublic) {
    mentionMembers = sharedWith.map((u, index) => {
      const matchedMember = workspaceMembers.find((wm) => wm.userEmail === u.email);

      return {
        userId: matchedMember ? matchedMember.userId : `shared-${index}`,
        userEmail: u.email,
        role: u.access,
        joinedAt: matchedMember ? matchedMember.joinedAt : "",
        userName: matchedMember ? matchedMember.userName : u.email,
      };
    });
  } else {
    mentionMembers = workspaceMembers;
  }

  const handleEditSubmit = () => {
    if (editValue.trim()) {
      onEdit(editValue.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(card.title);
      if (updateNoteTitleLocally) {
        updateNoteTitleLocally(card._id, card.title); // restore sidebar
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // check if blur target is inside the member button
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest("#member-btn")) {
      return; // do not close edit mode
    }
    handleEditSubmit();
  };

  const visibleProps = useMemo(() => {
    if (!boardProperties || Object.keys(boardProperties).length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[BoardCard] No boardProperties available');
      }
      return [];
    }
    
    // When visibility array is empty, show all non-default properties (default behavior)
    // When visibility array has values, show only those properties
    if (visiblePropertyIds.length === 0) {
      const allNonDefault = Object.entries(boardProperties)
        .filter(([_, prop]) => !prop.default)
        .map(([id]) => id);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[BoardCard] Showing all non-default properties:', allNonDefault);
      }
      return allNonDefault;
    }
    
    const filtered = visiblePropertyIds.filter(propId => boardProperties[propId] !== undefined);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[BoardCard] Showing only visible properties:', filtered);
    }
    
    return filtered;
  }, [boardProperties, visiblePropertyIds]);

  const order = propertyOrder[board._id] || [];

  const orderedVisibleProps = useMemo(() => [
    ...order.filter((propId) => visibleProps.includes(propId)),
    ...visibleProps.filter((propId) => !order.includes(propId)),
  ], [order, visibleProps]);

  return (
    <div className="">
      {/* Card container - always the same */}
      <div 
        className="p-2 py-3 bg-background dark:bg-black rounded-lg shadow  group relative dark:border-b-[rgb(42,42,42)]"
        style={{
          border: columnColors ? `1px solid ${columnColors.dotColor}05` : undefined,
        }}
      >
        {isEditing ? (
          // Edit mode - inline editable div
          <div
            contentEditable
            suppressContentEditableWarning={true}
            onInput={(e) => {
              const newValue = e.currentTarget.textContent || "";
              setEditValue(e.currentTarget.textContent || "");
              if (updateNoteTitleLocally) {
                updateNoteTitleLocally(card._id, newValue); // live update sidebar while typing
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onChange={(e) => {}}
            className="p-2 text-sm font-medium break-words outline-none rounded px-1 focus-visible:ring-2 dark:ring-gray-700 py-1 ring-blue-500 whitespace-pre-wrap"
            style={{ minHeight: "1.25rem", maxWidth: "100%" }}
            ref={(el) => {
              if (el && isEditing) {
                // Focus and place cursor at the end
                el.focus();
                const range = document.createRange();
                const sel = window.getSelection();
                if (el.childNodes.length > 0) {
                  const lastNode = el.childNodes[el.childNodes.length - 1];
                  if (lastNode) {
                    range.setStartAfter(lastNode);
                  } else {
                    range.setStart(el, 0);
                  }
                } else {
                  range.setStart(el, 0);
                }
                range.collapse(true);
                sel?.removeAllRanges();
                sel?.addRange(range);
              }
            }}
          >
            {editValue}
          </div>
        ) : (
          // Normal mode - display text
          <div className="text-sm font-medium pr-8 break-words whitespace-pre-wrap" 
            style={{ maxWidth: "100%" }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {card.title}
          </div>
        )}
        {/* Dynamically render all visible properties for this viewTypeId */}
        {orderedVisibleProps.length > 0 ? (
          orderedVisibleProps.map((propId) => {
            const propSchema = boardProperties[propId];
            // Safety check: ensure property exists (should already be filtered in visibleProps)
            if (!propSchema) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('[BoardCard] Property schema not found for propId:', propId);
              }
              return null;
            }
            
            // Get property value - use propId directly from databaseProperties for more reliable lookup
            const value = card.databaseProperties?.[propId];
            const isFormulaProp = propSchema.type === "formula";
            const isRollupProp = propSchema.type === "rollup";
            
            // For properties with options (select, status, priority), match the value to the option
            let displayValue = value;
            if (propSchema.options && value !== undefined && value !== null) {
              const option = propSchema.options.find(
                (opt: { name?: string; id?: string }) =>
                  opt.name?.toLowerCase() === String(value).toLowerCase() ||
                  opt.id?.toLowerCase() === String(value).toLowerCase()
              );
              displayValue = option ? option.name : String(value);
            } else if (value !== undefined && value !== null) {
              displayValue = value;
            }
            
            // Skip empty values (except formula and rollup which compute their own values)
            if (!isFormulaProp && !isRollupProp && (value === undefined || value === null || value === "")) {
              return null;
            }

          switch (propSchema.type) {
            case "date":
              return (
                <div key={propId} className="mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    <Calendar className="w-3 h-3" />
                    {String(displayValue || value || "")}
                  </span>
                </div>
              );

            case "priority":
              return (
                <div key={propId} className="mt-2">
                  {(() => {
                    const colorStyles = getOptionColorStyles(propSchema, String(displayValue || value || ""));
                    return (
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium ${colorStyles.bg} ${colorStyles.text}`}
                      >
                        {displayValue || value}
                      </span>
                    );
                  })()}
                </div>
              );

            case "person": {
              const membersArray = Array.isArray(value) ? value : (Array.isArray(displayValue) ? displayValue : []);
              return (
                <div key={propId} className="mt-3 items-center text-xs text-gray-500">
                  {membersArray.map((member: { userId: string; userName: string }) => (
                    <div className="flex my-2" key={member.userId}>
                      <UserIcon className="w-3 h-3 mr-1" />
                      <div className="flex items-center">{member.userName}</div>
                    </div>
                  ))}
                </div>
              );
            }

            case "relation": {
              const relationLimit = propSchema.relationLimit || "multiple";
              const linkedDatabaseId = propSchema.linkedDatabaseId;
              const noteIds = getRelationIdsFromValue(value, relationLimit);
              
              if (noteIds.length === 0) {
                return null;
              }
              
              return (
                <div key={propId} className="mt-2 flex flex-wrap gap-1">
                  {noteIds.map((noteId: string) => {
                    if (!noteId) {
                      return null;
                    }
                    const relTitle = getRelationNoteTitle(noteId, linkedDatabaseId || "", "");
                    if (!relTitle) {
                      return null;
                    }

                    const note = getNotesByDataSourceId(linkedDatabaseId || "").find(
                      (n: any) => String(n._id) === noteId,
                    );
                    const noteIcon = (note as any)?.icon;

                    return (
                      <div
                        key={noteId}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      >
                        {noteIcon ? (
                          <span className="text-xs" style={{ fontSize: "12px" }}>{noteIcon}</span>
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        <span className="max-w-[120px] truncate">{relTitle}</span>
                      </div>
                    );
                  })}
                </div>
              );
            }

            case "status":
              return (
                <div key={propId} className="mt-2">
                  {(() => {
                    const colorStyles = getOptionColorStyles(propSchema, String(displayValue || value || ""));
                    return (
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium ${colorStyles.bg} ${colorStyles.text}`}
                      >
                        {displayValue || value}
                      </span>
                    );
                  })()}
                </div>
              );

            case "select":
              return (
                <div key={propId} className="mt-2">
                  {(() => {
                    const colorStyles = getOptionColorStyles(propSchema, String(displayValue || value || ""));
                    return (
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium ${colorStyles.bg} ${colorStyles.text}`}
                      >
                        {String(displayValue || value || "")}
                      </span>
                    );
                  })()}
                </div>
              );

            case "formula": {
              const formattedValue = formatFormulaValue(value, propSchema.formulaReturnType);
              const errorMessage = card.formulaErrors?.[propId];
              return (
                <div key={propId} className="mt-2">
                  <span
                    className={`text-xs ${errorMessage ? "text-red-500" : "text-gray-600 dark:text-gray-300"}`}
                    title={typeof formattedValue === "string" ? formattedValue : undefined}
                  >
                    {formattedValue || ""}
                  </span>
                  {errorMessage && (
                    <div className="text-xs text-red-500 mt-1" title={errorMessage}>
                      {errorMessage}
                    </div>
                  )}
                </div>
              );
            }

            case "multi_select":
              return (
                <div key={propId} className="mt-2">
                  {(() => {
                    let values: string[] = [];
                    const valToUse = value !== undefined && value !== null ? value : displayValue;

                    if (Array.isArray(valToUse)) {
                      // If already an array
                      values = valToUse.map((v: string | { name?: string; id?: string }) =>
                        typeof v === "string" ? v : v.name || v.id || "",
                      );
                    } else if (typeof valToUse === "string") {
                      // Split comma-separated string
                      values = valToUse.split(",").map((v) => v.trim());
                    }

                    return values.map((item) => {
                      const colorStyles = getOptionColorStyles(propSchema, item);
                      return (
                        <span
                          key={item}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mr-1 mb-1 ${colorStyles.bg} ${colorStyles.text}`}
                        >
                          {item}
                        </span>
                      );
                    });
                  })()}
                </div>
              );

            case "number": {
              const numValue = typeof value === "number" ? value : Number(value) || 0;
              const showAs = (propSchema as any).showAs || "number";
              const progressColor = (propSchema as any).progressColor || "blue";
              const progressDivideByRaw = (propSchema as any).progressDivideBy;
              const showNumberText = (propSchema as any).showNumberText !== false; // default true
              const divideBy = progressDivideByRaw && progressDivideByRaw !== 0 ? progressDivideByRaw : 100;
              const numberNode = showNumberText ? (
                <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">{numValue}</div>
              ) : null;
              
              if (showAs === "bar") {
                // Calculate percentage: (value / divideBy) * 100, capped at 100%
                const percentage = Math.min(100, Math.max(0, (numValue / divideBy) * 100));
                const colorStyles = getColorStyles(progressColor);
                return (
                  <div key={propId} className="mt-2 flex items-center gap-2">
                    {numberNode}
                    <div className="flex-1">
                      <div
                        className="relative w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
                        style={{ height: "4px" }}
                      >
                        <div
                          className="absolute rounded-full h-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: colorStyles.dot,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (showAs === "ring") {
                // Calculate percentage: (value / divideBy) * 100, capped at 100%
                const percentage = Math.min(100, Math.max(0, (numValue / divideBy) * 100));
                const colorStyles = getColorStyles(progressColor);
                const circumference = 2 * Math.PI * 6; // radius = 6
                const offset = circumference - (percentage / 100) * circumference;
                return (
                  <div key={propId} className="mt-2 flex items-center gap-2">
                    {numberNode}
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
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          style={{
                            stroke: colorStyles.dot,
                            transition: "stroke-dashoffset 0.5s ease-out",
                          }}
                        />
                      </g>
                    </svg>
                  </div>
                );
              }
              
              // Default: show as number
              return (
                <div key={propId} className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                  {String(numValue)}
                </div>
              );
            }

            case "rollup": {
              const rollupResult = computeRollupData(
                card,
                propSchema,
                boardProperties,
                getNotesByDataSourceId,
                getDataSource,
              );

              if (rollupResult.state !== "ready") {
                return (
                  <div key={propId} className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {rollupResult.message || "—"}
                  </div>
                );
              }

              const { calculation, values, count, countFraction, percent } = rollupResult;

              if (calculation?.category === "count") {
                if (calculation.value === "per_group") {
                  return (
                    <div key={propId} className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                      {countFraction || `${count ?? 0}/${rollupResult.totalCount ?? 0}`}
                    </div>
                  );
                }
                return (
                  <div key={propId} className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                    {count ?? 0}
                  </div>
                );
              }

              if (calculation?.category === "percent") {
                return (
                  <div key={propId} className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                    {percent ?? 0}%
                  </div>
                );
              }

              // Original - show all values in one row with truncate
              if (values && values.length > 0) {
                return (
                  <div key={propId} className="mt-2 text-xs text-gray-600 dark:text-gray-300 truncate" title={values.join(', ')}>
                    {values.join(', ')}
                  </div>
                );
              }

              return (
                <div key={propId} className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  No related values
                </div>
              );
            }

            case "email": {
              const emailValue = String(value || "").trim();
              if (!emailValue) return null;
              return (
                <div key={propId} className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <Mail className="w-3 h-3" />
                  <a href={`mailto:${emailValue}`} className="truncate hover:underline" title={emailValue}>
                    {emailValue}
                  </a>
                </div>
              );
            }

            case "url": {
              const rawUrl = String(value || "").trim();
              if (!rawUrl) return null;
              const sanitizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
              const displayUrl = rawUrl.replace(/^https?:\/\//i, "");
              return (
                <div key={propId} className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <LinkIcon className="w-3 h-3" />
                  <a
                    href={sanitizedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:underline"
                    title={rawUrl}
                  >
                    {displayUrl}
                  </a>
                </div>
              );
            }

            case "phone": {
              const phoneValue = String(value || "").trim();
              if (!phoneValue) return null;
              return (
                <div key={propId} className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <Phone className="w-3 h-3" />
                  <a href={`tel:${phoneValue.replace(/\s+/g, "")}`} className="hover:underline" title={phoneValue}>
                    {phoneValue}
                  </a>
                </div>
              );
            }

            case "file": {
              const attachments = Array.isArray(value) ? value : value ? [value] : [];
              if (attachments.length === 0) return null;
              return (
                <div key={propId} className="mt-2 flex flex-wrap gap-1">
                  {attachments.slice(0, 2).map((file: any, idx: number) => {
                    const fileUrl = file.url || file;
                    const fileName = file.name || (typeof file === "string" ? file : "Attachment");
                    return (
                      <div key={file.id || fileUrl || idx} className="flex items-center gap-1">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/20"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Paperclip className="h-3 w-3" />
                          <span className="max-w-[100px] truncate">{fileName}</span>
                        </a>
                      </div>
                    );
                  })}
                  {attachments.length > 2 && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      +{attachments.length - 2}
                    </span>
                  )}
                </div>
              );
            }

            default:
              // Fallback plain text for other property types
              return (
                <div key={propId} className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                  {String(displayValue !== undefined ? displayValue : value || "")}
                </div>
              );
          }
          })
        ) : null}
        {/* Edit/Options buttons - only show when not editing */}
        {!isEditing && (
          <div className="absolute right-2 top-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <EditIcon className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOptions(!showOptions);
              }}
            >
              <EllipsisIcon className="w-4 h-4 text-gray-600" />
            </button>
            {/* Dropdown */}
            {showOptions && (
              <div ref={dropdownRef}>
                <TaskDropdownMenu
                  onEditProperties={() => {
                    onOpenSidebar(card);
                  }}
                  onDelete={onDelete}
                  onClose={() => setShowOptions(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
