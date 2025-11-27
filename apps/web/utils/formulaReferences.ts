import type { FormulaReturnType } from "./formatFormulaValue";

export type FormulaFunctionSpec = {
  id: string;
  name: string;
  signature: string;
  description: string;
  examples: Array<{ code: string; result: string }>;
};

export type FormulaFunctionGroup = {
  title: string;
  items: FormulaFunctionSpec[];
};

const PROPERTY_TOKEN_REGEX = /prop\("(?:[^"\\]|\\.)*"\)/g;

const FORMULA_TOKEN_CLASS =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 text-xs font-medium";
const FORMULA_FUNCTION_CLASS = "text-blue-600 dark:text-blue-300 font-semibold";
const FORMULA_NUMBER_CLASS = "text-emerald-600 dark:text-emerald-400 font-medium";

const extractPropertyName = (token: string): string => {
  const match = token.match(/^prop\("(.*)"\)$/);
  if (!match) return token;
  return match[1]?.replace(/\\"/g, '"') ?? token;
};

const escapeHtml = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttribute = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const FORMULA_FUNCTION_GROUPS: FormulaFunctionGroup[] = [
  {
    title: "Logic & Comparison",
    items: [
      {
        id: "equals",
        name: "==",
        signature: "value == other",
        description: "Checks if two values are equal.",
        examples: [
          { code: "3 == 2", result: "false" },
          { code: 'equal("A", "A")', result: "true" },
        ],
      },
      {
        id: "unequal",
        name: "!=",
        signature: "value != other",
        description: "Returns true when two values are different.",
        examples: [
          { code: '"Task" != "Task"', result: "false" },
          { code: 'unequal("Task", "Review")', result: "true" },
        ],
      },
      {
        id: "larger",
        name: "larger",
        signature: "larger(value, other)",
        description: "Returns true if the first value is greater than the second.",
        examples: [{ code: "larger(7, 4)", result: "true" }],
      },
      {
        id: "largerEq",
        name: "largerEq",
        signature: "largerEq(value, other)",
        description: "Returns true if the first value is greater than or equal to the second.",
        examples: [{ code: "largerEq(5, 5)", result: "true" }],
      },
      {
        id: "smaller",
        name: "smaller",
        signature: "smaller(value, other)",
        description: "Returns true if the first value is less than the second.",
        examples: [{ code: "smaller(2, 4)", result: "true" }],
      },
      {
        id: "smallerEq",
        name: "smallerEq",
        signature: "smallerEq(value, other)",
        description: "Returns true if the first value is less than or equal to the second.",
        examples: [{ code: "smallerEq(4, 4)", result: "true" }],
      },
      {
        id: "and",
        name: "and",
        signature: "and(...conditions)",
        description: "True only when every argument is truthy.",
        examples: [{ code: 'and(prop("Done"), prop("Approved"))', result: "false" }],
      },
      {
        id: "or",
        name: "or",
        signature: "or(...conditions)",
        description: "True when at least one argument is truthy.",
        examples: [{ code: 'or(prop("Done"), prop("Approved"))', result: "true" }],
      },
      {
        id: "not",
        name: "not",
        signature: "not(condition)",
        description: "Inverts a boolean value.",
        examples: [{ code: "not(true)", result: "false" }],
      },
      {
        id: "if",
        name: "if",
        signature: "if(condition, truthy, falsy)",
        description: "Returns one of two values based on a condition.",
        examples: [{ code: 'if(prop("Status") == "Done", "✅", "…")', result: '"✅"' }],
      },
    ],
  },
  {
    title: "Math",
    items: [
      {
        id: "abs",
        name: "abs",
        signature: "abs(number)",
        description: "Returns the absolute value of a number.",
        examples: [{ code: "abs(-7)", result: "7" }],
      },
      {
        id: "ceil",
        name: "ceil",
        signature: "ceil(number)",
        description: "Rounds a number up to the nearest integer.",
        examples: [{ code: "ceil(4.2)", result: "5" }],
      },
      {
        id: "floor",
        name: "floor",
        signature: "floor(number)",
        description: "Rounds a number down to the nearest integer.",
        examples: [{ code: "floor(4.9)", result: "4" }],
      },
      {
        id: "round",
        name: "round",
        signature: "round(number, precision)",
        description: "Rounds to the specified number of decimal places.",
        examples: [{ code: "round(8.456, 2)", result: "8.46" }],
      },
      {
        id: "roundup",
        name: "roundup",
        signature: "roundup(number, precision)",
        description: "Rounds up to the specified number of decimal places.",
        examples: [{ code: "roundup(8.123, 1)", result: "8.2" }],
      },
      {
        id: "rounddown",
        name: "rounddown",
        signature: "rounddown(number, precision)",
        description: "Rounds down to the specified number of decimal places.",
        examples: [{ code: "rounddown(8.987, 2)", result: "8.98" }],
      },
      {
        id: "sqrt",
        name: "sqrt",
        signature: "sqrt(number)",
        description: "Returns the square root of a number.",
        examples: [{ code: "sqrt(81)", result: "9" }],
      },
      {
        id: "cbrt",
        name: "cbrt",
        signature: "cbrt(number)",
        description: "Returns the cube root of a number.",
        examples: [{ code: "cbrt(27)", result: "3" }],
      },
      {
        id: "pow",
        name: "pow",
        signature: "pow(number, exponent)",
        description: "Raises a number to a power.",
        examples: [{ code: "pow(2, 4)", result: "16" }],
      },
      {
        id: "log",
        name: "log",
        signature: "log(number, base)",
        description: "Calculates the logarithm using an optional base.",
        examples: [{ code: "log(100, 10)", result: "2" }],
      },
      {
        id: "ln",
        name: "ln",
        signature: "ln(number)",
        description: "Calculates the natural logarithm of a positive number.",
        examples: [{ code: "ln(exp(1))", result: "1" }],
      },
      {
        id: "log10",
        name: "log10",
        signature: "log10(number)",
        description: "Calculates the base-10 logarithm of a positive number.",
        examples: [{ code: "log10(1000)", result: "3" }],
      },
      {
        id: "exp",
        name: "exp",
        signature: "exp(number)",
        description: "Returns e raised to the specified power.",
        examples: [{ code: "exp(1)", result: "2.718281828" }],
      },
      {
        id: "pi",
        name: "pi",
        signature: "pi()",
        description: "Returns the mathematical constant π.",
        examples: [{ code: "pi()", result: "3.141592654" }],
      },
      {
        id: "e",
        name: "e",
        signature: "e()",
        description: "Returns Euler's number e.",
        examples: [{ code: "e()", result: "2.718281828" }],
      },
      {
        id: "mod",
        name: "mod",
        signature: "mod(dividend, divisor)",
        description: "Returns the remainder with the sign of the divisor.",
        examples: [{ code: "mod(17, 5)", result: "2" }],
      },
      {
        id: "sign",
        name: "sign",
        signature: "sign(number)",
        description: "Returns -1, 0, or 1 based on the sign of the number.",
        examples: [{ code: "sign(-9)", result: "-1" }],
      },
      {
        id: "sin",
        name: "sin",
        signature: "sin(number)",
        description: "Calculates the sine of a number (radians).",
        examples: [{ code: "sin(0)", result: "0" }],
      },
      {
        id: "cos",
        name: "cos",
        signature: "cos(number)",
        description: "Calculates the cosine of a number (radians).",
        examples: [{ code: "cos(0)", result: "1" }],
      },
      {
        id: "tan",
        name: "tan",
        signature: "tan(number)",
        description: "Calculates the tangent of a number (radians).",
        examples: [{ code: "tan(0)", result: "0" }],
      },
      {
        id: "sum",
        name: "sum",
        signature: "sum(...values)",
        description: "Adds all numeric values together.",
        examples: [{ code: "sum(4, 6, 10)", result: "20" }],
      },
      {
        id: "average",
        name: "average",
        signature: "average(...values)",
        description: "Calculates the arithmetic mean.",
        examples: [{ code: "average(3, 5, 10)", result: "6" }],
      },
      {
        id: "min",
        name: "min",
        signature: "min(...values)",
        description: "Returns the smallest of the provided values.",
        examples: [{ code: "min(6, 2, 9)", result: "2" }],
      },
      {
        id: "max",
        name: "max",
        signature: "max(...values)",
        description: "Returns the largest of the provided values.",
        examples: [{ code: "max(6, 2, 9)", result: "9" }],
      },
    ],
  },
  {
    title: "Text",
    items: [
      {
        id: "concat",
        name: "concat",
        signature: "concat(value, ...more)",
        description: "Merges values into a single string.",
        examples: [{ code: 'concat("Hello", " ", prop("Name"))', result: '"Hello Alex"' }],
      },
      {
        id: "format",
        name: "format",
        signature: "format(value)",
        description: "Converts a value to a string.",
        examples: [{ code: 'format(prop("Due date"))', result: '"Dec 24, 2024"' }],
      },
      {
        id: "length",
        name: "length",
        signature: "length(value)",
        description: "Returns the number of characters or items.",
        examples: [{ code: 'length(prop("Tags"))', result: "3" }],
      },
      {
        id: "lower",
        name: "lower",
        signature: "lower(text)",
        description: "Converts all letters to lowercase.",
        examples: [{ code: 'lower("Hello")', result: '"hello"' }],
      },
      {
        id: "upper",
        name: "upper",
        signature: "upper(text)",
        description: "Converts all letters to uppercase.",
        examples: [{ code: 'upper("Hello")', result: '"HELLO"' }],
      },
      {
        id: "trim",
        name: "trim",
        signature: "trim(text)",
        description: "Removes leading and trailing whitespace.",
        examples: [{ code: 'trim(" Hello ")', result: '"Hello"' }],
      },
      {
        id: "replace",
        name: "replace",
        signature: "replace(text, pattern, replacement)",
        description: "Replaces the first match of pattern in text.",
        examples: [{ code: 'replace("total", "t", "T")', result: '"Total"' }],
      },
      {
        id: "replaceAll",
        name: "replaceAll",
        signature: "replaceAll(text, pattern, replacement)",
        description: "Replaces every match of pattern in text.",
        examples: [{ code: 'replaceAll("a-b-c", "-", "_")', result: '"a_b_c"' }],
      },
      {
        id: "slice",
        name: "slice",
        signature: "slice(text, start, length)",
        description: "Returns a portion of a string.",
        examples: [{ code: 'slice("Notion", 0, 3)', result: '"Not"' }],
      },
      {
        id: "startsWith",
        name: "startsWith",
        signature: "startsWith(text, search)",
        description: "Checks whether text begins with the search string.",
        examples: [{ code: 'startsWith("Status", "Sta")', result: "true" }],
      },
      {
        id: "endsWith",
        name: "endsWith",
        signature: "endsWith(text, search)",
        description: "Checks whether text ends with the search string.",
        examples: [{ code: 'endsWith("Status", "us")', result: "true" }],
      },
      {
        id: "contains",
        name: "contains",
        signature: "contains(text, search)",
        description: "Checks whether text contains the search string.",
        examples: [{ code: 'contains("Notion", "ti")', result: "true" }],
      },
      {
        id: "join",
        name: "join",
        signature: "join(list, separator)",
        description: "Joins array values with an optional separator.",
        examples: [{ code: 'join(prop("Tags"), ", ")', result: '"Design, Review"' }],
      },
    ],
  },
];

const FUNCTION_NAME_SET = new Set(
  FORMULA_FUNCTION_GROUPS.flatMap((group) =>
    group.items
      .map((fn) => fn.id)
      .filter((name) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)),
  ),
);
FUNCTION_NAME_SET.add("prop");

