import type { BoardProperty, Note } from "@/types/board";
import type { IAdvancedFilterGroup, IAdvancedFilterRule } from "@/models/types/ViewTypes";
import { computeRollupData, getRollupComparableValue } from "./rollupUtils";
import { getRelationIdsFromValue } from "./relationUtils";

const parseNumericValue = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  let normalized = String(value).trim();
  if (!normalized) return null;

  let isPercent = false;
  if (normalized.endsWith("%")) {
    isPercent = true;
    normalized = normalized.slice(0, -1).trim();
  }

  const mixedFractionMatch = normalized.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedFractionMatch) {
    const whole = Number(mixedFractionMatch[1]);
    const numerator = Number(mixedFractionMatch[2]);
    const denominator = Number(mixedFractionMatch[3]);
    if (!Number.isNaN(whole) && !Number.isNaN(numerator) && !Number.isNaN(denominator) && denominator !== 0) {
      const result = whole + numerator / denominator;
      return isPercent ? result : result;
    }
  }

  const fractionMatch = normalized.match(/^(-?\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (!Number.isNaN(numerator) && !Number.isNaN(denominator) && denominator !== 0) {
      const result = numerator / denominator;
      return isPercent ? result : result;
    }
  }

  const parsed = Number(normalized);
  if (!Number.isNaN(parsed)) {
    return isPercent ? parsed : parsed;
  }

  return null;
};

const valuesAreEqual = (a: string | number, b: string | number): boolean => {
  const numA = parseNumericValue(a);
  const numB = parseNumericValue(b);
  if (numA !== null && numB !== null) {
    return numA === numB;
  }
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
};

const valueContains = (source: string | number, target: string | number): boolean => {
  const numSource = parseNumericValue(source);
  const numTarget = parseNumericValue(target);
  if (numSource !== null && numTarget !== null) {
    return numSource === numTarget;
  }
  return String(source).toLowerCase().includes(String(target).toLowerCase());
};

/**
 * Apply a single advanced filter rule to a note
 * @param note - The note to check
 * @param rule - The filter rule
 * @param boardProperties - All board properties
 * @param getNotesByDataSourceId - Function to get notes by data source ID
 * @param getDataSource - Function to get data source
 * @returns true if note matches the rule, false otherwise
 */
