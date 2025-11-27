"use client";

import React , { useState, useRef, useEffect, useMemo } from "react";
import { ViewCollection, Note, BoardProperties } from "@/types/board";
import TimelineTaskCard from "./timelineCard";
import { Plus } from "lucide-react";
import TaskDropdownMenu from "../taskDropdownMenu";
import useDragDropNotes from "@/hooks/use-cardDragAndDrop";
import { useBoard } from "@/contexts/boardContext";

interface Props {
  notes: Note[];
  dateRange: string[];
  dayWidth: number;
  board: ViewCollection;
  leftLabelWidth: number; // px
  scrollerRef: React.RefObject<HTMLDivElement> | null;
  onTaskClick: (note: Note) => void;
  onAddTask?: (date: string) => void;
  onHoverDate?: (date: string | null) => void;
  onDeleteNote: (noteId: string) => void; 
  setLocalNotes?: React.Dispatch<React.SetStateAction<Note[]>>;
}

export default function TimelineGrid({
  notes,
  dateRange,
  dayWidth,
  board,
  leftLabelWidth,
  scrollerRef,
  onTaskClick,
  onAddTask,
  onHoverDate,
  onDeleteNote,
  setLocalNotes
}: Props) {
  const { getCurrentDataSourceProperties } = useBoard();
  
  // Get properties from current data source
  const boardProperties = getCurrentDataSourceProperties(board._id) || board.properties;

        const rowHeight = 50;
        const containerRef = useRef<HTMLDivElement | null>(null);
        const [hoverIndex, setHoverIndex] = useState<number | null>(null);
        const menuRef = useRef<HTMLDivElement | null>(null);
        const [contextMenu, setContextMenu] = useState<{
            x: number;
            y: number;
            note: Note;
          } | null>(null);
        
        // Get the primary date property for drag and drop
        const primaryDateProperty = useMemo(() => {
            const dateProps = Object.entries(boardProperties || {})
                .filter(([_, prop]: any) => prop.type === 'date');
            return dateProps[0]?.[0] || 'dueDate';
        }, [boardProperties]);

        const {
            draggedNote,
            handleDragStart,
            handleDragEnd,
            handleDragOver,
            handleDragLeave,
            handleDrop,
            isDragging,
            isDropTarget,
        } = useDragDropNotes({
            board,
            notes,
            setLocalNotes: setLocalNotes || (() => {}),
            primaryDateProperty,
        });
          
        useEffect(() => {
        if (!contextMenu) return;
        
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            setContextMenu(null); // close menu
            }
        };
        
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
        }, [contextMenu]);


        const handleContextMenu = (e: React.MouseEvent, note: Note) => {
        e.preventDefault();
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        setContextMenu({
            x: e.clientX - rect.left,  // relative to container
            y: e.clientY - rect.top,
            note,
        });
        };

        // safely get date property key
        const datePropKey = board?.properties
        ? (Object.keys(boardProperties).find(
            (key) => boardProperties[key]?.type === "date"
            ) as string | undefined)
        : undefined;


        function formatLocalDateFromParts(dateValue: string | Date) {
            // normalize to YYYY-MM-DD (local)
            let d: Date;
            if (typeof dateValue === "string") {
            const parts = String(dateValue).split("-").map(Number);
            const yyyy = parts[0] ?? 1970;
            const mm = parts[1] ?? 1;
            const dd = parts[2] ?? 1;
            d = new Date(yyyy, mm - 1, dd);
            } else {
            d = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
            }
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }

        // handle pointer move over the last-row area
        const handlePointerMove = (e: React.PointerEvent) => {
            if (!scrollerRef?.current) return;
            const scroller = scrollerRef.current;
            const rect = scroller.getBoundingClientRect();

            // coordinate inside scroller content (account for horizontal scroll)
            const xInContent = e.clientX - rect.left + scroller.scrollLeft - leftLabelWidth;
            const idx = Math.floor(xInContent / dayWidth);

            if (idx < 0 || idx >= dateRange.length) {
            setHoverIndex(null);
            onHoverDate?.(null);
            } else {
            setHoverIndex(idx);
            onHoverDate?.(dateRange[idx] ?? null); 
            }
        };

        const handlePointerLeave = () => {
            setHoverIndex(null);
            onHoverDate?.(null);
        };

        const handleAddClick = () => {
          if (hoverIndex === null || !onAddTask) return;
          const dateKey = dateRange[hoverIndex];
          console.log("1111 ->", dateKey)
          if(dateKey){
              onAddTask(dateKey);
          }
          else{
            console.error("Error in picking up the date ")
          }
        };

      return (
        <div className="relative"
            ref={containerRef}
            style={{ minHeight: (notes.length + 1) * rowHeight }}
        >
            {/* Render date column drop zones only if drag and drop is enabled */}
            {setLocalNotes && dateRange.map((dateKey, colIndex) => {
                const isDropTargetColumn = isDropTarget(dateKey);
                
                return (
                    <div
                        key={`drop-zone-${dateKey}`}
                        className={`absolute transition-all ${
                            isDropTargetColumn 
                                ? 'bg-blue-200/30 dark:bg-blue-800/30' 
                                : ''
                        }`}
                        style={{
                            left: leftLabelWidth + colIndex * dayWidth,
                            width: dayWidth,
                            height: notes.length * rowHeight,
                            top: 0,
                            pointerEvents: draggedNote ? 'auto' : 'none',
                            zIndex: draggedNote ? 1 : -1
                        }}
                        onDragOver={(e) => handleDragOver(e, dateKey)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dateKey)}
                    />
                );
            })}

            {notes.map((note, rowIndex) => {
                
                if (!datePropKey) return null;
                const dateValue = note.databaseProperties[datePropKey];
                if (!dateValue) return null;

                const dateKey =  formatLocalDateFromParts(dateValue);

                const startIndex = dateRange.indexOf(dateKey);
                if (startIndex === -1) return null;

                const noteIsDragging = setLocalNotes ? isDragging(note._id) : false;

                return (
                    <div
                        key={note._id}
                        className={`absolute flex items-center transition-all ${
                            noteIsDragging ? 'opacity-50 z-10' : 'z-20'
                        }`}
                        style={{
                        top: rowIndex * rowHeight, // row spacing
                        left: leftLabelWidth + startIndex * dayWidth,
                        width: dayWidth,
                        height: 40,
                        }}
                        onClick={() => onTaskClick(note)}
                        onMouseEnter={() => onHoverDate?.(dateKey)} 
                        onMouseLeave={() => onHoverDate?.(null)}
                        draggable={setLocalNotes && !noteIsDragging}
                        onDragStart={(e) => handleDragStart(e, note)}
                        onDragEnd={handleDragEnd}       
                    >
                        <TimelineTaskCard
                            note={note}
                            onClick={() => onTaskClick(note)}
                            onContextMenu={(e) => handleContextMenu(e, note)}
                            isDragging={noteIsDragging}
                        />
                    </div>
                );
            })}
            {/* last empty row area where hovering shows the "dummy page" */}
            <div
                className="absolute left-0 right-0"
                style={{
                top: notes.length * rowHeight,
                height: rowHeight,
                width: dateRange.length * dayWidth, 
                }}
                // we register pointer events on the last-row strip so it receives clientX even while scrolled
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onClick={handleAddClick}
            >
                {/* optionally render a subtle row background/guide */}
                <div style={{ height: "100%" }} />

                {/* hover placeholder */}
                {hoverIndex !== null && (
                <div
                    className="absolute flex items-center justify-center z-10"
                    style={{
                    top: 6,
                    left: leftLabelWidth + hoverIndex * dayWidth,
                    width: dayWidth,
                    pointerEvents: "auto",
                    }}
                >
                    {/* design: match note card styling, but as a placeholder (no blue) */}
                    <div
                    className="px-2 py-1 rounded-md cursor-pointer text-sm border border-dashed border-gray-300 bg-white dark:bg-gray-900"
                    style={{ width: "100%", textAlign: "center" }}
                    title="Create new page"
                    >
                    +
                    </div>
                </div>
                )}
            </div>
            {contextMenu && contextMenu.note && (
                <div
                    className="absolute z-50"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    ref={menuRef}
                >
                    <TaskDropdownMenu
                    onEditProperties={() => {
                        onTaskClick(contextMenu.note)
                    }}
                    onDelete={() => {
                        onDeleteNote(contextMenu.note._id);
                    }}
                    onClose={() => setContextMenu(null)}
                    />
                </div>
            )}
        </div>
      );
}
