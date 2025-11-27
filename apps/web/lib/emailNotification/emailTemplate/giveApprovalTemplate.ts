export function getApprovalEmailTemplate(noteTitle: string, approved: boolean) {
  const subject = approved
    ? `✅ Your note "${noteTitle}" has been approved`
    : `❌ Your note "${noteTitle}" has been rejected`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px;">
      <h2 style="color: ${approved ? "#28a745" : "#dc3545"}; margin-bottom: 10px;">
        ${approved ? "Note Approved ✅" : "Note Rejected ❌"}
      </h2>

      <p>Dear User,</p>

      <p>Your note titled <strong>"${noteTitle}"</strong> has been 
        <strong style="color: ${approved ? "#28a745" : "#dc3545"};">
          ${approved ? "APPROVED" : "REJECTED"}
        </strong>.
      </p>

      ${
        approved
          ? `<p>✅ You may now proceed with publishing or sharing the note as needed.</p>`
          : `<p>❌ Please review the content and make the necessary changes before resubmitting.</p>`
      }

      <p style="margin-top: 30px;">Best regards,<br /><strong>The Editorial Team</strong></p>
      
      <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;" />
      <small style="color: #777;">This is an automated message. Please do not reply to this email.</small>
    </div>
  `;

  return { subject, html: htmlBody };
}