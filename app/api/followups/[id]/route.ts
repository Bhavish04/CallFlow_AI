import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Followup ID is required' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (status !== undefined) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from('followups')
      // @ts-ignore
      .update(updatePayload as any)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      console.error('Error updating followup:', error);
      return NextResponse.json({ error: 'Failed to update followup' }, { status: 500 });
    }

    return NextResponse.json({ followup: updated, message: 'Followup updated successfully' });
  } catch (err) {
    console.error('Followup PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
