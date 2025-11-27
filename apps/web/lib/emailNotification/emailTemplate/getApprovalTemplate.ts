export function getApprovalEmailHtml(title: string, approveLink: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;">
            <tr>
              <td style="padding: 30px;">
                <h2 style="margin-top: 0; color: #2c3e50;">Note Approval Required</h2>
                <p style="font-size: 16px;">A new note has been published and requires your approval.</p>
  
                <p style="font-size: 16px;">
                  <strong>Title:</strong> ${title}
                </p>
  
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${approveLink}" 
                     style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                    Review & Approve Note
                  </a>
                </p>
  
                <p style="font-size: 14px; color: #777;">If the button above doesn't work, copy and paste the following link into your browser:</p>
                <p style="font-size: 14px; color: #555;"><a href="${approveLink}" style="color: #1a73e8;">${approveLink}</a></p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #aaa;">This is an automated message. Please do not reply.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }
  