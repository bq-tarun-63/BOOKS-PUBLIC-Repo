import { BoardProperty } from "@/types/board";
import React from "react";

interface Props {
  value: any;
  onChange: (val: any, immediate?: boolean) => void;
  property?: BoardProperty;
}

export const DefaultPropertyInput: React.FC<Props> = ({ value, onChange, property }) => {
  return (
    <input
      type="text"
      value={value ?? ""}
      placeholder={`Enter ${property?.name ?? "value"}`}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1.5 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 w-[250px] hover:bg-gray-200 dark:hover:bg-[#2c2c2c] rounded-sm"
    />
  );
};
