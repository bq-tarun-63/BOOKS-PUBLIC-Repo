"use client";

import React, { useMemo } from "react";

interface Props {
  dateRange: string[];
  dayWidth: number;
  scrollLeft: number;
  leftLabelWidth: number; // px
  hoveredDate?: string | null;   
}

export default function TimelineHeader({
  dateRange,
  dayWidth,
  scrollLeft,
  leftLabelWidth,
  hoveredDate
}: Props) {
  const totalWidth = dateRange.length * dayWidth;
  const translateX = leftLabelWidth - scrollLeft;

  // figure out which date is currently at scrollLeft
  const visibleIndex = Math.floor(scrollLeft / dayWidth);
  const currentDate = dateRange[visibleIndex] ?? dateRange[0];

  const currentMonth = useMemo(() => {
    if (!currentDate) return "";
    const parts = currentDate.split("-").map(Number);
    const yyyy = parts[0] ?? 1970;
    const mm = parts[1] ?? 1; 

    return new Date(yyyy, mm - 1).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

  }, [currentDate]);

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-gray-200">
      <div className="flex flex-col relative">
        {/* Fixed Month Label */}
        <div
          className="px-3 py-2 border-b text-sm min-w-40 font-semibold text-gray-900 bg-background"
        >
          {currentMonth}
        </div>

        {/* Day row */}
        <div className="flex-1 overflow-hidden relative">
          <div className="relative" style={{ height: 28 }}>
            <div
              className="absolute left-0 top-0 flex items-center"
              style={{
                transform: `translateX(${translateX}px)`,
                width: totalWidth,
                willChange: "transform",
              }}
            >
              {dateRange.map((date) => {
                const parts = date.split("-").map(Number);
                 const yyyy = parts[0] ?? 1970;
                 const mm = parts[1] ?? 1; 
                 const dd = parts[2] ?? 1;
                const d = new Date(yyyy, mm - 1, dd);
                const isHovered = hoveredDate === date;

                return (
                  <div
                    key={date}
                    className={`box-border flex-shrink-0 flex items-center justify-center text-center text-xs font-medium
                      ${isHovered ? "bg-gray-200 rounded-md font-semibold" : "text-gray-700"}`}
                    style={{ minWidth: `${dayWidth}px`, width: `${dayWidth}px` }}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
