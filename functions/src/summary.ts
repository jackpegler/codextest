import { TaskSummary, WorkspaceTask } from './types';

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

export function buildSummary(tasks: WorkspaceTask[]): TaskSummary {
  const now = Date.now();
  const bySource = {
    'Google Tasks': 0,
    'Google Docs Action Item': 0,
    'Google Chat Task': 0,
    'Google Calendar Task': 0
  } as TaskSummary['bySource'];

  let overdue = 0;
  let dueSoon = 0;

  tasks.forEach((task) => {
    bySource[task.source] = (bySource[task.source] ?? 0) + 1;

    if (task.due) {
      const dueTime = Date.parse(task.due);
      if (!Number.isNaN(dueTime)) {
        if (dueTime < now) {
          overdue += 1;
        } else if (dueTime - now <= MILLISECONDS_IN_DAY * 3) {
          dueSoon += 1;
        }
      }
    }
  });

  return {
    total: tasks.length,
    bySource,
    overdue,
    dueSoon
  };
}
