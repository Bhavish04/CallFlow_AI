import { createClient } from '@/lib/supabase/server';
import { SimulatorView } from '@/components/simulator/SimulatorView';
import { ensureSeedData } from '@/lib/seed-helpers';
import { Workflow } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function SimulatorPage() {
  await ensureSeedData();

  const supabase = await createClient();

  // Load active workflows from Supabase
  const { data: workflowsData } = await supabase
    .from('workflows')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  const workflows = (workflowsData || []) as Workflow[];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Call Simulator</h1>
        <p className="text-sm text-slate-500">
          Simulate automated missed-call callbacks, parameter extraction, and workflow engine evaluation in real-time.
        </p>
      </div>

      <SimulatorView workflows={workflows} />
    </div>
  );
}
