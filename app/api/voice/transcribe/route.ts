import { NextResponse } from 'next/server';
import { transcribeAudioWithDeepgram } from '@/lib/deepgram';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const langParam = url.searchParams.get('lang') || url.searchParams.get('establishedLang') || undefined;

    const contentType = request.headers.get('content-type') || 'audio/webm';
    let audioBuffer: Buffer;
    let mimeType = contentType;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('audio') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No audio file found in form data' }, { status: 400 });
      }

      mimeType = file.type || 'audio/webm';
      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    } else {
      const arrayBuffer = await request.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json({ error: 'Audio payload is empty' }, { status: 400 });
    }

    // Safe non-secret diagnostic logging (NEVER logs secrets, keys, or authorization headers)
    console.log(
      `[Transcribe API] Incoming audio payload: size=${audioBuffer.length} bytes, mimeType=${mimeType}, langHint=${langParam || 'auto'}`
    );

    const result = await transcribeAudioWithDeepgram({
      audioBuffer,
      mimeType,
      language: langParam,
    });

    if (!result.success) {
      console.warn(`[Transcribe API] STT failure: ${result.error}`);
      return NextResponse.json({ error: result.error || 'STT transcription failed' }, { status: 400 });
    }

    console.log(
      `[Transcribe API] STT success: transcript="${result.transcript}", language=${result.language}, confidence=${result.confidence}, retried=${result.sttRetried || false}, requestId=${result.requestId || 'N/A'}`
    );

    const isDebug = process.env.NODE_ENV !== 'production' || url.searchParams.get('debug') === 'true';

    if (isDebug) {
      return NextResponse.json({
        transcript: result.transcript,
        language: result.language,
        confidence: result.confidence,
        duration: result.duration || null,
        model: result.model || 'nova-2',
        requestId: result.requestId || null,
        sttRetried: result.sttRetried || false,
        debug: {
          payloadSize: audioBuffer.length,
          mimeType,
          langHint: langParam || 'auto',
        },
      });
    }

    return NextResponse.json({
      transcript: result.transcript,
      language: result.language,
      confidence: result.confidence,
    });
  } catch (err: unknown) {
    console.error('Transcribe API error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
