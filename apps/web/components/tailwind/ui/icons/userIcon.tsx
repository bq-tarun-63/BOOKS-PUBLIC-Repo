import React from "react";

interface UserIconProps {
  size?: number;
  className?: string;
  fill?: string;
}

export default function UserIcon({ size = 24, className = "", fill }: UserIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={fill || "currentColor"}
      xmlns="http://www.w3.org/2000/svg"
      className={`block flex-shrink-0 ${className}`}
    >
      <path d="M8 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1z" />
    </svg>
  );
}
