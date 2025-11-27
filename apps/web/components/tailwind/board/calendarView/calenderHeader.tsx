"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarHeaderProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

export default function CalendarHeader({
  currentDate,
  setCurrentDate,
}: CalendarHeaderProps) {
    
  const goToPrevious = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const goToNext = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="flex items-center justify-between p-2">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white m-2">
        {currentDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
      </h2>

      <div className="flex items-center space-x-1">
        <button
          onClick={goToPrevious}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={goToToday}
          className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
        >
          Today
        </button>
        <button
          onClick={goToNext}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
