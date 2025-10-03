import { google } from 'googleapis';
import { getGoogleWorkspaceConfig } from './config';

const SCOPES = [
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/chat.tasks.readonly',
  'https://www.googleapis.com/auth/calendar.readonly'
];

export async function getGoogleAuth() {
  const { serviceAccountEmail, privateKey, delegatedUser } = getGoogleWorkspaceConfig();
  const client = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: SCOPES,
    subject: delegatedUser
  });

  await client.authorize();
  return client;
}
