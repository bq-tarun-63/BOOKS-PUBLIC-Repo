export type FormulaReturnType = "text" | "number" | "boolean" | "date" | undefined;

type BooleanLabels = {
  trueLabel?: string;
  falseLabel?: string;
};

export interface FormatFormulaValueOptions {
  fallback?: string;
  locale?: string;
  booleanLabels?: BooleanLabels;
}

export const isFormulaValueEmpty = (value: any): boolean =>
  value === null || value === undefined || value === "";

export const formatFormulaValue = (
  value: any,
  returnType?: FormulaReturnType,
  options?: FormatFormulaValueOptions,
): string => {
  const fallback = options?.fallback ?? "—";

  if (isFormulaValueEmpty(value)) {
    return fallback;
  }

  switch (returnType) {
    case "number": {
      const num = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(num)) {
        return String(value);
      }
      return options?.locale ? num.toLocaleString(options.locale) : num.toLocaleString();
    }

    case "boolean": {
      const trueLabel = options?.booleanLabels?.trueLabel ?? "True";
      const falseLabel = options?.booleanLabels?.falseLabel ?? "False";

      if (typeof value === "boolean") {
        return value ? trueLabel : falseLabel;
      }

      if (typeof value === "string") {
        const lower = value.toLowerCase();
        if (lower === "true") return trueLabel;
        if (lower === "false") return falseLabel;
      }

      return value ? trueLabel : falseLabel;
    }

    case "date": {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return String(value);
      }
      return date.toLocaleString(options?.locale);
    }

    default:
      return String(value);
  }
};
