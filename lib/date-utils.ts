/**
 * Date and Time Normalization & Timezone Helpers for CallFlow AI
 */

export function getBusinessToday(timeZone: string = 'America/New_York'): Date {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '01';
    const year = parseInt(getPart('year'), 10);
    const month = parseInt(getPart('month'), 10);
    const day = parseInt(getPart('day'), 10);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  } catch {
    return new Date();
  }
}

export function resolveDateString(dateInput: string, referenceDate: Date = new Date()): string {
  if (!dateInput) return '';
  const trimmed = dateInput.trim();

  // If already YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const base = new Date(referenceDate);
  const lower = trimmed.toLowerCase();

  // Match Hindi / Hinglish / English relative date phrases
  if (
    lower.includes('today') ||
    lower.includes('aaj') ||
    lower.includes('आज')
  ) {
    return formatDateYYYYMMDD(base);
  }

  if (
    lower.includes('day after tomorrow') ||
    lower.includes('parso') ||
    lower.includes('परसों')
  ) {
    base.setDate(base.getDate() + 2);
    return formatDateYYYYMMDD(base);
  }

  if (
    lower.includes('tomorrow') ||
    lower.includes('kal') ||
    lower.includes('कल')
  ) {
    base.setDate(base.getDate() + 1);
    return formatDateYYYYMMDD(base);
  }

  // Handle "September 4", "4 September", "4th September" or Hindi Devanagari "4 सितंबर", "सितंबर 4"
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const hindiMonthNames = [
    'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितंबर', 'सितम्बर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
  ];

  const monthMatch = lower.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/);
  const dayMonthMatch = lower.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/);

  if (monthMatch) {
    const m = monthNames.indexOf(monthMatch[1]) + 1;
    const d = parseInt(monthMatch[2], 10);
    const y = base.getFullYear();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if (dayMonthMatch) {
    const d = parseInt(dayMonthMatch[1], 10);
    const m = monthNames.indexOf(dayMonthMatch[2]) + 1;
    const y = base.getFullYear();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Devanagari Hindi date matching e.g. "4 सितंबर" or "सितंबर 4"
  for (let idx = 0; idx < hindiMonthNames.length; idx++) {
    const hMonth = hindiMonthNames[idx];
    const monthNum = idx === 8 ? 9 : (idx > 8 ? idx : idx + 1); // handle both सितंबर and सितम्बर as month 9
    const regex1 = new RegExp(`(\\d{1,2})\\s+${hMonth}`);
    const regex2 = new RegExp(`${hMonth}\\s+(\\d{1,2})`);
    const match1 = lower.match(regex1);
    const match2 = lower.match(regex2);
    if (match1) {
      const d = parseInt(match1[1], 10);
      const y = base.getFullYear();
      return `${y}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    if (match2) {
      const d = parseInt(match2[1], 10);
      const y = base.getFullYear();
      return `${y}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Try standard date parsing for strings like "09/04/2026"
  const parsedTimestamp = Date.parse(dateInput);
  if (!isNaN(parsedTimestamp)) {
    const d = new Date(parsedTimestamp);
    return formatDateYYYYMMDD(d);
  }

  return dateInput;
}

export function formatNaturalTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const normalized = normalizeTimeString(timeStr);
  if (!/^\d{2}:\d{2}$/.test(normalized)) return timeStr;

  const [h, m] = normalized.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  let hours12 = h % 12;
  if (hours12 === 0) hours12 = 12;
  const minutesStr = m > 0 ? `:${String(m).padStart(2, '0')}` : ':00';
  return `${hours12}${minutesStr} ${period}`;
}

export function formatNaturalDateLabel(
  dateInput: string,
  lang: 'hinglish' | 'hindi' | 'english' = 'english',
  referenceDate: Date = new Date()
): string {
  if (!dateInput) return '';

  const resolved = resolveDateString(dateInput, referenceDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) return dateInput;

  const [y, m, d] = resolved.split('-').map(Number);
  const targetDate = new Date(Date.UTC(y, m - 1, d));

  const refFormatted = formatDateYYYYMMDD(referenceDate);
  const [refY, refM, refD] = refFormatted.split('-').map(Number);
  const refDateObj = new Date(Date.UTC(refY, refM - 1, refD));

  const diffDays = Math.round((targetDate.getTime() - refDateObj.getTime()) / (1000 * 60 * 60 * 24));

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesHi = [
    'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
  ];

  const monthEn = monthNamesEn[m - 1];
  const monthHi = monthNamesHi[m - 1];

  let relativePrefix = '';
  if (diffDays === 0) {
    if (lang === 'hindi') relativePrefix = 'आज, ';
    else if (lang === 'hinglish') relativePrefix = 'aaj, ';
    else relativePrefix = 'today, ';
  } else if (diffDays === 1) {
    if (lang === 'hindi') relativePrefix = 'कल, ';
    else if (lang === 'hinglish') relativePrefix = 'kal, ';
    else relativePrefix = 'tomorrow, ';
  } else if (diffDays === 2) {
    if (lang === 'hindi') relativePrefix = 'परसों, ';
    else if (lang === 'hinglish') relativePrefix = 'parso, ';
    else relativePrefix = 'the day after tomorrow, ';
  }

  if (lang === 'hindi') {
    return `${relativePrefix}${d} ${monthHi}`;
  } else if (lang === 'hinglish') {
    return `${relativePrefix}${d} ${monthEn}`;
  } else {
    return `${relativePrefix}${monthEn} ${d}`;
  }
}

export function normalizeTimeString(timeInput: string): string {
  if (!timeInput) return '';
  const trimmed = timeInput.trim();

  // If already HH:mm (24h format e.g. 14:00 or 09:30)
  if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    const [h, m] = trimmed.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  // Pre-process: sanitize dotted am/pm (e.g. "p.m.", "a.m.", "5.00")
  const sanitized = trimmed
    .toLowerCase()
    .replace(/([ap])\s*\.\s*m\s*\.?/gi, '$1m')
    .replace(/\s+/g, ' ');

  const hasQuantityOrNonTimeWords = /\b(kg|kilo|kilogram|pound|lb|tier|piece|pc|person|people|dollar|rupee|rs|pickup|delivery|custom|message|text|order|cake|flavour|flavor)\b/i.test(sanitized);
  const hasDateWords = /january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|aaj|kal|parso|परसों|आज|कल|जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|नवंबर|दिसंबर|sep|oct|nov|dec|jan|feb|mar|apr|aug/i.test(sanitized);
  const hasExplicitTimeMarker = /am|pm|baje|बजे|o'clock|oclock|shaam|subah|dopahar|raat|:\d{2}|\bat\s+\d+/i.test(sanitized);

  // If the input is primarily a quantity, non-time word, or date string without explicit time markers, do NOT extract a time!
  if ((hasQuantityOrNonTimeWords || hasDateWords) && !hasExplicitTimeMarker) {
    return '';
  }

  // Map of number words across English, Hinglish, and Devanagari Hindi
  const wordToNum: Record<string, number> = {
    one: 1, ek: 1, एक: 1,
    two: 2, do: 2, दो: 2,
    three: 3, teen: 3, tin: 3, तीन: 3,
    four: 4, char: 4, chaar: 4, चार: 4,
    five: 5, paanch: 5, panch: 5, पाँच: 5, पांच: 5,
    six: 6, chhe: 6, che: 6, छह: 6,
    seven: 7, saat: 7, सात: 7,
    eight: 8, aath: 8, ath: 8, आठ: 8,
    nine: 9, nau: 9, नौ: 9,
    ten: 10, das: 10, दस: 10,
    eleven: 11, gyarah: 11, ग्यारह: 11,
    twelve: 12, barah: 12, बारह: 12,
  };

  let hours: number | null = null;
  let minutes = 0;

  // Match digit time format e.g. 5:30 or 5.30 or 10 or 10:00
  const digitMatch = sanitized.match(/(\d{1,2})(?:[:.](\d{2}))?/);
  if (digitMatch && (hasExplicitTimeMarker || /^\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|baje|बजे)?$/i.test(sanitized))) {
    hours = parseInt(digitMatch[1], 10);
    if (digitMatch[2]) minutes = parseInt(digitMatch[2], 10);
  } else if (hasExplicitTimeMarker) {
    // Only match word-to-number mapping if explicit time marker is present (e.g. "one pm", "one o'clock")
    for (const [w, n] of Object.entries(wordToNum)) {
      const regex = new RegExp(`(?:^|\\s)${w}(?:$|\\s|[.,!?])`, 'i');
      if (regex.test(sanitized)) {
        hours = n;
        break;
      }
    }
  }

  if (hours === null || hours < 0 || hours > 23) {
    return timeInput;
  }

  const isPm =
    sanitized.includes('pm') ||
    sanitized.includes('shaam') ||
    sanitized.includes('शाम') ||
    sanitized.includes('dopahar') ||
    sanitized.includes('दोपहर') ||
    sanitized.includes('raat') ||
    sanitized.includes('रात');

  const isAm =
    sanitized.includes('am') ||
    sanitized.includes('subah') ||
    sanitized.includes('सुबह');

  if (isPm && hours < 12) {
    hours += 12;
  } else if (isAm && hours === 12) {
    hours = 0;
  } else if (!isPm && !isAm && hours >= 1 && hours <= 7) {
    // Default 1 to 7 without am/pm tag to afternoon/evening PM (e.g., "2 baje" -> 14:00)
    hours += 12;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function extractTimeFromMessage(userMessage: string): string | null {
  if (!userMessage || typeof userMessage !== 'string') return null;
  const raw = userMessage.trim();
  const sanitized = raw.toLowerCase().replace(/([ap])\s*\.\s*m\s*\.?/gi, '$1m');

  const hasQuantityOrNonTimeWords = /\b(kg|kilo|kilogram|pound|lb|tier|piece|pc|person|people|dollar|rupee|rs|pickup|delivery|custom|message|text|order|cake|flavour|flavor)\b/i.test(sanitized);
  const hasDateWords = /january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|aaj|kal|parso|परसों|आज|कल|जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|नवंबर|दिसंबर|sep|oct|nov|dec|jan|feb|mar|apr|aug/i.test(sanitized);
  const hasExplicitTimeMarker = /am|pm|baje|बजे|o'clock|oclock|shaam|subah|dopahar|raat|:\d{2}|\bat\s+\d+/i.test(sanitized);

  // If the message contains quantity/non-time words or date words without explicit time markers, do NOT fallback to extracting time!
  if ((hasQuantityOrNonTimeWords || hasDateWords) && !hasExplicitTimeMarker) {
    return null;
  }

  // Match explicitly formatted 12h/24h time expressions in text
  const timeRegexes = [
    /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i,
    /\b([01]?\d|2[0-3]):([0-5]\d)\b/,
    /\b(\d{1,2})\s*(baje|बजे|o'clock|oclock)\b/i,
    /\b(?:at|around|for)\s+(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?\b/i,
    /\b(1[0-2]|[1-9])\s*(am|pm)\b/i,
  ];

  for (const regex of timeRegexes) {
    const match = sanitized.match(regex);
    if (match) {
      const normalized = normalizeTimeString(match[0]);
      if (/^\d{2}:\d{2}$/.test(normalized)) {
        return normalized;
      }
    }
  }

  // Fallback for short standalone strings like "5 p.m.", "10PM", "5 बजे", "at 6"
  const direct = normalizeTimeString(raw);
  if (/^\d{2}:\d{2}$/.test(direct)) {
    return direct;
  }

  return null;
}

export function extractDateFromMessage(userMessage: string, referenceDate: Date = new Date()): string | null {
  if (!userMessage || typeof userMessage !== 'string') return null;
  const lower = userMessage.trim().toLowerCase();

  if (lower.includes('today') || lower.includes('aaj') || lower.includes('आज')) {
    return resolveDateString('today', referenceDate);
  }
  if (lower.includes('tomorrow') || lower.includes('kal') || lower.includes('कल')) {
    return resolveDateString('tomorrow', referenceDate);
  }
  if (lower.includes('day after tomorrow') || lower.includes('parso') || lower.includes('परसों')) {
    return resolveDateString('day after tomorrow', referenceDate);
  }

  const dateRegex = /\b(\d{4}-\d{2}-\d{2})\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b|\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
  const match = lower.match(dateRegex);
  if (match) {
    const resolved = resolveDateString(match[0], referenceDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(resolved)) {
      return resolved;
    }
  }

  return null;
}

export function formatDateYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildIsoInTimezone(
  dateInput: string,
  timeInput: string,
  timeZone: string = 'America/New_York',
  durationMinutes: number = 30,
  referenceDate: Date = new Date()
): { startIso: string; endIso: string; resolvedDate: string; normalizedTime: string } {
  const resolvedDate = resolveDateString(dateInput, referenceDate);
  const normalizedTime = normalizeTimeString(timeInput);

  if (!resolvedDate || !normalizedTime || !/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate) || !/^\d{2}:\d{2}$/.test(normalizedTime)) {
    return {
      startIso: '',
      endIso: '',
      resolvedDate,
      normalizedTime,
    };
  }

  const [year, month, day] = resolvedDate.split('-').map(Number);
  const [targetHour, targetMinute] = normalizedTime.split(':').map(Number);

  const baseUtc = new Date(Date.UTC(year, month - 1, day, targetHour, targetMinute));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(baseUtc);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const tzDay = parseInt(getPart('day'), 10);
  let tzHour = parseInt(getPart('hour'), 10);
  if (tzHour === 24) tzHour = 0;
  const tzMinute = parseInt(getPart('minute'), 10);

  const tzTotalMinutes = (tzDay * 24 + tzHour) * 60 + tzMinute;
  const utcTotalMinutes = (day * 24 + targetHour) * 60 + targetMinute;

  let offsetMinutes = tzTotalMinutes - utcTotalMinutes;
  if (offsetMinutes > 720) offsetMinutes -= 1440;
  if (offsetMinutes < -720) offsetMinutes += 1440;

  const targetUtc = new Date(baseUtc.getTime() - offsetMinutes * 60 * 1000);

  return {
    startIso: targetUtc.toISOString(),
    endIso: new Date(targetUtc.getTime() + durationMinutes * 60 * 1000).toISOString(),
    resolvedDate,
    normalizedTime,
  };
}
