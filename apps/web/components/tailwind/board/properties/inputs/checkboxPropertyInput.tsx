import { BoardProperty } from "@/types/board";
import React from "react";

interface Props {
  value: any;
  onChange: (val: any, immediate?: boolean) => void;
  property?: BoardProperty;
}

export const CheckboxPropertyInput: React.FC<Props> = ({ value, onChange }) => {
  return (
    <input
      type="checkbox"
      checked={!!value}
      onChange={(e) => onChange(e.target.checked, true)}
      className="mx-2"
    />
  );
};
