export type FormulaReturnType = "text" | "number" | "boolean" | "date";

export interface FormulaPropertyDefinition {
  id: string;
  name: string;
  type: string;
  formula?: string;
  formulaReturnType?: FormulaReturnType;
  options?: Array<{ name: string; color?: string }>;
}

export interface FormulaNoteLike {
  _id?: unknown;
  id?: string;
  title?: string;
  databaseProperties?: Record<string, any>;
  formulaErrors?: Record<string, string>;
  [key: string]: any;
}

export interface FormulaEvaluationResult {
  value: any;
  rawValue: any;
  returnType: FormulaReturnType | "raw";
  error?: string;
}

export interface FormulaRuntimeResult {
  note: FormulaNoteLike;
  results: Record<string, FormulaEvaluationResult>;
  errors: Record<string, string>;
}

interface CompiledFormula {
  source: string;
  sanitized: string;
  fn: (ctx: FormulaExecutionContext) => any;
}

interface FormulaExecutionContext {
  prop: (propertyName: string) => any;
  if: <T>(condition: any, truthy: T, falsy: T) => T;
  and: (...values: any[]) => boolean;
  or: (...values: any[]) => boolean;
  not: (value: any) => boolean;
  concat: (...values: any[]) => string;
  format: (value: any, locale?: string) => string;
  length: (value: any) => number;
  abs: (value: any) => number;
  round: (value: any, precision?: number) => number;
  floor: (value: any) => number;
  ceil: (value: any) => number;
  max: (...values: any[]) => number | null;
  min: (...values: any[]) => number | null;
  sum: (...values: any[]) => number | null;
  average: (...values: any[]) => number | null;
  contains: (target: any, search: any) => boolean;
  empty: (value: any) => boolean;
  toNumber: (value: any) => number | null;
  toString: (value: any) => string;
  coalesce: (...values: any[]) => any;
  now: () => Date;
  dateBetween: (start: any, end: any, unit?: DateDiffUnit) => number | null;
  dateAdd: (value: any, amount: number, unit?: DateDiffUnit) => Date | null;
  dateSubtract: (value: any, amount: number, unit?: DateDiffUnit) => Date | null;
  timestamp: (value?: any) => number | null;
  pi: () => number;
  e: () => number;
  cbrt: (value: any) => number;
  exp: (value: any) => number;
  ln: (value: any) => number;
  log10: (value: any) => number;
  log: (value: any, base?: any) => number;
  pow: (value: any, exponent: any) => number;
  sqrt: (value: any) => number;
  mod: (value: any, divisor: any) => number;
  roundup: (value: any, precision?: number) => number;
  rounddown: (value: any, precision?: number) => number;
  sign: (value: any) => number;
  sin: (value: any) => number;
  cos: (value: any) => number;
  tan: (value: any) => number;
  asin: (value: any) => number;
  acos: (value: any) => number;
  atan: (value: any) => number;
  equal: (left: any, right: any) => boolean;
  unequal: (left: any, right: any) => boolean;
  larger: (left: any, right: any) => boolean;
  largerEq: (left: any, right: any) => boolean;
  smaller: (left: any, right: any) => boolean;
  smallerEq: (left: any, right: any) => boolean;
  lower: (value: any) => string;
  upper: (value: any) => string;
  trim: (value: any) => string;
  replace: (text: any, pattern: any, replacement: any) => string;
  replaceAll: (text: any, pattern: any, replacement: any) => string;
  slice: (text: any, start: any, length?: any) => string;
  startsWith: (text: any, search: any) => boolean;
  endsWith: (text: any, search: any) => boolean;
  join: (value: any, separator?: any) => string;
}

type DateDiffUnit = "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "weeks" | "months" | "years";

interface FormulaRuntimeContext {
  properties: Record<string, FormulaPropertyDefinition>;
  nameToId: Map<string, string>;
  compiledCache: Map<string, CompiledFormula>;
  formulaPropertyIds: string[];
}

const DEFAULT_RETURN_TYPE: FormulaReturnType = "text";
const TITLE_ALIASES = ["title", "name"];

