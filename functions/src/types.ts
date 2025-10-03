export type TaskSource =
  | 'Google Tasks'
  | 'Google Docs Action Item'
  | 'Google Chat Task'
  | 'Google Calendar Task';

export interface WorkspaceTask {
  id: string;
  title: string;
  source: TaskSource;
  link?: string;
  due?: string;
  createdTime?: string;
  updatedTime?: string;
  status?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskSummary {
  total: number;
  bySource: Record<TaskSource, number>;
  overdue: number;
  dueSoon: number;
}

export interface TaskAggregationResult {
  tasks: WorkspaceTask[];
  summary: TaskSummary;
  errors: { provider: TaskSource | 'Google Workspace'; message: string }[];
}
