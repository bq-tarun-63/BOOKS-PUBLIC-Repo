export interface ActivityLog {
  _id: string;
  noteId: string;
  userId: string;
  userEmail: string;
  userName: string;
  noteName: string;
  workspaceId?: string;
  organizationDomain?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SHARE' ;
  field: 'title' | 'emoji'|'content'|'changeVisibility'|'comment'|'mention'|'note'|'property'|'view';
  serviceType: 'GITHUB' | 'MONGODB';
  timestamp: Date;
  oldValue?: any;
  newValue: any;
}