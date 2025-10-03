import { google } from 'googleapis';
import { WorkspaceTask } from '../types';

type GoogleAuth = Awaited<ReturnType<typeof import('../googleAuth')['getGoogleAuth']>>;

export async function fetchGoogleCalendarTasks(
  auth: GoogleAuth,
  userEmail: string
): Promise<WorkspaceTask[]> {
  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString();

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100
  });

  const events = response.data.items ?? [];
  return events
    .filter((event) => {
      const attendees = event.attendees ?? [];
      return attendees.some(
        (attendee) =>
          attendee.email?.toLowerCase() === userEmail.toLowerCase() &&
          attendee.responseStatus === 'needsAction'
      );
    })
    .map<WorkspaceTask>((event) => ({
      id: event.id ?? '',
      title: event.summary ?? 'Calendar task',
      source: 'Google Calendar Task',
      link: event.htmlLink ?? undefined,
      due:
        event.end?.dateTime ??
        (event.end?.date ? new Date(event.end.date).toISOString() : undefined),
      createdTime: event.created ?? undefined,
      updatedTime: event.updated ?? undefined,
      status: event.status ?? undefined,
      description: event.description ?? undefined,
      metadata: {
        organizer: event.organizer?.email,
        start: event.start,
        end: event.end
      }
    }))
    .filter((task) => task.id);
}
