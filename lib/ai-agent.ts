import { Business, Workflow, TranscriptMessage, QuestionField } from '@/types/database';
import { evaluateWorkflowState, getWorkflowActionType } from '@/lib/workflow-engine';
import { getOpenAIClient, getOpenAIModel } from '@/lib/openai';
import {
  checkCalendarAvailability,
  createCalendarEvent,
  updateCalendarEvent,
  cancelCalendarEvent,
} from '@/lib/google-calendar';
import {
  resolveDateString,
  normalizeTimeString,
  extractTimeFromMessage,
  extractDateFromMessage,
  buildIsoInTimezone,
  formatNaturalDateLabel,
  formatNaturalTime12h,
  getBusinessToday,
} from '@/lib/date-utils';

export interface ProcessTurnInput {
  business: Business;
  workflow: Workflow;
  existingTranscript: TranscriptMessage[];
  existingCollectedData: Record<string, unknown>;
  userMessage: string;
  calendarEventId?: string | null;
  calendarStatus?: string | null;
  referenceDate?: Date;
}

export interface BookingTicket {
  ticketId: string;
  calendarEventId: string;
  customerName: string;
  businessName: string;
  workflowName: string;
  date: string;
  time: string;
  details: Record<string, unknown>;
  createdAt: string;
  status: 'confirmed';
}

export interface ProcessTurnOutput {
  reply: string;
  intent: string;
  customerName: string | null;
  newExtractedData: Record<string, unknown>;
  mergedCollectedData: Record<string, unknown>;
  missingFields: string[];
  workflowComplete: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  summary: string | null;
  actionRequired: boolean;
  actionType: string | null;
  actionOperation: string | null;
  calendarStatus: 'IDLE' | 'CHECKING' | 'AVAILABLE' | 'UNAVAILABLE' | 'AWAITING_CONFIRMATION' | 'EVENT_CREATED' | 'CANCELLED' | 'ERROR';
  calendarEventId: string | null;
  calendarError: string | null;
  bookingTicket: BookingTicket | null;
}

/**
 * Builds a compact, language-enforced system prompt for OpenRouter/Groq.
 */
function buildMinimalSystemPrompt(
  business: Business,
  workflow: Workflow,
  existingCollectedData: Record<string, unknown>,
  missingFields: string[],
  referenceDateStr: string,
  userLangStyle: 'hinglish' | 'hindi' | 'english'
): string {
  const businessContext = `Business: "${business.name}" (${business.industry}). Timezone: ${business.timezone}. Reference Today Date: ${referenceDateStr}.`;
  const workflowGoal = `Workflow: "${workflow.name}". Greeting: "${workflow.greeting}". Closing: "${workflow.closing}".`;

  const questionsList = (workflow.questions || [])
    .map(
      (q, idx) =>
        `${idx + 1}. [${q.required ? 'REQUIRED' : 'OPTIONAL'}] Key: "${q.name}" | Prompt: "${q.label}" | Type: ${q.type}`
    )
    .join('\n');

  const missingListStr = missingFields.length > 0 ? missingFields.join(', ') : 'None (All collected)';

  const langInstruction =
    userLangStyle === 'hindi'
      ? `CRITICAL LANGUAGE REQUIREMENT: THE CUSTOMER IS SPEAKING HINDI. YOU MUST RESPOND EXCLUSIVELY IN HINDI USING DEVANAGARI SCRIPT (e.g. "ज़रूर! ..."). DO NOT USE PURE ENGLISH SENTENCES.`
      : userLangStyle === 'hinglish'
      ? `CRITICAL LANGUAGE REQUIREMENT: THE CUSTOMER IS SPEAKING HINGLISH. YOU MUST RESPOND IN NATURAL HINGLISH (HINDI WRITTEN IN LATIN ALPHABET, e.g. "Sure! Aapka..."). DO NOT USE PURE ENGLISH OR DEVANAGARI SCRIPT.`
      : `CRITICAL LANGUAGE REQUIREMENT: THE CUSTOMER IS SPEAKING ENGLISH. RESPOND IN CLEAR, FRIENDLY ENGLISH.`;

  return `You are a professional, helpful, natural voice AI receptionist for "${business.name}".
${businessContext}
${workflowGoal}

${langInstruction}

QUESTIONS TO COLLECT IN STRICT ORDER:
${questionsList}

CURRENT COLLECTED DATA: ${JSON.stringify(existingCollectedData)}
REMAINING MISSING REQUIRED FIELDS: ${missingListStr}

CRITICAL INSTRUCTIONS:
1. MATCH CUSTOMER LANGUAGE EXACTLY AS INSTRUCTED ABOVE.
2. ONE QUESTION AT A TIME: Ask for ONLY the FIRST missing required field (${missingListStr.split(',')[0]}). DO NOT SKIP AHEAD TO OTHER FIELDS.
3. DATES & TIMES: Convert relative date words to YYYY-MM-DD based on Reference Today Date ${referenceDateStr}. Normalize times to HH:mm.
4. EXTRACT DATA: Extract key-value pairs accurately in JSON. ONLY extract fields that the user explicitly answered. NEVER assume, guess, or invent a default time (such as 4 PM or 12 PM) if the user only provided a date. If 'time' is in REMAINING MISSING REQUIRED FIELDS and the user did not give an explicit time, leave 'time' missing/null.
5. CALENDAR WORKFLOW RULE: If all required fields are collected, DO NOT generate a booking confirmation message (such as "Your appointment is booked"). The system backend handles calendar availability checks and confirmation prompts authoritatively. If missing fields remain, reply asking for ONLY the FIRST missing field.

Return ONLY valid JSON matching this exact structure:
{
  "extractedData": { "key": "value" },
  "customerName": "extracted customer name or null",
  "intent": "booking | inquiry | cancellation | support",
  "reply": "Your brief, friendly conversational response asking ONLY for the FIRST missing field",
  "summary": "Brief summary if workflow complete, else null"
}`;
}

function hasHinglishKeywords(str: string): number {
  if (!str) return 0;
  const hinglishKeywords = [
    'mujhe', 'chahiye', 'karna', 'karni', 'karne', 'hai', 'hay', 'hoon', 'bhai', 'kal',
    'baje', 'par', 'ko', 'se', 'paas', 'jana', 'kya', 'ka', 'ki', 'ke', 'aur',
    'bata', 'dijiye', 'batao', 'bol', 'mera', 'meri', 'naam', 'aa', 'hote',
    'nahi', 'nahin', 'ha', 'haan', 'han', 'hanji', 'dhanyawad', 'kar do', 'kardo', 'bataiye',
    'taki', 'hum', 'pehle', 'aage', 'badha', 'saken', 'apna', 'kaha', 'kab', 'kardi',
    'kijiye', 'kardo', 'kar'
  ];
  const cleanStr = str.toLowerCase().trim();
  const words = cleanStr.split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, ''));
  return (
    words.filter((w) => hinglishKeywords.includes(w)).length +
    hinglishKeywords.filter((k) => k.includes(' ') && cleanStr.includes(k)).length
  );
}

