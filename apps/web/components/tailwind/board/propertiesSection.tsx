import { useState , useCallback, useEffect, useMemo } from "react"; 
import { debounce } from "lodash";
import { Note, BoardProperties, BoardPropertyOption, BoardProperty, RollupConfig } from "@/types/board";
import { formatFormulaValue } from "@/utils/formatFormulaValue";
import { computeRollupData, normalizeCalculation } from "@/utils/rollupUtils";
import {
  Check,
  Plus, 
  Tag,
  Trash2,
 } from "lucide-react";
import { toast } from "sonner";
import { AddPropertyDialog } from "./addPropertyDialog";
import { PROPERTY_TYPES } from "./addPropertyDialog";
import { Members } from "@/types/workspace";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { useNoteContext } from "@/contexts/NoteContext";
import DeleteConfirmationModal from "../ui/deleteConfirmationModal";
import { CheckboxPropertyInput } from "./properties/inputs/checkboxPropertyInput";
import { DatePropertyInput } from "./properties/inputs/datePropertyInput";
import { DefaultPropertyInput } from "./properties/inputs/defaultPropertyInput";
import { NumberPropertyInput } from "./properties/inputs/numberPropertyInput";
import { TextPropertyInput } from "./properties/inputs/textPropertyInput";
import { StatusPropertyInput } from "./properties/inputs/statusPropertyInput";
import { PersonPropertyInput } from "./properties/inputs/personPropertyInput";
import { PriorityPropertyInput } from "./properties/inputs/priorityPropertyInput";
import { RelationPropertyInput } from "./properties/inputs/relationPropertyInput";
import { RollupPropertyInput } from "./properties/inputs/rollupPropertyInput";
import { RelationViewSelector } from "./properties/inputs/relationViewSelector";
import { PropertyOptionsModal } from "../ui/modals/propertyOptionModal";
import { SelectPropertyInput } from "./properties/inputs/selectPropertyInput";
import { MultiSelectPropertyInput } from "./properties/inputs/multiSelectPropertyInput";
import { EditPropertyModal } from "../ui/modals/editBoardPropertyModel";
import { RelationConfigModal } from "@/components/tailwind/ui/modals/relationConfigModal";
import { useBoard } from "@/contexts/boardContext";
import { getWithAuth } from "@/lib/api-helpers";
import { GitHubPrPropertyInput } from "./properties/inputs/githubPrPropertyInput";
import { FilePropertyInput } from "./properties/inputs/filePropertyInput";

interface PropertiesSectionProps {
  boardId: string;
  note: Note;
  boardProperties: BoardProperties; 
  onUpdateProperty: (key: string, value: any) => void;
  onAddProperty: (type: string, options?: any, linkedDatabaseId?: string, relationConfig?: { relationLimit?: "single" | "multiple"; twoWayRelation?: boolean }, customName?: string) => Promise<{ id: string; name: string } | null>; 
  onRenameProperty: (key: string, newName: string, newOption?: BoardPropertyOption[], relationConfig?: { relationLimit?: "single" | "multiple"; twoWayRelation?: boolean; linkedDatabaseId?: string }, rollupConfig?: RollupConfig) => Promise<void>;
  onDeleteProperty: (key: string) => Promise<void>;
}


