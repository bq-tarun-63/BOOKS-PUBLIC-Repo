"use client";

import React from "react";

interface PropertyColumn {
  id: string;
  name: string;
  type: string;
  width: number;
  icon: React.ReactNode;
}

interface MainHeaderRowProps {
  propertyColumns: PropertyColumn[];
  columnWidths: Record<string, number>;
  boardId: string;
  filters: Record<string, string[]>; // Direct filters object (propertyId -> values[])
  sortBy: Array<{ propertyId: string; direction: "ascending" | "descending" }>; // Direct sortBy array
  selectedAllChecked: boolean;
  onToggleSelectAll: () => void;
  draggedColumnIndex: number | null;
  dragOverColumnIndex: number | null;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onPropertyHeaderClick: (e: React.MouseEvent, property: PropertyColumn) => void;
  onColumnResizeMouseDown: (e: React.MouseEvent, propertyId: string, baseWidth: number) => void;
  onClickAddProperty: () => void;
  addPropertyBtnRef: React.RefObject<HTMLButtonElement>;
}

export default function MainHeaderRow({
  propertyColumns,
  columnWidths,
  boardId,
  filters,
  sortBy,
  selectedAllChecked,
  onToggleSelectAll,
  draggedColumnIndex,
  dragOverColumnIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onPropertyHeaderClick,
  onColumnResizeMouseDown,
  onClickAddProperty,
  addPropertyBtnRef,
}: MainHeaderRowProps) {
  return (
    <div
      className="sticky top-0 z-[10] transition-colors duration-200"
      style={{
        background: 'var(--c-bacPri, #ffffff)',
        color: 'var(--c-texSec, #787774)',
        boxShadow: 'calc(var(--direction, 1) * -3px) 0 0 var(--c-bacPri, #ffffff), inset 0 -1px 0 var(--ca-borSecTra, rgba(55, 53, 47, 0.16))',
        width: '100%',
        height: '36px',
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      <div className="flex h-9 relative" style={{ height: '36px' }}>
        <div className="flex items-center h-full">
          <input
            type="checkbox"
            checked={selectedAllChecked}
            onChange={onToggleSelectAll}
            className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-opacity ${
              selectedAllChecked ? 'opacity-100' : 'opacity-0 hover:opacity-100'
            }`}
            aria-label="Select all tasks"
          />
        </div>

        {propertyColumns.map((property, index) => (
          <React.Fragment key={property.id}>
            {dragOverColumnIndex === index && draggedColumnIndex !== null && draggedColumnIndex !== index && (
              <div className="h-9 w-0.5 bg-blue-500 rounded-full shadow-lg" />
            )}

            <div
              draggable={true}
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, index)}
              aria-label={`Drag to reorder ${property.name} column`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                }
              }}
              className="relative flex items-center group transition-all duration-200"
              style={{
                display: 'flex',
                flexShrink: 0,
                overflow: 'hidden',
                fontSize: '14px',
                padding: 0,
                width: `${columnWidths[property.id] ?? property.width}px`,
                height: '36px',
                cursor: draggedColumnIndex === index ? 'grabbing' : 'grab',
                opacity: draggedColumnIndex === index ? 0.5 : 1,
                transform: draggedColumnIndex === index ? 'scale(0.95)' : 'scale(1)',
                transition: 'all 200ms ease'
              }}
            >
              <div
                className="flex items-center w-full h-full"
                style={{
                  userSelect: 'none',
                  transition: 'background 20ms ease-in',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  height: '100%',
                  paddingInline: '8px'
                }}
                onClick={(e) => onPropertyHeaderClick(e, property)}
              >
                <div className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 mr-2">
                  {property.icon}
                </div>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px', flex: '1 1 auto' }}>
                  <span>{property.name.charAt(0).toUpperCase() + property.name.slice(1)}</span>
                  {(() => {
                    const propertyFilters = filters?.[property.id];
                    return propertyFilters && Array.isArray(propertyFilters) && propertyFilters.length > 0 && (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--c-bluIcoAccPri)', flexShrink: 0 }} />
                    );
                  })()}
                  {sortBy?.some(sort => sort.propertyId === property.id) && (
                    <div style={{ 
                      width: 0,
                      height: 0,
                      borderLeft: '3px solid transparent',
                      borderRight: '3px solid transparent',
                      borderBottom: sortBy.find(sort => sort.propertyId === property.id)?.direction === 'ascending' 
                        ? '4px solid var(--c-icoSec)' 
                        : '4px solid var(--c-icoSec)',
                      transform: sortBy.find(sort => sort.propertyId === property.id)?.direction === 'descending' 
                        ? 'rotate(180deg)' 
                        : 'none',
                      flexShrink: 0 
                    }} />
                  )}
                </div>
                <div className="ml-auto w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 10 10">
                    <path d="M3,2 C2.44771525,2 2,1.55228475 2,1 C2,0.44771525 2.44771525,0 3,0 C3.55228475,0 4,0.44771525 4,1 C4,1.55228475 3.55228475,2 3,2 Z M3,6 C2.44771525,6 2,5.55228475 2,5 C2,4.44771525 2.44771525,4 3,4 C3.55228475,4 4,4.44771525 4,5 C4,5.55228475 3.55228475,6 3,6 Z M3,10 C2.44771525,10 2,9.55228475 2,9 C2,8.44771525 2.44771525,8 3,8 C3.55228475,8 4,8.44771525 4,9 C4,9.55228475 3.55228475,10 3,10 Z M7,2 C6.44771525,2 6,1.55228475 6,1 C6,0.44771525 6.44771525,0 7,0 C7.55228475,0 8,0.44771525 8,1 C8,1.55228475 7.55228475,2 7,2 Z M7,6 C6.44771525,6 6,5.55228475 6,5 C6,4.44771525 6.44771525,4 7,4 C7.55228475,4 8,4.44771525 8,5 C8,5.55228475 7.55228475,6 7,6 Z M7,10 C6.44771525,10 6,9.55228475 6,9 C6,8.44771525 6.44771525,8 7,8 C7.55228475,8 8,8.44771525 8,9 C8,9.55228475 7.55228475,10 7,10 Z" />
                  </svg>
                </div>
              </div>

              <div
                onMouseDown={(e) => onColumnResizeMouseDown(e, property.id, (columnWidths[property.id] ?? property.width))}
                className="absolute top-0 right-0 h-full w-1 cursor-col-resize opacity-0 group-hover:opacity-100"
                style={{ userSelect: 'none', background: 'transparent' }}
                aria-label={`Resize ${property.name} column`}
                role="separator"
              />
            </div>
          </React.Fragment>
        ))}

        <div className="relative flex items-center justify-start px-2" style={{ width: '64px', flexShrink: 0 }}>
          <button
            ref={addPropertyBtnRef}
            onClick={onClickAddProperty}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Add property"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2.74a.66.66 0 0 1 .66.66v3.94h3.94a.66.66 0 0 1 0 1.32H8.66v3.94a.66.66 0 0 1-1.32 0V8.66H3.4a.66.66 0 0 1 0-1.32h3.94V3.4A.66.66 0 0 1 8 2.74"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}


