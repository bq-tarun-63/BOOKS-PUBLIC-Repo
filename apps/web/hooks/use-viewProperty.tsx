"use client";

import { deleteWithAuth, postWithAuth, getWithAuth } from "@/lib/api-helpers";
import { BoardPropertyOption, DeletePropertyResponse, Note, RollupConfig, ViewCollection } from "@/types/board";
import { toast } from "sonner";
import { useBoard } from "@/contexts/boardContext";
import { useNotifications } from "@/hooks/use-notifications";
import { Members } from "@/types/workspace";
import { useWorkspaceContext } from "@/contexts/workspaceContext";
import { updatePropertyVisibility } from "@/services-frontend/boardServices/databaseSettingsService";
export const useDatabaseProperties = (
  board: ViewCollection,
  note: Note,
  onUpdate: (updatedNote: Note) => void,
) => {
    const { updateNote, updateAllNotes, updateBoard, getCurrentDataSource, setDataSource, updateDataSource, currentView, dataSources, boards: contextBoards, setPropertyVisibility, getPropertyVisibility } = useBoard();
    
    // Helper to get current dataSourceId from current view ID (not type)
    // IMPORTANT: Always match by view ID first, only use type as fallback
    const getCurrentDataSourceId = (): string | null => {
      const currentViewData = currentView[board._id];
      const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
      
      let view;
      if (currentViewData?.id) {
        // Prioritize ID match - if currentViewData.id exists, ONLY match by ID
        view = latestBoard.viewsType?.find((vt) => vt.id === currentViewData.id);
      } else if (currentViewData?.type) {
        // Only fallback to type if no ID is available
        view = latestBoard.viewsType?.find((vt) => vt.viewType === currentViewData.type);
      }
      
      const dsId = view?.databaseSourceId;
      return dsId ? (typeof dsId === "string" ? dsId : String(dsId)) : null;
    };
    const { notifyNoteAssigned } = useNotifications();
    const { currentWorkspace } = useWorkspaceContext();
    const handleAddProperty = async (
        type: string, 
        options?: any, 
        linkedDatabaseId?: string,
        relationConfig?: { relationLimit?: "single" | "multiple"; twoWayRelation?: boolean },
        customName?: string,
        rollupConfig?: RollupConfig
    ): Promise<{ id: string; name: string } | null> => {
        try {
            console.log("called the api ", type, board._id, note._id);
            
            // Get dataSourceId from current view ID (not type)
            const dataSourceId = getCurrentDataSourceId();
            if (!dataSourceId) {
                toast.error("Data source not found for current view!");
                return null;
            }
            
            // Get current data source to compare keys before adding
            const currentDataSource = getCurrentDataSource(board._id);
            const prevKeys = Object.keys(currentDataSource?.properties || board.properties || {});
            
            // Build request payload
            const payload: any = {
                dataSourceId: dataSourceId,
                viewId: board._id, // Optional for audit
                noteId: note._id,
                name: customName || type, // Use custom name if provided, otherwise use type
                type,
                options: options || [],
            };
            
            // For relation properties, add linkedDatabaseId and relation config
            if (type === "relation") {
                if (linkedDatabaseId) {
                    payload.linkedDatabaseId = linkedDatabaseId;
                }
                if (relationConfig?.relationLimit) {
                    payload.relationLimit = relationConfig.relationLimit;
                }
                if (relationConfig?.twoWayRelation !== undefined) {
                    payload.twoWayRelation = relationConfig.twoWayRelation;
                }
            }
            if (type === "rollup" && rollupConfig) {
                payload.rollup = {
                    relationPropertyId: rollupConfig.relationPropertyId,
                    relationDataSourceId: rollupConfig.relationDataSourceId,
                    targetPropertyId: rollupConfig.targetPropertyId,
                    calculation: rollupConfig.calculation ?? { category: "original", value: "original" },
                };
            }
            
            const res = await postWithAuth(`/api/database/createProperty`, payload);

            if (!res.success) {
                toast.error("Failed to add property!");
                return null;
            }

            console.log("New Property Response:", res);

            // Update data source in context from API response
            if (res.dataSource) {
                const ds = res.dataSource;
                const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : dataSourceId;
                setDataSource(dsId, ds as any);
            }

            // Update reverse datasource if two-way relation was created
            if (res.reverseDataSource && res.reverseProperty) {
                const reverseDs = res.reverseDataSource;
                const reverseDsId = reverseDs._id ? (typeof reverseDs._id === "string" ? reverseDs._id : reverseDs._id.toString()) : null;
                if (reverseDsId) {
                    // Update reverse datasource in context
                    setDataSource(reverseDsId, reverseDs as any);
                    
                    // Fetch full reverse datasource to ensure consistency (similar to main datasource)
                    try {
                        const reverseDsRes = await getWithAuth(`/api/database/getdataSource/${reverseDsId}`) as { success?: boolean; collection?: { dataSource?: any } };
                        if (reverseDsRes?.success && reverseDsRes.collection?.dataSource) {
                            const fullReverseDs = reverseDsRes.collection.dataSource;
                            const normalizedReverseId = typeof fullReverseDs._id === "string" ? fullReverseDs._id : fullReverseDs._id?.toString?.() || reverseDsId;
                            setDataSource(normalizedReverseId, fullReverseDs);
                        }
                    } catch (err) {
                        console.error("Failed to fetch updated reverse data source:", err);
                        // Continue even if fetch fails - we already have the datasource from the response
                    }
                }
            }
            
            // Get updated data source for syncing notes
            let updatedDataSource = res.dataSource || currentDataSource;
            if (updatedDataSource) {
                try {
                    // Use dataSourceId instead of view.databaseSourceId
                    const dsRes = await getWithAuth(`/api/database/getdataSource/${dataSourceId}`) as { success?: boolean; collection?: { dataSource?: any } };
                    if (dsRes?.success && dsRes.collection?.dataSource) {
                        const ds = dsRes.collection.dataSource;
                        const normalizedId = typeof ds._id === "string" ? ds._id : ds._id?.toString?.() || dataSourceId;
                        setDataSource(normalizedId, ds);
                        updatedDataSource = ds;
                        // Also update note locally to include any newly added properties
                        const dsProps = ds?.properties || {};
                        const nextDbProps = { ...(note.databaseProperties || {}) } as Record<string, any>;
                        // Add missing keys with empty value
                        Object.keys(dsProps).forEach((propId) => {
                          if (!(propId in nextDbProps)) nextDbProps[propId] = "";
                        });
                        // Remove keys no longer in datasource
                        Object.keys(nextDbProps).forEach((propId) => {
                          if (!(propId in dsProps)) delete nextDbProps[propId];
                        });
                        const syncedNote: Note = { ...note, databaseProperties: nextDbProps };
                        onUpdate(syncedNote);
                        // Reuse existing dataSourceId from above
                        if (dataSourceId) {
                          updateNote(dataSourceId, note._id, syncedNote);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch updated data source:", err);
                }
            }

            // Update note's database properties
            const resKeys = Object.keys(updatedDataSource?.properties || {});
            const newlyAddedKeys = resKeys.filter((k) => !prevKeys.includes(k));
            const addedEntries = Object.fromEntries(
                newlyAddedKeys.map((key) => [key, note.databaseProperties?.[key] ?? ""]) 
            );
            const updatedNote: Note = {
                ...note,
                databaseProperties: {
                    ...note.databaseProperties,
                    ...addedEntries,
                },
            };

            console.log("Updated Note ---->", updatedNote);
            onUpdate(updatedNote);
            // Reuse existing dataSourceId from above
            if (dataSourceId) {
              updateNote(dataSourceId, note._id, updatedNote);
            }
            
            // Find the newly added property ID
            const createdId = newlyAddedKeys[0] || res.property?.id || res.property?.name;
            
            // Add the new property to property visibility for the current view
            if (createdId) {
              const getCurrentViewTypeId = (): string | null => {
                const currentViewData = currentView[board._id];
                const latestBoard = contextBoards.find((b) => b._id === board._id) || board;
                if (!latestBoard || !currentViewData) return null;
                
                let viewObj;
                if (currentViewData.id) {
                  const currentViewId = typeof currentViewData.id === "string" ? currentViewData.id : String(currentViewData.id);
                  viewObj = latestBoard.viewsType?.find((vt) => {
                    const viewId = typeof vt.id === "string" ? vt.id : String(vt.id);
                    return viewId === currentViewId;
                  });
                } else if (currentViewData.type) {
                  viewObj = latestBoard.viewsType?.find((vt) => vt.viewType === currentViewData.type);
                }
                
                return viewObj?.id ? (typeof viewObj.id === "string" ? viewObj.id : String(viewObj.id)) : null;
              };
              
              const viewTypeId = getCurrentViewTypeId();
              if (viewTypeId) {
                const currentVisibility = getPropertyVisibility(board._id) || [];
                // Only add if not already in visibility list
                if (!currentVisibility.includes(createdId)) {
                  const newVisibility = [...currentVisibility, createdId];
                  setPropertyVisibility(viewTypeId, newVisibility);
                  
                  // Update on backend
                  try {
                    await updatePropertyVisibility(viewTypeId, newVisibility);
                  } catch (err) {
                    console.error("Failed to update property visibility:", err);
                    // Rollback on error
                    setPropertyVisibility(viewTypeId, currentVisibility);
                  }
                }
              }
            }
            
            toast.success(`Property "${res.property.name}" added successfully!`);
            return createdId ? { id: createdId, name: res.property.name } : null;
        } catch (err) {
            console.error("Error adding property:", err);
            toast.error("Error adding property!");
            return null;
        } 
    };

    const handleUpdateProperty = async (key: string, value: any) => {
        // Get dataSourceId from current view ID (not type)
        const dataSourceId = getCurrentDataSourceId();
        if (!dataSourceId) {
            toast.error("Data source not found for current view!");
            return;
        }
        
        // Optimistic update - update both local state and context immediately
        const updatedProps = { ...note.databaseProperties, [key]: value };
        const optimisticNote = { ...note, databaseProperties: updatedProps };
        onUpdate(optimisticNote);
        // Update context immediately so changes are reflected across all views
        updateNote(dataSourceId, note._id, optimisticNote);
        
        try {
            console.log("Updating property value:", { key, value, dataSourceId, noteId: note._id });
            const res = await postWithAuth(`/api/database/updatePropertyValue`, {
                dataSourceId: dataSourceId,
                viewId: board._id, // Optional for audit
                pageId: note._id,
                propertyId: key,
                value,
                workspaceName: currentWorkspace?.name || "",
            });

            // Get property type from current data source
            const currentDataSource = getCurrentDataSource(board._id);
            const propertyType = currentDataSource?.properties?.[key]?.type || board?.properties?.[key]?.type || "";
            
            if(propertyType === "person"){
                console.log("propertyType is person", propertyType);
                const assignedUsers = value;
                const assignedUsersEmail = assignedUsers.map((user:Members) => user.userEmail);
                const notificationOnAssigned = res.notificationOnAssigned;
                if(notificationOnAssigned){
                    console.log("------------>notificationOnAssigned", notificationOnAssigned);
                    notifyNoteAssigned(notificationOnAssigned);
                }
            }
            
            if (!res.success) {
                // Rollback on error
                onUpdate(note);
                // Reuse existing dataSourceId from above
                if (dataSourceId) {
                  updateNote(dataSourceId, note._id, note);
                }
                toast.error("Failed to change property value!");
                return;
            }

            console.log("Property Value Update Response", res);
            
            // Update note with server response
            const updatedNote: Note = {
                ...note,
                title: res.page.title,
                databaseProperties: res.page.databaseProperties ?? {},
                formulaErrors: res.page.formulaErrors ?? {},
            };

            onUpdate(updatedNote);
            // Update context with server response to keep it in sync
            // This ensures all views (board, list, calendar) reflect the updated relation values
            if (dataSourceId) {
              updateNote(dataSourceId, note._id, updatedNote);
            }

        } catch (err) {
            // Rollback on error
            onUpdate(note);
            // Reuse existing dataSourceId from above
            if (dataSourceId) {
              updateNote(dataSourceId, note._id, note);
            }
            toast.error("Could not update property value!");
            console.error("Failed to update property value:", err);
        }
    };

            const handleRenameProperty = async (
                key: string, 
                newName: string, 
                newOptions?: BoardPropertyOption[],
                relationConfig?: { relationLimit?: "single" | "multiple"; twoWayRelation?: boolean; linkedDatabaseId?: string },
                rollupConfig?: RollupConfig
            ) => {
        if (!newName.trim()) return;

        // Get dataSourceId from current view ID (not type)
        const dataSourceId = getCurrentDataSourceId();
        if (!dataSourceId) {
            toast.error("Data source not found for current view!");
            return;
        }

        // Get property from current data source, fallback to board.properties
        const currentDataSource = getCurrentDataSource(board._id);
        const property = currentDataSource?.properties?.[key] || board.properties?.[key];
        if (!property) return;

        console.log("Renaming property: -------->", key, "to", newName, property, newOptions)

        try {
            console.log("Renaming property:", { key, newName, property });
            const payload: Record<string, any> = {
                dataSourceId: dataSourceId,
                viewId: board._id, // Optional for audit
                propertyId: key,
                newName,
                type: property.type,
                options: newOptions ? newOptions : property.options,
                showProperty: property.showProperty
            };

            if (property.type === "formula") {
                payload.formula = property.formula ?? "";
                payload.formulaReturnType = property.formulaReturnType ?? "text";
            }

            // For relation properties, add relation config
            if (property.type === "relation" && relationConfig) {
                if (relationConfig.relationLimit) {
                    payload.relationLimit = relationConfig.relationLimit;
                }
                if (relationConfig.twoWayRelation !== undefined) {
                    payload.twoWayRelation = relationConfig.twoWayRelation;
                }
                if (relationConfig.linkedDatabaseId) {
                    payload.linkedDatabaseId = relationConfig.linkedDatabaseId;
                }
            }
            if (property.type === "rollup") {
                const nextRollup = rollupConfig ?? (property as any).rollup;
                if (nextRollup) {
                    const relationDataSourceId =
                        typeof nextRollup.relationDataSourceId === "string"
                            ? nextRollup.relationDataSourceId
                            : nextRollup.relationDataSourceId?.toString?.();
                    payload.rollup = {
                        relationPropertyId: nextRollup.relationPropertyId,
                        relationDataSourceId,
                        targetPropertyId: nextRollup.targetPropertyId,
                        calculation: nextRollup.calculation ?? { category: "original", value: "original" },
                        selectedOptions: nextRollup.selectedOptions,
                    };
                }
            }

            const res = await postWithAuth(`/api/database/updatePropertySchema`, payload);

            if (!res.success) {
                toast.error("Failed to rename property!");
                return;
            }

            // Update data source in context from API response
            if (res.dataSource) {
              const ds = res.dataSource;
              const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
              if (dsId) {
                // Store the updated data source from API response
                setDataSource(dsId, ds as any);
                
                // Sync note properties with updated schema (keys unchanged)
                const updatedProps = ds.properties || {};
                const nextDbProps = { ...(note.databaseProperties || {}) } as Record<string, any>;
                Object.keys(updatedProps).forEach((propId) => {
                  if (!(propId in nextDbProps)) nextDbProps[propId] = "";
                });
                Object.keys(nextDbProps).forEach((propId) => {
                  if (!(propId in updatedProps)) delete nextDbProps[propId];
                });
                const syncedNote: Note = { ...note, databaseProperties: nextDbProps };
                onUpdate(syncedNote);
                // Reuse existing dataSourceId from above
                if (dataSourceId) {
                  updateNote(dataSourceId, note._id, syncedNote);
                }
              }
            }
        } catch (err) {
            console.error("Error renaming property:", err);
            toast.error("Could not rename property!");
        } 
    };

    const handleDeleteProperty = async (key: string) => {
        try {
            // Get dataSourceId from current view
            const dataSourceId = getCurrentDataSourceId();
            if (!dataSourceId) {
                toast.error("Data source not found for current view!");
                return;
            }

            const res = await deleteWithAuth("/api/database/deleteProperty", {
                body: JSON.stringify({
                dataSourceId: dataSourceId,
                propertyId: key,
                }),
            });
            
            const response = res as { success: boolean; dataSource?: any; notes?: any[] };

            if (!response.success) {
                toast.error("Failed to delete property!");
                return;
            }

            // Update data source in context from API response
            if (response.dataSource) {
                const ds = response.dataSource;
                const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : dataSourceId;
                setDataSource(dsId, ds);
            }

            // Update notes in context from API response
            if (response.notes && Array.isArray(response.notes)) {
                updateAllNotes(dataSourceId, response.notes);
            }

            // Sync note properties: remove deleted key
            const nextDbProps = Object.fromEntries(
              Object.entries(note.databaseProperties || {}).filter(([propId]) => propId !== key)
            );
            const syncedNote: Note = { ...note, databaseProperties: nextDbProps };
            onUpdate(syncedNote);
            updateNote(dataSourceId, note._id, syncedNote);
            toast.success("Property deleted successfully!");
            } catch (err) {
            console.error("Failed to delete property:", err);
            toast.error("Failed to delete property!");
        } 
    };

    return {
        handleAddProperty,
        handleUpdateProperty,
        handleRenameProperty,
        handleDeleteProperty, 
    };
};