export function PropertiesSection({
  boardId,
  note,
  boardProperties,
  onUpdateProperty,
  onAddProperty,
  onRenameProperty,
  onDeleteProperty
}: PropertiesSectionProps) {

  const { workspaceMembers } = useWorkspaceContext();
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [localValues, setLocalValues] = useState<Record<string, any>>(
    note.databaseProperties ?? {}
  );
  const [editingPropertyKey, setEditingPropertyKey] = useState<string | null>(null);
  const [localPropertyNames, setLocalPropertyNames] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(boardProperties).map(([key, prop]) => [key, prop.name]))
  );
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [editingOptionsKey, setEditingOptionsKey] = useState<string | null>(null);

  const { sharedWith ,iscurrentNotPublic} = useNoteContext();
  const [editPropertyModalOpen, setEditPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  
  const { propertyOrder, setPropertyOrder, boards, getNotesByDataSourceId, getDataSource, setDataSource } = useBoard();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [rollupDataSourceLoading, setRollupDataSourceLoading] = useState<Record<string, boolean>>({});


  let mentionMembers: Members[] = [];
  
  if (!iscurrentNotPublic) {
      mentionMembers = sharedWith.map((u, index) => {
          const matchedMember = workspaceMembers.find(
              (wm) => wm.userEmail === u.email
          );
      
          return {
              userId: matchedMember ? matchedMember.userId : `shared-${index}`,
              userEmail: u.email,
              role: u.access,
              joinedAt: matchedMember ? matchedMember.joinedAt : "",
          userName: matchedMember ? matchedMember.userName : u.email, // fallback to email if no match
          };
      });
  } else {
      mentionMembers = workspaceMembers;
  }
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
  const [showRelationViewSelector, setShowRelationViewSelector] = useState(false);
  const [newRelationPropertyId, setNewRelationPropertyId] = useState<string | null>(null);
  const [relationViews, setRelationViews] = useState<any[]>([]);
  const [loadingRelationViews, setLoadingRelationViews] = useState(false);
  const [relationSelectTargetId, setRelationSelectTargetId] = useState<string | null>(null);
  const [relationSelectedView, setRelationSelectedView] = useState<{ id: string; title: string } | null>(null);
  const [showRelationConfigModal, setShowRelationConfigModal] = useState(false);
  const [pendingRelationData, setPendingRelationData] = useState<{
    viewId: string;
    viewTitle: string;
    databaseSourceId: string;
  } | null>(null);
  const { currentWorkspace } = useWorkspaceContext();


  useEffect(() => {
    // Reset localValues whenever the note changes
    setLocalValues({ ...note.databaseProperties });    
    console.log("Local Values ------>", localValues)
  }, [note]);

  useEffect(() => {
    setLocalPropertyNames(
      Object.fromEntries(Object.entries(boardProperties).map(([key, prop]) => [key, prop.name]))
    );
  }, [boardProperties]);


  // Debounced API updater
  const debouncedUpdate = useCallback(
    debounce((key: string, value: any) => {
      onUpdateProperty(key, value);
    }, 600), // wait 600ms after user stops typing
    [onUpdateProperty]
  );

  useEffect(() => {
    return () => debouncedUpdate.cancel();
  }, [debouncedUpdate]);
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";

    // Prevent dragging the full element snapshot
    const img = new Image();
    img.src =
      "data:image/svg+xml;base64," +
      btoa(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>`
      );
    e.dataTransfer.setDragImage(img, 0, 0);
  };
  
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
  
  // Ensure we always have a full list to reorder
  const currentOrder = propertyOrder[boardId] && propertyOrder[boardId].length > 0
    ? [...propertyOrder[boardId]]
    : Object.keys(boardProperties);

  const [movedItem] = currentOrder.splice(draggedIndex, 1);

  if (movedItem) currentOrder.splice(dropIndex, 0, movedItem);

  setDraggedIndex(null);

  // Persist updated order in context
  setPropertyOrder(boardId, currentOrder);

  };
  

  const handleLocalChange = (key: string, val: any, immediate: boolean=false) => {

    console.log("Key ---->", key, val)
    setLocalValues((prev) => ({ ...prev, [key]: val }));
    if (immediate) {
      // for checkbox, status, date → fire immediately
      onUpdateProperty(key, val);
    } else {
      // for text/number → debounce
      debouncedUpdate(key, val);
    }
  };

  const rollupRelationOptions = useMemo(
    () =>
      Object.entries(boardProperties)
        .filter(([, prop]) => prop.type === "relation")
        .map(([id, prop]) => ({
          id,
          name: prop.name || "Relation",
          linkedDatabaseId: prop.linkedDatabaseId
            ? String(prop.linkedDatabaseId)
            : undefined,
        })),
    [boardProperties],
  );

  const ensureRollupDataSource = useCallback(
    async (rawDataSourceId?: string) => {
      if (!rawDataSourceId) return;
      const dataSourceId = String(rawDataSourceId);
      if (getDataSource(dataSourceId)) return;
      if (rollupDataSourceLoading[dataSourceId]) return;

      setRollupDataSourceLoading((prev) => ({ ...prev, [dataSourceId]: true }));
      try {
        const response: any = await getWithAuth(`/api/database/getdataSource/${dataSourceId}`);
        if (response?.success && response.collection?.dataSource) {
          const ds = response.collection.dataSource;
          const normalizedId =
            typeof ds._id === "string" ? ds._id : ds._id?.toString?.() || dataSourceId;
          setDataSource(normalizedId, ds);
        }
      } catch (err) {
        console.error("Failed to load linked database", err);
      } finally {
        setRollupDataSourceLoading((prev) => {
          const next = { ...prev };
          delete next[dataSourceId];
          return next;
        });
      }
    },
    [getDataSource, rollupDataSourceLoading, setDataSource],
  );

  const handleRollupConfigUpdate = useCallback(
    async (
      rollupId: string,
      updates: {
        relationId?: string;
        linkedDatabaseId?: string;
        targetPropertyId?: string;
        calculation?: RollupConfig["calculation"];
        selectedOptions?: string[];
      },
    ) => {
      const property = boardProperties[rollupId];
      if (!property || property.type !== "rollup") return;

      const currentConfig = property.rollup || {};
      let nextConfig: RollupConfig = { ...currentConfig };

      // Handle relation change
      if (updates.relationId !== undefined) {
        const relationOption = rollupRelationOptions.find((option) => option.id === updates.relationId);
        const relationDataSourceId = updates.linkedDatabaseId || relationOption?.linkedDatabaseId;

        if (!relationDataSourceId) {
          toast.error("Selected relation is missing linked database");
          return;
        }

        nextConfig = {
          relationPropertyId: updates.relationId,
          relationDataSourceId: String(relationDataSourceId),
          targetPropertyId: undefined, // Reset when relation changes
          calculation: currentConfig.calculation || { category: "original", value: "original" },
          selectedOptions: undefined, // Reset when relation changes
        };

        void ensureRollupDataSource(relationDataSourceId);
      }

      // Handle property change
      if (updates.targetPropertyId !== undefined) {
        if (!nextConfig.relationPropertyId || !nextConfig.relationDataSourceId) {
          toast.error("Select a relation first");
          return;
        }
        nextConfig.targetPropertyId = updates.targetPropertyId;
        // Reset selectedOptions when property changes
        nextConfig.selectedOptions = undefined;
      }

      // Handle calculation change
      if (updates.calculation !== undefined) {
        if (!nextConfig.relationPropertyId) {
          toast.error("Configure relation first");
          return;
        }
        nextConfig.calculation = updates.calculation;
        // Clear selectedOptions when switching to non-per-group calculation
        const normalizedCalc = normalizeCalculation(updates.calculation);
        const isPerGroup = (normalizedCalc.category === "count" || normalizedCalc.category === "percent") && normalizedCalc.value === "per_group";
        if (!isPerGroup) {
          nextConfig.selectedOptions = undefined;
        }
      }

      // Handle selectedOptions change
      if (updates.selectedOptions !== undefined) {
        nextConfig.selectedOptions = updates.selectedOptions;
      }

      await onRenameProperty(rollupId, localPropertyNames[rollupId] ?? property.name, undefined, undefined, nextConfig);
    },
    [boardProperties, localPropertyNames, onRenameProperty, rollupRelationOptions, ensureRollupDataSource],
  );

  return (
    <div className="w-full max-w-full bg-[#f8f8f7] dark:bg-[#202020]">
      <div role="table" aria-label="Page properties" className="w-full bg-[#f8f8f7] dark:bg-[#202020]">
        {((propertyOrder[boardId] && propertyOrder[boardId].length > 0)
            ? propertyOrder[boardId]
            : Object.keys(boardProperties)
          ).map((key, index) => {
           const property = boardProperties[key];
           if (!property) return null;         
          const value = note.databaseProperties?.[key] ?? "";
          const Icon = PROPERTY_TYPES.find((prop) => prop.type === property.type)?.icon || Tag
          console.log("Prroperties ------>", property)         
          const renderInput = () => {
            switch (property.type) {
              case "text":
                return (
                  <TextPropertyInput
                    value={localValues[key] ?? ""}
                    onChange={(val, immediate) => handleLocalChange(key, val, immediate)}
                    property={property}
                  />
                );
        
              case "number":
                return (
                    <NumberPropertyInput 
                      value={localValues[key] ?? ""}
                      onChange={(val) => handleLocalChange(key, val, false)}
                      property={property}
                    />
                );
        
              case "checkbox":
                return (
                  <CheckboxPropertyInput
                    value={localValues[key] ?? false} 
                    onChange={(val, immediate) => handleLocalChange(key, val, immediate)}
                    property={property}
                  />
                );
        
              case "status":
                return (
                  <StatusPropertyInput 
                    value={localValues[key] ?? ""}
                    propertyId={key}
                    onChange={(val) => handleLocalChange(key, val, true)}
                    property={property}
                    onEditOptions={() => { setEditingOptionsKey(key); setOptionsModalOpen(true); }}
                  />
                );
  
              case "person":
                return (
                  <PersonPropertyInput 
                    value={localValues[key] ?? []}
                    onChange={(selected) => handleLocalChange(key, selected, true)}
                    availableMembers={mentionMembers}
                  />
                );

              case "relation":
                return (
                  <RelationPropertyInput
                    value={localValues[key] ?? []}
                    onChange={(selected) => handleLocalChange(key, selected, true)}
                    property={property}
                  />
                );
              case "rollup": {
                const rollupConfig = property.rollup;
                const relationDataSourceId = rollupConfig?.relationDataSourceId
                  ? String(rollupConfig.relationDataSourceId)
                  : undefined;
                
                // Load data source if needed
                if (relationDataSourceId && !getDataSource(relationDataSourceId)) {
                  void ensureRollupDataSource(relationDataSourceId);
                }
                
                const targetDataSource = relationDataSourceId
                  ? getDataSource(relationDataSourceId)
                  : undefined;
                const targetProperties = targetDataSource?.properties;
                const rollupResult = computeRollupData(
                  note,
                  property,
                  boardProperties,
                  getNotesByDataSourceId,
                  getDataSource,
                );

                return (
                  <RollupPropertyInput
                    relationOptions={rollupRelationOptions}
                    selectedRelationId={rollupConfig?.relationPropertyId}
                    targetProperties={targetProperties}
                    selectedPropertyId={rollupConfig?.targetPropertyId}
                    calculation={rollupConfig?.calculation || { category: "original", value: "original" }}
                    selectedOptions={rollupConfig?.selectedOptions || []}
                    loadingProperties={
                      relationDataSourceId ? !!rollupDataSourceLoading[relationDataSourceId] : false
                    }
                    disabled={rollupRelationOptions.length === 0}
                    rollupResult={rollupResult}
                    onChange={(updates) => handleRollupConfigUpdate(key, updates)}
                  />
                );
              }
        
              case "date":
                return (
                  <DatePropertyInput 
                    value={localValues[key] ?? ""}
                    onChange={(val, immediate) => handleLocalChange(key, val, immediate)}
                    property={property}
                  />
                );

              case "priority":
                return(
                  <PriorityPropertyInput 
                    value={localValues[key]}
                    options={property.options}
                    propertyId={key}
                    onChange={(val) => handleLocalChange(key, val, true)}
                    onEditOptions={() => { setEditingOptionsKey(key); setOptionsModalOpen(true); }}
                  />
                )

              case "select":
                return(
                  <SelectPropertyInput
                      value={localValues[key]}
                      options={property.options ?? []}
                      onChange={(val) => handleLocalChange(key, val, true)}
                      onEditOptions={() => { setEditingOptionsKey(key); setOptionsModalOpen(true) }}
                  />
                );
                
              case "multi_select":
                return (
                  <MultiSelectPropertyInput
                    value={localValues[key] ?? []}
                    options={property.options ?? []}
                    onChange={(val) => handleLocalChange(key, val, true)}
                    onEditOptions={() => { setEditingOptionsKey(key); setOptionsModalOpen(true) }}
                  />
                );

              case "github_pr":
                return (
                  <GitHubPrPropertyInput
                    value={localValues[key]}
                    onChange={(val, immediate) => handleLocalChange(key, val, immediate ?? true)}
                    property={property}
                  />
                );

              case "file":
                return (
                  <FilePropertyInput
                    value={localValues[key]}
                    onChange={(val) => handleLocalChange(key, val, true)}
                  />
                );

              case "formula": {
                const errorMessage = note.formulaErrors?.[key];
                const formattedValue = formatFormulaValue(localValues[key], property.formulaReturnType);
                return (
                  <div className="flex flex-col text-sm">
                    <span className={`font-medium ${errorMessage ? "text-red-500" : "text-gray-900 dark:text-gray-100"}`}>
                      {formattedValue}
                    </span>
                    {errorMessage && (
                      <span className="text-xs text-red-500 mt-1">{errorMessage}</span>
                    )}
                  </div>
                );
              }

                      
              default:
                return (
                  <DefaultPropertyInput 
                    value={localValues[key]}
                    onChange={(val) => handleLocalChange(key, val, false)}
                    property={property}
                  />
                );
            }
          };
        
          return (
            <div key={key} 
              role="row" 
              className={`${dragOverIndex === index ? 'bg-gray-200 dark:bg-gray-700' : ''} flex mx-3 relative gap-4 mb-1.5`}           
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => handleDrop(e, index)}
              // style={{
              //   transform: draggedIndex === index ? 'scale(1.03)' : 'translateY(0)',
              //   zIndex: draggedIndex === index ? 50 : 0,
              //   boxShadow: draggedIndex === index ? '0 4px 8px rgba(0,0,0,0.15)' : 'none',
              //   transition: 'all 0.2s ease',
              // }}
            >
              {/* Property Name Column */}
              <div className="relative">
                <div 
                  className="flex items-center w-40 max-w-40 min-w-0 px-3 py-2 bg-[#f8f8f7] dark:bg-[#202020] group hover:bg-gray-200 dark:hover:bg-[#2c2c2c] rounded-sm cursor-pointer"
                  onClick={()=>{
                    setEditingProperty(key);
                    setEditPropertyModalOpen(true);
                  }}>
                  <div className="flex items-center text-gray-600 dark:text-gray-400 min-w-0"> 
                    <div className="mr-2 text-gray-500 flex-shrink-0">
                      <Icon size={16} className="transform scale-110" />
                    </div>
                    
                    {editingPropertyKey === key ? (
                      <input
                        type="text"
                        value={localPropertyNames[key]}
                        autoFocus
                        onChange={(e) =>
                          setLocalPropertyNames((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        onBlur={() => {
                          setEditingPropertyKey(null);
                          onRenameProperty(key, localPropertyNames[key] ?? ""); // send rename to parent / backend
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingPropertyKey(null);
                            onRenameProperty(key, localPropertyNames[key] ?? "");
                          } else if (e.key === "Escape") {
                            setEditingPropertyKey(null);
                          }
                        }}
                        className="text-sm font-medium w-full bg-gray-100 dark:bg-gray-800 p-1 rounded outline-none"
                      />
                    ) : (
                      <span
                        className="text-sm font-medium truncate cursor-pointer"
                        onDoubleClick={() => setEditingPropertyKey(key)}
                      >
                        {(localPropertyNames[key] || '').charAt(0).toUpperCase() + (localPropertyNames[key] || '').slice(1)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Edit Property Modal */}
                {editPropertyModalOpen && editingProperty === key && (
                  <EditPropertyModal
                    isOpen={editPropertyModalOpen && editingProperty === key}
                    onClose={() => setEditPropertyModalOpen(false)}
                    onRename={() => {
                      setEditingPropertyKey(key);
                      setEditPropertyModalOpen(false);
                    }}
                    onDelete={() => {
                      setDeleteConfirmKey(key);
                      setEditPropertyModalOpen(false);
                    }}
                    propertyType={property.type}
                    board={boards.find(b => b._id === boardId)!}
                    propertyId={key}
                    property={property}
                  />
                )}
              </div>
              
              {/* Property Value Column */}
              <div className=" flex items-center relative">
                {renderInput()}
                
                {/* Property Options Modal - positioned absolute to this property row */}
                {optionsModalOpen && editingOptionsKey && boardProperties[key] && editingOptionsKey === key && (
                  <PropertyOptionsModal
                    isOpen={optionsModalOpen && editingOptionsKey === key}
                    options={boardProperties[key].options || []}
                    onClose={() => {
                      setOptionsModalOpen(false);
                      setEditingOptionsKey(null);
                    }}
                    onSave={(newOptions) => {
                      console.log("New Options --->", newOptions);
                      const property = boardProperties[key];
                      if (!property) return;
                      setOptionsModalOpen(false);
                      setEditingOptionsKey(null);
                      // Call API to persist - this will update the data source in context
                      onRenameProperty(key, property.name, newOptions);
                    }}
                    property={boardProperties[key]}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

        {/* Add Property Option */}
        <div className="relative">
          <button
            onClick={() => {
              setShowDialog(true);
              // onAddProperty?.()
            }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-3 rounded-md hover:bg-gray-50 dark:hover:bg-[#2c2c2c] w-full pl-5 bg-[#f8f8f7] dark:bg-[#202020]"
          >
            <Plus size={16} />
            <span>Add property</span>
          </button>
    
          <div className="absolute ml-5 border border-gray-200 rounded-md shadow-xl dark:border-[#3c3c3c]">
          {showDialog && (
            <AddPropertyDialog
              onSelect={async (type: string, options?: any) => {
                if (type === "relation" && options?.showViewSelector) {
                  // Don't create property yet - fetch views first, then show selector
                  setShowDialog(false);
                  setLoadingRelationViews(true);
                  setShowRelationViewSelector(true);
                  
                  try {
                    // Call get all views API immediately
                    // Use workspaceId if available, otherwise pass "all" as the route parameter
                    const workspaceId = currentWorkspace?._id;
                    const routeId = (workspaceId && workspaceId.trim() !== "") 
                      ? workspaceId 
                      : "all";
                    
                    // Build URL - no need to encode "all" but encode workspaceId if it exists
                    const url = routeId === "all" 
                      ? `/api/database/createProperty/relation/allViews/all`
                      : `/api/database/createProperty/relation/allViews/${encodeURIComponent(routeId)}`;
                    
                    const response: any = await getWithAuth(url);
                    
                    if (response && !response.isError && response.success && Array.isArray(response.views)) {
                      // Filter out current view if needed
                      let filteredViews = response.views;
                      if (boardId) {
                        filteredViews = response.views.filter((view: any) => 
                          String(view._id) !== String(boardId) && String(view.id) !== String(boardId)
                        );
                      }
                      setRelationViews(filteredViews);
                    } else if (response && response.isError) {
                      toast.error(response.message || "Failed to fetch views");
                    }
                  } catch (err) {
                    toast.error("Failed to fetch views");
                  } finally {
                    setLoadingRelationViews(false);
                  }
                  
                  return null;
                }
                const result = await onAddProperty(type, options);
                return result;
              }}
              onClose={() => setShowDialog(false)}
            />
          )}
          </div>

          {/* Relation View Selector */}
          {showRelationViewSelector && (
            <>
              {/* Backdrop overlay */}
              <div 
                className="fixed inset-0 bg-transparent z-[190]"
                onClick={() => {
                  setShowRelationViewSelector(false);
                  setRelationViews([]);
                  setRelationSelectTargetId(null);
                }}
              />
              {/* Dialog positioned same as AddPropertyDialog */}
              <div className="absolute ml-5 border border-gray-200 rounded-md shadow-xl dark:border-[#3c3c3c] z-[200]">
                <RelationViewSelector
                key={`relation-selector-${showRelationViewSelector}`}
                isOpen={true}
                loading={loadingRelationViews}
                views={relationViews}
                onClose={() => {
                  setShowRelationViewSelector(false);
                  setRelationViews([]);
                  setRelationSelectTargetId(null);
                }}
                onSelectView={async (viewId, viewTitle) => {
                  try {
                    // Find the selected view to get its databaseSourceId
                    const selectedView = relationViews.find((v: any) => 
                      String(v._id) === String(viewId) || String(v.id) === String(viewId)
                    );
                    
                    // Extract databaseSourceId from the view's viewsType array
                    let databaseSourceId: string | null = null;
                    if (selectedView?.viewsType && Array.isArray(selectedView.viewsType) && selectedView.viewsType.length > 0) {
                      // Get databaseSourceId from the first view type (all should have same source)
                      const firstViewType = selectedView.viewsType[0];
                      databaseSourceId = firstViewType?.databaseSourceId 
                        ? (typeof firstViewType.databaseSourceId === "string" 
                            ? firstViewType.databaseSourceId 
                            : String(firstViewType.databaseSourceId))
                        : null;
                    }
                    
                    if (!databaseSourceId) {
                      toast.error("Could not find database source for selected view");
                      return;
                    }
                    
                    // Store the pending relation data and show config modal
                    setPendingRelationData({
                      viewId,
                      viewTitle,
                      databaseSourceId,
                    });
                    setShowRelationViewSelector(false);
                    setShowRelationConfigModal(true);
                  } catch (err) {
                    toast.error("Failed to load notes for selected view");
                  } finally {
                    setRelationViews([]);
                  }
                }}
              />
              </div>
            </>
          )}

          {/* Relation Configuration Modal */}
          {showRelationConfigModal && pendingRelationData && (
            <>
              <div 
                className="fixed inset-0 bg-transparent z-[190]"
                onClick={() => {
                  setShowRelationConfigModal(false);
                  setPendingRelationData(null);
                }}
              />
              <div className="absolute ml-5 border border-gray-200 rounded-md shadow-xl dark:border-[#3c3c3c] z-[200]">
                <RelationConfigModal
                  isOpen={showRelationConfigModal}
                  selectedViewTitle={pendingRelationData.viewTitle}
                  onClose={() => {
                    setShowRelationConfigModal(false);
                    setPendingRelationData(null);
                  }}
                  onConfirm={async (config) => {
                    try {
                      const { viewId, viewTitle, databaseSourceId } = pendingRelationData;
                      
                      // Ensure the selected view is saved in the property option first
                      if (relationSelectTargetId) {
                        await onRenameProperty(relationSelectTargetId, config.propertyName, [{ id: viewId, name: viewTitle }], {
                          relationLimit: config.relationLimit,
                          twoWayRelation: config.twoWayRelation,
                          linkedDatabaseId: databaseSourceId,
                        });
                      } else {
                        // Pass both viewId (for options) and databaseSourceId (for linkedDatabaseId)
                        const created = await onAddProperty(
                          "relation",
                          [{ id: viewId, name: viewTitle }],
                          databaseSourceId,
                          {
                            relationLimit: config.relationLimit,
                            twoWayRelation: config.twoWayRelation,
                          },
                          config.propertyName
                        );
                        if (created?.id) {
                          setNewRelationPropertyId(created.id);
                        }
                      }

                      // Now fetch notes using the relatedViewId stored in the option
                      setRelationSelectedView({ id: viewId, title: viewTitle });
                      
                      setShowRelationConfigModal(false);
                      setPendingRelationData(null);
                    } catch (err) {
                      toast.error("Failed to create relation property");
                      console.error(err);
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>

        <DeleteConfirmationModal
          isOpen={!!deleteConfirmKey}
          header="Delete Property"
          message={deleteConfirmKey 
            ? `Are you sure you want to delete ${localPropertyNames[deleteConfirmKey]?.toLocaleUpperCase() ?? 'this property'} from the board?`
            : "Are you sure you want to delete this property from the board?"}
          onCancel={() => setDeleteConfirmKey(null)}
          onConfirm={async () => {
            if (deleteConfirmKey) {
              console.log("Delete Confimation Key --->", deleteConfirmKey);
              await onDeleteProperty(deleteConfirmKey);
              setDeleteConfirmKey(null);
            }
          }}
        />

      </div>
    );
}
