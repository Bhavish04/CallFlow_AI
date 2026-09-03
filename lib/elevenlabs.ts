export interface SynthesizeSpeechInput {
  text: string;
}

export interface SynthesizeSpeechResult {
  success: boolean;
  audioBuffer?: Buffer;
  error?: string;
}

export async function synthesizeSpeechWithElevenLabs(
  input: SynthesizeSpeechInput
): Promise<SynthesizeSpeechResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';

  if (!apiKey || apiKey === 'your-elevenlabs-api-key') {
    return {
      success: false,
      error: 'ElevenLabs API key missing in environment (.env.local). Please set ELEVENLABS_API_KEY.',
    };
  }

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: input.text,
        model_id: 'eleven_multilingual_v2', // Supports English, Hindi, Hinglish, etc.
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let detailMsg = `ElevenLabs TTS error (${response.status}): ${response.statusText}`;
      try {
        const parsedErr = JSON.parse(errText);
        if (parsedErr?.detail?.message) {
          detailMsg = `ElevenLabs error (${response.status}): ${parsedErr.detail.message}`;
        }
      } catch {}
      console.error('ElevenLabs TTS API Error:', detailMsg);
      return {
        success: false,
        error: detailMsg,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    return {
      success: true,
      audioBuffer,
    };
  } catch (err: unknown) {
    console.error('ElevenLabs TTS Exception:', err);
    const msg = err instanceof Error ? err.message : 'ElevenLabs TTS failed';
    return {
      success: false,
      error: msg,
    };
  }
}
