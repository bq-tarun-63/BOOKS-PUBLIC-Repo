import type { JSONContent } from "@tiptap/core";
import type { EditorView } from "prosemirror-view";

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
};

export const MIN_COLUMN_PERCENT = 5;

export const clampColumnCount = (value: number) => clamp(value || 1, 1, 5);

export const getDefaultColumnWidths = (columnCount: number): number[] => {
  const safeCount = clampColumnCount(columnCount);
  if (safeCount <= 0) {
    return [];
  }
  const base = parseFloat((100 / safeCount).toFixed(2));
  return Array.from({ length: safeCount }, () => base);
};

export const normalizeColumnWidths = (columnCount: number, widths?: number[]): number[] => {
  const safeCount = clampColumnCount(columnCount);
  const defaults = getDefaultColumnWidths(safeCount);
  if (!Array.isArray(widths) || widths.length !== safeCount) {
    return defaults;
  }
  const defaultValue = defaults[0] ?? 100 / safeCount;
  const numeric = widths as number[];
  const positiveValues = numeric.map((value, index): number => {
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
    return defaults[index] ?? defaultValue;
  });

  const total = positiveValues.reduce((sum: number, value: number) => sum + value, 0);
  if (total === 0) {
    return defaults;
  }

  return positiveValues.map((value) => parseFloat(((value / total) * 100).toFixed(2)));
};

export const parseWidthsInput = (input: string | null | undefined, columnCount: number, fallback?: number[]) => {
  const initial = normalizeColumnWidths(columnCount, fallback);
  if (!input) {
    return initial;
  }

  const parsed = input
    .split(/[,/|]+/)
    .map((value) => parseFloat(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (parsed.length !== clampColumnCount(columnCount)) {
    return initial;
  }

  return normalizeColumnWidths(columnCount, parsed);
};

export const parseWidthsAttribute = (value: unknown, columnCount: number) => {
  if (typeof value !== "string" || !value.trim()) {
    return getDefaultColumnWidths(columnCount);
  }

  const parsed = value
    .split(",")
    .map((segment) => parseFloat(segment.trim()))
    .filter((num) => Number.isFinite(num) && num > 0);

  if (!parsed.length) {
    return getDefaultColumnWidths(columnCount);
  }

  return normalizeColumnWidths(columnCount, parsed);
};

export const getGridTemplateFromWidths = (widths: number[]) => {
  if (!widths.length) {
    return "repeat(1, minmax(200px, 1fr))";
  }
  const normalized = widths.map((width) => Math.max(width, MIN_COLUMN_PERCENT));
  const total = normalized.reduce((sum, width) => sum + width, 0) || normalized.length;
  return normalized
    .map((width) => `${((width / total) * 100).toFixed(2)}%`)
    .join(" ");
};

type ColumnContent = JSONContent[] | undefined;

export const buildColumnLayoutNode = (
  columnCount: number,
  widths?: number[],
  columnContents?: ColumnContent[],
) => {
  const normalized = normalizeColumnWidths(columnCount, widths);
  return {
    type: "columnLayout",
    attrs: {
      columns: clampColumnCount(columnCount),
      widths: normalized.join(","),
    },
    content: normalized.map((width, index) => ({
      type: "columnItem",
      attrs: { width },
      content: columnContents?.[index]?.length ? columnContents[index] : [{ type: "paragraph" }],
    })),
  };
};

export const applyColumnWidths = (view: EditorView, nodePos: number, nextWidths: number[]) => {
  const { state } = view;
  const node = state.doc.nodeAt(nodePos);
  if (!node || node.type.name !== "columnLayout") {
    return;
  }
  const normalized = normalizeColumnWidths(node.childCount, nextWidths);
  const widthsAttr = normalized.map((value) => parseFloat(value.toFixed(2))).join(",");
  const attrs = {
    ...node.attrs,
    columns: clampColumnCount(node.attrs.columns ?? normalized.length),
    widths: widthsAttr,
  };

  let tr = state.tr;
  let hasChanges = false;

  if (node.attrs.widths !== widthsAttr) {
    tr = tr.setNodeMarkup(nodePos, undefined, attrs);
    hasChanges = true;
  }

  node.forEach((child, offset, index) => {
    const childPos = nodePos + 1 + offset;
    const fallbackWidth = normalized[normalized.length - 1] ?? 100;
    const nextWidth = parseFloat((normalized[index] ?? fallbackWidth).toFixed(2));
    const currentWidthRaw = child.attrs.width;
    const currentWidth =
      typeof currentWidthRaw === "number" ? currentWidthRaw : parseFloat(String(currentWidthRaw ?? nextWidth));

    if (!Number.isFinite(currentWidth) || Math.abs(currentWidth - nextWidth) > 0.01) {
      tr = tr.setNodeMarkup(childPos, undefined, {
        ...child.attrs,
        width: nextWidth,
      });
      hasChanges = true;
    }
  });

  if (hasChanges && tr.docChanged) {
    view.dispatch(tr);
  }
};

