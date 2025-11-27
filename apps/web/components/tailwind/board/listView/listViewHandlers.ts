import { postWithAuth } from "@/lib/api-helpers";
import { toast } from "sonner";
import type { ViewCollection } from "@/types/board";

interface HandlerParams {
  board: ViewCollection;
  boardProperties: Record<string, any>; // Properties from data source
  setGroupBy: (viewTypeId: string, propertyId: string | undefined) => void;
  setBoardSortBy: (viewTypeId: string, sorts: Array<{ propertyId: string; direction: 'ascending' | 'descending' }>) => void;
  setEditingPropertyId: (value: string | null) => void;
  setShowPropertyDialog: (value: boolean) => void;
  updateBoard: (boardId: string, updatedBoard: ViewCollection) => void;
  setPropertyOrder: (boardId: string, order: string[]) => void;
  groupBy: Record<string, string | undefined>; // key: viewTypeId
  sortBy: Record<string, Array<{ propertyId: string; direction: 'ascending' | 'descending' }>>; // key: viewTypeId
  propertyOrder: Record<string, string[]>;
}

export const createHandlers = (params: HandlerParams) => {
  const {
    board,
    boardProperties,
    setGroupBy,
    setBoardSortBy,
    setEditingPropertyId,
    setShowPropertyDialog,
    updateBoard,
    setPropertyOrder,
    groupBy,
    sortBy,
    propertyOrder,
  } = params;

  const handlePropertySort = (propertyId: string, direction: 'ascending' | 'descending') => {
    // Get viewTypeId from the first key in sortBy (since it's keyed by viewTypeId now)
    const viewTypeId = Object.keys(sortBy)[0];
    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }
    
    const currentSorts = sortBy[viewTypeId] || [];
    
    // Check if this property is already sorted
    const existingSortIndex = currentSorts.findIndex(s => s.propertyId === propertyId);
    
    let newSorts;
    if (existingSortIndex >= 0) {
      // Update existing sort
      newSorts = [...currentSorts];
      newSorts[existingSortIndex] = { propertyId, direction };
    } else {
      // Add new sort
      newSorts = [...currentSorts, { propertyId, direction }];
    }
    
    setBoardSortBy(viewTypeId, newSorts);
    toast.success(`Sorted by ${boardProperties?.[propertyId]?.name || propertyId} (${direction})`);
  };

  const handlePropertyFilter = () => {
    // Filter modal is now handled inside PropertyHeaderDropdown
  };

  const handlePropertyGroup = (propertyId: string) => {
    // Get viewTypeId from the first key in groupBy (since it's keyed by viewTypeId now)
    const viewTypeId = Object.keys(groupBy)[0];
    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }
    
    const currentGroup = groupBy[viewTypeId];
    
    if (currentGroup === propertyId) {
      // Ungroup
      setGroupBy(viewTypeId, undefined);
      toast.success("Ungrouped");
    } else {
      // Group by this property
      setGroupBy(viewTypeId, propertyId);
      toast.success(`Grouped by ${boardProperties?.[propertyId]?.name || propertyId}`);
    }
  };

  const handlePropertyHide = async (propertyId: string) => {
    try {
      const updatedProperties = {
        ...boardProperties,
        [propertyId]: {
          ...boardProperties?.[propertyId],
          showProperty: false,
        },
      };

      await postWithAuth(`/api/boards/${board._id}/properties`, {
        method: "PUT",
        body: JSON.stringify({ properties: updatedProperties }),
      });

      toast.success("Property hidden from view");
    } catch (error) {
      console.error("Error hiding property:", error);
      toast.error("Failed to hide property");
    }
  };

  const handlePropertyEdit = (propertyId: string) => {
    setEditingPropertyId(propertyId);
  };


  const handlePropertyWrapInView = () => {
    toast.info("Wrap in view functionality - coming soon");
  };

  const handlePropertyDisplayAs = () => {
    toast.info("Display as functionality - coming soon");
  };

  const handlePropertyInsertLeft = (propertyId: string) => {
    toast.info("Insert property to the left - opening property dialog");
    setShowPropertyDialog(true);
  };

  const handlePropertyInsertRight = (propertyId: string) => {
    toast.info("Insert property to the right - opening property dialog");
    setShowPropertyDialog(true);
  };

  const handleRemoveSortFromProperty = (propertyId: string) => {
    // Get viewTypeId from the first key in sortBy (since it's keyed by viewTypeId now)
    const viewTypeId = Object.keys(sortBy)[0];
    if (!viewTypeId) {
      toast.error("View type ID not found");
      return;
    }
    
    const currentSorts = sortBy[viewTypeId] || [];
    const newSorts = currentSorts.filter(s => s.propertyId !== propertyId);
    setBoardSortBy(viewTypeId, newSorts);
    toast.success("Sort removed");
  };

  return {
    handlePropertySort,
    handlePropertyFilter,
    handlePropertyGroup,
    handlePropertyHide,
    handlePropertyEdit,
    handlePropertyWrapInView,
    handlePropertyDisplayAs,
    handlePropertyInsertLeft,
    handlePropertyInsertRight,
    handleRemoveSortFromProperty,
  };
};

