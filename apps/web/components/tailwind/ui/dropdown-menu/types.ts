import { ReactNode } from 'react';

export interface DropdownMenuItemProps {
  // Required
  id?: string | number; // For React key
  label: string;
  onClick: (e?: React.MouseEvent) => void | Promise<void>;
  
  // Optional - Visual elements
  icon?: ReactNode; // Icon on the left
  hasChevron?: boolean; // Show ChevronRight icon (default: false)
  count?: string | number; // Count/text shown left of ChevronRight (like "2" in Sort button)
  badge?: string | number; // Badge element (if needed)
  rightElement?: ReactNode; // Custom right-side element (e.g., CheckCircle for selected items)
  selected?: boolean; // Selected state (for radio/checklist style menus)
  
  // Optional - Behavior
  disabled?: boolean;
  variant?: 'default' | 'destructive'; // 'destructive' makes it red on hover (for delete/remove)
  
  // Optional - Styling
  className?: string;
  
  // Optional - Events
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  'aria-label'?: string;
}

export interface DropdownMenuProps {
  items: DropdownMenuItemProps[]; // Array of menu items - loops through this!
  className?: string;
  dividerAfter?: number[]; // Indices after which to show dividers
}

