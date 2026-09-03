import { google } from 'googleapis';

export interface CalendarAvailabilityInput {
  startTime: string; // ISO 8601 string or YYYY-MM-DDTHH:mm:ss
  endTime: string;   // ISO 8601 string
  timezone?: string;
}

export interface CalendarAvailabilityResult {
  success: boolean;
  available: boolean;
  conflictingEvents?: Array<{ summary?: string; start?: string; end?: string }>;
  error?: string;
  startTime?: string;
  endTime?: string;
}

export interface CreateCalendarEventInput {
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
}

export interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  error?: string;
}

function getCalendarClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (
    !clientId ||
    clientId === 'your-google-client-id' ||
    !clientSecret ||
    clientSecret === 'your-google-client-secret' ||
    !refreshToken ||
    refreshToken === 'your-google-refresh-token'
  ) {
    return null; // OAuth credentials not configured
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  return { calendar, calendarId };
}

/**
 * 1. CHECK CALENDAR AVAILABILITY
 */
export async function checkCalendarAvailability(
  input: CalendarAvailabilityInput
): Promise<CalendarAvailabilityResult> {
  try {
    const clientObj = getCalendarClient();
    if (!clientObj) {
      return {
        success: false,
        available: false,
        error:
          'Google Calendar credentials missing in environment (.env.local). Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.',
      };
    }

    const { calendar, calendarId } = clientObj;
    const timeMin = new Date(input.startTime).toISOString();
    const timeMax = new Date(input.endTime).toISOString();

    console.log('[Google Calendar Diagnostic] Checking Availability:');
    console.log(`  - Calendar ID: ${calendarId}`);
    console.log(`  - Timezone: ${input.timezone || 'UTC'}`);
    console.log(`  - ISO Start Datetime: ${timeMin}`);
    console.log(`  - ISO End Datetime: ${timeMax}`);

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: input.timezone || 'UTC',
    });

    const items = response.data.items || [];
    console.log(`  - Google Calendar Events Found: ${items.length}`);

    if (items.length > 0) {
      console.log('  - Google Calendar Conflicting Intervals:', JSON.stringify(items.map((item) => ({
        summary: item.summary || 'Busy',
        start: item.start?.dateTime || item.start?.date || '',
        end: item.end?.dateTime || item.end?.date || '',
      })), null, 2));

      const conflictingEvents = items.map((item) => ({
        summary: item.summary || 'Busy',
        start: item.start?.dateTime || item.start?.date || '',
        end: item.end?.dateTime || item.end?.date || '',
      }));

      return {
        success: true,
        available: false,
        conflictingEvents,
        startTime: input.startTime,
        endTime: input.endTime,
      };
    }

    return {
      success: true,
      available: true,
      startTime: input.startTime,
      endTime: input.endTime,
    };
  } catch (err: unknown) {
    console.error('Google Calendar Availability Error:', err);
    const msg = err instanceof Error ? err.message : 'Calendar availability check failed';
    return {
      success: false,
      available: false,
      error: msg,
    };
  }
}

/**
 * 2. CREATE CALENDAR EVENT
 */
export async function createCalendarEvent(
  input: CreateCalendarEventInput
): Promise<CalendarEventResult> {
  try {
    const clientObj = getCalendarClient();
    if (!clientObj) {
      return {
        success: false,
        error:
          'Google Calendar credentials missing in environment (.env.local). Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.',
      };
    }

    const { calendar, calendarId } = clientObj;

    const startDateTime = new Date(input.startTime).toISOString();
    const endDateTime = new Date(input.endTime).toISOString();

    const eventPayload = {
      summary: input.summary,
      description: input.description || 'Automated CallFlow AI booking',
      start: {
        dateTime: startDateTime,
        timeZone: input.timezone || 'UTC',
      },
      end: {
        dateTime: endDateTime,
        timeZone: input.timezone || 'UTC',
      },
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventPayload,
    });

    if (!response.data.id) {
      return {
        success: false,
        error: 'Google Calendar returned empty event ID',
      };
    }

    return {
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink || undefined,
    };
  } catch (err: unknown) {
    console.error('Google Calendar Event Creation Error:', err);
    const msg = err instanceof Error ? err.message : 'Calendar event creation failed';
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * 3. UPDATE / RESCHEDULE CALENDAR EVENT
 */
export async function updateCalendarEvent(
  eventId: string,
  input: Partial<CreateCalendarEventInput>
): Promise<CalendarEventResult> {
  try {
    const clientObj = getCalendarClient();
    if (!clientObj) {
      return {
        success: false,
        error:
          'Google Calendar credentials missing in environment (.env.local). Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.',
      };
    }

    const { calendar, calendarId } = clientObj;

    const requestBody: any = {};
    if (input.summary) requestBody.summary = input.summary;
    if (input.description) requestBody.description = input.description;
    if (input.startTime) {
      requestBody.start = {
        dateTime: new Date(input.startTime).toISOString(),
        timeZone: input.timezone || 'UTC',
      };
    }
    if (input.endTime) {
      requestBody.end = {
        dateTime: new Date(input.endTime).toISOString(),
        timeZone: input.timezone || 'UTC',
      };
    }

    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody,
    });

    return {
      success: true,
      eventId: response.data.id || eventId,
      htmlLink: response.data.htmlLink || undefined,
    };
  } catch (err: unknown) {
    console.error('Google Calendar Event Update Error:', err);
    const msg = err instanceof Error ? err.message : 'Calendar event update failed';
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * 4. CANCEL / DELETE CALENDAR EVENT
 */
export async function cancelCalendarEvent(eventId: string): Promise<CalendarEventResult> {
  try {
    const clientObj = getCalendarClient();
    if (!clientObj) {
      return {
        success: false,
        error:
          'Google Calendar credentials missing in environment (.env.local). Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.',
      };
    }

    const { calendar, calendarId } = clientObj;

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return {
      success: true,
      eventId,
    };
  } catch (err: unknown) {
    console.error('Google Calendar Event Cancellation Error:', err);
    const msg = err instanceof Error ? err.message : 'Calendar event deletion failed';
    return {
      success: false,
      error: msg,
    };
  }
}
