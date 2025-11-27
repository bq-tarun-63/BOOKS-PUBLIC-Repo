"use client";

type DeleteButtonProps = {
  onDelete: () => void;
};

export default function DeleteButton({ onDelete }: DeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onDelete}
      className="px-3 py-1 text-sm bg-accent rounded-lg text-red-500 text-muted-foreground hover:text-gray-700 dark:hover:text-gray-100 font-semibold"
    >
      Delete
    </button>
  );
}