function hasEnglishKeywords(str: string): number {
  if (!str) return 0;
  const englishKeywords = [
    'i', 'want', 'need', 'my', 'name', 'is', 'please', 'could', 'would', 'like', 'help',
    'schedule', 'book', 'appointment', 'can', 'speak', 'talk', 'in', 'english'
  ];
  const cleanStr = str.toLowerCase().trim();
  const words = cleanStr.split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, ''));
  return words.filter((w) => englishKeywords.includes(w)).length;
}

export function detectLanguageStyle(
  text: string,
  transcriptHistory: TranscriptMessage[] = []
): 'hinglish' | 'hindi' | 'english' {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 1. Explicit multi-word language change requests
  if (lower.includes('in english') || lower.includes('speak english') || lower.includes('talk english') || lower.includes('english please')) {
    return 'english';
  }
  if (lower.includes('hindi me') || lower.includes('hindi mein') || lower.includes('hindi please') || lower.includes('हिंदी में')) {
    return /[\u0900-\u097F]/.test(trimmed) ? 'hindi' : 'hinglish';
  }

  // 2. Identify established conversation language from past user messages
  const userHistoryMsgs = transcriptHistory.filter((m) => m.role === 'user');
  let establishedLang: 'hinglish' | 'hindi' | 'english' | null = null;

  for (let i = userHistoryMsgs.length - 1; i >= 0; i--) {
    const pastText = userHistoryMsgs[i].content;
    if (/[\u0900-\u097F]/.test(pastText)) {
      establishedLang = 'hindi';
      break;
    }
    const hCount = hasHinglishKeywords(pastText);
    const eCount = hasEnglishKeywords(pastText);
    if (hCount > 0 && hCount >= eCount) {
      establishedLang = 'hinglish';
      break;
    }
    if (eCount > 0 && eCount > hCount) {
      establishedLang = 'english';
      break;
    }
  }

  // 3. Devanagari script in current text guarantees Hindi
  if (/[\u0900-\u097F]/.test(trimmed)) {
    return 'hindi';
  }

  // 4. Short field value / single token / proper name check
  const cleanStr = lower.replace(/[^a-z0-9\s]/g, '').trim();
  const words = cleanStr.split(/\s+/).filter(Boolean);

  const isShortOrFieldValue =
    words.length <= 3 ||
    /^\d+$/.test(cleanStr) ||
    /^(january|february|march|april|may|june|july|august|september|october|november|december)/i.test(cleanStr) ||
    /^\d{1,2}(:\d{2})?\s*(am|pm|baje)?$/i.test(cleanStr) ||
    ['yes', 'no', 'ok', 'okay', 'done', 'kardo', 'kar do', 'bovish', 'bhavish', 'dentist'].includes(lower);

  // If current utterance is a short token or field value, strictly preserve established language!
  if (isShortOrFieldValue && establishedLang) {
    return establishedLang;
  }

  // 5. Meaningful multi-word utterance keyword check
  const hCount = hasHinglishKeywords(trimmed);
  const eCount = hasEnglishKeywords(trimmed);

  if (hCount > 0 && hCount >= eCount) {
    return 'hinglish';
  }
  if (eCount > 0 && eCount > hCount) {
    return 'english';
  }

  return establishedLang || 'english';
}

function getLanguageConsistentQuestion(
  field: QuestionField,
  userLangStyle: 'hinglish' | 'hindi' | 'english',
  customerName: string | null
): string {
  const fName = field.name.toLowerCase();

  if (fName.includes('name')) {
    if (userLangStyle === 'hindi') return `ज़रूर! कृपया अपना नाम बताइए ताकि हम आपकी अपॉइंटमेंट बुक कर सकें।`;
    if (userLangStyle === 'hinglish') return `Sure! Pehle apna naam bataiye, taki hum booking aage badha saken.`;
    return `Sure! Could you please provide your name so we can proceed with your booking?`;
  }

  const nameHiPrefix = customerName ? `ज़रूर, ${customerName}! ` : `ज़रूर! `;
  const nameEnPrefix = customerName ? `Sure, ${customerName}! ` : `Sure! `;

  if (fName.includes('specialty') || fName.includes('doctor')) {
    if (userLangStyle === 'hindi') return `${nameHiPrefix}कृपया बताइए कि आप किस डॉक्टर या विशेषज्ञ के साथ अपॉइंटमेंट बुक करना चाहेंगे?`;
    if (userLangStyle === 'hinglish') return `${nameEnPrefix}Aap kis doctor ya specialist ke saath appointment book karna chahenge?`;
    return `${nameEnPrefix}Which doctor or specialist would you like to see?`;
  }

  if (fName.includes('date')) {
    if (userLangStyle === 'hindi') return `${nameHiPrefix}कृपया अपनी अपॉइंटमेंट की तारीख बताइए।`;
    if (userLangStyle === 'hinglish') return `${nameEnPrefix}Aap appointment ki date bata dijiye.`;
    return `${nameEnPrefix}Could you please provide your appointment date?`;
  }

  if (fName.includes('time')) {
    if (userLangStyle === 'hindi') return `${nameHiPrefix}कृपया अपनी पसंद का समय बताइए। जैसे 2 PM या 4 बजे।`;
    if (userLangStyle === 'hinglish') return `${nameEnPrefix}Aap apni pasand ka time bataiye, jaise 2 PM ya 4 baje.`;
    return `${nameEnPrefix}Could you please provide your preferred time? For example, 2 PM or 4 PM.`;
  }

  if (fName.includes('cake') || fName.includes('flavour') || fName.includes('type') || fName.includes('flavor')) {
    if (userLangStyle === 'hindi') return `${nameHiPrefix}कृपया बताइए कि आप किस फ्लेवर या टाइप का केक चाहते हैं?`;
    if (userLangStyle === 'hinglish') return `${nameEnPrefix}Aap kis flavor ya type ka cake prefer karenge?`;
    return `${nameEnPrefix}What flavor or type of cake would you like?`;
  }

  // Generic fallback for any other workflow field across any business type
  const label = field.label || field.name;
  if (userLangStyle === 'hindi') return `${nameHiPrefix}कृपया ${label.toLowerCase()} बताइए।`;
  if (userLangStyle === 'hinglish') return `${nameEnPrefix}Aapka ${label.toLowerCase()} bata dijiye.`;
  return `${nameEnPrefix}Could you please provide your ${label.toLowerCase()}?`;
}

