import React from "react";

interface EllipsisIconProps {
  size?: number;
  className?: string;
  fill?: string;
}

export default function EllipsisIcon({ size = 24, className = "", fill }: EllipsisIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={fill || "currentColor"}
      xmlns="http://www.w3.org/2000/svg"
      className={`block flex-shrink-0 ${className}`}
    >
      <path d="M3.2 6.725a1.275 1.275 0 1 0 0 2.55 1.275 1.275 0 0 0 0-2.55m4.8 0a1.275 1.275 0 1 0 0 2.55 1.275 1.275 0 0 0 0-2.55m4.8 0a1.275 1.275 0 1 0 0 2.55 1.275 1.275 0 0 0 0-2.55" />
    </svg>
  );
}