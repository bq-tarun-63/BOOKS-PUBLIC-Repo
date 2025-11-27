import React, { useState } from "react";

interface Props {
  id: string;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (id: string) => void;
  children: React.ReactNode;
}

export const Draggable: React.FC<Props> = ({
  id,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}) => {
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isOver, setIsOver] = useState<boolean>(false);
  return (
    
    <div
      draggable
      onDragStart={() => {
        setIsDragging(true);
        onDragStart(id)
      }}
      onDragEnd={() => { 
        setIsDragging(false)
        onDragEnd();
      }}
      onDragOver={(e) => {
        e.preventDefault(); // Required for drop to fire
        setIsOver(true);
        onDragOver(id);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={() => {
        setIsOver(false);
        onDrop(id);
      }}
      className={`transition-all ${
        isDragging ? "opacity-50" : ""
      } ${isOver ? "border-2 border-blue-500 rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
};
