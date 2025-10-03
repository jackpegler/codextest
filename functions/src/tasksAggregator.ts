import { getGoogleAuth } from './googleAuth';
import { fetchGoogleTasks } from './providers/googleTasks';
import { fetchGoogleDocsAssignments } from './providers/googleDocs';
import { fetchGoogleChatTasks } from './providers/googleChat';
import { fetchGoogleCalendarTasks } from './providers/googleCalendar';
import { buildSummary } from './summary';
import { TaskAggregationResult, WorkspaceTask } from './types';

export async function aggregateWorkspaceTasks(userEmail: string): Promise<TaskAggregationResult> {
  const auth = await getGoogleAuth();
  const results = await Promise.allSettled<WorkspaceTask[]>([
    fetchGoogleTasks(auth),
    fetchGoogleDocsAssignments(auth, userEmail),
    fetchGoogleChatTasks(auth, userEmail),
    fetchGoogleCalendarTasks(auth, userEmail)
  ]);

  const tasks: WorkspaceTask[] = [];
  const errors: TaskAggregationResult['errors'] = [];

  const providers = [
    'Google Tasks',
    'Google Docs Action Item',
    'Google Chat Task',
    'Google Calendar Task'
  ] as const;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      tasks.push(...result.value);
    } else {
      errors.push({ provider: providers[index], message: result.reason instanceof Error ? result.reason.message : String(result.reason) });
    }
  });

  const summary = buildSummary(tasks);
  return { tasks, summary, errors };
}
