import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Workflow, Business } from '@/types/database';
import { ensureSeedData } from '@/lib/seed-helpers';

export async function GET() {
  try {
    await ensureSeedData();

    const supabase = await createClient();

    // Fetch workflows
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflows:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflows: (workflows || []) as Workflow[] });
  } catch (err) {
    console.error('Workflows GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, trigger, greeting, questions, conditions, action, closing, active } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Workflow name is required' }, { status: 400 });
    }
    if (!greeting || !greeting.trim()) {
      return NextResponse.json({ error: 'Greeting message is required' }, { status: 400 });
    }
    if (!closing || !closing.trim()) {
      return NextResponse.json({ error: 'Closing message is required' }, { status: 400 });
    }

    // Ensure seed data / default business exists if database is fresh
    await ensureSeedData();

    const supabase = await createClient();

    // Get or create primary business
    let { data: businesses, error: fetchBizErr } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchBizErr) {
      console.error('Error fetching businesses:', fetchBizErr);
    }

    let businessId = businesses && businesses.length > 0 ? (businesses[0] as Business).id : null;

    if (!businessId) {
      // Create a default business profile if missing
      const { data: newBiz, error: bizErr } = await supabase
        .from('businesses')
        // @ts-ignore Supabase insert payload
        .insert({
          name: 'My Business',
          industry: 'general',
          phone: null,
          address: null,
          timezone: 'UTC',
          languages: ['en'],
        } as any)
        .select()
        .single();

      if (bizErr || !newBiz) {
        console.error('Error auto-creating business:', bizErr);
        const detail = bizErr?.message || 'Failed to insert business record.';
        return NextResponse.json(
          { error: `Could not initialize business profile: ${detail}` },
          { status: 500 }
        );
      }
      businessId = (newBiz as Business).id;
    }

    const payload = {
      business_id: businessId,
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
      // @ts-ignore Supabase insert payload
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating workflow:', error);
      return NextResponse.json({ error: `Failed to save workflow: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ workflow, message: 'Workflow created successfully' });
  } catch (err) {
    console.error('Workflows POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
