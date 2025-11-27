import { canReadNote } from "../getNote/checkAccess";

export function canCreateNote({ user, parentId, parentNote }) {
  if (!parentId) return true;
  const isOwner = user.id && parentNote.userId && user.id.toString() === parentNote.userId.toString();
  if (isOwner) return true;
  if (Array.isArray(parentNote.sharedWith) && user.email) {
    
    return parentNote.sharedWith.some(entry => entry.email && entry.email.toString() === user.email.toString() && entry.access === 'write');
  }
  return false;
}