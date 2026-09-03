import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Business } from '@/types/database';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Fetch primary business
    const { data: businesses } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);

    const business = (businesses && businesses.length > 0 ? businesses[0] : null) as Business | null;

    let activeWorkflowsCount = 0;
    let totalConversationsCount = 0;
    let pendingFollowupsCount = 0;
    let recentConversations: Array<Record<string, unknown>> = [];

    if (business && business.id) {
      // 2. Active workflows count
      const { count: wfCount } = await supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('active', true);

      activeWorkflowsCount = wfCount || 0;

      // 3. Total conversations count
      const { count: convCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id);

      totalConversationsCount = convCount || 0;

      // 4. Pending follow-ups count
      const { data: followups } = await supabase
        .from('followups')
        .select('id, status, conversation_id')
        .eq('status', 'pending');

      pendingFollowupsCount = followups ? followups.length : 0;

      // 5. Recent conversations (top 5)
      const { data: convs } = await supabase
        .from('conversations')
        .select(`
          id,
          customer_name,
          phone,
          intent,
          status,
          priority,
          collected_data,
          summary,
          action_performed,
          created_at,
          workflow_id
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (convs && convs.length > 0) {
        recentConversations = convs as unknown as Array<Record<string, unknown>>;
      }
    } else {
      // Fallback counts if no business record found yet
      const { count: wfCount } = await supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);
      activeWorkflowsCount = wfCount || 0;

      const { count: convCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });
      totalConversationsCount = convCount || 0;

      const { count: fuCount } = await supabase
        .from('followups')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      pendingFollowupsCount = fuCount || 0;
    }

    return NextResponse.json({
      business,
      activeWorkflowsCount,
      totalConversationsCount,
      pendingFollowupsCount,
      recentConversations,
    });
  } catch (err) {
    console.error('Dashboard GET handler error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
