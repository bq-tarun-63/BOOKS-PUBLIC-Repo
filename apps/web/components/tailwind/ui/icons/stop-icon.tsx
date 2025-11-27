import React from "react";

export default function StopIcon({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Blue circular background */}
      <circle
        cx="12"
        cy="12"
        r="12"
        fill="#3b82f6"
      />
      
      {/* White stop square */}
      <rect
        x="7"
        y="7"
        width="10"
        height="10"
        fill="white"
      />
    </svg>
  );
}