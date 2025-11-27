// Accepts an array of notes and a user, returns true if user owns all notes
export function canReorderRootNotes({ notes, user }) {
  return notes.every(
    (note) => user.id && note.userId && String(user.id) == String(note.userId),
  );
}
