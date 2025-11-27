"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getWithAuth } from "@/lib/api-helpers";
import { Search, FileText, Minus, Plus } from "lucide-react";
import { getRelationIdsFromValue } from "@/utils/relationUtils";
import type { BoardProperty, Note } from "@/types/board";
import { useBoard } from "@/contexts/boardContext";
import { toast } from "sonner";

interface RelationPropertyInputProps {
  value: string[] | string | any;
  onChange: (value: string[] | string) => void;
  property: BoardProperty;
}

export function RelationPropertyInput({
  value,
  onChange,
  property,
}: RelationPropertyInputProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pickerStyles, setPickerStyles] = useState<{ top: number; left: number; width: number } | null>(null);
  
  const { getNotesByDataSourceId, setNotesState, getDataSource, setDataSource, getRelationNoteTitle } = useBoard();
  
  // Get linkedDatabaseId from property
  const linkedDatabaseId = property.linkedDatabaseId;
  
  const relationLimitType = property.relationLimit || "multiple";
  const isSingleRelation = relationLimitType === "single";
  const selectedNoteIds = getRelationIdsFromValue(value, "multiple");
  
  // Load notes from context or API
  const updatePickerPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPickerStyles({
      top: rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!isPickerOpen) return;

    updatePickerPosition();

    const handleResize = () => updatePickerPosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isPickerOpen]);

  useEffect(() => {
    if (!isPickerOpen || !linkedDatabaseId) return;
    
    const loadNotes = async () => {
      try {
        setLoading(true);
        
        // Normalize linkedDatabaseId to string
        const normalizedDataSourceId = typeof linkedDatabaseId === "string" 
          ? linkedDatabaseId 
          : String(linkedDatabaseId);
        
        // First, check if notes are already in context
        let notes = getNotesByDataSourceId(normalizedDataSourceId);
        
        if (notes.length === 0) {
          // Notes not in context, fetch from API
          const response: any = await getWithAuth(
            `/api/database/getdataSource/${normalizedDataSourceId}`
          );
          
          if (response?.success && response.collection) {
            // Store data source in context if not already there
            if (response.collection.dataSource) {
              const ds = response.collection.dataSource;
              const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : normalizedDataSourceId;
              
              // Check if data source is already in context
              const existingDataSource = getDataSource(normalizedDataSourceId);
              if (!existingDataSource) {
                setDataSource(dsId, ds);
              }
            }
            
            // Store notes in context
            const fetchedNotes = response.collection.notes || [];
            if (fetchedNotes.length > 0) {
              setNotesState(normalizedDataSourceId, fetchedNotes);
              notes = fetchedNotes;
            }
          } else {
            toast.error("Failed to fetch notes from linked database");
          }
        }
        
        setRelatedNotes(notes);
        setFilteredNotes(notes);
      } catch (error) {
        console.error("Failed to fetch related notes:", error);
        toast.error("Failed to load notes");
      } finally {
        setLoading(false);
      }
    };
    
    loadNotes();
  }, [isPickerOpen, linkedDatabaseId, getNotesByDataSourceId, setNotesState, getDataSource, setDataSource]);
  
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotes(relatedNotes);
      return;
    }
    
    const filtered = relatedNotes.filter((note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredNotes(filtered);
  }, [searchQuery, relatedNotes]);
  
  useEffect(() => {
    if (!isPickerOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const pickerEl = pickerRef.current;
      const containerEl = containerRef.current;
      if (!pickerEl || !containerEl) return;

      if (!pickerEl.contains(target) && !containerEl.contains(target)) {
        setIsPickerOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isPickerOpen]);

  useEffect(() => {
    if (isPickerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isPickerOpen]);
  
  const handleToggleNote = (note: Note) => {
    const noteId = String(note._id);
    const isSelected = selectedNoteIds.includes(noteId);
    
    let newSelection: string[] | string;
    if (isSelected) {
      // Remove the note
      newSelection = selectedNoteIds.filter(id => id !== noteId);
    } else {
      // Add the note
      if (relationLimitType === "single") {
        // For single relation, replace the existing selection (store as string)
        newSelection = noteId;
      } else {
        // For multiple relations, add to existing selection
        newSelection = [...selectedNoteIds, noteId];
      }
    }
    
    onChange(newSelection);
  };
  
  const handleRemoveNote = (noteId: string) => {
    const newSelection = selectedNoteIds.filter((id) => id !== noteId);
    onChange(newSelection);
  };
  
  // Get selected note objects with full data from context
  const normalizedLinkedDatabaseId = linkedDatabaseId
    ? (typeof linkedDatabaseId === "string" ? linkedDatabaseId : String(linkedDatabaseId))
    : "";

  const selectedNoteInfos = selectedNoteIds.map((noteId) => {
    const note =
      relatedNotes.find((n) => String(n._id) === noteId) ||
      filteredNotes.find((n) => String(n._id) === noteId);

    return {
      noteId,
      title: getRelationNoteTitle(noteId, normalizedLinkedDatabaseId, note?.title || "Untitled"),
      icon: (note as any)?.icon as string | undefined,
      description: note?.description,
    };
  });
  const displayedNoteInfos = isSingleRelation ? selectedNoteInfos.slice(0, 1) : selectedNoteInfos;
  const availableNotes = filteredNotes.filter(
    (note) => !selectedNoteIds.includes(String(note._id)),
  );
  const linkedDataSourceTitle = normalizedLinkedDatabaseId
    ? (getDataSource(normalizedLinkedDatabaseId)?.title || property.name || "Linked database")
    : property.name || "Linked database";
  
  if (!linkedDatabaseId) {
    return (
      <div className="text-sm text-gray-400">
        No database linked
        {selectedNoteIds.length === 0 && (
          <div className="pointer-events-none absolute right-2 top-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openPicker();
              }}
              className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded bg-white shadow hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
              aria-label="Add page"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }
  
  const openPicker = () => {
    updatePickerPosition();
    setIsPickerOpen(true);
  };

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        <div
          role="button"
          tabIndex={0}
          className="group flex flex-col gap-1 rounded-md text-sm text-gray-900 dark:text-gray-100 w-[250px]"
          onClick={() => openPicker()}
        >
          {selectedNoteIds.length === 0 ? (
            <div className="flex items-center gap-2 px-2 py-1 text-gray-500">
              <span className="text-sm">{isSingleRelation ? "Add page" : "Add pages"}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {displayedNoteInfos.map((note) => (
                <div
                  key={note.noteId}
                  className="group/item relative flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-5 w-5 items-center justify-center">
                      {note.icon ? (
                        <span className="text-base leading-none">{note.icon}</span>
                      ) : (
                        <FileText className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <span className="truncate text-sm">{note.title}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1 opacity-0 transition p-0.5 rounded-sm bg-white group-hover/item:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveNote(note.noteId);
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      aria-label="Remove page"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPicker();
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      aria-label="Add page"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isPickerOpen && pickerStyles &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[190]" onClick={() => setIsPickerOpen(false)} />
            <div
              ref={pickerRef}
              className="absolute z-[200] flex min-w-[350px] flex-col rounded-[10px] border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-[#202020]"
              style={{
                top: pickerStyles.top,
                left: pickerStyles.left,
                width: pickerStyles.width,
              }}
            >
              <div className="flex flex-col gap-2 border-b bg-gray-100 border-gray-100 px-3 py-1 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search Page..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-md border border-transparent bg-gray-100/70 py-1 pl-8 pr-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:bg-[#2a2a2a] dark:text-gray-100"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>In</span>
                    <span className="font-semibold truncate max-w-[160px]">
                      {property.name || "Linked database"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-2">
                {selectedNoteInfos.length > 0 && (
                  <div className="p-1">
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>{selectedNoteInfos.length} selected</span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {selectedNoteInfos.map((note) => (
                        <div
                          key={`selected-${note.noteId}`}
                          className="group/item flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-5 w-5 items-center justify-center">
                              {note.icon ? (
                                <span className="text-base leading-none">{note.icon}</span>
                              ) : (
                                <FileText className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <span className="truncate text-sm">{note.title}</span>
                          </div>
                          <div className="ml-auto opacity-0 transition group-hover/item:opacity-100 rounded-sm bg-white">
                            <button
                              type="button"
                              onClick={() => handleRemoveNote(note.noteId)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(loading || availableNotes.length > 0) && (
                  <div className="mt-3 rounded-md bg-transparent">
                    <div className="flex items-center px-1 pb-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>Select more</span>
                    </div>
                    {loading ? (
                      <div className="py-6 text-center text-sm text-gray-500">Loading pages…</div>
                    ) : (
                      <div className="space-y-1">
                        {availableNotes.map((note) => (
                          <div
                            key={note._id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1 transition hover:bg-gray-100 dark:hover:bg-gray-700/50"
                            onClick={() => {
                              if (isSingleRelation) {
                                handleToggleNote(note);
                                setIsPickerOpen(false);
                              } else {
                                handleToggleNote(note);
                              }
                            }}
                          >
                            <div className="flex h-5 w-5 items-center justify-center">
                              {(note as any)?.icon ? (
                                <span className="text-base leading-none">{(note as any)?.icon}</span>
                              ) : (
                                <FileText className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm">{note.title || "Untitled"}</div>
                              {note.description && (
                                <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                                  {note.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