const ALLOWED_IDENTIFIER_FUNCTIONS = new Set([
  "prop",
  "if",
  "and",
  "or",
  "not",
  "concat",
  "format",
  "length",
  "abs",
  "round",
  "floor",
  "ceil",
  "max",
  "min",
  "sum",
  "average",
  "contains",
  "empty",
  "toNumber",
  "toString",
  "coalesce",
  "now",
  "dateBetween",
  "dateAdd",
  "dateSubtract",
  "timestamp",
  "pi",
  "e",
  "cbrt",
  "exp",
  "ln",
  "log10",
  "log",
  "pow",
  "sqrt",
  "mod",
  "roundup",
  "rounddown",
  "sign",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "equal",
  "unequal",
  "larger",
  "largerEq",
  "smaller",
  "smallerEq",
  "lower",
  "upper",
  "trim",
  "replace",
  "replaceAll",
  "slice",
  "startsWith",
  "endsWith",
  "join",
]);

const ALLOWED_LITERALS = new Set(["true", "false", "null"]);

const ALLOWED_SINGLE_OPERATORS = new Set(["+", "-", "*", "/", "%", "^", ">", "<", "!", "(", ")", ","]);
const ALLOWED_MULTI_OPERATORS = new Set(["**", "==", "!=", ">=", "<=", "&&", "||"]);

const EPSILON = 1e-12;

