/**
 * Centralized color styles utility for board components
 * Provides consistent color mapping across the application
 */

export type ColorName = 
  | "default" 
  | "gray" 
  | "brown" 
  | "orange" 
  | "yellow" 
  | "green" 
  | "blue" 
  | "purple" 
  | "pink" 
  | "red";

export interface BaseColorStyles {
  bg: string;
  text: string;
  dot: string;
}

export interface ColorStylesWithBadge extends BaseColorStyles {
  badge: string;
}

export interface ColorStylesWithBorder {
  bg: string;
  text: string;
  border: string;
}

export interface ColorStylesMinimal {
  bg: string;
  text: string;
}

export interface ColorStylesBgDot {
  bg: string;
  dot: string;
}

/**
 * Base color map with RGB/RGBA values
 * This is the most commonly used format across board components
 */
const BASE_COLOR_MAP: Record<ColorName, BaseColorStyles> = {
  default: { 
    bg: "rgba(206, 205, 202, 0.5)", 
    text: "rgb(55, 53, 47)", 
    dot: "rgb(155, 154, 151)" 
  },
  gray: { 
    bg: "rgba(227, 226, 224, 0.5)", 
    text: "rgb(50, 48, 44)", 
    dot: "rgb(151, 149, 146)" 
  },
  brown: { 
    bg: "rgba(238, 224, 218, 0.5)", 
    text: "rgb(68, 42, 30)", 
    dot: "rgb(159, 107, 83)" 
  },
  orange: { 
    bg: "rgba(250, 222, 201, 0.5)", 
    text: "rgb(73, 41, 14)", 
    dot: "rgb(217, 115, 13)" 
  },
  yellow: { 
    bg: "rgba(251, 243, 219, 0.5)", 
    text: "rgb(64, 44, 27)", 
    dot: "rgb(203, 145, 47)" 
  },
  green: { 
    bg: "rgba(219, 237, 219, 0.5)", 
    text: "rgb(28, 56, 41)", 
    dot: "rgb(68, 131, 97)" 
  },
  blue: { 
    bg: "rgba(211, 229, 239, 0.5)", 
    text: "rgb(24, 51, 71)", 
    dot: "rgb(51, 126, 169)" 
  },
  purple: { 
    bg: "rgba(232, 222, 238, 0.5)", 
    text: "rgb(65, 36, 84)", 
    dot: "rgb(144, 101, 176)" 
  },
  pink: { 
    bg: "rgba(245, 224, 233, 0.5)", 
    text: "rgb(76, 35, 55)", 
    dot: "rgb(193, 76, 138)" 
  },
  red: { 
    bg: "rgba(255, 226, 221, 0.5)", 
    text: "rgb(93, 23, 21)", 
    dot: "rgb(212, 76, 71)" 
  },
} as const;

/**
 * Get color styles with bg, text, and dot
 * This is the most common format used across board components
 */
export function getColorStyles(colorName: ColorName | string = "default"): BaseColorStyles {
  const color = (colorName in BASE_COLOR_MAP ? colorName : "default") as ColorName;
  return BASE_COLOR_MAP[color] || BASE_COLOR_MAP.default;
}

/**
 * Get color styles with badge (same as bg)
 * Used in boardView.tsx
 */
export function getColorStylesWithBadge(colorName: ColorName | string = "default"): ColorStylesWithBadge {
  const base = getColorStyles(colorName);
  return {
    ...base,
    badge: base.bg,
  };
}

/**
 * Get color styles with only bg and text (no dot)
 * Used in calendarCard.tsx and boardViewCard.tsx
 */
export function getColorStylesMinimal(colorName: ColorName | string = "default"): ColorStylesMinimal {
  const base = getColorStyles(colorName);
  return {
    bg: base.bg,
    text: base.text,
  };
}

/**
 * Get color styles with only bg and dot (no text)
 * Used in editSinglePropertyModal.tsx (but with Tailwind classes)
 */
export function getColorStylesBgDot(colorName: ColorName | string = "default"): ColorStylesBgDot {
  const base = getColorStyles(colorName);
  return {
    bg: base.bg,
    dot: base.dot,
  };
}

/**
 * Export the base color map for direct access if needed
 */
export { BASE_COLOR_MAP };

