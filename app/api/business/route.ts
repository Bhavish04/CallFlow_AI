import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Business } from '@/types/database';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error fetching business profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch business profile' },
        { status: 500 }
      );
    }

    const business = (businesses && businesses.length > 0 ? businesses[0] : null) as Business | null;
    return NextResponse.json({ business });
  } catch (err) {
    console.error('Business GET handler error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, industry, phone, address, timezone, languages } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    if (!industry || !industry.trim()) {
      return NextResponse.json(
        { error: 'Industry is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const payload = {
      name: name.trim(),
      industry: industry.trim(),
      phone: phone ? phone.trim() : null,
      address: address ? address.trim() : null,
      timezone: timezone || 'UTC',
      languages: Array.isArray(languages) && languages.length > 0 ? languages : ['en'],
    };

    if (id) {
      // Update existing business record
      const { data, error } = await supabase
        .from('businesses')
        // @ts-ignore Supabase generic table insert type
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating business:', error);
        return NextResponse.json(
          { error: 'Failed to update business profile' },
          { status: 500 }
        );
      }

      return NextResponse.json({ business: data, message: 'Business profile updated successfully' });
    } else {
      // Create new business record
      const { data, error } = await supabase
        .from('businesses')
        // @ts-ignore Supabase generic table insert type
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error creating business:', error);
        return NextResponse.json(
          { error: 'Failed to create business profile' },
          { status: 500 }
        );
      }

      return NextResponse.json({ business: data, message: 'Business profile created successfully' });
    }
  } catch (err) {
    console.error('Business POST handler error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
