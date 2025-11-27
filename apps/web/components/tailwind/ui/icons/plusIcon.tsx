import React from "react";

interface PlusIconProps {
  size?: number;
  className?: string;
  fill?: string;
}

export default function PlusIcon({ size = 24, className = "", fill }: PlusIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={fill || "currentColor"}
      xmlns="http://www.w3.org/2000/svg"
      className={`block flex-shrink-0 ${className}`}
    >
      <path d="M8 2.74a.66.66 0 0 1 .66.66v3.94h3.94a.66.66 0 0 1 0 1.32H8.66v3.94a.66.66 0 0 1-1.32 0V8.66H3.4a.66.66 0 0 1 0-1.32h3.94V3.4A.66.66 0 0 1 8 2.74" />
    </svg>
  );
}
