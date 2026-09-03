import { createClient } from '@/lib/supabase/server';
import { ConversationDetailView } from '@/components/conversations/ConversationDetailView';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    notFound();
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <ConversationDetailView initialData={conversation as any} />
    </div>
  );
}
