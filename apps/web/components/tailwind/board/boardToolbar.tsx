"use client";

import React, { useState, useEffect, useRef } from "react";
import { LayoutGrid, Calendar, Clock, Plus, MoreHorizontal, FilterIcon, EyeIcon, ListFilter, SlidersHorizontal, List, ArrowUpDown, Settings2, Eye, FileText, Zap, ArrowUpRight, Share2 } from "lucide-react";
import BoardSettingsDropdown from "./boardSettingDropdown ";
import { View, ViewCollection } from "@/types/board";
import { useBoard } from "@/contexts/boardContext";
import { deleteWithAuth } from "@/lib/api-helpers";
import FilterPropertiesModal from "./filterPropertiesModal";
import SortModal from "./sortPropertiesModel";
import { updateSorts } from "@/services-frontend/boardServices/databaseSettingsService";
import { toast } from "sonner";
import { useEditor } from "novel"; 
import ViewOptionsModal from "./viewOptionsModal";
import DeleteConfirmationModal from "@/components/tailwind/ui/deleteConfirmationModal";
import CardPropertiesEditor from "./boardView/cardPropertiesEditor";
import FormPreviewModal from "@/components/tailwind/board/formView/FormPreviewModal";
import FormShareModal from "@/components/tailwind/board/formView/FormShareModal";
interface BoardToolbarProps {
  readonly currentView: string;
  readonly onChangeView: (view: string) => void;
  readonly onAddView?: () => void;
  readonly onSettings?: () => void;
  readonly children?: React.ReactNode;
  readonly boardViewsType: View[];
  readonly board: ViewCollection;
}

