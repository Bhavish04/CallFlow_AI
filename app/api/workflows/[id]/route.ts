import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Workflow } from '@/types/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ workflow: workflow as Workflow });
  } catch (err) {
    console.error('Workflow GET [id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, trigger, greeting, questions, conditions, action, closing, active } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Workflow name is required' }, { status: 400 });
    }
    if (!greeting || !greeting.trim()) {
      return NextResponse.json({ error: 'Greeting message is required' }, { status: 400 });
    }
    if (!closing || !closing.trim()) {
      return NextResponse.json({ error: 'Closing message is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const payload = {
      name: name.trim(),
      trigger: trigger || 'missed_call',
      greeting: greeting.trim(),
      questions: Array.isArray(questions) ? questions : [],
      conditions: Array.isArray(conditions) ? conditions : [],
      action: action || { type: 'none' },
      closing: closing.trim(),
      active: active !== undefined ? Boolean(active) : true,
    };

    const { data: workflow, error } = await supabase
      .from('workflows')
      // @ts-ignore Supabase update payload
      .update(payload as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating workflow:', error);
      return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
    }

    return NextResponse.json({ workflow, message: 'Workflow updated successfully' });
  } catch (err) {
    console.error('Workflow PUT [id] error:', err);
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
    const { active } = body;

    const supabase = await createClient();

    const { data: workflow, error } = await supabase
      .from('workflows')
      // @ts-ignore Supabase update payload
      .update({ active: Boolean(active) } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating workflow status:', error);
      return NextResponse.json({ error: 'Failed to update workflow status' }, { status: 500 });
    }

    return NextResponse.json({ workflow });
  } catch (err) {
    console.error('Workflow PATCH [id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting workflow:', error);
      return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Workflow deleted successfully' });
  } catch (err) {
    console.error('Workflow DELETE [id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
