import { useCallback, useEffect, useMemo, useState } from 'react';

interface WorkspaceTask {
  id: string;
  title: string;
  source: string;
  link?: string;
  due?: string;
  createdTime?: string;
  updatedTime?: string;
  status?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface TaskSummary {
  total: number;
  bySource: Record<string, number>;
  overdue: number;
  dueSoon: number;
}

interface AggregationResponse {
  userEmail: string;
  tasks: WorkspaceTask[];
  summary: TaskSummary;
  errors: { provider: string; message: string }[];
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function formatSource(source: string) {
  return source.replace(/Task$/i, '').trim();
}

export default function App() {
  const [response, setResponse] = useState<AggregationResponse | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(
    async (email: string) => {
      if (!email) {
        setError('Please provide an email address to impersonate.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const url = new URL(`${API_BASE}/api/tasks`, window.location.origin);
        url.searchParams.set('userEmail', email);
        const res = await fetch(url.toString(), {
          headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error ?? 'Failed to fetch tasks');
        }

        const payload: AggregationResponse = await res.json();
        setResponse(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('userEmail');
    if (emailParam) {
      setUserEmail(emailParam);
      fetchTasks(emailParam).catch(() => undefined);
    }
  }, [fetchTasks]);

  const summaryCards = useMemo(() => {
    const summary = response?.summary;
    if (!summary) return [];
    return [
      { label: 'Total Tasks', value: summary.total.toString() },
      { label: 'Overdue', value: summary.overdue.toString() },
      { label: 'Due in 3 days', value: summary.dueSoon.toString() }
    ];
  }, [response]);

  const sourceBreakdown = useMemo(() => {
    const summary = response?.summary;
    if (!summary) return [];
    return Object.entries(summary.bySource).map(([source, value]) => ({
      source,
      value
    }));
  }, [response]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      fetchTasks(userEmail.trim());
    },
    [fetchTasks, userEmail]
  );

  return (
    <main>
      <header>
        <h1>Workspace Task Radar</h1>
        <p>
          Aggregate tasks assigned to you across Google Tasks, Docs, Chat, and Calendar, then
          review progress with a unified dashboard.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="user@your-domain.com"
            value={userEmail}
            onChange={(event) => setUserEmail(event.target.value)}
            required
            style={{
              flex: '1 1 260px',
              padding: '0.75rem 1rem',
              borderRadius: '999px',
              border: '1px solid #cbd5f5',
              fontSize: '1rem'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '999px',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? 'Refreshing…' : 'Fetch tasks'}
          </button>
        </form>
      </header>

      {error ? (
        <div className="error-box">
          <strong>Unable to load tasks.</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {response ? (
        <>
          <section>
            <h2>Summary</h2>
            <div className="summary-grid" style={{ marginTop: '1rem' }}>
              {summaryCards.map((card) => (
                <div key={card.label} className="summary-card">
                  <h3>{card.label}</h3>
                  <p>{card.value}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>By Source</h3>
              <div className="summary-grid">
                {sourceBreakdown.map((item) => (
                  <div key={item.source} className="summary-card">
                    <h3>{item.source}</h3>
                    <p>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {response.errors.length > 0 ? (
            <section className="error-box" style={{ boxShadow: 'none' }}>
              <h3 style={{ marginTop: 0 }}>Providers with issues</h3>
              <ul>
                {response.errors.map((issue) => (
                  <li key={issue.provider}>
                    <strong>{issue.provider}:</strong> {issue.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 style={{ marginTop: 0 }}>Tasks</h2>
            <div className="task-list" style={{ marginTop: '1.5rem' }}>
              {response.tasks.length === 0 ? (
                <p>No open tasks found for {response.userEmail}.</p>
              ) : (
                response.tasks.map((task) => (
                  <article key={task.id} className="task-card">
                    <div style={{ minWidth: 0 }}>
                      <h4>{task.title}</h4>
                      <div className="task-meta">
                        <span className="badge">{formatSource(task.source)}</span>
                        {task.due ? <span>Due {formatDate(task.due)}</span> : null}
                        {task.metadata?.documentName ? (
                          <span>Doc: {String(task.metadata.documentName)}</span>
                        ) : null}
                        {task.metadata?.space && typeof task.metadata.space === 'object' ? (
                          <span>
                            Space: {String((task.metadata.space as Record<string, unknown>).displayName ?? '')}
                          </span>
                        ) : null}
                        {task.link ? (
                          <a href={task.link} target="_blank" rel="noreferrer">
                            Open source
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <span className="status-pill" data-state={task.status ?? 'open'}>
                      {(task.status ?? 'open').replace(/_/g, ' ')}
                    </span>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      ) : !loading ? (
        <p>Enter your email and click “Fetch tasks” to pull assignments.</p>
      ) : null}
    </main>
  );
}
