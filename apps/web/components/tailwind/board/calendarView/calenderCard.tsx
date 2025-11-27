"use client";

import { useBoard } from "@/contexts/boardContext";
import type { Note, ViewCollection } from "@/types/board";
import { Calendar, Edit, MenuIcon, Trash2Icon, User, FileText, Mail, Link as LinkIcon, Phone, Paperclip } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState, useMemo } from "react";
import { getColorStyles } from "@/utils/colorStyles";
import { getRelationIdsFromValue } from "@/utils/relationUtils";
import { computeRollupData } from "@/utils/rollupUtils";

interface CalendarCardProps {
  card: Note;
  board: ViewCollection;
  onEdit: (newTitle: string) => void;
  onDelete: () => void;
  onClick: (card: Note) => void;
}

export default function CalendarCard({ card, board, onEdit, onDelete, onClick }: CalendarCardProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>(card.title);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const { propertyOrder, getCurrentDataSourceProperties, getPropertyVisibility, getRelationNoteTitle, getNotesByDataSourceId, getDataSource } = useBoard();
  
  // Get properties from current data source
  const boardProperties = getCurrentDataSourceProperties(board._id) || board.properties;
  
  // Get visible property IDs using the helper function which properly handles viewTypeId lookup
  const visiblePropertyIds = getPropertyVisibility(board._id) || [];
  
  const isInitialFocus = useRef(true);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      const el = inputRef.current;
      if (isInitialFocus.current) {
        el.textContent = editValue;
        el.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        const len = el.textContent?.length || 0;
        if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
          range.setStart(el.firstChild, Math.min(len, (el.firstChild.textContent || "").length));
        } else {
          range.setStart(el, 0);
        }
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
        isInitialFocus.current = false;
      }
    } else {
      isInitialFocus.current = true;
    }
  }, [isEditing, editValue]);

  // Get visible properties: only render properties that are in visiblePropertyIds for this viewTypeId
  const visibleProps = useMemo(() => {
    if (!boardProperties || Object.keys(boardProperties).length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[CalendarCard] No boardProperties available');
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
        console.log('[CalendarCard] Showing all non-default properties:', allNonDefault);
      }
      return allNonDefault;
    }
    
    const filtered = visiblePropertyIds.filter(propId => boardProperties[propId] !== undefined);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[CalendarCard] Showing only visible properties:', filtered);
    }
    
    return filtered;
  }, [boardProperties, visiblePropertyIds]);

  const order = propertyOrder[board._id] || [];
  const orderedVisibleProps = useMemo(() => [
    ...order.filter((propId) => visibleProps.includes(propId)),
    ...visibleProps.filter((propId) => !order.includes(propId)),
  ], [order, visibleProps]);

  const handleEditSubmit = () => {
    if (editValue.trim() && editValue.trim() !== card.title) {
      onEdit(editValue.trim());
      setIsEditing(false);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
      setEditValue(card.title);
    }
  };



  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      onClick(card);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate position to ensure menu stays within viewport
    const x = Math.min(e.clientX, window.innerWidth - 150);
    const y = Math.min(e.clientY, window.innerHeight - 120);

    setContextMenuPosition({ x, y });
    setShowContextMenu(true);
  };

  if (isEditing) {
    return (
      <div
        className="px-2 py-1 rounded cursor-pointer transition-opacity"
      >
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning={true}
          onMouseDown={(e) => { e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); }}
          onDoubleClick={(e) => { e.stopPropagation(); }}
          onInput={(e) => {
            const newValue = e.currentTarget.textContent || "";
            setEditValue(newValue);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const newValue = (e.currentTarget as HTMLDivElement).textContent?.trim() || "";
              setEditValue(newValue || card.title);
              handleEditSubmit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setIsEditing(false);
              setEditValue(card.title);
            }
          }}
          onBlur={(e) => {
            const newValue = e.currentTarget.textContent?.trim() || "";
            setEditValue(newValue || card.title);
            handleEditSubmit();
          }}
          className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent whitespace-pre-wrap px-1 py-1"
          style={{ minHeight: "1.75rem", maxWidth: "100%" }}
        />
      </div>
    );
  }

  return (
    <>
      <div
        className="p-1.5 rounded-md cursor-pointer hover:opacity-80 transition-opacity truncate relative group border dark:border-[#343434] hover:bg-gray-200 dark:hover-bg-[#202020] bg-white dark:bg-[#2c2c2c]"
        title={card.title}
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
      >
        {/* Main title */}
        <div 
          className={`font-semibold text-sm`} 
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {card.title}
        </div>

        {/* Visible Properties */}
        {orderedVisibleProps.length > 0 ? (
          <div className="mt-1 space-y-1 text-black dark:text-gray-300">
            {orderedVisibleProps.map((propId) => {
              const propSchema = boardProperties[propId];
              // Safety check: ensure property exists
              if (!propSchema) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('[CalendarCard] Property schema not found for propId:', propId);
                }
                return null;
              }
              
              // Get property value - use propId directly from databaseProperties for more reliable lookup
              const value = card.databaseProperties?.[propId];
              
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
              
              // Skip empty values (but not for rollup/formula which compute their own values)
              if (propSchema.type !== "rollup" && propSchema.type !== "formula" && (value === undefined || value === null || value === "")) {
                return null;
              }

              switch (propSchema.type) {
                case "date":
                  return (
                    <div key={propId} className="flex items-center gap-1 mt-2">
                      <Calendar className="w-3 h-3 opacity-70" />
                      <p className="text-xs opacity-80 m-0">{String(displayValue || value || "")}</p>
                    </div>
                  );

                case "priority":
                  return (
                    <div key={propId} className="m-0">
                      {(() => {
                        const colorStyles = getOptionColorStyles(propSchema, String(displayValue || value || ""));
                        return (
                          <p
                            className={`m-0 inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${colorStyles.bg} ${colorStyles.text}`}
                          >
                            {displayValue || value}
                          </p>
                        );
                      })()}
                    </div>
                  );

                case "person":
                  const membersArray = (Array.isArray(value) ? value : (Array.isArray(displayValue) ? displayValue : [])) as any[];
                  return (
                    <div key={propId} className="flex items-center gap-1 mt-2">
                      <User className="w-3 h-3 opacity-70 shrink-0" />
                      <p className="text-xs opacity-80 m-0">
                        {membersArray
                          .slice(0, 2)
                          .map((member) => member.userName)
                          .join(", ")}
                        {membersArray.length > 2 && ` +${membersArray.length - 2}`}
                      </p>
                    </div>
                  );

                case "relation": {
                  const relationLimit = propSchema?.relationLimit || "multiple";
                  const linkedDatabaseId = propSchema?.linkedDatabaseId;
                  const noteIds = getRelationIdsFromValue(value, relationLimit);

                  if (noteIds.length === 0) {
                    return null;
                  }

                  return (
                    <div key={propId} className="flex items-center gap-1 mt-2 flex-wrap">
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
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          >
                            {noteIcon ? (
                              <span className="text-xs opacity-70 shrink-0" style={{ fontSize: "12px" }}>
                                {noteIcon}
                              </span>
                            ) : (
                              <FileText className="w-3 h-3 opacity-70 shrink-0" />
                            )}
                            <span className="max-w-[100px] truncate">{relTitle}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                case "status":
                  return (
                    <div key={propId}>
                      {(() => {
                        const colorStyles = getOptionColorStyles(propSchema, String(displayValue || value || ""));
                        return (
                          <p
                            className={`m-0 inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${colorStyles.bg} ${colorStyles.text}`}
                          >
                            {displayValue || value}
                          </p>
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
                          <p
                            className={`m-0 inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${colorStyles.bg} ${colorStyles.text}`}
                          >
                            {String(displayValue || value || "")}
                          </p>
                        );
                      })()}
                    </div>
                  );

                case "number": {
                  const numValue = typeof value === "number" ? value : Number(value) || 0;
                  const showAs = (propSchema as any)?.showAs || "number";
                  const progressColor = (propSchema as any)?.progressColor || "blue";
                  const progressDivideByRaw = (propSchema as any)?.progressDivideBy;
                  const showNumberText = (propSchema as any)?.showNumberText !== false; // default true
                  const divideBy = progressDivideByRaw && progressDivideByRaw !== 0 ? progressDivideByRaw : 100;
                  const numberNode = showNumberText ? (
                    <p className="text-xs opacity-80 m-0 font-medium">{String(numValue)}</p>
                  ) : null;
                  
                  if (showAs === "bar") {
                    // Calculate percentage: (value / divideBy) * 100, capped at 100%
                    const percentage = Math.min(100, Math.max(0, (numValue / divideBy) * 100));
                    const colorStyles = getColorStyles(progressColor);
                    return (
                      <div key={propId} className="mt-2 flex items-center gap-2">
                        {numberNode}
                        <div className="flex-1">
                          <div className="relative w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden" style={{ height: "4px" }}>
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
                        <svg viewBox="0 0 14 14" width="16" height="16" className="flex-shrink-0">
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
                    <div key={propId} className="mt-2">
                      <p className="text-xs opacity-80 m-0">{String(numValue)}</p>
                    </div>
                  );
                }

                case "multi_select":
                  return (
                    <div key={propId} className="flex flex-wrap gap-1 mt-2">
                      {(() => {
                        let values: string[] = [];
                        const valToUse = value !== undefined && value !== null ? value : displayValue;

                        if (Array.isArray(valToUse)) {
                          values = valToUse.map((v: string | { name?: string; id?: string }) =>
                            typeof v === "string" ? v : v.name || v.id || "",
                          );
                        } else if (typeof valToUse === "string") {
                          values = valToUse.split(",").map((v) => v.trim());
                        }
                        return values.slice(0, 2).map((item) => {
                          const colorStyles = getOptionColorStyles(propSchema, item);
                          return (
                            <p
                              key={item}
                              className={`m-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colorStyles.bg} ${colorStyles.text}`}
                            >
                              {item}
                            </p>
                          );
                        });
                      })()}
                    </div>
                  );

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
                      <div key={propId} className="text-xs opacity-80 text-gray-500">
                        {rollupResult.message || "—"}
                      </div>
                    );
                  }

                  const { calculation, values, count, countFraction, percent } = rollupResult;

                  if (calculation?.category === "count") {
                    if (calculation.value === "per_group") {
                      return (
                        <div key={propId} className="text-xs opacity-80 font-medium">
                          {countFraction || `${count ?? 0}/${rollupResult.totalCount ?? 0}`}
                        </div>
                      );
                    }
                    return (
                      <div key={propId} className="text-xs opacity-80 font-medium">
                        {count ?? 0}
                      </div>
                    );
                  }

                  if (calculation?.category === "percent") {
                    return (
                      <div key={propId} className="text-xs opacity-80 font-medium">
                        {percent ?? 0}%
                      </div>
                    );
                  }

                  // Original - show all values in one row with truncate
                  if (values && values.length > 0) {
                    return (
                      <div key={propId} className="text-xs opacity-80 truncate" title={values.join(', ')}>
                        {values.join(', ')}
                      </div>
                    );
                  }

                  return (
                    <div key={propId} className="text-xs opacity-80 text-gray-500">
                      No related values
                    </div>
                  );
                }

                case "email": {
                  const emailValue = String(value || "").trim();
                  if (!emailValue) return null;
                  return (
                    <div key={propId} className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400">
                      <Mail className="w-3 h-3 opacity-70" />
                      <a href={`mailto:${emailValue}`} className="hover:underline truncate" title={emailValue}>
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
                    <div key={propId} className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400">
                      <LinkIcon className="w-3 h-3 opacity-70" />
                      <a href={sanitizedUrl} target="_blank" rel="noreferrer" className="hover:underline truncate" title={rawUrl}>
                        {displayUrl}
                      </a>
                    </div>
                  );
                }

                case "phone": {
                  const phoneValue = String(value || "").trim();
                  if (!phoneValue) return null;
                  return (
                    <div key={propId} className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400">
                      <Phone className="w-3 h-3 opacity-70" />
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
                    <div key={propId} className="flex items-center gap-1 mt-2 flex-wrap">
                      {attachments.slice(0, 2).map((file: any, idx: number) => {
                        const fileUrl = file.url || file;
                        const fileName = file.name || (typeof file === "string" ? file : "Attachment");
                        return (
                          <div key={file.id || fileUrl || idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-100 max-w-[100px] truncate">
                            <Paperclip className="h-3 w-3 opacity-70 shrink-0" />
                            <span className="truncate" title={fileName}>{fileName}</span>
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
                  return (
                    <div key={propId} className="text-xs opacity-80">
                      {String(displayValue !== undefined ? displayValue : value || "")}
                    </div>
                  );
              }
            })}
          </div>
        ) : null}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
              setShowContextMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Title
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(card);
              setShowContextMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MenuIcon className="h-4 w-4" />
            Edit Properties
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowContextMenu(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2Icon className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </>
  );
}
