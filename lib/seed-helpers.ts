import { createClient } from '@/lib/supabase/server';

export async function ensureSeedData() {
  try {
    const supabase = await createClient();

    // 1. Check existing workflows count
    const { count } = await supabase.from('workflows').select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      return; // Workflows already exist; no seeding needed
    }

    // 2. Check or create Clinic Business
    let clinicBizId: string | null = null;
    const { data: existingClinic } = await supabase
      .from('businesses')
      .select('id')
      .eq('industry', 'clinic')
      .limit(1);

    if (existingClinic && existingClinic.length > 0) {
      clinicBizId = (existingClinic[0] as any).id;
    } else {
      const { data: newClinic } = await supabase
        .from('businesses')
        // @ts-ignore
        .insert({
          name: 'Metro Health Care Clinic',
          industry: 'clinic',
          phone: '+1 555-0192',
          address: '123 Medical Center Way, Suite 400',
          timezone: 'America/New_York',
          languages: ['en', 'hi'],
        } as any)
        .select()
        .single();

      if (newClinic) clinicBizId = (newClinic as any).id;
    }

    // Insert Clinic Workflow if business exists
    if (clinicBizId) {
      await supabase
        .from('workflows')
        // @ts-ignore
        .insert({
          business_id: clinicBizId,
          name: 'Clinic Appointment Booking',
          trigger: 'missed_call',
          greeting:
            'Hello! Thank you for calling Metro Health Care Clinic. I noticed we missed your call. I am your AI assistant—how can I help you today?',
          questions: [
            { name: 'customer_name', label: 'Patient Name', required: true, type: 'text' },
            { name: 'specialty', label: 'Doctor or Specialty', required: true, type: 'text' },
            { name: 'date', label: 'Appointment Date', required: true, type: 'date' },
            { name: 'time', label: 'Preferred Time', required: true, type: 'time' },
          ],
          conditions: [
            { field: 'date', operator: 'within_24_hours', value: '', result: 'urgent' },
          ],
          action: { type: 'google_calendar', operation: 'create_event' },
          closing:
            'Thank you! Your appointment request has been recorded. Have a wonderful day!',
          active: true,
        } as any);
    }

    // 3. Check or create Bakery Business
    let bakeryBizId: string | null = null;
    const { data: existingBakery } = await supabase
      .from('businesses')
      .select('id')
      .eq('industry', 'cake_shop')
      .limit(1);

    if (existingBakery && existingBakery.length > 0) {
      bakeryBizId = (existingBakery[0] as any).id;
    } else {
      const { data: newBakery } = await supabase
        .from('businesses')
        // @ts-ignore
        .insert({
          name: 'Sweet Dreams Bakery & Cakes',
          industry: 'cake_shop',
          phone: '+1 555-0482',
          address: '456 Pastry Boulevard',
          timezone: 'America/Chicago',
          languages: ['en', 'hi'],
        } as any)
        .select()
        .single();

      if (newBakery) bakeryBizId = (newBakery as any).id;
    }

    // Insert or update Bakery Workflow if business exists
    if (bakeryBizId) {
      const bakeryQuestions = [
        { name: 'customer_name', label: 'Customer Name', required: true, type: 'text' },
        { name: 'cake_type', label: 'Cake Type / Theme', required: true, type: 'text' },
        { name: 'flavour', label: 'Flavour Choice', required: true, type: 'text' },
        { name: 'weight', label: 'Weight / Servings', required: true, type: 'text' },
        { name: 'date', label: 'Required Date', required: true, type: 'date' },
        {
          name: 'delivery_preference',
          label: 'Pickup or Delivery',
          required: true,
          type: 'select',
          options: ['pickup', 'delivery'],
        },
        { name: 'time', label: 'Preferred Pickup/Delivery Time', required: true, type: 'time' },
      ];

      const bakeryAction = { type: 'google_calendar', operation: 'create_event' };

      const { data: existingBakeryWf } = await supabase
        .from('workflows')
        .select('id')
        .eq('business_id', bakeryBizId)
        .limit(1);

      if (existingBakeryWf && existingBakeryWf.length > 0) {
        await supabase
          .from('workflows')
          // @ts-ignore
          .update({
            questions: bakeryQuestions,
            action: bakeryAction,
          } as any)
          .eq('id', (existingBakeryWf[0] as any).id);
      } else {
        await supabase
          .from('workflows')
          // @ts-ignore
          .insert({
            business_id: bakeryBizId,
            name: 'Cake Order Enquiry',
            trigger: 'missed_call',
            greeting:
              'Hi there! Thanks for calling Sweet Dreams Bakery. Sorry we missed your call. Would you like to place a custom cake order or ask an enquiry?',
            questions: bakeryQuestions,
            conditions: [
              { field: 'date', operator: 'within_24_hours', value: '', result: 'urgent' },
            ],
            action: bakeryAction,
            closing:
              'Awesome! We have received your cake order details. Our master baker will review it and get back to you shortly!',
            active: true,
          } as any);
      }
    }
  } catch (err) {
    console.error('Seed helper error:', err);
  }
}
