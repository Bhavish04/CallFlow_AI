import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        workflows:workflow_id (
          id,
          name,
          trigger,
          greeting,
          questions,
          closing
        ),
        businesses:business_id (
          id,
          name,
          industry,
          timezone
        ),
        followups (
          id,
          status,
          notes,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    console.error('Conversation GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, priority, summary } = body;

    if (!id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (status !== undefined) updatePayload.status = status;
    if (priority !== undefined) updatePayload.priority = priority;
    if (summary !== undefined) updatePayload.summary = summary;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from('conversations')
      // @ts-ignore
      .update(updatePayload as any)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      console.error('Error updating conversation:', error);
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
    }

    return NextResponse.json({ conversation: updated, message: 'Conversation updated successfully' });
  } catch (err) {
    console.error('Conversation PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
