export function canUploadContent({ note, user }) {
  const isOwner = user.id && note.userId && user.id.toString() === note.userId.toString();
  if (note.isTemplate) return Boolean(isOwner);
  if (note.isPublicNote === true && note.isRestrictedPage !== true) return true;
  if (note?.isRestrictedPage) return isOwner;
  if (isOwner) return true;
  
  if (Array.isArray(note.sharedWith) && user.email) {
    
    return note.sharedWith.some(entry => entry.email && entry.email.toString() === user.email.toString() && entry.access === 'write');
  }
  return false;
}
