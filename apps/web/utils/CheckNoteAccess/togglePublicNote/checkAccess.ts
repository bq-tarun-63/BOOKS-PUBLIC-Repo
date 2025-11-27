export function canTogglePublicNote({ note, user }) {
  const isOwner = user.id && note.userId && user.id.toString() === note.userId.toString();
  if (isOwner) return true;
  if (Array.isArray(note.sharedWith) && user.email) {
    return note.sharedWith.some(entry => entry.email && entry.email.toString() === user.email.toString() && entry.access === 'write');
  }
  return false;
}
