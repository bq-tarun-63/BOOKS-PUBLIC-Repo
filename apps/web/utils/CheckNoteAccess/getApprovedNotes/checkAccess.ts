export function canGetApprovedNotes({ user }) {
  const adminEmails = (process.env.ADMINS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return user && user.email && adminEmails.includes(user.email.toLowerCase());
}
