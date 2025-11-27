export function getNoteSharedHtml(link: string, sharedByUserName: string, workspaceName: string ,noteName: string ): string {
    return `
      
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; line-height: 1.6;">
        <h2 style="color: #007bff;">📄 Note Shared</h2>
        
        <p>Hello,</p>
        
        <p>You've been granted access to a new note named ${noteName} from workspace-${workspaceName} by user-${sharedByUserName}.</p>
  
        <p>
          You can view the note using the link below:
          <br />
          <a href="${link}" style="display: inline-block; margin-top: 10px; padding: 10px 15px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
            🔗 View Note
          </a>
        </p>
        <p> if u don't have access to this workspace, click on the button to Join the workspace ${workspaceName}.</p>
        <a href="${process.env.DOMAIN}/organization/workspace" style="display: inline-block; margin-top: 10px; padding: 10px 15px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
          🔗 Request Access 
        </a>
        <p>Thank you for using BQ Notes.</p>
  
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="background-color: #f4f4f4; padding: 10px; border-left: 4px solid #007bff; word-break: break-all;">${link}</p>
  
        <p style="margin-top: 30px;">Best regards,<br /><strong>The BQ Notes Team</strong></p>
  
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;" />
        <small style="color: #777;">This is an automated message. Please do not reply to this email.</small>
      </div>
    `;
  }
  