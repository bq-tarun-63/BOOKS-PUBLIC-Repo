"use client";

import React from "react";
import MainHeaderRow from "./MainHeaderRow";
import type { Note, ViewCollection } from "@/types/board";

interface PropertyColumn {
  id: string;
  name: string;
  type: string;
  width: number;
  icon: React.ReactNode;
}

interface GroupSectionProps {
  groupName: string;
  groupNotes: Note[];
  collapsed: boolean;
  onToggleCollapse: (groupName: string) => void;
  renderNoteRow: (note: Note, idx: number) => React.ReactNode;
  propertyColumns: PropertyColumn[];
  columnWidths: Record<string, number>;
  filters: Record<string, string[]>; // Direct filters object (propertyId -> values[])
  sortBy: Array<{ propertyId: string; direction: "ascending" | "descending" }>; // Direct sortBy array
  boardId: string;
  showAddRowForGroup: Record<string, boolean>;
  setShowAddRowForGroup: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  newRowTitleForGroup: Record<string, string>;
  setNewRowTitleForGroup: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  groupByPropertyId?: string | null;
  boardProperties?: ViewCollection["properties"];
  workspaceMembers?: any[];
  onCreateInGroup: (args: { propertyId: string | null; value: any; title: string; groupName: string }) => Promise<void> | void;
  // Header behavior parity with main header
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
  groupAllSelected: boolean;
  onToggleGroupSelect: () => void;
}

export default function GroupSection({
  groupName,
  groupNotes,
  collapsed,
  onToggleCollapse,
  renderNoteRow,
  propertyColumns,
  columnWidths,
  filters,
  sortBy,
  boardId,
  showAddRowForGroup,
  setShowAddRowForGroup,
  newRowTitleForGroup,
  setNewRowTitleForGroup,
  groupByPropertyId,
  boardProperties,
  workspaceMembers,
  onCreateInGroup,
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
  groupAllSelected,
  onToggleGroupSelect,
}: GroupSectionProps) {
  const resolveGroupValue = (): any => {
    if (!groupByPropertyId || !boardProperties) return null;
    const schema: any = (boardProperties as any)[groupByPropertyId];
    if (!schema) return null;
    const name = groupName.trim();
    const lower = name.toLowerCase();
    switch (schema.type) {
      case "person": {
        if (lower === "unassigned" || lower === "no person" || lower.startsWith("no ")) return [];
        const member = (workspaceMembers || []).find((m: any) => m.userName === name || m.userEmail === name);
        return member ? [member] : [];
      }
      case "multi_select": {
        if (lower.startsWith("no ")) return [];
        return [name];
      }
      case "status":
      case "select":
      case "priority": {
        if (lower.startsWith("no ")) return null;
        return name;
      }
      case "checkbox": {
        return lower === "true" || lower === "checked";
      }
      case "date": {
        return name === "—" || lower.startsWith("no ") ? null : name;
      }
      default: {
        return name === "—" || lower.startsWith("no ") ? null : name;
      }
    }
  };
  return (
    <div key={groupName} >
      <div 
        className="sticky top-9 z-[5]"
        style={{
          background: 'var(--c-bacPri, #ffffff)',
          paddingInline: '8px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          fontSize: '14px'
        }}
      >
        <button
          type="button"
          onClick={() => onToggleCollapse(groupName)}
          aria-label={collapsed ? 'Expand' : 'Collapse'}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 mr-1"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>
            <path d="M2.835 3.25a.8.8 0 0 0-.69 1.203l5.164 8.854a.8.8 0 0 0 1.382 0l5.165-8.854a.8.8 0 0 0-.691-1.203z" />
          </svg>
        </button>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', minWidth: 0, maxWidth: '100%', height: 20,
            borderRadius: 10, paddingInline: '7px 9px', lineHeight: '120%', color: 'var(--c-graTexPri)',
            background: 'var(--ca-graBacTerTra)'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ marginInlineEnd: 5, borderRadius: 99, height: 8, width: 8, backgroundColor: 'var(--c-graIcoAccPri)' }} />
          </span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{groupName}</span>
        </span>
        <span style={{ marginInlineStart: 8, fontSize: 12, color: 'var(--c-texTer, #9b9a97)' }}>({groupNotes.length})</span>
        <div className="ml-1 opacity-0 hover:opacity-100 transition-opacity flex items-center">
          <button type="button" className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Group options">
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor"><path d="M3.2 6.725a1.275 1.275 0 1 0 0 2.55 1.275 1.275 0 0 0 0-2.55m4.8 0a1.275 1.275 0 1 0 0 2.55 1.275 1.275 0 0 0 0-2.55m4.8 0a1.275 1.275 0 1 0 0 2.55 1.275 1.275 0 0 0 0-2.55"/></svg>
          </button>
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Add in group"
            onClick={() => setShowAddRowForGroup((p) => ({ ...p, [groupName]: true }))}
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor"><path d="M8 2.74a.66.66 0 0 1 .66.66v3.94h3.94a.66.66 0 0 1 0 1.32H8.66v3.94a.66.66 0 0 1-1.32 0V8.66H3.4a.66.66 0 0 1 0-1.32h3.94V3.4A.66.66 0 0 1 8 2.74"/></svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <MainHeaderRow
          propertyColumns={propertyColumns}
          columnWidths={columnWidths}
          boardId={boardId}
          filters={filters}
          sortBy={sortBy}
          selectedAllChecked={groupAllSelected}
          onToggleSelectAll={onToggleGroupSelect}
          draggedColumnIndex={draggedColumnIndex}
          dragOverColumnIndex={dragOverColumnIndex}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onPropertyHeaderClick={onPropertyHeaderClick}
          onColumnResizeMouseDown={onColumnResizeMouseDown}
          onClickAddProperty={onClickAddProperty}
          addPropertyBtnRef={addPropertyBtnRef}
        />
      )}

      {!collapsed && groupNotes.map((note, idx) => renderNoteRow(note, idx))}

      {!collapsed && (
        <div className="flex items-center h-9 px-2" style={{ paddingInlineStart: 44 }}>
          {!showAddRowForGroup[groupName] ? (
            <button
              type="button"
              onClick={() => setShowAddRowForGroup((p) => ({ ...p, [groupName]: true }))}
              className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M8 2.74a.66.66 0 0 1 .66.66v3.94h3.94a.66.66 0 0 1 0 1.32H8.66v3.94a.66.66 0 0 1-1.32 0V8.66H3.4a.66.66 0 0 1 0-1.32h3.94V3.4A.66.66 0 0 1 8 2.74"/></svg>
              New page
            </button>
          ) : (
            <div className="flex w-full border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 h-9">
              <div className="flex-1 flex items-center px-2 pl-5">
                <input
                  type="text"
                  value={newRowTitleForGroup[groupName] || ''}
                  onChange={(e) => setNewRowTitleForGroup((p) => ({ ...p, [groupName]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const title = (newRowTitleForGroup[groupName] || '').trim();
                      if (!title) return;
                      const value = resolveGroupValue();
                      onCreateInGroup({ propertyId: groupByPropertyId || null, value, title, groupName });
                    } else if (e.key === 'Escape') {
                      setShowAddRowForGroup((p) => ({ ...p, [groupName]: false }));
                      setNewRowTitleForGroup((p) => ({ ...p, [groupName]: '' }));
                    }
                  }}
                  placeholder="Task name"
                  className="w-full bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