function isReplyAskingForField(reply: string, targetField: QuestionField): boolean {
  if (!reply) return false;
  const lower = reply.toLowerCase();
  const fName = targetField.name.toLowerCase();
  const fLabel = (targetField.label || '').toLowerCase();

  if (fName.includes('name') || fLabel.includes('name')) {
    return lower.includes('naam') || lower.includes('name') || reply.includes('नाम');
  }
  if (fName.includes('specialty') || fName.includes('doctor') || fLabel.includes('specialty') || fLabel.includes('doctor')) {
    return lower.includes('doctor') || lower.includes('specialist') || lower.includes('specialty') || reply.includes('डॉक्टर') || reply.includes('विशेषज्ञ') || reply.includes('स्पेशलिस्ट');
  }
  if (fName.includes('date') || fLabel.includes('date')) {
    return lower.includes('date') || reply.includes('तारीख') || reply.includes('दिनांक');
  }
  if (fName.includes('time') || fLabel.includes('time')) {
    return lower.includes('time') || lower.includes('baje') || reply.includes('समय') || reply.includes('बजे');
  }
  if (fName.includes('cake') || fName.includes('type') || fName.includes('flavour') || fName.includes('flavor')) {
    return lower.includes('cake') || lower.includes('flavor') || lower.includes('flavour') || lower.includes('type') || reply.includes('केक') || reply.includes('फ्लेवर');
  }

  return lower.includes(fName) || (fLabel ? lower.includes(fLabel) : false);
}

function isPlausibleFieldValue(fieldName: string, text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const noiseTokens = [
    'cardo', 'dan', 'wišé', 'wisé', 'menam', '10', 'aaj', 'kal', 'parso',
    'yes', 'no', 'cancel', 'book', 'appointment', 'ok', 'okay', 'oke', 'done',
    'ha', 'haan', 'han', 'ба биш', 'ба', 'биш'
  ];

  if (fieldName.includes('name')) {
    if (trimmed.length < 2 || trimmed.length > 50) return false;
    if (/^\d+$/.test(trimmed)) return false;
    if (/[\u0400-\u04FF]/.test(trimmed)) return false; // Reject Cyrillic garbage tokens for names
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    if (wordCount > 4) return false; // Reject long sentence STT hallucinations for names
    if (noiseTokens.some((t) => lower === t || lower.startsWith(`${t}.`) || lower.includes('wišé') || lower.includes('menam'))) return false;
    return true;
  }

  if (fieldName.includes('date')) {
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ||
      lower.includes('aaj') || lower.includes('kal') || lower.includes('parso') ||
      lower.includes('today') || lower.includes('tomorrow') || lower.includes('आज') || lower.includes('कल') || lower.includes('परसों') ||
      /september|october|november|december|january|february|march|april|may|june|july|august/i.test(trimmed)
    );
  }

  if (fieldName.includes('time')) {
    const extracted = extractTimeFromMessage(trimmed);
    if (extracted) return true;
    const hasExplicitTimeMarker = /am|pm|baje|बजे|o'clock|oclock|shaam|subah|dopahar|raat|:\d{2}|\bat\s+\d+/i.test(lower);
    const hasDateWords = /january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|aaj|kal|parso|परसों|आज|कल/i.test(lower);
    if (hasDateWords && !hasExplicitTimeMarker) return false;
    return (
      /^\d{2}:\d{2}$/.test(trimmed) ||
      hasExplicitTimeMarker ||
      /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|ek|do|teen|tin|char|chaar|paanch|panch|chhe|saat|aath|nau|das)\b/i.test(lower)
    );
  }

  return trimmed.length > 0 && trimmed.length < 100;
}

function isFieldAnsweredInUserMessage(
  fieldName: string,
  fieldValue: unknown,
  userMessage: string,
  targetMissingField: QuestionField | undefined
): boolean {
  if (fieldValue === null || fieldValue === undefined || fieldValue === '') return false;
  const fName = fieldName.toLowerCase();
  const lowerMsg = userMessage.toLowerCase().trim();

  // STRICT RULE FOR TIME: An extracted time value (e.g. "13:00") MUST NEVER be accepted unless user message explicitly contains time evidence.
  if (fName.includes('time')) {
    const extracted = extractTimeFromMessage(userMessage);
    if (extracted) return true;
    const hasDateWords = /january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|aaj|kal|parso|परसों|आज|कल|जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|नवंबर|दिसंबर/i.test(lowerMsg);
    const hasExplicitTimeMarker = /am|pm|baje|बजे|o'clock|oclock|shaam|शाम|subah|सुबह|dopahar|दोपहर|raat|रात|:\d{2}|\bat\s+\d+/i.test(lowerMsg);
    if (hasDateWords && !hasExplicitTimeMarker) return false;
    return (
      hasExplicitTimeMarker ||
      /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|ek|do|teen|tin|char|chaar|paanch|panch|chhe|saat|aath|nau|das)\b/i.test(lowerMsg)
    );
  }

  // STRICT RULE FOR DATE: Date value MUST be backed by date evidence in user message.
  if (fName.includes('date')) {
    const extracted = extractDateFromMessage(userMessage, new Date());
    if (extracted) return true;
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(String(fieldValue)) &&
      (
        lowerMsg.includes('aaj') || lowerMsg.includes('kal') || lowerMsg.includes('parso') ||
        lowerMsg.includes('today') || lowerMsg.includes('tomorrow') || lowerMsg.includes('आज') || lowerMsg.includes('कल') || lowerMsg.includes('परसों') ||
        /\d/.test(lowerMsg) ||
        /january|february|march|april|may|june|july|august|september|october|november|december|जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|नवंबर|दिसंबर/i.test(lowerMsg)
      )
    );
  }

  // If this field was the current missing field target, verify it is plausible
  if (targetMissingField && targetMissingField.name.toLowerCase() === fName) {
    return isPlausibleFieldValue(fieldName, String(fieldValue));
  }

  // If this field was NOT the target missing field, verify user message actually provided evidence
  if (fName.includes('name')) {
    return lowerMsg.includes('naam') || lowerMsg.includes('name') || lowerMsg.includes('मेरा नाम') || isPlausibleFieldValue(fieldName, String(fieldValue));
  }
  if (fName.includes('specialty') || fName.includes('doctor')) {
    return lowerMsg.includes('doctor') || lowerMsg.includes('dentist') || lowerMsg.includes('specialist') || lowerMsg.includes('डॉक्टर') || lowerMsg.includes('विशेषज्ञ');
  }
  if (fName.includes('cake') || fName.includes('type') || fName.includes('flavor') || fName.includes('flavour')) {
    return lowerMsg.includes('cake') || lowerMsg.includes('flavor') || lowerMsg.includes('chocolate') || lowerMsg.includes('vanilla') || lowerMsg.includes('strawberry') || lowerMsg.includes('pineapple') || lowerMsg.includes('केक') || lowerMsg.includes('फ्लेवर');
  }

  return true;
}

