import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversation_id, status, notes } = body;

    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if followup already exists for this conversation
    const { data: existing } = await supabase
      .from('followups')
      .select('*')
      .eq('conversation_id', conversation_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { followup: existing[0], message: 'Followup already exists' },
        { status: 200 }
      );
    }

    const payload = {
      conversation_id,
      status: status || 'pending',
      notes: notes || '',
    };

    const { data: followup, error } = await supabase
      .from('followups')
      // @ts-ignore
      .insert(payload as any)
      .select()
      .single();

    if (error || !followup) {
      console.error('Error creating followup:', error);
      return NextResponse.json({ error: 'Failed to create followup' }, { status: 500 });
    }

    return NextResponse.json({ followup, message: 'Followup created successfully' });
  } catch (err) {
    console.error('Followups POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
