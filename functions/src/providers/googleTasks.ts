import { google } from 'googleapis';
import { WorkspaceTask } from '../types';

type GoogleAuth = Awaited<ReturnType<typeof import('../googleAuth')['getGoogleAuth']>>;

const TASK_LINK_BASE = 'https://tasks.google.com/embed/list';

export async function fetchGoogleTasks(auth: GoogleAuth): Promise<WorkspaceTask[]> {
  const tasksClient = google.tasks({ version: 'v1', auth });
  const tasklistsResponse = await tasksClient.tasklists.list({ maxResults: 50 });
  const tasklists = tasklistsResponse.data.items ?? [];

  const taskPromises = tasklists.map(async (list) => {
    if (!list.id) {
      return [] as WorkspaceTask[];
    }

    const tasksResponse = await tasksClient.tasks.list({
      tasklist: list.id,
      showCompleted: false,
      showHidden: false,
      maxResults: 200
    });

    const items = tasksResponse.data.items ?? [];
    return items
      .filter((task) => task.id && !task.deleted)
      .map<WorkspaceTask>((task) => ({
        id: `${list.id}:${task.id}`,
        title: task.title ?? 'Untitled Task',
        source: 'Google Tasks',
        link: task.id
          ? `${TASK_LINK_BASE}/${encodeURIComponent(list.id!)}?task=${encodeURIComponent(task.id)}`
          : undefined,
        due: task.due ?? undefined,
        createdTime: task.updated ?? undefined,
        updatedTime: task.updated ?? undefined,
        status: task.status ?? undefined,
        description: task.notes ?? undefined,
        metadata: {
          tasklist: list.title,
          parentTaskId: task.parent,
          position: task.position
        }
      }));
  });

  const tasks = (await Promise.all(taskPromises)).flat();
  return tasks;
}
