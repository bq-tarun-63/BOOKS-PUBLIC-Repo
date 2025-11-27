import type { Note, BoardProperty, SortItem, BoardProperties } from "@/types/board";
import { getRelationIdsFromValue } from "@/utils/relationUtils";
import { computeRollupData, getRollupComparableValue } from "@/utils/rollupUtils";

export function applySorting(
  notes: Note[],
  sorts: SortItem[],
  boardProperties: Record<string, BoardProperty>,
  rollupHelpers?: {
    getNotesByDataSourceId: (dataSourceId: string) => Note[];
    getDataSource: (dataSourceId: string) => any;
  }
): Note[] {
  if (!sorts || sorts.length === 0) return notes;
  if (!notes || notes.length === 0) return notes;

  return [...notes].sort((a, b) => {
    for (const sort of sorts) {
      const { propertyId, direction } = sort;
      const property = boardProperties[propertyId];
      
      if (!property) continue;

      // Handle rollup properties
      if (property.type === "rollup" && rollupHelpers) {
        const aRollupResult = computeRollupData(
          a,
          property,
          boardProperties,
          rollupHelpers.getNotesByDataSourceId,
          rollupHelpers.getDataSource,
        );
        const bRollupResult = computeRollupData(
          b,
          property,
          boardProperties,
          rollupHelpers.getNotesByDataSourceId,
          rollupHelpers.getDataSource,
        );

        const aValue = getRollupComparableValue(aRollupResult);
        const bValue = getRollupComparableValue(bRollupResult);

        // Handle undefined/null values - push them to the end
        if (aValue === null || aValue === undefined) {
          return direction === "ascending" ? 1 : -1;
        }
        if (bValue === null || bValue === undefined) {
          return direction === "ascending" ? -1 : 1;
        }

        let comparison = 0;
        if (typeof aValue === "number" && typeof bValue === "number") {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase());
        }

        if (comparison !== 0) {
          return direction === "ascending" ? comparison : -comparison;
        }
        continue;
      }

      const aValue = a.databaseProperties?.[propertyId];
      const bValue = b.databaseProperties?.[propertyId];

      // Handle undefined/null values - push them to the end
      if (aValue === undefined || aValue === null) {
        return direction === "ascending" ? 1 : -1;
      }
      if (bValue === undefined || bValue === null) {
        return direction === "ascending" ? -1 : 1;
      }

      let comparison = 0;

      const resolvedType = property.type === "formula"
        ? property.formulaReturnType ?? "text"
        : property.type;

      switch (resolvedType) {
        case "text":
        case "status":
        case "select":
          // String comparison
          const aStr = String(aValue).toLowerCase();
          const bStr = String(bValue).toLowerCase();
          comparison = aStr.localeCompare(bStr);
          break;

        case "relation": {
          const relationLimit = property.relationLimit || "multiple";
          const aIds = getRelationIdsFromValue(aValue, relationLimit);
          const bIds = getRelationIdsFromValue(bValue, relationLimit);
          const aId = (aIds[0] || "").toLowerCase();
          const bId = (bIds[0] || "").toLowerCase();
          comparison = aId.localeCompare(bId);
          break;
        }

        case "number":
          // Numeric comparison
          const aNum = Number(aValue) || 0;
          const bNum = Number(bValue) || 0;
          comparison = aNum - bNum;
          break;

        case "priority":
          // Priority comparison (assuming: Low=1, Medium=2, High=3, Urgent=4)
          const priorityOrder: Record<string, number> = {
            "low": 1, "Low": 1,
            "medium": 2, "Medium": 2,
            "high": 3, "High": 3,
            "urgent": 4, "Urgent": 4
          };
          const aPriority = priorityOrder[String(aValue).toLowerCase()] || 0;
          const bPriority = priorityOrder[String(bValue).toLowerCase()] || 0;
          comparison = aPriority - bPriority;
          break;

        case "person":
          // sort by first person's name
          const aPersons = Array.isArray(aValue) ? aValue : [aValue].filter(Boolean);
          const bPersons = Array.isArray(bValue) ? bValue : [bValue].filter(Boolean);
          
          const aName = aPersons[0]?.userName || aPersons[0]?.userEmail || "";
          const bName = bPersons[0]?.userName || bPersons[0]?.userEmail || "";
          
          comparison = aName.toLowerCase().localeCompare(bName.toLowerCase());
          break;

        case "date":
          // Date comparison
          try {
            const aDate = new Date(aValue).getTime();
            const bDate = new Date(bValue).getTime();
            comparison = aDate - bDate;
          } catch {
            comparison = String(aValue).localeCompare(String(bValue));
          }
          break;

        case "boolean": {
          const normalize = (val: any) => {
            if (typeof val === "boolean") return val ? 1 : 0;
            if (typeof val === "string") {
              const lower = val.toLowerCase();
              if (lower === "true") return 1;
              if (lower === "false") return 0;
            }
            return val ? 1 : 0;
          };
          comparison = normalize(aValue) - normalize(bValue);
          break;
        }

        default:
          // Default string comparison
          comparison = String(aValue).localeCompare(String(bValue));
      }

      // Apply direction
      if (comparison !== 0) {
        return direction === "ascending" ? comparison : -comparison;
      }
    }

    return 0;
  });
}
