import { google } from 'googleapis';
import { WorkspaceTask } from '../types';

type GoogleAuth = Awaited<ReturnType<typeof import('../googleAuth')['getGoogleAuth']>>;

const DOCS_QUERY = "mimeType='application/vnd.google-apps.document' and trashed=false";

function extractAssigneeEmails(htmlContent?: string): string[] {
  if (!htmlContent) {
    return [];
  }

  const matches = htmlContent.match(/data-user-email=\"([^\"]+)\"/g) ?? [];
  return matches.map((match) => match.split('"')[1]).filter(Boolean);
}

export async function fetchGoogleDocsAssignments(
  auth: GoogleAuth,
  userEmail: string
): Promise<WorkspaceTask[]> {
  const drive = google.drive({ version: 'v3', auth });
  const filesResponse = await drive.files.list({
    q: DOCS_QUERY,
    fields: 'files(id,name,webViewLink)',
    orderBy: 'modifiedTime desc',
    pageSize: 30
  });

  const files = filesResponse.data.files ?? [];
  const tasks: WorkspaceTask[] = [];

  for (const file of files) {
    if (!file.id) continue;

    const commentsResponse = await drive.comments.list({
      fileId: file.id,
      fields:
        'comments(id,htmlContent,createdTime,modifiedTime,resolved,author(displayName,emailAddress),replies(id,htmlContent,createdTime,author(displayName,emailAddress),resolved))',
      includeDeleted: false,
      pageSize: 100
    });

    const comments = commentsResponse.data.comments ?? [];
    for (const comment of comments) {
      const commentAssignees = extractAssigneeEmails(comment.htmlContent);
      const isAssigned = commentAssignees.includes(userEmail.toLowerCase());

      const replies = comment.replies ?? [];
      const replyAssignments = replies.flatMap((reply) => extractAssigneeEmails(reply.htmlContent));
      const replyAssigned = replyAssignments.includes(userEmail.toLowerCase());

      if ((isAssigned || replyAssigned) && !comment.resolved) {
        tasks.push({
          id: `${file.id}:${comment.id}`,
          title: comment.htmlContent
            ? comment.htmlContent.replace(/<[^>]+>/g, '').trim()
            : 'Action item',
          source: 'Google Docs Action Item',
          link: file.webViewLink ?? undefined,
          createdTime: comment.createdTime ?? undefined,
          updatedTime: comment.modifiedTime ?? undefined,
          status: comment.resolved ? 'completed' : 'open',
          metadata: {
            documentName: file.name,
            commentId: comment.id,
            assignedFromComment: isAssigned,
            assignedFromReply: replyAssigned
          }
        });
      }
    }
  }

  return tasks;
}
