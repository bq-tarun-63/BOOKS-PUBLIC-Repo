export function canReadNote({ note, user }) {
  const isOwner = user.id && note.userId && user.id.toString() === note.userId.toString();
  if (note.isTemplate) return true;
  if (isOwner) return true;

  if (note.isPublicNote === true) return true;
  if (note.noteType === "review" || note.noteType ==="approved") {
    const admins = process.env.ADMINS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    return admins.includes(user.email.toLowerCase());
  }

  if (Array.isArray(note.sharedWith) && user.email) {
    for (const entry of note.sharedWith) {
      if (!entry.email) {
        continue;
      }
      if (entry.email.toString() === user.email.toString()) {
        if (entry.access === "read" || entry.access === "write") {
          return true;
        }
      }
    }
  }

  return false;
}
