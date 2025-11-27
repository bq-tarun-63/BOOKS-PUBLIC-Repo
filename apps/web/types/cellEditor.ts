import type { Note } from "./board";
import type { Members } from "@/types/workspace";

import type { GitHubPrConfig } from "./board";

export interface CellEditorProps {
  value: any;
  property: {
    id: string;
    name: string;
    type: string;
    options?: Array<{ id?: string; name: string; color?: string }>;
    placeholder?: string;
    // Additional properties for number type
    decimalPlaces?: number;
    numberFormat?: string;
    showAs?: "number" | "bar" | "ring";
    progressColor?: string;
    progressDivideBy?: number;
    showNumberText?: boolean;
    githubPrConfig?: GitHubPrConfig | null;
  };
  note: Note;
  boardId: string;
  onUpdate: (noteId: string, propertyId: string, value: any) => void;
  onClose: () => void;
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  workspaceMembers?: Members[];
}

export interface EditingCell {
  noteId: string;
  propertyId: string;
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export type PropertyEditorType =
  | "text" 
  | "email"
  | "url"
  | "phone"
  | "number" 
  | "status" 
  | "select" 
  | "multi_select" 
  | "person" 
  | "date" 
  | "checkbox" 
  | "priority"
  | "formula"
  | "github_pr"
  | "file";

export interface PropertyEditorConfig {
  type: PropertyEditorType;
  component: React.ComponentType<CellEditorProps>;
  canEdit: boolean;
  placeholder?: string;
}
