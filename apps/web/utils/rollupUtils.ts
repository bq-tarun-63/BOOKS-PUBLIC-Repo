import type { BoardProperty, BoardProperties, Note, RollupCalculation, RollupCalculationCategory, RollupCalculationValue } from "@/types/board";
import type { DatabaseSource } from "@/types/board";
import { getRelationIdsFromValue } from "./relationUtils";

// Helper to normalize calculation (supports both old string format and new object format)
export function normalizeCalculation(calc: RollupCalculation | string | undefined): RollupCalculation {
  if (!calc) {
    return { category: "original", value: "original" };
  }
  
  // If it's already an object, return it
  if (typeof calc === "object" && "category" in calc && "value" in calc) {
    return calc as RollupCalculation;
  }
  
  // Convert old string format to new object format
  if (typeof calc === "string") {
    if (calc === "original") {
      return { category: "original", value: "original" };
    }
    if (calc.startsWith("count_")) {
      const value = calc.replace("count_", "") as RollupCalculationValue;
      return { category: "count", value };
    }
    if (calc.startsWith("percent_")) {
      const value = calc.replace("percent_", "") as RollupCalculationValue;
      return { category: "percent", value };
    }
  }
  
  // Default fallback
  return { category: "original", value: "original" };
}

export interface RollupComputation {
  state: "missing_config" | "missing_relation" | "missing_property" | "no_relation" | "no_related" | "ready";
  calculation?: RollupCalculation;
  values?: string[];
  count?: number;
  totalCount?: number;
  countFraction?: string;
  percent?: number;
  message?: string;
}

/**
 * Get a comparable value from rollup computation for filtering, sorting, and grouping
 * Returns a string or number that can be used for comparison
 */
export function getRollupComparableValue(
  rollupResult: RollupComputation
): string | number | null {
  if (rollupResult.state !== "ready") {
    return null;
  }

  const { calculation, values, count, countFraction, percent } = rollupResult;

  if (calculation?.category === "count") {
    if (calculation.value === "per_group") {
      // For per_group, return the fraction as a number for sorting
      if (countFraction) {
        const parts = countFraction.split("/");
        const num = parts[0] ? Number(parts[0]) : 0;
        const den = parts[1] ? Number(parts[1]) : 1;
        return den > 0 ? num / den : 0;
      }
      return count ?? 0;
    }
    return count ?? 0;
  }

  if (calculation?.category === "percent") {
    return percent ?? 0;
  }

  // Original - return first value or joined values for comparison
  if (values && values.length > 0) {
    return values.join(", ");
  }

  return null;
}

export const formatRollupValue = (rawValue: any, schema?: BoardProperty): string => {
  if (!schema) {
    if (rawValue === null || rawValue === undefined || rawValue === "") return "—";
    if (Array.isArray(rawValue)) return rawValue.join(", ");
    if (typeof rawValue === "object") return JSON.stringify(rawValue);
    return String(rawValue);
  }

  switch (schema.type) {
    case "number":
      return rawValue !== null && rawValue !== undefined && rawValue !== ""
        ? String(rawValue)
        : "0";
    case "date": {
      if (!rawValue) return "—";
      const date = new Date(rawValue);
      return isNaN(date.getTime()) ? String(rawValue) : date.toLocaleDateString();
    }
    case "checkbox":
      return rawValue ? "Yes" : "No";
    case "person":
      if (Array.isArray(rawValue)) {
        return rawValue
          .map((person: any) => person.userName || person.userEmail || "Unnamed")
          .join(", ");
      }
      return rawValue?.userName || "—";
    case "multi_select":
      if (Array.isArray(rawValue)) return rawValue.join(", ");
      return rawValue ? String(rawValue) : "—";
    case "relation":
      if (Array.isArray(rawValue)) {
        return `${rawValue.length} linked`;
      }
      return rawValue ? "1 linked" : "—";
    default:
      if (Array.isArray(rawValue)) return rawValue.join(", ");
      if (rawValue === null || rawValue === undefined || rawValue === "") return "—";
      return String(rawValue);
  }
};

