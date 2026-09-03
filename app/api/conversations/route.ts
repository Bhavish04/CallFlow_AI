import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const workflowId = searchParams.get('workflow_id');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');

    const supabase = await createClient();

    let query = supabase
      .from('conversations')
      .select(`
        *,
        workflows:workflow_id (
          id,
          name,
          questions
        ),
        followups (
          id,
          status,
          notes,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    if (workflowId) {
      query = query.eq('workflow_id', workflowId);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    let filtered: any[] = conversations || [];

    // Text search on customer_name, phone, intent
    if (q) {
      const lowerQ = q.toLowerCase();
      filtered = filtered.filter((conv) => {
        const nameMatch = conv.customer_name?.toLowerCase().includes(lowerQ);
        const phoneMatch = conv.phone?.toLowerCase().includes(lowerQ);
        const intentMatch = conv.intent?.toLowerCase().includes(lowerQ);
        return Boolean(nameMatch || phoneMatch || intentMatch);
      });
    }

    return NextResponse.json({ conversations: filtered });
  } catch (err) {
    console.error('Conversations GET API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
