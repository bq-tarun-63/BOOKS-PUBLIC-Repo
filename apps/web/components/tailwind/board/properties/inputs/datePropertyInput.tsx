import { BoardProperty } from "@/types/board";
import React from "react";

interface Props {
  value: any;
  onChange: (val: any, immediate?: boolean) => void;
  property?: BoardProperty;
}

export const DatePropertyInput: React.FC<Props> = ({ value, onChange }) => {
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value, true)}
      className="px-2 py-1.5 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 w-[250px] hover:bg-gray-200 dark:hover:bg-[#2c2c2c] rounded-sm"
    />
  );
};