const highlightFormulaSegment = (segment: string): string => {
  if (!segment) return "";

  const tokenRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b|(\d+(?:\.\d+)?)/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(segment)) !== null) {
    const [fullMatch, identifier, numberLiteral] = match;
    result += escapeHtml(segment.slice(lastIndex, match.index));

    if (identifier && FUNCTION_NAME_SET.has(identifier)) {
      result += `<span class="${FORMULA_FUNCTION_CLASS}">${escapeHtml(identifier)}</span>`;
    } else if (numberLiteral) {
      result += `<span class="${FORMULA_NUMBER_CLASS}">${escapeHtml(numberLiteral)}</span>`;
    } else {
      result += escapeHtml(fullMatch);
    }

    lastIndex = match.index + fullMatch.length;
  }

  result += escapeHtml(segment.slice(lastIndex));
  return result;
};

export const renderFormulaDisplay = (formula: string): string => {
  let result = "";
  let lastIndex = 0;
  const tokenRegex = new RegExp(PROPERTY_TOKEN_REGEX.source, "g");

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(formula)) !== null) {
    const token = match[0];
    const offset = match.index;
    result += highlightFormulaSegment(formula.slice(lastIndex, offset));
    const name = extractPropertyName(token);
    result += `<span contenteditable="false" data-formula-token="${escapeAttribute(token)}" class="${FORMULA_TOKEN_CLASS}">`;
    result += escapeHtml(name);
    result += "</span>";
    lastIndex = offset + token.length;
  }

  result += highlightFormulaSegment(formula.slice(lastIndex));
  return result;
};

export const extractFormulaFromElement = (element: HTMLElement): string => {
  let result = "";
  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? "";
      return;
    }

    if (node.nodeName === "BR") {
      result += "\n";
      return;
    }

    if (node instanceof HTMLElement) {
      const token = node.getAttribute("data-formula-token");
      if (token) {
        result += token;
      } else {
        result += extractFormulaFromElement(node);
      }
    }
  });
  return result;
};

export const getFormulaReturnLabel = (value: FormulaReturnType): string => {
  switch (value) {
    case "number":
      return "Number";
    case "boolean":
      return "Boolean";
    case "date":
      return "Date";
    case "text":
    default:
      return "Text";
  }
};
