import { toast } from "sonner";
import { postWithAuth } from "@/lib/api-helpers";
import type { BoardProperty, BoardPropertyOption, DatabaseSource } from "@/types/board";
import { ObjectId } from "bson";

/**
 * Shared helper functions for basic form view actions.
 * These handlers currently only display placeholder toasts
 * but live in a dedicated service so they can be reused.
 */

export const handleSubmitScreen = () => {
  toast.info("Submit screen customization coming soon");
};

export const handleDeleteForm = () => {
  toast.info("Submit screen customization coming soon");
};

export const handleDuplicateQuestion = () => {
  toast.info("Duplicate functionality to be implemented");
};

type GetCurrentDataSourceId = () => string | null;
type SetDataSource = (dataSourceId: string, dataSource: DatabaseSource) => void;

interface PropertyServiceBase {
  boardId: string;
  propertyId: string;
  boardProperties: Record<string, BoardProperty>;
  getCurrentDataSourceId: GetCurrentDataSourceId;
  setDataSource: SetDataSource;
}

interface UpdatePropertySchemaParams extends PropertyServiceBase {
  updates: {
    options?: BoardPropertyOption[];
    formMetaData?: BoardProperty["formMetaData"];
  };
}

export const updatePropertySchema = async ({
  boardId,
  propertyId,
  boardProperties,
  getCurrentDataSourceId,
  setDataSource,
  updates,
}: UpdatePropertySchemaParams) => {
  const property = boardProperties[propertyId];
  if (!property) {
    toast.error("Property not found");
    return false;
  }

  const dataSourceId = getCurrentDataSourceId();
  if (!dataSourceId) {
    toast.error("Data source not found for current view!");
    return false;
  }

  try {
    const payload: Record<string, any> = {
      dataSourceId,
      viewId: boardId,
      propertyId,
      newName: property.name,
      type: property.type,
      options: updates.options !== undefined ? updates.options : property.options,
      showProperty: property.showProperty,
    };

    if (updates.formMetaData) {
      payload.formMetaData = updates.formMetaData;
    }

    const res = await postWithAuth("/api/database/updatePropertySchema", payload);

    if (!res.success) {
      toast.error("Failed to update property");
      return false;
    }

    if (res.dataSource) {
      const ds = res.dataSource;
      const dsId = ds._id ? (typeof ds._id === "string" ? ds._id : ds._id.toString()) : "";
      if (dsId) {
        setDataSource(dsId, ds);
      }
    }

    return true;
  } catch (err) {
    console.error(err);
    toast.error("Failed to update property");
    return false;
  }
};

interface PropertyOptionParams extends PropertyServiceBase {
  optionName: string;
}

export const addPropertyOption = async ({
  boardId,
  propertyId,
  boardProperties,
  getCurrentDataSourceId,
  setDataSource,
  optionName,
}: PropertyOptionParams) => {
  const property = boardProperties[propertyId];
  if (!property) {
    toast.error("Property not found");
    return;
  }

  const newOptionId = `opt_${new ObjectId()}`;
  const newOption: BoardPropertyOption = {
    id: newOptionId,
    name: optionName.trim(),
    color: "default",
  };

  const updatedOptions = [...(property.options || []), newOption];
  const success = await updatePropertySchema({
    boardId,
    propertyId,
    boardProperties,
    getCurrentDataSourceId,
    setDataSource,
    updates: { options: updatedOptions },
  });

  if (success) {
    toast.success("Option added");
  }
};

interface PropertyOptionMutationParams extends PropertyServiceBase {
  optionId: string;
}

export const deletePropertyOption = async ({
  boardId,
  propertyId,
  boardProperties,
  getCurrentDataSourceId,
  setDataSource,
  optionId,
}: PropertyOptionMutationParams) => {
  const property = boardProperties[propertyId];
  if (!property) {
    toast.error("Property not found");
    return;
  }

  const updatedOptions = (property.options || []).filter((opt) => opt.id !== optionId);
  const success = await updatePropertySchema({
    boardId,
    propertyId,
    boardProperties,
    getCurrentDataSourceId,
    setDataSource,
    updates: { options: updatedOptions },
  });

  if (success) {
    toast.success("Option deleted");
  }
};

interface ReorderPropertyOptionsParams extends PropertyServiceBase {
  optionIds: string[];
}

export const reorderPropertyOptions = async ({
  boardId,
  propertyId,
  boardProperties,
  getCurrentDataSourceId,
  setDataSource,
  optionIds,
}: ReorderPropertyOptionsParams) => {
  const property = boardProperties[propertyId];
  if (!property) {
    toast.error("Property not found");
    return;
  }

  const currentOptions = property.options || [];
  const reorderedOptions = optionIds
    .map((id) => currentOptions.find((opt) => opt.id === id))
    .filter((opt): opt is BoardPropertyOption => Boolean(opt));

  const missingOptions = currentOptions.filter((opt) => !optionIds.includes(opt.id));
  const updatedOptions = [...reorderedOptions, ...missingOptions];

  await updatePropertySchema({
    boardId,
    propertyId,
    boardProperties,
    getCurrentDataSourceId,
    setDataSource,
    updates: { options: updatedOptions },
  });
};