export default function BoardToolbar({
  currentView: currentViewProp,
  onChangeView,
  onAddView,
  onSettings,
  children,
  boardViewsType,
  board,
}: BoardToolbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFormPreview, setShowFormPreview] = useState(false);
  const [showFormShare, setShowFormShare] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showGroupByModal, setShowGroupByModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showViewOptions, setShowViewOptions] = useState<string | null>(null);
  const [confirmDeleteView, setConfirmDeleteView] = useState<{ id: string; label: string } | null>(null);
  const [isDeletingView, setIsDeletingView] = useState(false);

  const { groupBy, setGroupBy, filters, setBoardFilters, searchQuery, setSearchQuery, updateBoard, currentView, getCurrentDataSourceProperties, getFilters, getSortBy, setBoardSortBy, boards, getPropertyVisibility } = useBoard();
  
  // Get currentView from context (has both id and type)
  const currentViewData = currentView[board._id];
  const selectedGroupByProperty = groupBy[board._id];
  const latestBoard = boards.find((b) => b._id === board._id) || board;
  
  // Get current filters, sorts, and property visibility for the current view
  const currentFilters = getFilters(board._id);
  const currentSorts = getSortBy(board._id);
  const currentPropertyVisibility = getPropertyVisibility(board._id) || [];
  const hasFilters = currentFilters && Object.keys(currentFilters).length > 0;
  const hasSorts = currentSorts && currentSorts.length > 0;
  const hasPropertyVisibility = currentPropertyVisibility.length > 0;
  const isFormsView = currentViewData?.type === "forms";
  
  // Get current viewTypeId
  const getCurrentViewTypeId = (): string | null => {
    if (!latestBoard || !currentViewData) return null;
    let view;
    if (currentViewData.id) {
      const currentViewId = typeof currentViewData.id === "string" ? currentViewData.id : String(currentViewData.id);
      view = latestBoard.viewsType?.find((v) => {
        const viewId = typeof v.id === "string" ? v.id : String(v.id);
        return viewId === currentViewId;
      });
    } else if (currentViewData.type) {
      view = latestBoard.viewsType?.find((v) => v.viewType === currentViewData.type);
    }
    if (!view) return null;
    return view.id ? (typeof view.id === "string" ? view.id : String(view.id)) : null;
  };
  
  const viewTypeId = getCurrentViewTypeId();
  const editorContext = useEditor(); 
  const editorInstance = editorContext?.editor;

  const availableTabsMap = {
    board: { id: "board", label: "Board", icon: <LayoutGrid className="h-4 w-4" /> },
    list: { id: "list", label: "List", icon: <List className="h-4 w-4" /> },
    calendar: { id: "calendar", label: "Calendar", icon: <Calendar className="h-4 w-4" /> },
    timeline: { id: "timeline", label: "Timeline", icon: <Clock className="h-4 w-4" /> },
    forms: { id: "forms", label: "Form", icon: <FileText className="h-4 w-4" /> },
  };
  
  // Render tabs in the order they appear in boardViewsType, using custom title/icon when provided
  const tabsToRender = boardViewsType
    .map((viewType, index) => {
      const base = availableTabsMap[viewType.viewType as keyof typeof availableTabsMap];
      if (!base) return null;
      const hasCustomTitle = typeof viewType.title === "string" && viewType.title.trim().length > 0;
      const displayTitle = hasCustomTitle ? viewType.title : base.label;
      const displayIcon = viewType.icon
        ? (<span className="text-base" aria-hidden>{viewType.icon}</span>)
        : base.icon;
      // Use view ID if available, otherwise fallback to viewType
      // For React key, use index to ensure uniqueness if no id
      const viewId = viewType.id || viewType.viewType;
      const reactKey = viewType.id || `${viewType.viewType}-${index}`;
      return { ...base, id: viewId, key: reactKey, icon: displayIcon, title: displayTitle, viewType: viewType.viewType };
    })
    .filter(Boolean) as Array<typeof availableTabsMap[keyof typeof availableTabsMap] & { id: string; key: string; title?: string; viewType: string }>;

  const handleFilter = () => {
    setShowFilterModal(true);
  };

  const handleSort = () => {
    setShowSortModal(true);
  };

  const handleProperties = () => {
    setShowPropertiesModal(true);
  };

  const handleSearchToggle = () => {
    setShowSearchInput(!showSearchInput);
    if (!showSearchInput === false) {
      setSearchValue("");
      setSearchQuery(board._id, "");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchValue(query);
    setSearchQuery(board._id, query);
  };

  const handleViewButtonClick = (viewId: string) => {
    console.log("Button clicked - viewId:", viewId, "currentViewData:", currentViewData, "showViewOptions:", showViewOptions);
    
    // Find the view that matches this viewId (could be id or viewType)
    const clickedView = boardViewsType.find(v => v.id === viewId || v.viewType === viewId);
    
    // Check if clicked view is the current view by comparing both id and type from context
    const isCurrentView = clickedView && currentViewData && (
      // Match by id if both exist and match
      (clickedView.id && currentViewData.id && clickedView.id === currentViewData.id) ||
      // Match by type if types match and either no id or ids match
      (clickedView.viewType === currentViewData.type && (
        !clickedView.id || !currentViewData.id || clickedView.id === currentViewData.id
      ))
    );
    
    if (isCurrentView) {
      setShowViewOptions(viewId);
    } else {
      onChangeView(viewId);
      setShowViewOptions(null);
    }
  };

  const handlePreviewForm = () => {
    if (!isFormsView) {
      toast.info("Preview is available on form views only");
      return;
    }
    setShowFormPreview(true);
  };

  const handleShareForm = () => {
    if (!isFormsView) {
      return;
    }
    setShowFormShare(true);
  };

  const handleOpenFullForm = () => {
    toast.info("Open full form coming soon");
  };

  const handleFormAutomations = () => {
    toast.info("Automations coming soon");
  };

  useEffect(() => {
    console.log("showViewOptions changed:", showViewOptions);
    console.log("currentViewData:", currentViewData);
  }, [showViewOptions, currentViewData]);
  
  useEffect(() => {
    setShowFilterModal(false);
    setShowSortModal(false);
    // setShowPropertiesModal(false);
  }, [board]);

  // Helper: delete a view type and update board
  const deleteViewType = async (viewIdToDelete: string) => {
    await deleteWithAuth("/api/database/deleteVeiwType", {
      method: "DELETE",
      body: JSON.stringify({ viewId: board._id, viewTypeToDelete: viewIdToDelete }),
    });

    const updated = { ...board, viewsType: (board.viewsType || []).filter((v) => v.id !== viewIdToDelete && v.viewType !== viewIdToDelete) };
    updateBoard(updated._id, updated);

    // Check if currentView matches the viewIdToDelete by comparing id and type from context
    const viewToDelete = board.viewsType?.find(v => v.id === viewIdToDelete || v.viewType === viewIdToDelete);
    
    // Match by id if both exist, otherwise match by type
    const isCurrentView = viewToDelete && currentViewData && (
      (viewToDelete.id && currentViewData.id && viewToDelete.id === currentViewData.id) ||
      (viewToDelete.viewType === currentViewData.type && (
        !viewToDelete.id || !currentViewData.id || viewToDelete.id === currentViewData.id
      ))
    );
    
    if (isCurrentView) {
      const nextView = updated.viewsType[0];
      if (nextView) {
        const nextViewId = nextView.id || nextView.viewType || "list";
        onChangeView(nextViewId);
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        {/* Views Tabs */}
        <div className="flex items-center gap-1">
          <div className="flex gap-2 px-1">
            {tabsToRender.map((tab) => (
              <div key={tab.key} className="relative">
                <button
                  onClick={() => handleViewButtonClick(tab.id)}
                  className={`flex relative items-center gap-1.5 px-3 py-1.5 text-sm transition ${
                    // Find if this tab's view matches the current view by id and type from context
                    (() => {
                      const tabView = boardViewsType.find(v => v.id === tab.id || v.viewType === tab.id);
                      if (!tabView || !currentViewData) return false;
                      // Match by id if both exist and match
                      if (tabView.id && currentViewData.id && tabView.id === currentViewData.id) return true;
                      // Match by type if types match and either no id or ids match
                      if (tabView.viewType === currentViewData.type) {
                        // If both have ids, they must match. If only one has id, match by type
                        if (!tabView.id || !currentViewData.id) return true;
                        // If both have ids but they don't match, don't match
                        if (tabView.id !== currentViewData.id) return false;
                        return true;
                      }
                      return false;
                    })()
                      ? "bg-accent text-accent-foreground rounded-xl"
                      : "text-muted-foreground hover:bg-accent/50 rounded-xl"
                  }`}
                >
                  {tab.icon}
                  {tab.title || tab.label}
                </button>

                {/* View Options Modal - Positioned relative to button */}
                {showViewOptions === tab.id && (
                  <div className="absolute top-full left-0 mt-2 z-100"
                    style={{ zIndex: 1000}}
                  >
                    <ViewOptionsModal
                      isOpen={true}
                      onClose={() => setShowViewOptions(null)}
                      onEditView={() => {
                        setShowViewOptions(null);
                        setShowDropdown(true);
                      }}
                      onDelete={() => {
                        setShowViewOptions(null);
                        setConfirmDeleteView({ id: tab.id, label: tab.label });
                      }}
                      onCopyLink={() => {
                        setShowViewOptions(null);
                      }}
                      onOpenFullPage={() => {
                        setShowViewOptions(null);
                      }}
                      onShowDataSource={() => {
                        setShowViewOptions(null);
                      }}
                      viewName={board.title || "My Board"}
                      viewType={tab.viewType}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={onAddView}
              className="p-1.5 rounded-md hover:bg-accent transition"
              title="Add views"
            >
              <Plus className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Dialog positioned below and centered */}
            {children && (
              <div className="absolute top-full mt-2 z-20">
                {children}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Always show menu items, change color when applied */}
          {currentViewData?.type !== "forms" && (
          <div className="flex items-center gap-1">
            {/* Sort Button */}
            <div className="relative">
              <button
                onClick={handleSort}
                className="p-1 rounded hover:bg-accent text-sm"
                title="Sort cards"
              >
                <ArrowUpDown className={`h-4 w-4 ${hasSorts ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} /> 
              </button>

              {/* Sort Modal */}
              {showSortModal && (
                <div className="absolute top-full right-0 mt-1 z-50">
                  <SortModal
                    board={board}
                    boardProperties={getCurrentDataSourceProperties(board._id) || board.properties}
                    sorts={currentSorts}
                    onClose={() => setShowSortModal(false)}
                    onApply={async (sorts) => {
                      if (!viewTypeId) {
                        toast.error("View type ID not found");
                        return;
                      }
                      try {
                        const res = await updateSorts(viewTypeId, sorts);
                        setBoardSortBy(viewTypeId, sorts);
                        if (res.viewType) {
                          const updatedViewsType = latestBoard.viewsType.map((v) => {
                            const vId = typeof v.id === "string" ? v.id : String(v.id);
                            return vId === viewTypeId ? { ...v, settings: res.viewType?.settings } : v;
                          });
                          updateBoard(board._id, { ...latestBoard, viewsType: updatedViewsType });
                        }
                      } catch (err) {
                        console.error("Failed to update sorts:", err);
                        toast.error("Failed to update sorts");
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Filter Button */}
            <div className="relative">
              <button
                onClick={handleFilter}
                className="p-1 rounded hover:bg-accent text-sm"
                title="Filter cards"
              >
                <ListFilter className={`h-4 w-4 ${hasFilters ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} /> 
              </button>

              {/* Filter Modal */}
              {showFilterModal && (
                <div className="absolute top-full right-0 mt-1 z-50">
                  <FilterPropertiesModal
                    board={board}
                    boardProperties={getCurrentDataSourceProperties(board._id) || board.properties}
                    onClose={() => setShowFilterModal(false)}
                    onApply={(selectedFilters) => {
                      console.log("Applied Filters ----->", selectedFilters);
                      setBoardFilters(board._id, selectedFilters);
                      setShowFilterModal(false);
                    }}
                    filters={filters[board._id] || {}}
                  />
                </div>
              )}
            </div>

            {/* Properties Button */}
            <div className="relative">
              <button
                onClick={handleProperties}
                className="p-1 rounded hover:bg-accent text-sm"
                title="Properties"
              >
                <Eye className={`h-4 w-4 ${hasPropertyVisibility ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} /> 
              </button>

              {/* Properties Modal */}
              {showPropertiesModal && (
                <div className="absolute top-full right-0 mt-1 z-50">
                  <CardPropertiesEditor
                    board={board}
                    boardProperties={getCurrentDataSourceProperties(board._id) || board.properties}
                    onClose={() => setShowPropertiesModal(false)}
                  />
                </div>
              )}
            </div>
          </div>
          )}
          
          {/* Search Button */}
          {currentViewData?.type !== "forms" && (
          <div className="relative flex items-center">
            <button
              onClick={handleSearchToggle}
              className="p-1 rounded hover:bg-accent transition text-muted-foreground"
              title="Search"
            >
              <svg
                aria-hidden="true"
                role="graphics-symbol"
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path d="M7.1 1.975a5.125 5.125 0 1 0 3.155 9.164l3.107 3.107a.625.625 0 1 0 .884-.884l-3.107-3.107A5.125 5.125 0 0 0 7.1 1.975M3.225 7.1a3.875 3.875 0 1 1 7.75 0 3.875 3.875 0 0 1-7.75 0" />
              </svg>
            </button>
            
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                showSearchInput ? "w-36 opacity-100" : "w-0 opacity-0"
              }`}
            >
              <div className="flex items-center">
                <input
                  type="text"
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder="Type to search..."
                  autoFocus={showSearchInput}
                  className="w-full px-2 py-1 text-sm border-none bg-transparent focus:outline-none text-gray-600 dark:text-gray-400 placeholder:text-muted-foreground/70"
                />
                {searchValue && (
                  <button
                    onClick={() => {
                      setSearchValue("");
                      setSearchQuery(board._id, "");
                    }}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-accent/50 transition text-muted-foreground"
                    title="Clear"
                  >
                    <svg
                      aria-hidden="true"
                      role="graphics-symbol"
                      viewBox="0 0 16 16"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M7.993 15.528a7.273 7.273 0 01-2.923-.593A7.633 7.633 0 012.653 13.3a7.797 7.797 0 01-1.633-2.417 7.273 7.273 0 01-.593-2.922c0-1.035.198-2.01.593-2.922A7.758 7.758 0 015.063.99 7.273 7.273 0 017.985.395a7.29 7.29 0 012.93.593 7.733 7.733 0 012.417 1.64 7.647 7.647 0 011.64 2.41c.396.914.594 1.888.594 2.923 0 1.035-.198 2.01-.593 2.922a7.735 7.735 0 01-4.058 4.05 7.272 7.272 0 01-2.922.594zM5.59 11.06c.2 0 .371-.066.513-.198L8 8.951l1.904 1.911a.675.675 0 00.498.198.667.667 0 00.491-.198.67.67 0 00.205-.49.64.64 0 00-.205-.491L8.981 7.969l1.92-1.911a.686.686 0 00.204-.491.646.646 0 00-.205-.484.646.646 0 00-.483-.205.67.67 0 00-.49.205L8 6.995 6.081 5.083a.696.696 0 00-.49-.19.682.682 0 00-.491.198.651.651 0 00-.198.49c0 .181.068.342.205.484l1.912 1.904-1.912 1.92a.646.646 0 00-.205.483c0 .19.066.354.198.49.136.132.3.198.49.198z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
          )}
          
          {isFormsView && (
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={handleFormAutomations}
                className="p-1 rounded hover:bg-accent text-sm"
                title="Automations"
              >
                <Zap className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1 rounded-full hover:bg-accent transition"
            >
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>

            {showDropdown && board && (
              <div className="absolute top-full right-0 mt-2 z-50">
                <BoardSettingsDropdown
                  board={board}
                  boardProperties={getCurrentDataSourceProperties(board._id) || board.properties}
                  onClose={() => setShowDropdown(false)}
                  editor={editorInstance}
                />
              </div>
            )}
          </div>

          {isFormsView && (
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={handlePreviewForm}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-accent"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={handleShareForm}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 px-2 py-1 text-sm font-medium text-primary-foreground"
                >
                  <Share2 className="h-4 w-4" />
                  Share form
                </button>

                {showFormShare && (
                  <div className="absolute top-full right-0 mt-2 z-50">
                    <FormShareModal
                      board={board}
                      viewTypeId={viewTypeId}
                      onClose={() => setShowFormShare(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete View Modal (reusing existing component) */}
      {confirmDeleteView && (
        <DeleteConfirmationModal
          header="Delete View"
          title={confirmDeleteView.label}
          entity="view"
          isOpen={!!confirmDeleteView}
          isDeleting={isDeletingView}
          onCancel={() => setConfirmDeleteView(null)}
          onConfirm={async () => {
            try {
              setIsDeletingView(true);
              await deleteViewType(confirmDeleteView.id);
            } catch (e) {
              console.error("Failed to delete view type", e);
            } finally {
              setConfirmDeleteView(null);
              setIsDeletingView(false);
            }
          }}
        />
      )}

      {showFormPreview && (
        <FormPreviewModal
          board={board}
          onClose={() => setShowFormPreview(false)}
        />
      )}
    </>
  );
}
