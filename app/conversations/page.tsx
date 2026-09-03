import { createClient } from '@/lib/supabase/server';
import { ConversationsList } from '@/components/conversations/ConversationsList';
import { Workflow } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function ConversationsPage() {
  const supabase = await createClient();

  const { data: workflowsData } = await supabase
    .from('workflows')
    .select('id, name, active')
    .order('created_at', { ascending: false });

  const workflows = (workflowsData || []) as Workflow[];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Conversations</h1>
        <p className="text-sm text-slate-500">
          View, search, and manage all automated customer callbacks, AI summaries, and follow-up tasks.
        </p>
      </div>

      <ConversationsList workflows={workflows} />
    </div>
  );
}
