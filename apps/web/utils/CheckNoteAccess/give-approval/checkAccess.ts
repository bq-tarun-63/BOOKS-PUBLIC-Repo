export function canGiveApproval(user) {
  if (!user || !user.email) return false;
  const admins = process.env.ADMINS?.split(",").map(e => e.trim().toLowerCase()) || [];
  return admins.includes(user.email.toLowerCase());
}
