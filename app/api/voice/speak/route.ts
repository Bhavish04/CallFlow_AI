import { NextResponse } from 'next/server';
import { synthesizeSpeechWithElevenLabs } from '@/lib/elevenlabs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text parameter is required for TTS' }, { status: 400 });
    }

    const result = await synthesizeSpeechWithElevenLabs({ text: text.trim() });

    if (!result.success || !result.audioBuffer) {
      return NextResponse.json(
        { error: result.error || 'ElevenLabs TTS synthesis failed' },
        { status: 400 }
      );
    }

    // Convert Buffer to Uint8Array for Next.js response compatibility
    const uint8Array = new Uint8Array(result.audioBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': uint8Array.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: unknown) {
    console.error('Speak API error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
