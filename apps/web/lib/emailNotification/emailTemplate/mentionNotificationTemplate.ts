export function getMentionNotificationHtml(
    noteTitle: string,
    link: string,
    mentionedBy: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; line-height: 1.6;">
        <h2 style="color: #007bff;">💬 You Were Mentioned!</h2>
        
        <p>Hello,</p>
        
        <p><strong>${mentionedBy}</strong> mentioned you in the note <strong>"${noteTitle}"</strong>.</p>
  
        <p>
          You can view the note using the link below:
          <br />
          <a href="${link}" style="display: inline-block; margin-top: 10px; padding: 10px 15px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
            🔗 View Mention
          </a>
        </p>
  
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="background-color: #f4f4f4; padding: 10px; border-left: 4px solid #007bff; word-break: break-all;">${link}</p>
  
        <p style="margin-top: 30px;">Best regards,<br /><strong>The BQ Notes Team</strong></p>
  
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;" />
        <small style="color: #777;">This is an automated message. Please do not reply to this email.</small>
      </div>
    `;
  }
  