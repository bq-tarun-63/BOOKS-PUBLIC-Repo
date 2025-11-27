export function canAccessUserNotes({ note, user }) {
  return user.id && note.userId && user.id.toString() === note.userId.toString();
}
