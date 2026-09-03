export interface TranscribeAudioInput {
  audioBuffer: Buffer;
  mimeType: string;
  language?: string; // e.g. 'hi', 'en', 'hinglish', 'auto'
}

export interface TranscribeAudioResult {
  success: boolean;
  transcript: string;
  language?: string;
  confidence?: number;
  duration?: number;
  model?: string;
  requestId?: string;
  sttRetried?: boolean;
  error?: string;
}

/**
 * Validates whether an STT transcript is suspicious (e.g. Cyrillic misclassification, noise, or low confidence).
 */
export function isSuspiciousSTT(
  transcript: string,
  confidence: number,
  detectedLanguage?: string
): boolean {
  if (!transcript || typeof transcript !== 'string') return true;
  const trimmed = transcript.trim();
  if (trimmed.length === 0) return true;

  // Punctuation / noise-only output
  if (/^[\s.,!?-]+$/.test(trimmed)) return true;

  // Cyrillic script mismatch (e.g. "Ба Биш!")
  if (/[\u0400-\u04FF]/.test(trimmed)) return true;

  // Misdetected Cyrillic languages (bg, ru, sr, uk, be, mk)
  const cyrillicLangs = ['bg', 'ru', 'sr', 'uk', 'be', 'mk'];
  if (detectedLanguage && cyrillicLangs.includes(detectedLanguage.toLowerCase())) {
    return true;
  }

  // Extremely low confidence score (< 0.35)
  if (typeof confidence === 'number' && confidence < 0.35) {
    return true;
  }

  return false;
}

async function callDeepgramAPI(
  audioBuffer: Buffer,
  mimeType: string,
  apiKey: string,
  langParam?: string
): Promise<any> {
  // Valid Deepgram Nova-2 request without unsupported alternatives parameter
  let url = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true';

  if (langParam === 'hi' || langParam === 'en') {
    url += `&language=${encodeURIComponent(langParam)}`;
  } else {
    url += '&detect_language=true';
  }

  const uint8Array = new Uint8Array(audioBuffer);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': mimeType || 'audio/webm',
    },
    body: uint8Array,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Deepgram STT API error (${response.status}): ${errText || response.statusText}`);
  }

  return await response.json();
}

export async function transcribeAudioWithDeepgram(
  input: TranscribeAudioInput
): Promise<TranscribeAudioResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey || apiKey === 'your-deepgram-api-key') {
    return {
      success: false,
      transcript: '',
      error: 'Deepgram API key missing in environment (.env.local). Please configure DEEPGRAM_API_KEY.',
    };
  }

  try {
    const requestedLang = input.language;

    // First Deepgram STT attempt
    const data = await callDeepgramAPI(input.audioBuffer, input.mimeType, apiKey, requestedLang);

    const alt = data?.results?.channels?.[0]?.alternatives?.[0];
    const initialTranscript = (alt?.transcript || '').trim();
    const initialConfidence = typeof alt?.confidence === 'number' ? alt.confidence : 1.0;
    const initialLanguage = alt?.languages?.[0] || data?.results?.channels?.[0]?.detected_language || 'en';
    const duration = data?.metadata?.duration || null;
    const model = data?.metadata?.model_info?.name || 'nova-2';
    const requestId = data?.metadata?.request_id || null;

    let finalTranscript = initialTranscript;
    let finalConfidence = initialConfidence;
    let finalLanguage = initialLanguage;
    let sttRetried = false;

    // Controlled 1-retry mechanism if initial transcript is suspicious and language wasn't strictly forced
    const isSuspicious = isSuspiciousSTT(initialTranscript, initialConfidence, initialLanguage);
    if (isSuspicious && (!requestedLang || requestedLang === 'auto' || requestedLang === 'hinglish')) {
      console.warn(
        `[Deepgram STT] Primary transcript suspicious ("${initialTranscript || 'empty'}"). Performing 1 controlled retry with language=hi...`
      );
      try {
        const retryData = await callDeepgramAPI(input.audioBuffer, input.mimeType, apiKey, 'hi');
        const retryAlt = retryData?.results?.channels?.[0]?.alternatives?.[0];
        const retryTranscript = (retryAlt?.transcript || '').trim();
        const retryConf = typeof retryAlt?.confidence === 'number' ? retryAlt.confidence : 1.0;
        const retryLang = retryAlt?.languages?.[0] || 'hi';

        if (!isSuspiciousSTT(retryTranscript, retryConf, retryLang)) {
          finalTranscript = retryTranscript;
          finalConfidence = retryConf;
          finalLanguage = retryLang;
          sttRetried = true;
          console.log(
            `[Deepgram STT] Controlled retry succeeded: transcript="${finalTranscript}", confidence=${finalConfidence}`
          );
        }
      } catch (retryErr) {
        console.warn('[Deepgram STT] Controlled retry exception:', retryErr);
      }
    }

    if (!finalTranscript) {
      return {
        success: false,
        transcript: '',
        error: 'No speech detected in audio recording. Please try speaking again.',
      };
    }

    return {
      success: true,
      transcript: finalTranscript,
      language: finalLanguage,
      confidence: finalConfidence,
      duration,
      model,
      requestId,
      sttRetried,
    };
  } catch (err: unknown) {
    console.error('Deepgram STT Exception:', err);
    const msg = err instanceof Error ? err.message : 'Deepgram transcription failed';
    return {
      success: false,
      transcript: '',
      error: msg,
    };
  }
}
