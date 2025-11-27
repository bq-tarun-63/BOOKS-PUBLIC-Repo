export interface Members {
  userId: string; 
  userEmail: string;
  role: string;
  joinedAt: string;
  userName: string
}

export interface Request {
  userEmail: string
}


export interface Notifications {
  notificationId: string;
  requesterName: string;
  requesterId: string;
  requesterEmail: string
  type: string;
  message: string;
  read: boolean;
  createdAt: string
}

export interface WorkspaceGroup {
  id: string;
  name: string;
  members: Members[];
  createdAt: Date | string;
}

export interface Workspace {
    _id: string;
    name: string;
    icon: string;
    slug: string;
    orgDomain: string;
    createdAt: string;
    members: Members[];
    ownerId: string;
    admins: [];
    requests: Request[];
    notifications: Notifications[]
    type: 'public' | 'private'
    groups: WorkspaceGroup[];
  }
  
export interface WorkspaceResponse {
    message: string;
    workspaces: Workspace[];
  }