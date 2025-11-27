import React from "react";

interface EditIconProps {
  size?: number;
  className?: string;
  fill?: string;
}

export default function EditIcon({ size = 24, className = "", fill }: EditIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={fill || "currentColor"}
      xmlns="http://www.w3.org/2000/svg"
      className={`block flex-shrink-0 ${className}`}
    >
      <path d="M11.243 3.457a.803.803 0 0 0-1.13 0l-.554.552a.075.075 0 0 0 0 .106l1.03 1.03a.075.075 0 0 0 .107 0l.547-.546a.1.1 0 0 0 .019-.032.804.804 0 0 0-.02-1.11m-2.246 1.22a.075.075 0 0 0-.106 0l-6.336 6.326a1.1 1.1 0 0 0-.237.393l-.27.87v.002c-.062.232.153.466.389.383l.863-.267q.221-.061.397-.239l6.332-6.331a.075.075 0 0 0 0-.106zm-3.355 6.898a.08.08 0 0 0-.053.022l-1.1 1.1a.075.075 0 0 0 .053.128h9.06a.625.625 0 1 0 0-1.25z" />
    </svg>
  );
}
