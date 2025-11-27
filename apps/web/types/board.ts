export interface BoardPropertyOption {
  id: string;
  name: string;
  color?: string;
}

export type RollupCalculationCategory = "original" | "count" | "percent";
export type RollupCalculationValue = 
  | "original" 
  | "all" 
  | "per_group" 
  | "empty"
  | "non_empty";

export interface RollupCalculationMetadata {
  displayFormat?: "number" | "bar" | "ring";
  [key: string]: any; // Allow for future metadata fields
}

export interface RollupCalculation {
  category: RollupCalculationCategory;
  value: RollupCalculationValue;
  metadata?: RollupCalculationMetadata;
}

export interface RollupConfig {
  relationPropertyId?: string;
  relationDataSourceId?: string;
  targetPropertyId?: string;
  calculation?: RollupCalculation;
  selectedOptions?: string[];
}
export interface GitHubPrConfig {
  defaultOwner?: string;
  defaultRepo?: string;
  installationId?: number;
  statusPropertyId?: string;
  pendingStatusOptionId?: string;
  completedStatusOptionId?: string;
  autoSync?: boolean;
}

export interface BoardProperty {
  name: string;
  type:
    | "select"
    | "multi_select"
    | "text"
    | "number"
    | "status"
    | "person"
    | "date"
    | "checkbox"
    | "priority"
    | "formula"
    | "relation"
    | "rollup"
    | "github_pr"
    | "url"
    | "phone"
    | "email"
    | "place"
    | "file";
  default: boolean;
  options?: BoardPropertyOption[];
  showProperty: boolean;
  formula?: string;
  formulaReturnType?: "text" | "number" | "boolean" | "date";
  linkedDatabaseId?: string;
  relationLimit?: "single" | "multiple"; 
  rollup?: RollupConfig;
  githubPrConfig?: GitHubPrConfig | null;
  formMetaData?: {
    isFiedRequired?: boolean;
    isDescriptionRequired?: boolean;
    Description?: string;
    isLongAnswerRequired?: boolean;
    checkboxLabel?: string;
  };
}

export interface BoardProperties {
  [key: string]: BoardProperty;
}

export interface BoardCreatedBy {
  userId: string;
  userName: string;
  userEmail: string;
}

export interface View  {
  id?: string;
  viewType: "board" | "list" | "calendar" | "timeline" | "forms";
  title: string;
  icon: string;
  formIcon?: string; // Form page icon 
  formCoverImage?: string; // Form page cover image
  formTitle?: string;
  formDescription?: string;
  isPublicForm?: boolean;
  formAnonymousResponses?: boolean;
  formAccessToSubmission?: "no_access" | "can_view_own";
  databaseSourceId?: string; // Reference to IDatabaseSource
  settings?: {
    sorts?: Array<{ propertyId: string; direction: "ascending" | "descending" }>;
    group?: { propertyId: string; sortDirection?: "ascending" | "descending"; hideEmptyGroups?: boolean; colotColumn?: boolean };
    propertyVisibility?: Array<{ propertyId: string }>;
    filters?: Array<{ propertyId: string; value: any }>;
  };
  isLocked?: boolean;
}

export interface ViewCollection {
  _id: string;
  title: string;
  description: string;
  createdBy: BoardCreatedBy;
  createdAt: string;
  updatedAt: string;
  properties: BoardProperties;
  viewsType: View[];
  defaultDataSourceId?: string; // Reference to the default datasource created with the board
}

export interface Comment {
  commentId: string;
  commenterName: string;
  commenterEmail: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  mediaMetaData?: Array<{
    id: string;
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
    uploadedAt?: string;
  }>;
}

export interface Note {
  // define fields once you know what note contains
  // e.g.
  _id: string;
  id?: string;
  title: string;
  content: string;
  description: string;
  noteType: string;
  databaseProperties: Record<string, any>;
  formulaErrors?: Record<string, string>;
  contentPath: string;
  commitSha: string;
  comments: Comment[];
}

export type Priority = "Low" | "Medium" | "High";

export interface BoardCollectionResponse {
  success: boolean;
  collection: {
    viewCollection: ViewCollection;
    note: Note[];
  };
  message: string;
}

export interface DeletePropertyResponse {
  success: boolean;
  message: string;
}

  export interface BoardCollectionResponse {
    success: boolean;
    collection: {
      viewCollection: ViewCollection;
      note: Note[];
    };
    message: string;
  }
  
  export interface DeletePropertyResponse {
    success: boolean;
    message: string;
  }

  export interface SortItem {
    propertyId: string;
    direction: "ascending" | "descending";
  }
export interface SortItem {
  propertyId: string;
  direction: "ascending" | "descending";
}

// Database Source type (frontend representation)
export interface DatabaseSource {
  _id: string;
  title?: string; // Name/title of the data source
  properties: BoardProperties;
  settings: Record<string, any>;
  workspaceId?: string;
  isSprint?: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: BoardCreatedBy;
}
