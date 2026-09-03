import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const validServiceKey =
    serviceKey && serviceKey !== 'your-supabase-service-role-key' && serviceKey.trim() !== ''
      ? serviceKey.trim()
      : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = validServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component cookie set error ignored
          }
        },
      },
    }
  );
}