export function applyAdvancedFilterRule(
  note: Note,
  rule: IAdvancedFilterRule,
  boardProperties: Record<string, BoardProperty>,
  getNotesByDataSourceId?: (dataSourceId: string) => Note[],
  getDataSource?: (dataSourceId: string) => any
): boolean {
  const prop = boardProperties[rule.propertyId];
  if (!prop) return false;

  const noteProps = note.databaseProperties || {};
  let noteValue = noteProps[rule.propertyId];

  // Handle rollup properties
  let rollupValues: string[] | null = null;
  let rollupTargetProperty: BoardProperty | null = null;
  let rollupCalculation: { category?: string } | null = null;
  if (prop.type === "rollup" && getNotesByDataSourceId && getDataSource) {
    const rollupResult = computeRollupData(
      note,
      prop,
      boardProperties,
      getNotesByDataSourceId,
      getDataSource,
    );
    
    rollupCalculation = rollupResult.calculation ? { category: rollupResult.calculation.category } : null;
    
    // Get target property for ID-to-name conversion
    if (prop.rollup?.targetPropertyId && prop.rollup?.relationDataSourceId) {
      const targetDataSource = getDataSource(String(prop.rollup.relationDataSourceId));
      rollupTargetProperty = targetDataSource?.properties?.[prop.rollup.targetPropertyId] || null;
    }
    
    // For "original" category, preserve the array of values for multi-value filtering
    if (rollupResult.state === "ready" && 
        rollupResult.calculation?.category === "original" && 
        rollupResult.values && 
        rollupResult.values.length > 0) {
      rollupValues = rollupResult.values;
      noteValue = rollupResult.values; // Use array for array-based filtering
    } else if (rollupResult.state === "ready") {
      // For count/percent, get the comparable value
      // Note: getRollupComparableValue returns number for count/percent, but we need to handle
      // cases where it might be formatted as string (e.g., "1 1/2", "75%")
      const comparableValue = getRollupComparableValue(rollupResult);
      
      // For count with per_group, we might have a fraction string like "1/2"
      if (rollupResult.calculation?.category === "count" && rollupResult.calculation?.value === "per_group" && rollupResult.countFraction) {
        noteValue = rollupResult.countFraction; // Use the fraction string for parsing (e.g., "1/2")
      } else if (rollupResult.calculation?.category === "percent" && rollupResult.percent !== undefined) {
        // For percent, use the number value (e.g., 75 for 75%)
        noteValue = rollupResult.percent;
      } else if (rollupResult.calculation?.category === "count" && rollupResult.count !== undefined) {
        // For count, use the number value
        noteValue = rollupResult.count;
      } else {
        noteValue = comparableValue;
      }
    } else {
      noteValue = null;
    }
  }

  const operator = rule.operator || "contains";
  let filterValue = rule.value;
  let filterValues: string[] = [];

  // Handle multiple filter values (for contains operator with multi-select properties)
  if (Array.isArray(filterValue)) {
    filterValues = filterValue.map(v => String(v));
  } else if (filterValue !== null && filterValue !== undefined && filterValue !== "") {
    filterValues = [String(filterValue)];
  }

  // For status/select/priority properties, convert option IDs to option names for comparison
  // Notes store option names, but filters store option IDs
  if ((prop.type === "status" || prop.type === "select" || prop.type === "priority") && filterValues.length > 0) {
    filterValues = filterValues.map(fv => {
      const option = prop.options?.find((opt: any) => {
        const optId = opt.id || opt.value || opt;
        return String(optId) === String(fv);
      });
      return option ? (option.name || fv) : fv;
    });
    filterValue = filterValues[0]; // Keep single value for backward compatibility
  }

  // For multi_select properties, convert option IDs to option names
  if (prop.type === "multi_select" && filterValues.length > 0) {
    filterValues = filterValues.map(fv => {
      const option = prop.options?.find((opt: any) => {
        const optId = opt.id || opt.value || opt;
        return String(optId) === String(fv);
      });
      return option ? (option.name || fv) : fv;
    });
  }

  // For rollup properties with target property, convert filter IDs to display values
  if (prop.type === "rollup" && rollupTargetProperty && filterValues.length > 0) {
    if (rollupTargetProperty.type === "select" || rollupTargetProperty.type === "status" || rollupTargetProperty.type === "priority") {
      filterValues = filterValues.map(fv => {
        const option = rollupTargetProperty!.options?.find((opt: any) => {
          const optId = opt.id || opt.value || opt;
          return String(optId) === String(fv);
        });
        return option ? (option.name || fv) : fv;
      });
    } else if (rollupTargetProperty.type === "multi_select") {
      filterValues = filterValues.map(fv => {
        const option = rollupTargetProperty!.options?.find((opt: any) => {
          const optId = opt.id || opt.value || opt;
          return String(optId) === String(fv);
        });
        return option ? (option.name || fv) : fv;
      });
    } else if (rollupTargetProperty.type === "person") {
      // For person, filter values are userIds, but rollup values are user names/emails
      // We can't convert without workspace members, so compare as-is (filter should store names/emails)
      // For now, keep filter values as-is
    } else if (rollupTargetProperty.type === "relation") {
      // For relation, filter values are note IDs, but rollup values are note titles
      // We need to convert note IDs to titles, but we don't have access to notes here
      // For now, compare as-is (this might not work correctly)
    }
  }

  // Handle empty/not empty checks
  if (operator === "is_empty") {
    if (noteValue === undefined || noteValue === null || noteValue === "") {
      return true;
    }
    if (Array.isArray(noteValue) && noteValue.length === 0) {
      return true;
    }
    return false;
  }

  if (operator === "is_not_empty") {
    if (noteValue === undefined || noteValue === null || noteValue === "") {
      return false;
    }
    if (Array.isArray(noteValue) && noteValue.length === 0) {
      return false;
    }
    return true;
  }

  // For operators that need a value, return false if value is empty
  if (filterValues.length === 0) {
    return false;
  }

  // Handle array values (multi-select, person, relation, rollup with original)
  if (Array.isArray(noteValue)) {
    switch (operator) {
      case "contains":
        // For "contains", check if note value array contains ANY of the filter values
        if (prop.type === "rollup" && rollupValues) {
          return filterValues.some((fv) => {
            return rollupValues!.some((val) => valueContains(val, fv));
          });
        } else if (prop.type === "person") {
          // Person: filter values are userIds, note values are objects with userId/userName/userEmail
          return filterValues.some((fv) => {
            return noteValue.some((val) => {
              if (typeof val === "object" && val !== null) {
                const userId = val.userId || val.id || val._id;
                const userEmail = val.userEmail || val.email;
                const userName = val.userName || val.name;
                return String(userId) === String(fv) || 
                       String(userEmail) === String(fv) || 
                       String(userName) === String(fv);
              }
              return String(val) === String(fv);
            });
          });
        } else if (prop.type === "relation") {
          // Relation: filter values are note IDs, note values are note IDs (strings or objects with noteId)
          const relationLimit = prop.relationLimit || "multiple";
          const noteIds = getRelationIdsFromValue(noteValue, relationLimit);
          return filterValues.some((fv) => {
            return noteIds.some((noteId) => String(noteId) === String(fv));
          });
        } else if (prop.type === "multi_select") {
          // Multi-select: filter values are option names (after conversion), note values are option names
          return filterValues.some((fv) => {
            return noteValue.some((val) => String(val) === String(fv));
          });
        } else {
          // Generic array handling
          return filterValues.some((fv) => {
            return noteValue.some((val) => {
              const valStr = typeof val === "object" && val !== null && val.userId 
                ? (val.userName || val.userEmail || String(val.userId))
                : String(val);
              const filterStr = String(fv);
              return valStr.toLowerCase().includes(filterStr.toLowerCase()) || valStr === filterStr;
            });
          });
        }
      case "equals":
        // For "equals", check if note value array has EXACTLY the filter values (no more, no less)
        if (prop.type === "rollup" && rollupValues) {
          if (rollupValues.length !== filterValues.length) return false;
          return filterValues.every((fv) => {
            return rollupValues!.some((val) => valuesAreEqual(val, fv));
          }) && rollupValues!.every((val) => {
            return filterValues.some((fv) => valuesAreEqual(fv, val));
          });
        } else if (prop.type === "person") {
          // Extract person IDs from note values
          const notePersonIds = noteValue.map((val) => {
            if (typeof val === "object" && val !== null) {
              return String(val.userId || val.id || val._id || "");
            }
            return String(val);
          }).filter(id => id !== "");
          
          // Must have exactly the same values, same count
          if (notePersonIds.length !== filterValues.length) return false;
          return filterValues.every((fv) => notePersonIds.includes(String(fv))) &&
                 notePersonIds.every((id) => filterValues.includes(id));
        } else if (prop.type === "relation") {
          const relationLimit = prop.relationLimit || "multiple";
          const noteIds = getRelationIdsFromValue(noteValue, relationLimit);
          
          // Must have exactly the same values, same count
          if (noteIds.length !== filterValues.length) return false;
          return filterValues.every((fv) => noteIds.some((id) => String(id) === String(fv))) &&
                 noteIds.every((id) => filterValues.some((fv) => String(fv) === String(id)));
        } else if (prop.type === "multi_select") {
          // Must have exactly the same values, same count
          if (noteValue.length !== filterValues.length) return false;
          return filterValues.every((fv) => noteValue.some((val) => String(val) === String(fv))) &&
                 noteValue.every((val) => filterValues.some((fv) => String(fv) === String(val)));
        } else {
          // Generic: must have exactly the same values
          if (noteValue.length !== filterValues.length) return false;
          const noteValueStrs = noteValue.map((val) => {
            const valStr = typeof val === "object" && val !== null && val.userId 
              ? (val.userName || val.userEmail || String(val.userId))
              : String(val);
            return valStr;
          });
          return filterValues.every((fv) => noteValueStrs.includes(String(fv))) &&
                 noteValueStrs.every((valStr) => filterValues.some((fv) => String(fv) === valStr));
        }
      case "not_equals":
        // For "not_equals", check if note value array does NOT have exactly the filter values
        // (either has different values or extra/missing values)
        if (prop.type === "rollup" && rollupValues) {
          if (rollupValues.length !== filterValues.length) return true;
          const hasAll = filterValues.every((fv) => {
            return rollupValues!.some((val) => valuesAreEqual(val, fv));
          });
          const hasOnly = rollupValues!.every((val) => {
            return filterValues.some((fv) => valuesAreEqual(fv, val));
          });
          return !(hasAll && hasOnly);
        } else if (prop.type === "person") {
          const notePersonIds = noteValue.map((val) => {
            if (typeof val === "object" && val !== null) {
              return String(val.userId || val.id || val._id || "");
            }
            return String(val);
          }).filter(id => id !== "");
          
          if (notePersonIds.length !== filterValues.length) return true;
          const hasAll = filterValues.every((fv) => notePersonIds.includes(String(fv)));
          const hasOnly = notePersonIds.every((id) => filterValues.includes(id));
          return !(hasAll && hasOnly);
        } else if (prop.type === "relation") {
          const relationLimit = prop.relationLimit || "multiple";
          const noteIds = getRelationIdsFromValue(noteValue, relationLimit);
          
          if (noteIds.length !== filterValues.length) return true;
          const hasAll = filterValues.every((fv) => noteIds.some((id) => String(id) === String(fv)));
          const hasOnly = noteIds.every((id) => filterValues.some((fv) => String(fv) === String(id)));
          return !(hasAll && hasOnly);
        } else if (prop.type === "multi_select") {
          if (noteValue.length !== filterValues.length) return true;
          const hasAll = filterValues.every((fv) => noteValue.some((val) => String(val) === String(fv)));
          const hasOnly = noteValue.every((val) => filterValues.some((fv) => String(fv) === String(val)));
          return !(hasAll && hasOnly);
        } else {
          if (noteValue.length !== filterValues.length) return true;
          const noteValueStrs = noteValue.map((val) => {
            const valStr = typeof val === "object" && val !== null && val.userId 
              ? (val.userName || val.userEmail || String(val.userId))
              : String(val);
            return valStr;
          });
          const hasAll = filterValues.every((fv) => noteValueStrs.includes(String(fv)));
          const hasOnly = noteValueStrs.every((valStr) => filterValues.some((fv) => String(fv) === valStr));
          return !(hasAll && hasOnly);
        }
      case "not_contains":
        // For "not_contains", check if note value array does NOT contain ANY of the filter values
        if (prop.type === "rollup" && rollupValues) {
          return !filterValues.some((fv) => {
            return rollupValues!.some((val) => valueContains(val, fv));
          });
        } else if (prop.type === "person") {
          return !filterValues.some((fv) => {
            return noteValue.some((val) => {
              if (typeof val === "object" && val !== null) {
                const userId = val.userId || val.id || val._id;
                const userEmail = val.userEmail || val.email;
                const userName = val.userName || val.name;
                return String(userId) === String(fv) || 
                       String(userEmail) === String(fv) || 
                       String(userName) === String(fv);
              }
              return String(val) === String(fv);
            });
          });
        } else if (prop.type === "relation") {
          const relationLimit = prop.relationLimit || "multiple";
          const noteIds = getRelationIdsFromValue(noteValue, relationLimit);
          return !filterValues.some((fv) => {
            return noteIds.some((noteId) => String(noteId) === String(fv));
          });
        } else if (prop.type === "multi_select") {
          return !filterValues.some((fv) => {
            return noteValue.some((val) => String(val) === String(fv));
          });
        } else {
          return !filterValues.some((fv) => {
            return noteValue.some((val) => {
              const valStr = typeof val === "object" && val !== null && val.userId 
                ? (val.userName || val.userEmail || String(val.userId))
                : String(val);
              const filterStr = String(fv);
              return valStr.toLowerCase().includes(filterStr.toLowerCase()) || valStr === filterStr;
            });
          });
        }
      default:
        return false;
    }
  }

  // Handle single values
  const noteValueStr = String(noteValue);
  const filterValueStr = String(filterValue);

  // For rollup with count/percent, use numeric comparison
  const isRollupNumeric = prop.type === "rollup" && 
    (rollupCalculation?.category === "count" || rollupCalculation?.category === "percent");
  
  // Parse numeric values for comparison (handles "1", "1/2", "1 1/2", "75%", etc.)
  const noteNumeric = isRollupNumeric || typeof noteValue === "number" 
    ? parseNumericValue(noteValue) 
    : null;
  const filterNumeric = parseNumericValue(filterValue);

  switch (operator) {
    case "contains":
      // For rollup numeric, check if numeric values match
      if (isRollupNumeric && noteNumeric !== null && filterNumeric !== null) {
        return noteNumeric === filterNumeric;
      }
      return noteValueStr.toLowerCase().includes(filterValueStr.toLowerCase());
    case "not_contains":
      // For rollup numeric, check if numeric values don't match
      if (isRollupNumeric && noteNumeric !== null && filterNumeric !== null) {
        return noteNumeric !== filterNumeric;
      }
      return !noteValueStr.toLowerCase().includes(filterValueStr.toLowerCase());
    case "equals":
      // For rollup numeric, use numeric comparison
      if (isRollupNumeric && noteNumeric !== null && filterNumeric !== null) {
        return noteNumeric === filterNumeric;
      }
      return noteValueStr === filterValueStr;
    case "not_equals":
      // For rollup numeric, use numeric comparison
      if (isRollupNumeric && noteNumeric !== null && filterNumeric !== null) {
        return noteNumeric !== filterNumeric;
      }
      return noteValueStr !== filterValueStr;
    case "greater_than":
      // For rollup numeric, use numeric comparison
      if (isRollupNumeric && noteNumeric !== null && filterNumeric !== null) {
        return noteNumeric > filterNumeric;
      }
      if (typeof noteValue === "number" && filterNumeric !== null) {
        return noteValue > filterNumeric;
      }
      if (noteValue instanceof Date && !isNaN(Date.parse(filterValueStr))) {
        return noteValue > new Date(filterValueStr);
      }
      return noteValueStr > filterValueStr;
    case "less_than":
      // For rollup numeric, use numeric comparison
      if (isRollupNumeric && noteNumeric !== null && filterNumeric !== null) {
        return noteNumeric < filterNumeric;
      }
      if (typeof noteValue === "number" && filterNumeric !== null) {
        return noteValue < filterNumeric;
      }
      if (noteValue instanceof Date && !isNaN(Date.parse(filterValueStr))) {
        return noteValue < new Date(filterValueStr);
      }
      return noteValueStr < filterValueStr;
    case "greater_than_or_equal":
      // For rollup numeric, use numeric comparison
      if (isRollupNumeric && noteNumeric !== null && filterNumeric !== null) {
        return noteNumeric >= filterNumeric;
      }
      if (typeof noteValue === "number" && filterNumeric !== null) {
        return noteValue >= filterNumeric;
      }
      if (noteValue instanceof Date && !isNaN(Date.parse(filterValueStr))) {
        return noteValue >= new Date(filterValueStr);
      }
      return noteValueStr >= filterValueStr;
    case "less_than_or_equal":
      // For rollup numeric, use numeric comparison
      if (isRollupNumeric && noteNumeric !== null && filterNumeric !== null) {
        return noteNumeric <= filterNumeric;
      }
      if (typeof noteValue === "number" && filterNumeric !== null) {
        return noteValue <= filterNumeric;
      }
      if (noteValue instanceof Date && !isNaN(Date.parse(filterValueStr))) {
        return noteValue <= new Date(filterValueStr);
      }
      return noteValueStr <= filterValueStr;
    default:
      return false;
  }
}

