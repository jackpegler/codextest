import { google } from 'googleapis';
import { WorkspaceTask } from '../types';

type GoogleAuth = Awaited<ReturnType<typeof import('../googleAuth')['getGoogleAuth']>>;

export async function fetchGoogleChatTasks(
  auth: GoogleAuth,
  userEmail: string
): Promise<WorkspaceTask[]> {
  const chat = google.chat({ version: 'v1', auth });
  const spacesResponse = await chat.spaces.list({ pageSize: 50 });
  const spaces = spacesResponse.data.spaces ?? [];

  const allTasks: WorkspaceTask[] = [];
  for (const space of spaces) {
    if (!space.name) continue;

    try {
      const tasksResponse = await (chat as any).spaces.tasks.list({
        parent: space.name,
        assignee: `users/${userEmail}`
      });
      const tasks = tasksResponse.data.tasks ?? [];
      for (const task of tasks) {
        if (!task.name) continue;
        allTasks.push({
          id: task.name,
          title: task.title ?? 'Chat task',
          source: 'Google Chat Task',
          link: task.thread?.name ? `https://chat.google.com/${task.thread.name.replace('spaces/', '').replace('/threads/', '/')}` : undefined,
          due: task.dueDateTime ?? undefined,
          createdTime: task.createTime ?? undefined,
          updatedTime: task.updateTime ?? undefined,
          status: task.state,
          description: task.description ?? undefined,
          metadata: {
            space: {
              name: space.name,
              displayName: space.displayName
            },
            assignee: task.assignee,
            creator: task.creator
          }
        });
      }
    } catch (error) {
      // Ignore spaces where the API is not enabled or permissions are missing.
      continue;
    }
  }

  return allTasks;
}
