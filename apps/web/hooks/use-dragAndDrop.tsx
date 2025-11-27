import { useState } from "react";

export function useDragAndDrop<T>(items: T[], setItems: (items: T[]) => void) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
  };

  const handleDragOver = (id: string) => {
    if (draggedItemId === null || draggedItemId === id) return;

    const draggedIndex = items.findIndex((i: any) => i.id === draggedItemId);
    const targetIndex = items.findIndex((i: any) => i.id === id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...items];
    const [removed] = reordered.splice(draggedIndex, 1);
    if(!removed) return;
    reordered.splice(targetIndex, 0, removed);

    setItems(reordered);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };

  return {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    draggedItemId,
  };
}
