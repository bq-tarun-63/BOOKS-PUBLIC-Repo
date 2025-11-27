export function canDeleteNote({ note, user }) {
  const admins = process.env.ADMINS?.split(",").map(e => e.trim().toLowerCase()) || [];
  const isAdmin = user.email && admins.includes(user.email.toLowerCase());
  const isOwner = user.id && note.userId && user.id.toString() === note.userId.toString();
 
if (note.noteType === "review" || note.noteType === "approved") {
    return isAdmin;
  }
  if (isOwner) return true;
  return false;
}