export async function processConversationTurn(
  input: ProcessTurnInput
): Promise<ProcessTurnOutput> {
  const { business, workflow, existingTranscript, userMessage } = input;
  let existingCollectedData = { ...input.existingCollectedData };
  let calendarEventId = input.calendarEventId || null;

  const openai = getOpenAIClient();
  const model = getOpenAIModel();

  const referenceDate = input.referenceDate || getBusinessToday(business.timezone);
  const referenceDateStr = referenceDate.toISOString().split('T')[0];

  const userLangStyle = detectLanguageStyle(userMessage, existingTranscript);

  // Evaluate current state before turn
  const evalBefore = evaluateWorkflowState(workflow, existingCollectedData, business.timezone);
  const actionType = getWorkflowActionType(workflow);
  const isCalendarActionConfigured =
    actionType === 'google_calendar' ||
    actionType === 'calendar' ||
    (typeof workflow?.action === 'object' && workflow?.action !== null && (workflow.action as any).type === 'google_calendar');
  const currentTargetField = evalBefore.missingRequiredFields[0];

  let calendarStatus: ProcessTurnOutput['calendarStatus'] =
    (input.calendarStatus as any) ||
    (existingCollectedData._calendarStatus as any) ||
    'IDLE';
  let calendarError: string | null = null;

  const systemPrompt = buildMinimalSystemPrompt(
    business,
    workflow,
    existingCollectedData,
    evalBefore.missingRequiredFields.map((q) => q.name),
    referenceDateStr,
    userLangStyle
  );

  const messagesPayload = [
    { role: 'system', content: systemPrompt },
    ...existingTranscript.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  if (userMessage && userMessage.trim()) {
    const lastMsg = messagesPayload[messagesPayload.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userMessage) {
      messagesPayload.push({ role: 'user', content: userMessage });
    }
  }

  let rawContent = '';
  const fallbackModels = [model, 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'qwen/qwen3.8-27b', 'groq/compound-mini'];
  let lastErr: any = null;

  for (const currentModel of fallbackModels) {
    try {
      console.log(
        `[AI Agent Diagnostic] Requesting completion: model="${currentModel}", workflowId="${workflow.id}", langStyle="${userLangStyle}"`
      );
      const response = await openai.chat.completions.create({
        model: currentModel,
        messages: messagesPayload as any,
        temperature: 0.2,
        max_tokens: 400,
      });
      rawContent = response.choices[0]?.message?.content || '';
      console.log(
        `[AI Agent Diagnostic] Completion success: model="${currentModel}", responseLength=${rawContent.length}`
      );
      lastErr = null;
      break;
    } catch (err: any) {
      lastErr = err;
      const status = err?.status || err?.statusCode || 'N/A';
      const rawMsg = err?.message || (err instanceof Error ? err.message : 'Unknown AI provider error');
      const safeMsg = rawMsg.replace(/(gsk_|sk-or-|sk-)[A-Za-z0-9_-]+/gi, '[REDACTED_KEY]');
      console.warn(
        `[AI Agent Diagnostic Error] Call failed: model="${currentModel}", workflowId="${workflow.id}", status=${status}, message="${safeMsg}". Trying fallback model...`
      );
      if (status !== 429 && status !== 404) {
        break;
      }
    }
  }

  if (lastErr && !rawContent) {
    const status = lastErr?.status || lastErr?.statusCode || 'N/A';
    const rawMsg = lastErr?.message || (lastErr instanceof Error ? lastErr.message : 'Unknown AI provider error');
    const safeMsg = rawMsg.replace(/(gsk_|sk-or-|sk-)[A-Za-z0-9_-]+/gi, '[REDACTED_KEY]');
    throw new Error(`AI Provider Error (${model}): ${safeMsg}`);
  }

  let parsed: any = {};
  try {
    let cleanJsonStr = rawContent.trim();
    if (cleanJsonStr.includes('```')) {
      cleanJsonStr = cleanJsonStr.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    }
    parsed = JSON.parse(cleanJsonStr);
  } catch {
    parsed = {
      extractedData: {},
      customerName: null,
      intent: 'general_inquiry',
      reply: '',
      summary: null,
    };
  }

  const newExtractedData = parsed.extractedData || {};
  const mergedCollectedData: Record<string, unknown> = {
    ...existingCollectedData,
  };

  // Only merge extracted data that is supported by the user message (prevents LLM hallucinations/skipping)
  for (const [k, v] of Object.entries(newExtractedData)) {
    if (v !== null && v !== undefined && v !== '') {
      if (isFieldAnsweredInUserMessage(k, v, userMessage, currentTargetField)) {
        mergedCollectedData[k] = v;

        // Smart mapping for question field synonyms
        for (const q of workflow.questions || []) {
          const qName = q.name.toLowerCase();
          const eKey = k.toLowerCase();
          if (
            (qName === 'customer_name' && (eKey === 'patient_name' || eKey === 'name' || eKey === 'caller_name')) ||
            (qName === 'specialty' && (eKey === 'doctor' || eKey === 'department' || eKey === 'doctor_specialty')) ||
            (qName === 'cake_type' && (eKey === 'theme' || eKey === 'type' || eKey === 'cake_theme')) ||
            (qName === 'flavour' && (eKey === 'flavor'))
          ) {
            mergedCollectedData[q.name] = v;
          }

          if (qName === 'delivery_preference' || eKey === 'delivery_preference') {
            const strV = String(v).toLowerCase();
            if (strV.includes('pickup') || strV.includes('pick up')) {
              mergedCollectedData[q.name] = 'Pickup';
            } else if (strV.includes('delivery') || strV.includes('deliver')) {
              mergedCollectedData[q.name] = 'Delivery';
            }
          }
        }
      }
    }
  }

  if (mergedCollectedData.delivery_preference) {
    const strV = String(mergedCollectedData.delivery_preference).toLowerCase();
    if (strV.includes('pickup') || strV.includes('pick up')) {
      mergedCollectedData.delivery_preference = 'Pickup';
    } else if (strV.includes('delivery') || strV.includes('deliver')) {
      mergedCollectedData.delivery_preference = 'Delivery';
    }
  }

  const customerName =
    parsed.customerName && isFieldAnsweredInUserMessage('customer_name', parsed.customerName, userMessage, currentTargetField)
      ? parsed.customerName
      : (mergedCollectedData.customer_name as string) ||
        (mergedCollectedData.patient_name as string) ||
        (mergedCollectedData.name as string) ||
        null;

  if (customerName) {
    mergedCollectedData.customer_name = customerName;
    for (const q of workflow.questions || []) {
      if (q.name === 'patient_name' || q.name === 'name' || q.name === 'customer_name') {
        mergedCollectedData[q.name] = customerName;
      }
    }
  }

  // Fallback: If user provided a direct short answer to the prompt (e.g., "Bhavish", "Dentist")
  if (evalBefore.missingRequiredFields.length > 0) {
    const targetField = evalBefore.missingRequiredFields[0];
    if (
      targetField &&
      !mergedCollectedData[targetField.name] &&
      userMessage.trim().length > 0 &&
      userMessage.trim().length < 50 &&
      !userMessage.toLowerCase().includes('appointment') &&
      !userMessage.toLowerCase().includes('book') &&
      !userMessage.toLowerCase().includes('cake') &&
      isPlausibleFieldValue(targetField.name, userMessage.trim())
    ) {
      mergedCollectedData[targetField.name] = userMessage.trim();
    }
  }

  // Standalone / explicit time & date extraction directly from user message
  const explicitTime = extractTimeFromMessage(userMessage);
  if (explicitTime) {
    mergedCollectedData.time = explicitTime;
  }
  const explicitDate = extractDateFromMessage(userMessage, referenceDate);
  if (explicitDate) {
    mergedCollectedData.date = explicitDate;
  }

  if (mergedCollectedData.date) {
    mergedCollectedData.date = resolveDateString(mergedCollectedData.date as string, referenceDate);
  }

  if (mergedCollectedData.delivery_preference) {
    const strV = String(mergedCollectedData.delivery_preference).toLowerCase();
    if (strV.includes('pickup') || strV.includes('pick up')) {
      mergedCollectedData.delivery_preference = 'Pickup';
    } else if (strV.includes('delivery') || strV.includes('deliver')) {
      mergedCollectedData.delivery_preference = 'Delivery';
    }
  }
  if (mergedCollectedData.time) {
    const timeWasInPrevState = Boolean(existingCollectedData.time);
    const userHasExplicitTime = Boolean(explicitTime) || isFieldAnsweredInUserMessage('time', mergedCollectedData.time, userMessage, undefined);

    if (!timeWasInPrevState && !userHasExplicitTime) {
      console.log(`[Time Extraction Guard] REJECTED defaulted/hallucinated time "${mergedCollectedData.time}" for user message: "${userMessage}"`);
      delete mergedCollectedData.time;
    } else {
      const normTime = normalizeTimeString(mergedCollectedData.time as string);
      if (normTime && /^\d{2}:\d{2}$/.test(normTime)) {
        mergedCollectedData.time = normTime;
      } else {
        delete mergedCollectedData.time;
      }
    }
  }

  const prevDate = (existingCollectedData.date as string) || '';
  const prevTime = (existingCollectedData.time as string) || '';
  const newDate = (mergedCollectedData.date as string) || '';
  const newTime = (mergedCollectedData.time as string) || '';

  const dateTimeChanged = Boolean(
    (newDate && prevDate && newDate !== prevDate) ||
    (newTime && prevTime && newTime !== prevTime)
  );

  const evalState = evaluateWorkflowState(workflow, mergedCollectedData, business.timezone);

  const lowerUserMsg = userMessage.toLowerCase().trim();

  // Comprehensive affirmative confirmation tokens across English, Devanagari Hindi, and Hinglish
  const confirmTokens = [
    // English
    'yes', 'yeah', 'yep', 'okay', 'ok', 'oke', 'k', 'sure', 'confirm', 'confirmed',
    'confirm it', 'book it', 'do it', 'done', 'go ahead', 'fine', 'perfect', 'book',
    // Hindi (Devanagari)
    'हाँ', 'हां', 'जी', 'ठीक है', 'कर दो', 'करदो', 'बुक कर दो', 'कन्फर्म कर दो', 'हाँ कर दो',
    'ठीक है कर दो', 'हो गया', 'जी हाँ', 'जी हां', 'कर दीजिए',
    // Hinglish
    'kardo', 'kar do', 'haan kardo', 'haan kar do', 'confirm kar do', 'book kar do',
    'okay kar do', 'done', 'kar do', 'yes kar do', 'ha confirm kar do', 'hanji',
    'yes please', 'kar sakte ho', 'haan', 'ha', 'han', 'haa'
  ];

  const isConfirmed = confirmTokens.some((token) => {
    if (token.length <= 3) {
      const regex = new RegExp(`(?:^|\\s)${token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?:$|\\s|[.,!?])`, 'i');
      return regex.test(lowerUserMsg);
    }
    return lowerUserMsg.includes(token);
  });

  const isCancellationOrChange =
    lowerUserMsg.includes('no') ||
    lowerUserMsg.includes('cancel') ||
    lowerUserMsg.includes('change') ||
    lowerUserMsg.includes('another time') ||
    lowerUserMsg.includes('different time') ||
    lowerUserMsg.includes('other time');

  const isTimeOrDateUpdate = Boolean(explicitTime || explicitDate || dateTimeChanged);

  // HARD DEFENSIVE GUARD FOR GOOGLE CALENDAR
  // If required date or time is missing, NEVER call check_calendar_availability or create_event.
  // calendarStatus MUST remain 'IDLE'.
  if (!mergedCollectedData.date || !mergedCollectedData.time) {
    calendarStatus = 'IDLE';
  }

  // Invalidate stale calendarStatus if user provided a NEW date or time AND all required fields are complete
  if (isTimeOrDateUpdate && !isConfirmed && evalState.isComplete && mergedCollectedData.date && mergedCollectedData.time) {
    calendarStatus = 'CHECKING';
  }

  const prevCalendarStatus = (input.calendarStatus || 'IDLE') as string;

  // Handle Google Calendar Action Confirmation & Execution Flow
  if (isCalendarActionConfigured && evalState.isComplete && mergedCollectedData.date && mergedCollectedData.time) {
    const targetDate = mergedCollectedData.date as string;
    const targetTime = mergedCollectedData.time as string;

    if (calendarEventId) {
      // 1. CANCEL CALENDAR EVENT TOOL
      if (lowerUserMsg.includes('cancel') || lowerUserMsg.includes('delete') || lowerUserMsg.includes('कैंसिल') || lowerUserMsg.includes('रद्द')) {
        console.log(`[Google Calendar Tool] Invoking cancelCalendarEvent for eventId="${calendarEventId}"`);
        const cancelRes = await cancelCalendarEvent(calendarEventId);
        if (cancelRes.success) {
          calendarStatus = 'CANCELLED';
          calendarEventId = null;
          delete mergedCollectedData._booking_ticket;
        } else {
          calendarStatus = 'ERROR';
          calendarError = cancelRes.error || 'Failed to cancel Google Calendar event';
        }
      }
      // 2. UPDATE / RESCHEDULE CALENDAR EVENT TOOL
      else if (isTimeOrDateUpdate) {
        let startIso = '';
        let endIso = '';
        try {
          const res = buildIsoInTimezone(targetDate, targetTime, business.timezone, 30, referenceDate);
          startIso = res.startIso;
          endIso = res.endIso;
        } catch (tzErr: unknown) {
          calendarStatus = 'ERROR';
          calendarError = tzErr instanceof Error ? tzErr.message : 'Invalid timezone configuration';
        }

        if (startIso && endIso && calendarStatus !== 'ERROR') {
          const availRes = await checkCalendarAvailability({
            startTime: startIso,
            endTime: endIso,
            timezone: business.timezone,
          });

          if (availRes.success && availRes.available) {
            if (isConfirmed || prevCalendarStatus === 'AVAILABLE' || prevCalendarStatus === 'CHECKING') {
              console.log(`[Google Calendar Tool] Invoking updateCalendarEvent for eventId="${calendarEventId}"`);
              const updateRes = await updateCalendarEvent(calendarEventId, {
                summary: `Booking - ${business.name}`,
                description: `Customer: ${customerName || 'N/A'}\nData: ${JSON.stringify(mergedCollectedData)}`,
                startTime: startIso,
                endTime: endIso,
                timezone: business.timezone,
              });

              if (updateRes.success) {
                calendarStatus = 'EVENT_CREATED';
                calendarEventId = updateRes.eventId || calendarEventId;
              } else {
                calendarStatus = 'ERROR';
                calendarError = updateRes.error || 'Failed to update Google Calendar event';
              }
            } else {
              calendarStatus = 'AVAILABLE';
            }
          } else if (availRes.success && !availRes.available) {
            calendarStatus = 'UNAVAILABLE';
          } else {
            calendarStatus = 'ERROR';
            calendarError = availRes.error || 'Calendar API check failed';
          }
        }
      }
    } else if (calendarStatus !== 'EVENT_CREATED') {
      if (isCancellationOrChange && !isTimeOrDateUpdate && (lowerUserMsg.includes('no') || lowerUserMsg.includes('cancel')) && !lowerUserMsg.includes('time')) {
        calendarStatus = 'IDLE';
      } else if (isConfirmed && !isCancellationOrChange && !isTimeOrDateUpdate) {
        // Execute Google Calendar Event Creation on explicit user confirmation
        let startIso = '';
        let endIso = '';
        try {
          const res = buildIsoInTimezone(targetDate, targetTime, business.timezone, 30, referenceDate);
          startIso = res.startIso;
          endIso = res.endIso;
        } catch (tzErr: unknown) {
          calendarStatus = 'ERROR';
          calendarError = tzErr instanceof Error ? tzErr.message : 'Invalid timezone configuration';
        }

        if (startIso && endIso && calendarStatus !== 'ERROR') {
          const createRes = await createCalendarEvent({
            summary: `Booking - ${business.name}`,
            description: `Customer: ${customerName || 'N/A'}\nData: ${JSON.stringify(mergedCollectedData)}`,
            startTime: startIso,
            endTime: endIso,
            timezone: business.timezone,
          });

          if (createRes.success && createRes.eventId) {
            calendarStatus = 'EVENT_CREATED';
            calendarEventId = createRes.eventId;
          } else {
            calendarStatus = 'ERROR';
            calendarError = createRes.error || 'Failed to create Google Calendar event';
          }
        }
      } else if (
        isTimeOrDateUpdate ||
        (calendarStatus as string) === 'IDLE' ||
        (calendarStatus as string) === 'CHECKING'
      ) {
        // Perform fresh Google Calendar Availability Check for the NEW datetime
        let startIso = '';
        let endIso = '';
        try {
          const res = buildIsoInTimezone(targetDate, targetTime, business.timezone, 30, referenceDate);
          startIso = res.startIso;
          endIso = res.endIso;
        } catch (tzErr: unknown) {
          calendarStatus = 'ERROR';
          calendarError = tzErr instanceof Error ? tzErr.message : 'Invalid timezone configuration';
        }

        // Required explicit debug logging
        console.log('[Calendar Availability]');
        console.log(`  conversationId=${(input as any).conversationId || 'N/A'}`);
        console.log(`  extracted date=${newExtractedData.date || explicitDate || 'N/A'}`);
        console.log(`  extracted time=${newExtractedData.time || explicitTime || 'N/A'}`);
        console.log(`  normalized date=${targetDate}`);
        console.log(`  normalized time=${targetTime}`);
        console.log(`  final ISO timestamp=${startIso}`);
        console.log(`  timezone=${business.timezone}`);

        if (startIso && endIso && calendarStatus !== 'ERROR') {
          const availRes = await checkCalendarAvailability({
            startTime: startIso,
            endTime: endIso,
            timezone: business.timezone,
          });

          console.log(`  result=${availRes.available ? 'AVAILABLE' : 'UNAVAILABLE'}`);

          if (availRes.success && availRes.available) {
            calendarStatus = 'AVAILABLE';
          } else if (availRes.success && !availRes.available) {
            calendarStatus = 'UNAVAILABLE';
          } else {
            calendarStatus = 'ERROR';
            calendarError = availRes.error || 'Calendar API check failed';
          }
        }
      } else if (calendarStatus === 'AVAILABLE' || calendarStatus === 'AWAITING_CONFIRMATION') {
        // User provided ambiguous / low-confidence response during confirmation prompt
        // Maintain AWAITING_CONFIRMATION state so booking is NOT prematurely created
        calendarStatus = 'AWAITING_CONFIRMATION';
      }
    }
  }

  let finalReply = (parsed.reply || '').trim();

  // SAFEGUARD: Workflow Question Order Enforcement
  if (!evalState.isComplete) {
    const missing = evalState.missingRequiredFields;
    const nextMissingField = missing[0];

    if (nextMissingField) {
      const fieldName = nextMissingField.name;

      // Field-aware smart recovery if transcript was unparseable or response was closing
      if ((fieldName.includes('name') || fieldName.includes('patient')) && !mergedCollectedData[fieldName]) {
        const isUnclearNameAttempt =
          userMessage.trim().length > 0 &&
          (!isPlausibleFieldValue(fieldName, userMessage) || /[\u0400-\u04FF]/.test(userMessage));

        if (isUnclearNameAttempt) {
          if (userLangStyle === 'hinglish') {
            finalReply = 'Please apna naam ek baar phir thoda clearly bataiye.';
          } else if (userLangStyle === 'hindi') {
            finalReply = 'कृपया अपना नाम एक बार फिर धीरे-धीरे बताइए।';
          } else {
            finalReply = 'Could you please say your name again?';
          }
        } else {
          const isAskingCorrectField = isReplyAskingForField(finalReply, nextMissingField);
          const isEnglishReplyWhenHindi = userLangStyle === 'hindi' && !/[\u0900-\u097F]/.test(finalReply);
          const isEnglishReplyWhenHinglish =
            userLangStyle === 'hinglish' &&
            (finalReply.toLowerCase().startsWith('sure,') || finalReply.toLowerCase().includes('which doctor') || finalReply.toLowerCase().includes('could you please'));

          if (!finalReply || !isAskingCorrectField || isEnglishReplyWhenHindi || isEnglishReplyWhenHinglish) {
            finalReply = getLanguageConsistentQuestion(nextMissingField, userLangStyle, customerName);
          }
        }
      } else if (fieldName === 'time' && !mergedCollectedData.time) {
        if (userLangStyle === 'hinglish') {
          finalReply = 'Time ek baar phir bata dijiye, jaise 2 PM ya 4 baje.';
        } else if (userLangStyle === 'hindi') {
          finalReply = 'कृपया समय एक बार फिर बताइए। जैसे 2 PM या 4 बजे।';
        } else {
          finalReply = 'Could you please repeat your preferred time? For example, 2 PM or 4 PM.';
        }
      } else if (fieldName === 'date' && !mergedCollectedData.date) {
        if (userLangStyle === 'hinglish') {
          finalReply = 'Date ek baar phir bata dijiye, jaise aaj, kal ya 4 September.';
        } else if (userLangStyle === 'hindi') {
          finalReply = 'कृपया तारीख एक बार फिर बताइए। जैसे आज, कल या 4 सितंबर।';
        } else {
          finalReply = 'Could you please repeat the date? For example, today, tomorrow, or September 4.';
        }
      } else {
        // Force the reply to ask for the FIRST missing field in workflow order
        const isAskingCorrectField = isReplyAskingForField(finalReply, nextMissingField);
        const isEnglishReplyWhenHindi = userLangStyle === 'hindi' && !/[\u0900-\u097F]/.test(finalReply);
        const isEnglishReplyWhenHinglish =
          userLangStyle === 'hinglish' &&
          (finalReply.toLowerCase().startsWith('sure,') || finalReply.toLowerCase().includes('which doctor') || finalReply.toLowerCase().includes('could you please'));

        if (!finalReply || !isAskingCorrectField || isEnglishReplyWhenHindi || isEnglishReplyWhenHinglish) {
          finalReply = getLanguageConsistentQuestion(nextMissingField, userLangStyle, customerName);
        }
      }
    }
  } else if (!finalReply) {
    finalReply = workflow.closing;
  }

  // Format natural date & time labels (e.g., "kal, 4 September", "2:00 PM")
  const naturalDateStr = formatNaturalDateLabel(
    (mergedCollectedData.date as string) || '',
    userLangStyle,
    referenceDate
  );
  const naturalTimeStr = formatNaturalTime12h((mergedCollectedData.time as string) || '');

  if (calendarStatus === 'UNAVAILABLE') {
    if (userLangStyle === 'hinglish') {
      finalReply = `Mujhe khed hai, ${naturalDateStr} ko ${naturalTimeStr} ka slot available nahi hai. Kripya koi doosra time batayein.`;
    } else if (userLangStyle === 'hindi') {
      finalReply = `मुझे खेद है, ${naturalDateStr} को ${naturalTimeStr} का स्लॉट उपलब्ध नहीं है। कृपया कोई दूसरा समय बताएं।`;
    } else {
      finalReply = `I am sorry, the slot for ${naturalDateStr} at ${naturalTimeStr} is unavailable. Please choose another date or time.`;
    }
  } else if (calendarStatus === 'ERROR') {
    if (userLangStyle === 'hinglish') {
      finalReply = `System calendar issue error aayi hai (${calendarError || 'error'}). Aapke details save ho gaye hain, humari team jald contact karegi.`;
    } else if (userLangStyle === 'hindi') {
      finalReply = `क्षमा करें, कैलेंडर में अपॉइंटमेंट जोड़ने में एक समस्या आई है (${calendarError || 'त्रुटि'})। क्या आप फिर से प्रयास करना चाहेंगे?`;
    } else {
      finalReply = `I am sorry, there was a system issue creating your appointment (${calendarError || 'system error'}). Would you like to try again?`;
    }
  } else if (calendarStatus === 'AVAILABLE' || calendarStatus === 'AWAITING_CONFIRMATION') {
    const wasAmbiguousAttempt = !isConfirmed && !isCancellationOrChange && (prevCalendarStatus === 'AWAITING_CONFIRMATION' || prevCalendarStatus === 'AVAILABLE');

    if (wasAmbiguousAttempt) {
      if (userLangStyle === 'hinglish') {
        finalReply = `Mujhe aapki baat thik se samajh nahi aayi. Kya aap ${naturalDateStr} ko ${naturalTimeStr} ka slot confirm karna chahte hain?`;
      } else if (userLangStyle === 'hindi') {
        finalReply = `मुझे आपकी बात ठीक से समझ नहीं आई। क्या आप ${naturalDateStr} को ${naturalTimeStr} का स्लॉट confirm करना चाहते हैं?`;
      } else {
        finalReply = `I didn't quite capture that. Would you like me to confirm the slot for ${naturalDateStr} at ${naturalTimeStr}?`;
      }
    } else {
      if (userLangStyle === 'hinglish') {
        finalReply = `${naturalDateStr} ko ${naturalTimeStr} ka slot available hai. Kya main aapki booking confirm kar doon?`;
      } else if (userLangStyle === 'hindi') {
        finalReply = `${naturalDateStr} को ${naturalTimeStr} का स्लॉट उपलब्ध है। क्या मैं आपकी बुकिंग कन्फर्म कर दूँ?`;
      } else {
        finalReply = `The slot for ${naturalDateStr} at ${naturalTimeStr} is available. Would you like me to confirm the appointment?`;
      }
    }
  } else if (calendarStatus === 'EVENT_CREATED') {
    if (userLangStyle === 'hinglish') {
      finalReply = `Ho gaya! Aapki appointment ${naturalDateStr} ko ${naturalTimeStr} par confirm ho gayi hai aur Google Calendar mein add kar di gayi hai. Dhanyawad!`;
    } else if (userLangStyle === 'hindi') {
      finalReply = `हो गया! आपकी अपॉइंटमेंट ${naturalDateStr} को ${naturalTimeStr} पर confirm हो गई है और Google Calendar में add कर दी गई है। धन्यवाद!`;
    } else {
      finalReply = `Done! Your appointment for ${naturalDateStr} at ${naturalTimeStr} has been confirmed and added to Google Calendar.`;
    }
  } else if (calendarStatus === 'CANCELLED') {
    if (userLangStyle === 'hinglish') {
      finalReply = 'Aapki appointment Google Calendar se cancel kar di gayi hai. Dhanyawad!';
    } else if (userLangStyle === 'hindi') {
      finalReply = 'आपकी अपॉइंटमेंट Google Calendar से रद्द कर दी गई है। धन्यवाद!';
    } else {
      finalReply = 'Your appointment has been cancelled in Google Calendar. Let me know if you need anything else!';
    }
  } else if (isCancellationOrChange && (lowerUserMsg.includes('no') || lowerUserMsg.includes('cancel')) && !lowerUserMsg.includes('time')) {
    if (userLangStyle === 'hinglish') {
      finalReply = 'Koi baat nahi! Aapki appointment request cancel kar di gayi hai. Agar koi aur time chahiye to bataiye.';
    } else {
      finalReply = `No problem! Your appointment request has been cancelled. Let me know if you would like to pick another date or time.`;
    }
  }

  // CRITICAL SERVER-SIDE RESPONSE SANITIZER & GUARD FOR CALENDAR WORKFLOWS
  if (isCalendarActionConfigured && calendarStatus !== 'EVENT_CREATED' && calendarStatus !== 'CANCELLED') {
    const isGenericClosingOrBookingClaim =
      finalReply.toLowerCase().includes('received your') ||
      finalReply.toLowerCase().includes('master baker') ||
      (workflow.closing && finalReply.toLowerCase().trim() === workflow.closing.toLowerCase().trim()) ||
      /booked|confirmed|scheduled|added to google calendar|successfully booked|ho gaya|हो गया|बुक कर ली गई|कन्फर्म हो गई|कन्फर्म कर दी गई|कन्फर्म हो चुकी|google calendar में add/i.test(finalReply);

    if (isGenericClosingOrBookingClaim || calendarStatus === 'UNAVAILABLE' || calendarStatus === 'AVAILABLE' || calendarStatus === 'AWAITING_CONFIRMATION' || calendarStatus === 'ERROR') {
      console.log(`[Calendar State Guard] OVERRIDING invalid response containing premature booking/closing claim during calendarStatus="${calendarStatus}": "${finalReply}"`);

      if (calendarStatus === 'UNAVAILABLE') {
        if (userLangStyle === 'hinglish') {
          finalReply = `Mujhe khed hai, ${naturalDateStr} ko ${naturalTimeStr} ka slot available nahi hai. Kripya koi doosra time batayein.`;
        } else if (userLangStyle === 'hindi') {
          finalReply = `मुझे खेद है, ${naturalDateStr} को ${naturalTimeStr} का स्लॉट उपलब्ध नहीं है। कृपया कोई दूसरा समय बताएं।`;
        } else {
          finalReply = `I am sorry, the slot for ${naturalDateStr} at ${naturalTimeStr} is unavailable. Please choose another date or time.`;
        }
      } else if (calendarStatus === 'AVAILABLE' || calendarStatus === 'AWAITING_CONFIRMATION') {
        if (userLangStyle === 'hinglish') {
          finalReply = `${naturalDateStr} ko ${naturalTimeStr} ka slot available hai. Kya main aapki booking confirm kar doon?`;
        } else if (userLangStyle === 'hindi') {
          finalReply = `${naturalDateStr} को ${naturalTimeStr} का स्लॉट उपलब्ध है। क्या मैं आपकी बुकिंग कन्फर्म कर दूँ?`;
        } else {
          finalReply = `The slot for ${naturalDateStr} at ${naturalTimeStr} is available. Would you like me to confirm the appointment?`;
        }
      } else if (calendarStatus === 'ERROR') {
        if (userLangStyle === 'hinglish') {
          finalReply = `System calendar issue error aayi hai (${calendarError || 'error'}). Aapke details save ho gaye hain, humari team jald contact karegi.`;
        } else if (userLangStyle === 'hindi') {
          finalReply = `क्षमा करें, कैलेंडर में अपॉइंटमेंट जोड़ने में एक समस्या आई है (${calendarError || 'त्रुटि'})। क्या आप फिर से प्रयास करना चाहेंगे?`;
        } else {
          finalReply = `I am sorry, there was a system issue creating your appointment (${calendarError || 'system error'}). Would you like to try again?`;
        }
      } else if (!evalState.isComplete) {
        finalReply = getLanguageConsistentQuestion(evalState.missingRequiredFields[0], userLangStyle, customerName);
      }
    }
  }

  // Final safeguard: Replace any remaining raw ISO YYYY-MM-DD dates in finalReply so customer NEVER sees raw ISO strings
  finalReply = finalReply.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (match: string) => {
    return formatNaturalDateLabel(match, userLangStyle, referenceDate);
  });

  const finalEventId = calendarEventId || input.calendarEventId || null;

  const isWorkflowFullyDone = isCalendarActionConfigured
    ? (calendarStatus === 'EVENT_CREATED' && Boolean(finalEventId))
    : (evalState.isComplete && evalState.missingRequiredFields.length === 0);

  let bookingTicket: BookingTicket | null = null;
  if (isWorkflowFullyDone && calendarStatus === 'EVENT_CREATED' && finalEventId) {
    bookingTicket = {
      ticketId: `TCK-${finalEventId.slice(-8).toUpperCase()}`,
      calendarEventId: finalEventId,
      customerName: customerName || (mergedCollectedData.customer_name as string) || 'Customer',
      businessName: business.name,
      workflowName: workflow.name,
      date: (mergedCollectedData.date as string) || '',
      time: (mergedCollectedData.time as string) || '',
      details: { ...mergedCollectedData },
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };
    mergedCollectedData._booking_ticket = bookingTicket;
  } else {
    delete mergedCollectedData._booking_ticket;
  }

  return {
    reply: finalReply,
    intent: parsed.intent || 'general_inquiry',
    customerName,
    newExtractedData,
    mergedCollectedData,
    missingFields: evalState.missingRequiredFields.map((q) => q.name),
    workflowComplete: isWorkflowFullyDone,
    priority: (evalState.priority as 'low' | 'normal' | 'high' | 'urgent') || 'normal',
    summary: isWorkflowFullyDone
      ? parsed.summary || `Request processed for ${customerName || 'customer'}`
      : null,
    actionRequired: evalState.actionRequired,
    actionType: evalState.actionType || null,
    actionOperation: evalState.actionOperation || null,
    calendarStatus,
    calendarEventId: finalEventId,
    calendarError,
    bookingTicket,
  };
}
