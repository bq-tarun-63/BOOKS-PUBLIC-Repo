export interface User {
  id?: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  role?: string;
  organizationId?: string; 
  organizationDomain?: string; 
  accessibleNotes?: {
    noteId: string;
    access: string;
  }[];
}