export function computeRollupData(
  note: Note,
  propertySchema: BoardProperty | undefined,
  boardProperties: BoardProperties | undefined,
  getNotesByDataSourceId: (dataSourceId: string) => Note[],
  getDataSource: (dataSourceId: string) => DatabaseSource | undefined,
): RollupComputation {
  if (!propertySchema?.rollup) {
    return { state: "missing_config", message: "Configure rollup" };
  }

  const rollup = propertySchema.rollup;
  if (!rollup.relationPropertyId) {
    return { state: "missing_relation", message: "Select relation" };
  }

  const relationProperty = boardProperties?.[rollup.relationPropertyId];
  if (!relationProperty) {
    return { state: "missing_relation", message: "Missing relation" };
  }

  const relationValue = note.databaseProperties?.[rollup.relationPropertyId];
  const relationIds = getRelationIdsFromValue(relationValue, relationProperty.relationLimit || "multiple");
  if (relationIds.length === 0) {
    return { state: "no_relation", message: "No related pages" };
  }

  const relationDataSourceIdRaw = rollup.relationDataSourceId;
  const relationDataSourceId = relationDataSourceIdRaw ? String(relationDataSourceIdRaw) : "";

  if (!relationDataSourceId || !rollup.targetPropertyId) {
    return { state: "missing_property", message: "Select property" };
  }

  const relatedNotes = getNotesByDataSourceId(relationDataSourceId) || [];
  const relatedDataSource = getDataSource(relationDataSourceId);
  const targetSchema = relatedDataSource?.properties?.[rollup.targetPropertyId];

  if (!targetSchema) {
    return { state: "missing_property", message: "Missing property" };
  }

  const targetPropertyId = rollup.targetPropertyId as string;

  const resolvedNotes = relationIds
    .map((relationId) => relatedNotes.find((n) => String(n._id) === relationId))
    .filter(Boolean) as Note[];

  if (resolvedNotes.length === 0) {
    return { state: "no_related", message: "Loading…" };
  }

  const calculation = normalizeCalculation(rollup.calculation);
  const selectedOptions = rollup.selectedOptions || [];

  // Handle original
  if (calculation.category === "original") {
    const values = resolvedNotes.slice(0, 5).map((relatedNote) => {
      const val = relatedNote.databaseProperties?.[targetPropertyId];
      return formatRollupValue(val, targetSchema);
    });

    return {
      state: "ready",
      calculation,
      values,
      count: resolvedNotes.length,
    };
  }

  // Handle count category
  if (calculation.category === "count") {
    // Handle count_all
    if (calculation.value === "all") {
      return {
        state: "ready",
        calculation,
        count: resolvedNotes.length,
      };
    }

    // Handle count_empty
    if (calculation.value === "empty") {
      const emptyCount = resolvedNotes.filter((relatedNote) => {
        const val = relatedNote.databaseProperties?.[targetPropertyId];
        if (Array.isArray(val)) return val.length === 0;
        if (val && typeof val === "object") return Object.keys(val).length === 0;
        return !val || val === "" || val === null || val === undefined;
      }).length;
      return {
        state: "ready",
        calculation,
        count: emptyCount,
      };
    }

    // Handle count_non_empty
    if (calculation.value === "non_empty") {
      const nonEmptyCount = resolvedNotes.filter((relatedNote) => {
        const val = relatedNote.databaseProperties?.[targetPropertyId];
        if (Array.isArray(val)) return val.length > 0;
        if (val && typeof val === "object") return Object.keys(val).length > 0;
        return !!val && val !== "" && val !== null && val !== undefined;
      }).length;
      return {
        state: "ready",
        calculation,
        count: nonEmptyCount,
      };
    }

    // Handle count_per_group
    if (calculation.value === "per_group") {
      const totalCount = resolvedNotes.length;
      
      if (selectedOptions.length === 0) {
        return {
          state: "ready",
          calculation,
          count: 0,
          totalCount,
          countFraction: `0/${totalCount}`,
          message: "Select options to count",
        };
      }

      // Convert selected option IDs to option names for comparison
      // Note: select/status properties store option names (strings) in databaseProperties, not IDs
      const selectedOptionNames = new Set<string>();
      if (targetSchema.options) {
        targetSchema.options.forEach((opt) => {
          if (selectedOptions.includes(opt.id)) {
            selectedOptionNames.add(opt.name);
          }
        });
      }

      // Filter notes that match any of the selected options
      const matchingNotes = resolvedNotes.filter((relatedNote) => {
        const val = relatedNote.databaseProperties?.[targetPropertyId];
        if (Array.isArray(val)) {
          // For multi_select, check if any selected option name is in the array
          return val.some((v) => {
            if (typeof v === "string") return selectedOptionNames.has(v);
            if (typeof v === "object" && v?.name) return selectedOptionNames.has(v.name);
            return false;
          });
        }
        if (typeof val === "object" && val?.name) {
          return selectedOptionNames.has(val.name);
        }
        if (typeof val === "string") {
          return selectedOptionNames.has(val);
        }
        return false;
      });

      const matchingCount = matchingNotes.length;
      return {
        state: "ready",
        calculation,
        count: matchingCount,
        totalCount,
        countFraction: `${matchingCount}/${totalCount}`,
      };
    }
  }

  // Handle percent category
  if (calculation.category === "percent") {
    // Handle percent_all
    if (calculation.value === "all") {
      const filled = resolvedNotes.filter((relatedNote) => {
        const val = relatedNote.databaseProperties?.[targetPropertyId];
        if (Array.isArray(val)) return val.length > 0;
        if (val && typeof val === "object") return Object.keys(val).length > 0;
        return !!val;
      }).length;
      const percent = resolvedNotes.length === 0 ? 0 : Math.round((filled / resolvedNotes.length) * 100);
      return {
        state: "ready",
        calculation,
        percent,
      };
    }

    // Handle percent_empty
    if (calculation.value === "empty") {
      const emptyCount = resolvedNotes.filter((relatedNote) => {
        const val = relatedNote.databaseProperties?.[targetPropertyId];
        if (Array.isArray(val)) return val.length === 0;
        if (val && typeof val === "object") return Object.keys(val).length === 0;
        return !val || val === "" || val === null || val === undefined;
      }).length;
      const percent = resolvedNotes.length === 0 ? 0 : Math.round((emptyCount / resolvedNotes.length) * 100);
      return {
        state: "ready",
        calculation,
        percent,
      };
    }

    // Handle percent_non_empty
    if (calculation.value === "non_empty") {
      const nonEmptyCount = resolvedNotes.filter((relatedNote) => {
        const val = relatedNote.databaseProperties?.[targetPropertyId];
        if (Array.isArray(val)) return val.length > 0;
        if (val && typeof val === "object") return Object.keys(val).length > 0;
        return !!val && val !== "" && val !== null && val !== undefined;
      }).length;
      const percent = resolvedNotes.length === 0 ? 0 : Math.round((nonEmptyCount / resolvedNotes.length) * 100);
      return {
        state: "ready",
        calculation,
        percent,
      };
    }

    // Handle percent_per_group
    if (calculation.value === "per_group") {
      const totalCount = resolvedNotes.length;
      
      if (selectedOptions.length === 0) {
        return {
          state: "ready",
          calculation,
          percent: 0,
          message: "Select options to calculate percent",
        };
      }

      // Convert selected option IDs to option names for comparison
      // Note: select/status properties store option names (strings) in databaseProperties, not IDs
      const selectedOptionNames = new Set<string>();
      if (targetSchema.options) {
        targetSchema.options.forEach((opt) => {
          if (selectedOptions.includes(opt.id)) {
            selectedOptionNames.add(opt.name);
          }
        });
      }

      // Filter notes that match any of the selected options
      const matchingNotes = resolvedNotes.filter((relatedNote) => {
        const val = relatedNote.databaseProperties?.[targetPropertyId];
        if (Array.isArray(val)) {
          // For multi_select, check if any selected option name is in the array
          return val.some((v) => {
            if (typeof v === "string") return selectedOptionNames.has(v);
            if (typeof v === "object" && v?.name) return selectedOptionNames.has(v.name);
            return false;
          });
        }
        if (typeof val === "object" && val?.name) {
          return selectedOptionNames.has(val.name);
        }
        if (typeof val === "string") {
          return selectedOptionNames.has(val);
        }
        return false;
      });

      const percent = totalCount === 0 ? 0 : Math.round((matchingNotes.length / totalCount) * 100);
      return {
        state: "ready",
        calculation,
        percent,
      };
    }
  }

  // Fallback to original if calculation doesn't match any case
  const values = resolvedNotes.slice(0, 5).map((relatedNote) => {
    const val = relatedNote.databaseProperties?.[targetPropertyId];
    return formatRollupValue(val, targetSchema);
  });

  return {
    state: "ready",
    calculation,
    values,
    count: resolvedNotes.length,
  };
}