/**
 * Evaluate a single advanced filter group against a note
 * @param note - The note to check
 * @param group - The filter group
 * @param boardProperties - All board properties
 * @param getNotesByDataSourceId - Function to get notes by data source ID
 * @param getDataSource - Function to get data source
 * @returns true if note matches the group, false otherwise
 */
function evaluateAdvancedFilterGroup(
  note: Note,
  group: IAdvancedFilterGroup,
  boardProperties: Record<string, BoardProperty>,
  getNotesByDataSourceId?: (dataSourceId: string) => Note[],
  getDataSource?: (dataSourceId: string) => any
): boolean {
  const groupBooleanOperator = group.booleanOperator || "AND";
  
  // Evaluate all rules in this group, respecting individual rule boolean operators
  let ruleResult: boolean | null = null;
  for (let i = 0; i < group.rules.length; i++) {
    const rule = group.rules[i];
    if (!rule) continue;
    
    const result = applyAdvancedFilterRule(
      note,
      rule,
      boardProperties,
      getNotesByDataSourceId,
      getDataSource
    );
    
    if (ruleResult === null) {
      // First rule - just store the result
      ruleResult = result;
    } else {
      // Subsequent rules - combine with previous using rule's booleanOperator or group's default
      const ruleBooleanOp = rule.booleanOperator || groupBooleanOperator;
      if (ruleBooleanOp === "AND") {
        ruleResult = ruleResult && result;
      } else {
        // OR
        ruleResult = ruleResult || result;
      }
    }
  }

  // Evaluate nested groups
  let nestedGroupResult: boolean | null = null;
  if (group.groups && group.groups.length > 0) {
    for (let i = 0; i < group.groups.length; i++) {
      const nestedGroup = group.groups[i];
      if (!nestedGroup) continue;
      
      const result = evaluateAdvancedFilterGroup(
        note,
        nestedGroup,
        boardProperties,
        getNotesByDataSourceId,
        getDataSource
      );
      
      if (nestedGroupResult === null) {
        nestedGroupResult = result;
      } else {
        // Combine nested groups using group's booleanOperator
        if (groupBooleanOperator === "AND") {
          nestedGroupResult = nestedGroupResult && result;
        } else {
          nestedGroupResult = nestedGroupResult || result;
        }
      }
    }
  }

  // Combine rule results and nested group results
  if (ruleResult === null && nestedGroupResult === null) {
    return true; // Empty group matches everything
  }
  
  if (ruleResult === null) {
    return nestedGroupResult!;
  }
  
  if (nestedGroupResult === null) {
    return ruleResult;
  }
  
  // Both exist - combine using group's booleanOperator
  if (groupBooleanOperator === "AND") {
    return ruleResult && nestedGroupResult;
  } else {
    return ruleResult || nestedGroupResult;
  }
}

/**
 * Apply advanced filter groups to notes
 * @param notes - Array of notes to filter
 * @param groups - Array of IAdvancedFilterGroup objects
 * @param boardProperties - All board properties
 * @param getNotesByDataSourceId - Function to get notes by data source ID
 * @param getDataSource - Function to get data source
 * @returns Filtered array of notes
 */
export function applyAdvancedFilters(
  notes: Note[],
  groups: IAdvancedFilterGroup[],
  boardProperties: Record<string, BoardProperty>,
  getNotesByDataSourceId?: (dataSourceId: string) => Note[],
  getDataSource?: (dataSourceId: string) => any
): Note[] {
  if (!groups || groups.length === 0) return notes;

  return notes.filter((note) => {
    // Each group is evaluated independently (groups are combined with AND by default)
    // If any group matches, the note passes
    // You can change this logic if you want groups to be combined differently
    return groups.some((group) =>
      evaluateAdvancedFilterGroup(
        note,
        group,
        boardProperties,
        getNotesByDataSourceId,
        getDataSource
      )
    );
  });
}
