"use client";

import { useState, useEffect } from "react";
import { DatePropertyInput } from "./datePropertyInput";

interface DateAndDueDatePropertyInputProps {
  value: string; // e.g. "2025-10-22 [2025-10-22 - 2025-10-25]"
  onChange: (val: string, immediate?: boolean) => void;
}

export function DateAndDueDatePropertyInput({ value, onChange }: DateAndDueDatePropertyInputProps) {
  const [startDate, setStartDate] = useState<string>(() => {
    const match = value?.match(/\[(.*?) - (.*?)\]/);
    return match?.[1] ?? value ?? "";
  });

  const [dueDate, setDueDate] = useState<string>(() => {
    const match = value?.match(/\[(.*?) - (.*?)\]/);
    return match?.[2] ?? value ?? "";
  });

  useEffect(() => {
    if (!value) {
      setStartDate("");
      setDueDate("");
      return;
    }

    const match = value.match(/\[(.*?) - (.*?)\]/);
    if (match) {
      setStartDate(match[1] ?? "");
      setDueDate(match[2] ?? "");
    } else {
      setStartDate(value ?? "");
      setDueDate(value ?? "");
    }
  }, [value]);

  const handleChange = (newStart: string, newDue: string) => {
    setStartDate(newStart);
    setDueDate(newDue);

    const combined = `${newStart} [${newStart} - ${newDue}]`;
    onChange(combined, true);
  };

  return (
    <div className="flex gap-2 items-center">
      <DatePropertyInput value={startDate} onChange={(val) => handleChange(val, dueDate)} />
      <span className="text-gray-500 dark:text-gray-400">-</span>
      <DatePropertyInput value={dueDate} onChange={(val) => handleChange(startDate, val)} />
    </div>
  );
}
