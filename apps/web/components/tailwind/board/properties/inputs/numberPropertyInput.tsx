import { BoardProperty } from "@/types/board";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getColorStyles } from "@/utils/colorStyles";

interface Props {
  value: any;
  onChange: (val: any, immediate?: boolean) => void;
  property?: BoardProperty;
}

export const NumberPropertyInput: React.FC<Props> = ({ value, onChange, property }) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  // Get decimal places from property
  const decimalPlaces = (property as any)?.decimalPlaces ?? undefined;

  // Helper function to round number based on decimal places
  const roundNumber = (num: number): number => {
    if (decimalPlaces === undefined || decimalPlaces === null) {
      return num;
    }
    const multiplier = Math.pow(10, decimalPlaces);
    return Math.round(num * multiplier) / multiplier;
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    if (nextValue === "") {
      onChange(undefined);
    } else {
      onChange(Number(nextValue));
    }
  };

  const handleBlur = () => {
    // Round the value before saving
    if (value !== undefined && value !== null && value !== "") {
      const numValue = Number(value);
      if (Number.isFinite(numValue)) {
        const roundedValue = roundNumber(numValue);
        onChange(roundedValue);
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      // Round the value before saving
      if (value !== undefined && value !== null && value !== "") {
        const numValue = Number(value);
        if (Number.isFinite(numValue)) {
          const roundedValue = roundNumber(numValue);
          onChange(roundedValue);
        }
      }
      setIsEditing(false);
    }
  };

  const parsedNumber = typeof value === "number" ? value : Number(value);
  const numValue = Number.isFinite(parsedNumber) ? parsedNumber : 0;
  const showAs = (property as any)?.showAs || "number";
  const progressColor = (property as any)?.progressColor || "blue";
  const progressDivideByRaw = (property as any)?.progressDivideBy;
  const showNumberText = (property as any)?.showNumberText !== false; // default true
  const divideBy = progressDivideByRaw && progressDivideByRaw !== 0 ? progressDivideByRaw : 100;

  const displayContent = useMemo(() => {
    const numberNode = showNumberText ? (
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{numValue}</span>
    ) : null;

  if (showAs === "bar") {
    // Calculate percentage: (value / divideBy) * 100, capped at 100%
    const percentage = Math.min(100, Math.max(0, (numValue / divideBy) * 100));
      const colorStyles = getColorStyles(progressColor);
      return (
        <div className="flex items-center gap-2">
          {numberNode}
          <div className="flex-1">
            <div
              className="relative w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
              style={{ height: "4px" }}
            >
              <div
                className="absolute rounded-full h-full transition-all"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: colorStyles.dot,
                }}
              />
            </div>
          </div>
        </div>
      );
    }

  if (showAs === "ring") {
    // Calculate percentage: (value / divideBy) * 100, capped at 100%
    const percentage = Math.min(100, Math.max(0, (numValue / divideBy) * 100));
      const colorStyles = getColorStyles(progressColor);
      const circumference = 2 * Math.PI * 6; // radius = 6
      const offset = circumference - (percentage / 100) * circumference;
      return (
        <div className="flex items-center gap-2">
          {numberNode}
          <svg viewBox="0 0 14 14" width="20" height="20" className="flex-shrink-0">
            <circle cx="7" cy="7" r="6" fill="none" strokeWidth="2" className="stroke-gray-200 dark:stroke-gray-700" />
            <g transform="rotate(-90 7 7)">
              <circle
                cx="7"
                cy="7"
                r="6"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{
                  stroke: colorStyles.dot,
                  transition: "stroke-dashoffset 0.5s ease-out",
                }}
              />
            </g>
          </svg>
        </div>
      );
    }

    return (
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {Number.isFinite(numValue) ? numValue : ""}
      </span>
    );
  }, [showAs, showNumberText, numValue, divideBy, progressColor]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={value ?? ""}
        placeholder="Enter number"
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="px-2 py-1.5 bg-transparent border border-gray-300 dark:border-gray-600 rounded-sm text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 w-[250px] focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );
  }

  return (
    <div
      className="px-2 py-1.5 w-[250px] rounded-sm hover:bg-gray-200 dark:hover:bg-[#2c2c2c] cursor-pointer transition-colors"
      role="button"
      tabIndex={0}
      onClick={() => setIsEditing(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setIsEditing(true);
        }
      }}
    >
      {displayContent}
    </div>
  );
};
