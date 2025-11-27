export type RelationValue = string | { noteId?: string } | Array<string | { noteId?: string } | null | undefined> | null | undefined;

export function getRelationIdsFromValue(
  value: RelationValue,
  relationLimit: "single" | "multiple" = "multiple",
): string[] {
  if (value === null || value === undefined || value === "") {
    return [];
  }

  const items = Array.isArray(value) ? value : [value];
  const ids = items
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed ? trimmed : null;
      }
      if (typeof item === "object" && "noteId" in item && item.noteId) {
        const id = String(item.noteId).trim();
        return id ? id : null;
      }
      return null;
    })
    .filter((id): id is string => !!id);

  if (relationLimit === "single") {
    return ids.length > 0 ? [ids[0]!] : [];
  }

  return ids;
}

