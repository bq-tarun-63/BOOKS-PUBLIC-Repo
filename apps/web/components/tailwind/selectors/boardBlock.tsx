"use client";

import React from "react";
import { NodeViewWrapper,NodeViewProps } from "@tiptap/react";
import BoardTitle from "@/components/tailwind/board/boardTitle";
import { useState, useEffect } from "react";
import BoardContainer from "../board/boardContainer";
import {  getWithAuth, postWithAuth } from "@/lib/api-helpers";
import { useBoard } from "@/contexts/boardContext";
import { BoardCollectionResponse, ViewCollection, Note } from "@/types/board";
import { Kanban ,Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BoardBlockProps extends NodeViewProps {
  initialBoard?: any;
}

export default function BoardBlock({node, initialBoard}: BoardBlockProps) {

    const { viewId } = (node as { attrs: { viewId?: string } }).attrs;
    const [loading, setLoading] = useState(!initialBoard);
    const [board, setBoard] = useState<ViewCollection | null>(initialBoard || null);
    const {  
      addBoard, 
      setNotesState, 
      boards, 
      updateBoard, 
      setCurrentView, 
      setDataSource, 
      setDataSources,
      updateDataSource,
      dataSources
    } = useBoard();
    
    // Sync local board state with context when boards array changes
    useEffect(() => {
      if (viewId) {
        const contextBoard = boards.find((b) => b._id === viewId);
        if (contextBoard) {
          setBoard(contextBoard);
        }
      }
    }, [boards, viewId]);

    useEffect(() => {
      if(board || initialBoard) return;

      if (!viewId) return;
      (async () => {
        try {
          const res  = await getWithAuth(`/api/database/getView/${viewId}`);
          console.log("Response gor getView", res)

          const response = res as BoardCollectionResponse
          if (response.success === false) {
            console.error("Failed to fetch board:", response.message);
            return;
          }

          const fetchedBoard = response.collection.viewCollection;

          // Extract defaultDataSourceId if it exists
          if (fetchedBoard.defaultDataSourceId) {
            fetchedBoard.defaultDataSourceId = typeof fetchedBoard.defaultDataSourceId === "string"
              ? fetchedBoard.defaultDataSourceId
              : String(fetchedBoard.defaultDataSourceId);
          }

          if (fetchedBoard.viewsType) {
            fetchedBoard.viewsType = fetchedBoard.viewsType.map((vt: any) => {
              // Extract _id from ViewTypeWithIconAndTitle structure
              const id = vt._id 
                ? (typeof vt._id === "string" ? vt._id : vt._id.toString())
                : vt.id || "";
              
              // Extract databaseSourceId
              const databaseSourceId = vt.databaseSourceId
                ? (typeof vt.databaseSourceId === "string" ? vt.databaseSourceId : vt.databaseSourceId.toString())
                : undefined;
              
              return {
                id: id,
                viewType: vt.viewType,
                title: vt.title || "",
                icon: vt.icon || "",
                formIcon: vt.formIcon || "",
                formCoverImage: vt.formCoverImage || null,
                formTitle: vt.formTitle || "",
                formDescription: vt.formDescription || "",
                isPublicForm: vt.isPublicForm,
                formAnonymousResponses: vt.formAnonymousResponses,
                formAccessToSubmission: vt.formAccessToSubmission,
                databaseSourceId: databaseSourceId,
                settings: vt.settings || {}, // Preserve settings from API response
                isLocked: vt.isLocked || false, // Preserve isLocked if present
              };
            });
          }

          addBoard(fetchedBoard);
          
          // Extract all unique dataSourceIds from views
          const uniqueDataSourceIds = new Set<string>();
          fetchedBoard.viewsType?.forEach((vt: any) => {
            if (vt.databaseSourceId) {
              const normalizedDsId = typeof vt.databaseSourceId === "string" 
                ? vt.databaseSourceId 
                : String(vt.databaseSourceId);
              if (normalizedDsId) {
                uniqueDataSourceIds.add(normalizedDsId);
              }
            }
          });

          // Fetch notes for each dataSourceId
          const dataSourcesMap: Record<string, any> = {};
          const notesByDataSourceId: Record<string, Note[]> = {};

          // Fetch data sources and notes for each unique dataSourceId
          await Promise.all(
            Array.from(uniqueDataSourceIds).map(async (dataSourceId) => {
              try {
                const dsRes = await getWithAuth(`/api/database/getdataSource/${dataSourceId}`) as { 
                  success?: boolean; 
                  collection?: { 
                    dataSource?: any;
                    notes?: any[];
                  } 
                };
                
                if (dsRes?.success && dsRes.collection?.dataSource) {
                  const ds = dsRes.collection.dataSource;
                  const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : dataSourceId;
                  
                  // Store data source as-is (raw response)
                  dataSourcesMap[dsId] = ds;

                  // Store notes for this dataSourceId
                  const notes = dsRes.collection.notes || [];
                  notesByDataSourceId[dsId] = notes;
                }
              } catch (err) {
                console.error(`Failed to fetch data source ${dataSourceId}:`, err);
              }
            })
          );

          // Set all data sources in context
          if (Object.keys(dataSourcesMap).length > 0) {
            setDataSources({ ...dataSourcesMap });
          }

          // Set notes for each dataSourceId in context
          Object.entries(notesByDataSourceId).forEach(([dsId, notes]) => {
            setNotesState(dsId, notes);
          });
          
          setBoard(fetchedBoard);
          
          const firstView = fetchedBoard.viewsType?.[0];
          if (firstView) {
            const viewId = firstView.id ? (typeof firstView.id === "string" ? firstView.id : String(firstView.id)) : "";
            setCurrentView(fetchedBoard._id, viewId, firstView.viewType);
          }

        } catch (err) {
          console.error("Failed to fetch board:", err);
        }
        finally {
          setLoading(false);
        }
      })();
    }, [viewId]);

    const handleBoardRename = async( currentBoard: ViewCollection, newTitle: string) => {
      console.log("Renaming board (optimistic) ------>", currentBoard, newTitle)

      // Optimistic update
      const previousTitle = currentBoard.title;
      const optimisticBoard: ViewCollection = { ...currentBoard, title: newTitle };
      setBoard(optimisticBoard);
      updateBoard(currentBoard._id, optimisticBoard);

      // Update default datasource title in context if it exists
      if (currentBoard.defaultDataSourceId) {
        const defaultDsId = typeof currentBoard.defaultDataSourceId === "string" 
          ? currentBoard.defaultDataSourceId 
          : String(currentBoard.defaultDataSourceId);
        
        // Check if datasource exists in context
        if (dataSources[defaultDsId]) {
          // Optimistically update datasource title
          updateDataSource(defaultDsId, { title: newTitle });
        }
      }

      try{
        const res = await postWithAuth('/api/database/updateViewName',{
          viewId: currentBoard._id,
          title: newTitle
        })
        if(!res?.view?.success){
          // Revert on API-level failure
          const revertedBoard: ViewCollection = { ...currentBoard, title: previousTitle };
          setBoard(revertedBoard);
          updateBoard(currentBoard._id, revertedBoard);
          
          // Revert datasource title if it was updated
          if (currentBoard.defaultDataSourceId) {
            const defaultDsId = typeof currentBoard.defaultDataSourceId === "string" 
              ? currentBoard.defaultDataSourceId 
              : String(currentBoard.defaultDataSourceId);
            if (dataSources[defaultDsId]) {
              updateDataSource(defaultDsId, { title: previousTitle });
            }
          }
          
          console.error("Failed to update board title:", res?.message);
          toast.error("Failed to update board title");
        }
        // If success, keep optimistic state (both board and datasource titles are already updated)
      }
      catch(err){
        // Revert on network/runtime error
        const revertedBoard: ViewCollection = { ...currentBoard, title: previousTitle };
        setBoard(revertedBoard);
        updateBoard(currentBoard._id, revertedBoard);
        
        // Revert datasource title if it was updated
        if (currentBoard.defaultDataSourceId) {
          const defaultDsId = typeof currentBoard.defaultDataSourceId === "string" 
            ? currentBoard.defaultDataSourceId 
            : String(currentBoard.defaultDataSourceId);
          if (dataSources[defaultDsId]) {
            updateDataSource(defaultDsId, { title: previousTitle });
          }
        }
        
        console.error("Failed to update board title:", err);
        toast.error("Failed to update board title");
      }
    };

    if (loading) {
      return (
        <NodeViewWrapper className="w-full flex flex-col items-center justify-center p-6">
          <div className="min-w-[65vw] w-[70vw] max-w-full animate-pulse space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-4 h-4">
                <div className="absolute inset-0 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Loading board...
              </span>
            </div>

            {/* Small header skeleton */}
            <div className="h-6 w-[150px] rounded-sm bg-[rgb(235,235,235)] dark:bg-[rgb(45,45,45)]" />

            {/* Three placeholder cards (full width responsive) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-52 rounded-lg bg-[rgb(235,235,235)] dark:bg-[rgb(45,45,45)]"
                />
              ))}
            </div>
          </div>
        </NodeViewWrapper>
      );
    }


  return (
    <NodeViewWrapper
      className="
        bg-card text-card-foreground dark:bg-background
        shadow-sm p-2
        transition-colors
        w-full
      "
    >
      <div className="w-full">
        {/* Editable Title */}
        <BoardTitle
          initialTitle={board?.title || 'My task Board'}
          onChange={(newTitle) => {
            if(board && newTitle !== board.title){
              handleBoardRename(board, newTitle);
            }
          }}
        />

        <div className="">
          <div className="min-w-[65vw] w-[70vw] max-w-full">
            {board && <BoardContainer boardId={board?._id}/>}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