function toNumberOrThrow(value: any, functionName: string, argumentPosition: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${functionName}() argument ${argumentPosition} must be a finite number`);
  }
  return num;
}

function toOptionalNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toStringValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function compareValues(left: any, right: any): number {
  const leftNumber = toOptionalNumber(left);
  const rightNumber = toOptionalNumber(right);
  if (leftNumber !== null && rightNumber !== null) {
    if (Math.abs(leftNumber - rightNumber) < EPSILON) {
      return 0;
    }
    return leftNumber - rightNumber;
  }

  const leftText = toStringValue(left).toLowerCase();
  const rightText = toStringValue(right).toLowerCase();
  return leftText.localeCompare(rightText);
}

function parsePattern(text: any): RegExp | string {
  if (text instanceof RegExp) {
    return text;
  }

  const candidate = String(text ?? "");
  if (candidate.startsWith("/") && candidate.lastIndexOf("/") > 0) {
    try {
      const closing = candidate.lastIndexOf("/");
      const body = candidate.slice(1, closing);
      const flags = candidate.slice(closing + 1);
      return new RegExp(body, flags);
    } catch {
      // ignore invalid regexp, fall back to literal replacement
    }
  }

  return candidate;
}

enum TokenType {
  Number = "number",
  String = "string",
  Identifier = "identifier",
  Operator = "operator",
  Paren = "paren",
  Comma = "comma",
}

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export interface FormulaRuntime {
  hasFormulas: boolean;
  evaluatePropertyForNote: (
    propertyId: string,
    note: FormulaNoteLike,
    memo?: Map<string, FormulaEvaluationResult>,
    stack?: Set<string>
  ) => FormulaEvaluationResult;
  recomputeFormulasForNote: (note: FormulaNoteLike) => FormulaRuntimeResult;
  recomputeFormulasForNotes: (notes: FormulaNoteLike[]) => FormulaRuntimeResult[];
}

export function createFormulaRuntime(properties: Record<string, FormulaPropertyDefinition>): FormulaRuntime {
  const normalizedProperties: Record<string, FormulaPropertyDefinition> = {};
  const nameToId = new Map<string, string>();

  Object.entries(properties || {}).forEach(([id, prop]) => {
    const normalized: FormulaPropertyDefinition = {
      ...prop,
      id: prop.id ?? id,
      formula: prop.formula ?? "",
      formulaReturnType: prop.formulaReturnType ?? DEFAULT_RETURN_TYPE,
    };
    normalizedProperties[id] = normalized;
    nameToId.set(prop.name, id);
    nameToId.set(prop.name.toLowerCase(), id);
  });

  const formulaPropertyIds = Object.entries(normalizedProperties)
    .filter(([, prop]) => prop.type === "formula")
    .map(([id]) => id);

  const context: FormulaRuntimeContext = {
    properties: normalizedProperties,
    nameToId,
    compiledCache: new Map<string, CompiledFormula>(),
    formulaPropertyIds,
  };

  const evaluatePropertyForNote = (
    propertyId: string,
    note: FormulaNoteLike,
    memo: Map<string, FormulaEvaluationResult> = new Map(),
    stack: Set<string> = new Set()
  ) => evaluateProperty(propertyId, note, context, memo, stack);

  const recomputeFormulasForNote = (note: FormulaNoteLike): FormulaRuntimeResult => {
    if (context.formulaPropertyIds.length === 0) {
      return {
        note: { ...note },
        results: {},
        errors: {},
      };
    }

    const workingNote: FormulaNoteLike = {
      ...note,
      databaseProperties: { ...(note.databaseProperties ?? {}) },
    };

    const memo = new Map<string, FormulaEvaluationResult>();
    const errors: Record<string, string> = {};
    const results: Record<string, FormulaEvaluationResult> = {};

    for (const formulaId of context.formulaPropertyIds) {
      const result = evaluateProperty(formulaId, workingNote, context, memo, new Set());
      results[formulaId] = result;
      if (!workingNote.databaseProperties) {
        workingNote.databaseProperties = {};
      }
      workingNote.databaseProperties[formulaId] = result.error ? null : result.value ?? null;
      if (result.error) {
        errors[formulaId] = result.error;
      }
    }

    workingNote.formulaErrors = Object.keys(errors).length > 0 ? errors : undefined;

    return {
      note: workingNote,
      results,
      errors,
    };
  };

  const recomputeFormulasForNotes = (notes: FormulaNoteLike[]): FormulaRuntimeResult[] => {
    if (!Array.isArray(notes) || notes.length === 0) {
      return [];
    }
    return notes.map((note) => recomputeFormulasForNote(note));
  };

  return {
    hasFormulas: context.formulaPropertyIds.length > 0,
    evaluatePropertyForNote,
    recomputeFormulasForNote,
    recomputeFormulasForNotes,
  };
}

function evaluateProperty(
  propertyId: string,
  note: FormulaNoteLike,
  context: FormulaRuntimeContext,
  memo: Map<string, FormulaEvaluationResult>,
  stack: Set<string>
): FormulaEvaluationResult {
  if (memo.has(propertyId)) {
    return memo.get(propertyId)!;
  }

  const property = context.properties[propertyId];
  if (!property) {
    const missingResult: FormulaEvaluationResult = {
      value: null,
      rawValue: null,
      returnType: "raw",
      error: `Property '${propertyId}' not found`,
    };
    memo.set(propertyId, missingResult);
    return missingResult;
  }

  if (property.type !== "formula") {
    const rawValue = readPropertyValue(propertyId, property, note);
    const result: FormulaEvaluationResult = {
      value: rawValue,
      rawValue,
      returnType: "raw",
    };
    memo.set(propertyId, result);
    return result;
  }

  const expression = property.formula?.trim();
  if (!expression) {
    const emptyResult: FormulaEvaluationResult = {
      value: null,
      rawValue: null,
      returnType: property.formulaReturnType ?? DEFAULT_RETURN_TYPE,
    };
    memo.set(propertyId, emptyResult);
    return emptyResult;
  }

  if (stack.has(propertyId)) {
    const cycleResult: FormulaEvaluationResult = {
      value: null,
      rawValue: null,
      returnType: property.formulaReturnType ?? DEFAULT_RETURN_TYPE,
      error: "Circular formula reference detected",
    };
    memo.set(propertyId, cycleResult);
    return cycleResult;
  }

  stack.add(propertyId);
  let rawValue: any = null;
  let executionError: string | undefined;

  try {
    const compiled = compileFormula(expression, context);
    const execCtx = buildExecutionContext(propertyId, note, context, memo, stack);
    rawValue = compiled.fn(execCtx);
  } catch (error) {
    executionError =
      error instanceof Error ? error.message : "Failed to execute formula";
  } finally {
    stack.delete(propertyId);
  }

  const coerced = coerceValueForReturnType(
    rawValue,
    property.formulaReturnType ?? DEFAULT_RETURN_TYPE
  );

  const error = executionError ?? coerced.error;
  const finalResult: FormulaEvaluationResult = {
    value: error ? null : coerced.value,
    rawValue,
    returnType: property.formulaReturnType ?? DEFAULT_RETURN_TYPE,
    error,
  };

  memo.set(propertyId, finalResult);
  return finalResult;
}

function compileFormula(
  expression: string,
  context: FormulaRuntimeContext
): CompiledFormula {
  const cached = context.compiledCache.get(expression);
  if (cached) {
    return cached;
  }

  const sanitized = sanitizeExpression(expression);
  let fn: (ctx: FormulaExecutionContext) => any;

  try {
    // eslint-disable-next-line no-new-func
    fn = new Function("ctx", `"use strict"; return (${sanitized});`) as (
      ctx: FormulaExecutionContext
    ) => any;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to compile formula";
    throw new Error(`Formula compilation error: ${message}`);
  }

  const compiled: CompiledFormula = { source: expression, sanitized, fn };
  context.compiledCache.set(expression, compiled);
  return compiled;
}

function sanitizeExpression(expression: string): string {
  const tokens = tokenize(expression);
  const sanitizedTokens: string[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case TokenType.Number: {
        sanitizedTokens.push(token.value);
        break;
      }
      case TokenType.String: {
        const parsed = parseStringLiteral(token.value, token.position);
        sanitizedTokens.push(JSON.stringify(parsed));
        break;
      }
      case TokenType.Identifier: {
        const lower = token.value.toLowerCase();
        if (ALLOWED_LITERALS.has(lower)) {
          sanitizedTokens.push(lower);
        } else if (ALLOWED_IDENTIFIER_FUNCTIONS.has(token.value)) {
          sanitizedTokens.push(`ctx.${token.value}`);
        } else {
          throw new Error(
            `Unsupported identifier '${token.value}' in formula at position ${token.position}`
          );
        }
        break;
      }
      case TokenType.Operator: {
        if (token.value === "^") {
          sanitizedTokens.push("**");
        } else if (
          ALLOWED_SINGLE_OPERATORS.has(token.value) ||
          ALLOWED_MULTI_OPERATORS.has(token.value)
        ) {
          sanitizedTokens.push(token.value);
        } else {
          throw new Error(
            `Unsupported operator '${token.value}' in formula at position ${token.position}`
          );
        }
        break;
      }
      case TokenType.Paren:
      case TokenType.Comma: {
        sanitizedTokens.push(token.value);
        break;
      }
      default:
        throw new Error(
          `Unsupported token '${token.value}' in formula at position ${token.position}`
        );
    }
  }

  return sanitizedTokens.join(" ");
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  const length = expression.length;
  let index = 0;

  while (index < length) {
    const char = expression[index] ?? "";

    if (isWhitespace(char)) {
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const { token, nextIndex } = readStringToken(expression, index);
      tokens.push(token);
      index = nextIndex;
      continue;
    }

    if (isDigit(char) || (char === "." && isDigit(expression[index + 1] ?? ""))) {
      const { token, nextIndex } = readNumberToken(expression, index);
      tokens.push(token);
      index = nextIndex;
      continue;
    }

    if (isIdentifierStart(char)) {
      const { token, nextIndex } = readIdentifierToken(expression, index);
      tokens.push(token);
      index = nextIndex;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: TokenType.Comma, value: char, position: index });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: TokenType.Paren, value: char, position: index });
      index += 1;
      continue;
    }

    const twoChar = expression.slice(index, index + 2);
    if (ALLOWED_MULTI_OPERATORS.has(twoChar)) {
      tokens.push({ type: TokenType.Operator, value: twoChar, position: index });
      index += 2;
      continue;
    }

    if (ALLOWED_SINGLE_OPERATORS.has(char)) {
      tokens.push({ type: TokenType.Operator, value: char, position: index });
      index += 1;
      continue;
    }

    throw new Error(
      `Unsupported character '${char}' in formula at position ${index}`
    );
  }

  return tokens;
}

function readStringToken(expression: string, start: number): {
  token: Token;
  nextIndex: number;
} {
  const quote = expression[start];
  let index = start + 1;
  let escaped = false;

  while (index < expression.length) {
    const char = expression[index] ?? "";
    if (escaped) {
      escaped = false;
      index += 1;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      index += 1;
      continue;
    }
    if (char === quote) {
      const value = expression.slice(start, index + 1);
      return {
        token: { type: TokenType.String, value, position: start },
        nextIndex: index + 1,
      };
    }
    index += 1;
  }

  throw new Error(`Unterminated string literal starting at position ${start}`);
}

function readNumberToken(expression: string, start: number): {
  token: Token;
  nextIndex: number;
} {
  let index = start;
  let hasDot = false;
  let hasExponent = false;

  while (index < expression.length) {
    const char = expression[index] ?? "";

    if (isDigit(char)) {
      index += 1;
      continue;
    }

    if (char === "." && !hasDot && !hasExponent) {
      hasDot = true;
      index += 1;
      continue;
    }

    if ((char === "e" || char === "E") && !hasExponent) {
      hasExponent = true;
      index += 1;
      if (expression[index] === "+" || expression[index] === "-") {
        index += 1;
      }
      continue;
    }

    break;
  }

  const value = expression.slice(start, index);
  if (!value || value === "." || value === "+" || value === "-") {
    throw new Error(`Invalid number literal at position ${start}`);
  }

  return {
    token: { type: TokenType.Number, value, position: start },
    nextIndex: index,
  };
}

function readIdentifierToken(expression: string, start: number): {
  token: Token;
  nextIndex: number;
} {
  let index = start;

  while (index < expression.length) {
    const char = expression[index] ?? "";
    if (isIdentifierPart(char)) {
      index += 1;
    } else {
      break;
    }
  }

  const value = expression.slice(start, index);
  return {
    token: { type: TokenType.Identifier, value, position: start },
    nextIndex: index,
  };
}

function parseStringLiteral(raw: string, position: number): string {
  const quote = raw[0];
  if (quote !== '"' && quote !== "'") {
    throw new Error(`Invalid string literal at position ${position}`);
  }

  let jsonReady = raw;
  if (quote === "'") {
    const inner = raw.slice(1, -1).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    jsonReady = `"${inner}"`;
  }

  try {
    return JSON.parse(jsonReady);
  } catch {
    throw new Error(`Invalid string literal at position ${position}`);
  }
}

function buildExecutionContext(
  propertyId: string,
  note: FormulaNoteLike,
  context: FormulaRuntimeContext,
  memo: Map<string, FormulaEvaluationResult>,
  stack: Set<string>
): FormulaExecutionContext {
  const propFn = (propertyName: string): any => {
    if (typeof propertyName !== "string" || !propertyName.trim()) {
      throw new Error("prop() requires a property name");
    }

    const directMatch = context.nameToId.get(propertyName);
    const normalizedMatch = context.nameToId.get(propertyName.toLowerCase());

    if (directMatch) {
      const result = evaluateProperty(directMatch, note, context, memo, stack);
      if (result.error) {
        const dependencyName = context.properties[directMatch]?.name ?? propertyName;
        throw new Error(
          `Dependency '${dependencyName}' error: ${result.error}`
        );
      }
      return result.value ?? null;
    }

    if (normalizedMatch) {
      const result = evaluateProperty(normalizedMatch, note, context, memo, stack);
      if (result.error) {
        const dependencyName = context.properties[normalizedMatch]?.name ?? propertyName;
        throw new Error(
          `Dependency '${dependencyName}' error: ${result.error}`
        );
      }
      return result.value ?? null;
    }

    const lowerName = propertyName.toLowerCase();
    if (TITLE_ALIASES.includes(lowerName)) {
      return note.title ?? "";
    }

    throw new Error(`Property '${propertyName}' does not exist`);
  };

  const ctx: FormulaExecutionContext = {
    prop: propFn,
    if: (condition, truthy, falsy) => (condition ? truthy : falsy),
    and: (...values: any[]) => values.every((value) => Boolean(value)),
    or: (...values: any[]) => values.some((value) => Boolean(value)),
    not: (value: any) => !value,
    concat: (...values: any[]) =>
      values
        .map((value) =>
          value instanceof Date ? value.toISOString() : value ?? ""
        )
        .join(""),
    format: (value: any, locale?: string) => {
      if (value == null) return "";
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "number") {
        return Number.isFinite(value)
          ? value.toLocaleString(locale)
          : "";
      }
      return String(value);
    },
    length: (value: any) => {
      if (value == null) return 0;
      if (typeof value === "string") return value.length;
      if (Array.isArray(value)) return value.length;
      if (value instanceof Date) return value.toISOString().length;
      if (typeof value === "object") return Object.keys(value).length;
      return String(value).length;
    },
    abs: (value: any) => {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        throw new Error("abs() requires a numeric value");
      }
      return Math.abs(num);
    },
    round: (value: any, precision = 0) => roundWithPrecision(value, precision),
    floor: (value: any) => {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        throw new Error("floor() requires a numeric value");
      }
      return Math.floor(num);
    },
    ceil: (value: any) => {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        throw new Error("ceil() requires a numeric value");
      }
      return Math.ceil(num);
    },
    max: (...values: any[]) => {
      const nums = values.map(Number).filter((num) => Number.isFinite(num));
      return nums.length === 0 ? null : Math.max(...nums);
    },
    min: (...values: any[]) => {
      const nums = values.map(Number).filter((num) => Number.isFinite(num));
      return nums.length === 0 ? null : Math.min(...nums);
    },
    sum: (...values: any[]) => {
      const nums = values.map(Number).filter((num) => Number.isFinite(num));
      return nums.length === 0 ? null : nums.reduce((acc, val) => acc + val, 0);
    },
    average: (...values: any[]) => {
      const nums = values.map(Number).filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return nums.reduce((acc, val) => acc + val, 0) / nums.length;
    },
    contains: (target: any, search: any) => {
      if (target == null || search == null) return false;
      if (Array.isArray(target)) {
        return target.some((item) => String(item) === String(search));
      }
      return String(target).includes(String(search));
    },
    empty: (value: any) => {
      if (value == null) return true;
      if (typeof value === "string") return value.trim() === "";
      if (Array.isArray(value)) return value.length === 0;
      if (value instanceof Date) return Number.isNaN(value.getTime());
      if (typeof value === "object") return Object.keys(value).length === 0;
      return false;
    },
    toNumber: (value: any) => {
      if (value == null) return null;
      if (typeof value === "number" && Number.isFinite(value)) return value;
      const converted = Number(value);
      return Number.isFinite(converted) ? converted : null;
    },
    toString: (value: any) => {
      if (value == null) return "";
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    },
    coalesce: (...values: any[]) => {
      for (const value of values) {
        if (value !== null && value !== undefined && value !== "") {
          return value;
        }
      }
      return null;
    },
    now: () => new Date(),
    dateBetween: (start: any, end: any, unit: DateDiffUnit = "days") =>
      dateDiff(start, end, unit),
    dateAdd: (value: any, amount: number, unit: DateDiffUnit = "days") =>
      dateAdd(value, amount, unit),
    dateSubtract: (value: any, amount: number, unit: DateDiffUnit = "days") =>
      dateAdd(value, -amount, unit),
    timestamp: (value?: any) => {
      if (value === undefined) {
        return Date.now();
      }
      const date = toDate(value);
      return date ? date.getTime() : null;
    },
    pi: () => Math.PI,
    e: () => Math.E,
    cbrt: (value: any) => Math.cbrt(toNumberOrThrow(value, "cbrt", 1)),
    exp: (value: any) => Math.exp(toNumberOrThrow(value, "exp", 1)),
    ln: (value: any) => {
      const num = toNumberOrThrow(value, "ln", 1);
      if (num <= 0) {
        throw new Error("ln() requires a positive number");
      }
      return Math.log(num);
    },
    log10: (value: any) => {
      const num = toNumberOrThrow(value, "log10", 1);
      if (num <= 0) {
        throw new Error("log10() requires a positive number");
      }
      return Math.log10(num);
    },
    log: (value: any, base: any = 10) => {
      const num = toNumberOrThrow(value, "log", 1);
      const baseNum = toNumberOrThrow(base, "log", 2);
      if (num <= 0 || baseNum <= 0 || baseNum === 1) {
        throw new Error("log() requires positive number and base not equal to 1");
      }
      return Math.log(num) / Math.log(baseNum);
    },
    pow: (value: any, exponent: any) => Math.pow(
      toNumberOrThrow(value, "pow", 1),
      toNumberOrThrow(exponent, "pow", 2)
    ),
    sqrt: (value: any) => {
      const num = toNumberOrThrow(value, "sqrt", 1);
      if (num < 0) {
        throw new Error("sqrt() requires a non-negative number");
      }
      return Math.sqrt(num);
    },
    mod: (value: any, divisor: any) => {
      const dividend = toNumberOrThrow(value, "mod", 1);
      const divisorNum = toNumberOrThrow(divisor, "mod", 2);
      if (Math.abs(divisorNum) < EPSILON) {
        throw new Error("mod() divisor cannot be 0");
      }
      return dividend - divisorNum * Math.floor(dividend / divisorNum);
    },
    roundup: (value: any, precision = 0) => {
      const num = toNumberOrThrow(value, "roundup", 1);
      const prec = clampPrecision(toNumberOrThrow(precision, "roundup", 2));
      const factor = 10 ** prec;
      return Math.ceil(num * factor) / factor;
    },
    rounddown: (value: any, precision = 0) => {
      const num = toNumberOrThrow(value, "rounddown", 1);
      const prec = clampPrecision(toNumberOrThrow(precision, "rounddown", 2));
      const factor = 10 ** prec;
      return Math.floor(num * factor) / factor;
    },
    sign: (value: any) => Math.sign(toNumberOrThrow(value, "sign", 1)),
    sin: (value: any) => Math.sin(toNumberOrThrow(value, "sin", 1)),
    cos: (value: any) => Math.cos(toNumberOrThrow(value, "cos", 1)),
    tan: (value: any) => Math.tan(toNumberOrThrow(value, "tan", 1)),
    asin: (value: any) => Math.asin(toNumberOrThrow(value, "asin", 1)),
    acos: (value: any) => Math.acos(toNumberOrThrow(value, "acos", 1)),
    atan: (value: any) => Math.atan(toNumberOrThrow(value, "atan", 1)),
    equal: (left: any, right: any) => compareValues(left, right) === 0,
    unequal: (left: any, right: any) => compareValues(left, right) !== 0,
    larger: (left: any, right: any) => compareValues(left, right) > 0,
    largerEq: (left: any, right: any) => compareValues(left, right) >= 0,
    smaller: (left: any, right: any) => compareValues(left, right) < 0,
    smallerEq: (left: any, right: any) => compareValues(left, right) <= 0,
    lower: (value: any) => toStringValue(value).toLowerCase(),
    upper: (value: any) => toStringValue(value).toUpperCase(),
    trim: (value: any) => toStringValue(value).trim(),
    replace: (text: any, pattern: any, replacement: any) => {
      const target = toStringValue(text);
      const matcher = parsePattern(pattern);
      return typeof matcher === "string"
        ? target.replace(matcher, toStringValue(replacement))
        : target.replace(matcher, toStringValue(replacement));
    },
    replaceAll: (text: any, pattern: any, replacement: any) => {
      const target = toStringValue(text);
      const matcher = parsePattern(pattern);
      if (typeof matcher === "string") {
        return target.split(matcher).join(toStringValue(replacement));
      }
      const globalMatcher = matcher.global ? matcher : new RegExp(matcher.source, `${matcher.flags}g`);
      return target.replace(globalMatcher, toStringValue(replacement));
    },
    slice: (text: any, start: any, length?: any) => {
      const str = toStringValue(text);
      const startIndex = Math.trunc(toNumberOrThrow(start, "slice", 2));
      if (length === undefined || length === null) {
        return str.slice(startIndex);
      }
      const sliceLength = Math.trunc(toNumberOrThrow(length, "slice", 3));
      const endIndex = startIndex + Math.max(0, sliceLength);
      return str.slice(startIndex, endIndex);
    },
    startsWith: (text: any, search: any) => toStringValue(text).startsWith(toStringValue(search)),
    endsWith: (text: any, search: any) => toStringValue(text).endsWith(toStringValue(search)),
    join: (value: any, separator: any = "") => {
      const list = Array.isArray(value) ? value : value == null ? [] : [value];
      return list.map((item) => toStringValue(item)).join(toStringValue(separator));
    },
  };

  return ctx;
}

function readPropertyValue(
  propertyId: string,
  property: FormulaPropertyDefinition,
  note: FormulaNoteLike
) {
  const data = note.databaseProperties ?? {};
  if (property.type === "title") {
    return note.title ?? "";
  }
  return data[propertyId];
}

function coerceValueForReturnType(
  rawValue: any,
  expectedType: FormulaReturnType
): { value: any; error?: string } {
  if (rawValue === undefined || rawValue === null) {
    return { value: null };
  }

  switch (expectedType) {
    case "text": {
      if (typeof rawValue === "string") {
        return { value: rawValue };
      }
      if (rawValue instanceof Date) {
        return { value: rawValue.toISOString() };
      }
      if (typeof rawValue === "object") {
        try {
          return { value: JSON.stringify(rawValue) };
        } catch {
          return { value: String(rawValue) };
        }
      }
      return { value: String(rawValue) };
    }
    case "number": {
      if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        return { value: rawValue };
      }
      const converted = Number(rawValue);
      if (Number.isFinite(converted)) {
        return { value: converted };
      }
      return { value: null, error: "Formula result could not be converted to number" };
    }
    case "boolean": {
      if (typeof rawValue === "boolean") {
        return { value: rawValue };
      }
      if (typeof rawValue === "string") {
        const lower = rawValue.toLowerCase();
        if (lower === "true") return { value: true };
        if (lower === "false") return { value: false };
      }
      return { value: Boolean(rawValue) };
    }
    case "date": {
      const date = toDate(rawValue);
      if (!date) {
        return { value: null, error: "Formula result could not be converted to date" };
      }
      return { value: date.toISOString() };
    }
    default:
      return { value: rawValue };
  }
}

function roundWithPrecision(value: any, precision = 0): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error("round() requires a numeric value");
  }

  const factor = 10 ** clampPrecision(precision);
  return Math.round(num * factor) / factor;
}

function clampPrecision(precision: number): number {
  if (!Number.isFinite(precision)) return 0;
  if (precision > 10) return 10;
  if (precision < -10) return -10;
  return Math.trunc(precision);
}

function dateDiff(start: any, end: any, unit: DateDiffUnit): number | null {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return null;

  const diffMs = endDate.getTime() - startDate.getTime();

  switch (unit) {
    case "milliseconds":
      return diffMs;
    case "seconds":
      return diffMs / 1000;
    case "minutes":
      return diffMs / (1000 * 60);
    case "hours":
      return diffMs / (1000 * 60 * 60);
    case "days":
      return diffMs / (1000 * 60 * 60 * 24);
    case "weeks":
      return diffMs / (1000 * 60 * 60 * 24 * 7);
    case "months": {
      const years = endDate.getFullYear() - startDate.getFullYear();
      const months = endDate.getMonth() - startDate.getMonth();
      const totalMonths = years * 12 + months;
      const dayDiff = endDate.getDate() - startDate.getDate();
      return totalMonths + dayDiff / 30;
    }
    case "years":
      return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    default:
      return diffMs / (1000 * 60 * 60 * 24);
  }
}

function dateAdd(value: any, amount: number, unit: DateDiffUnit): Date | null {
  const date = toDate(value);
  if (!date || !Number.isFinite(amount)) return null;

  const result = new Date(date);
  switch (unit) {
    case "milliseconds":
      result.setMilliseconds(result.getMilliseconds() + amount);
      break;
    case "seconds":
      result.setSeconds(result.getSeconds() + amount);
      break;
    case "minutes":
      result.setMinutes(result.getMinutes() + amount);
      break;
    case "hours":
      result.setHours(result.getHours() + amount);
      break;
    case "days":
      result.setDate(result.getDate() + amount);
      break;
    case "weeks":
      result.setDate(result.getDate() + amount * 7);
      break;
    case "months":
      result.setMonth(result.getMonth() + amount);
      break;
    case "years":
      result.setFullYear(result.getFullYear() + amount);
      break;
    default:
      result.setDate(result.getDate() + amount);
      break;
  }
  return result;
}

function toDate(value: any): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

function isDigit(char: string): boolean {
  return /[0-9]/.test(char);
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char);
}
