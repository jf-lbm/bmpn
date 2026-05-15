import { useMemo } from 'react';
import { useSession } from '@clerk/clerk-react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

/**
 * Supabase client that authenticates every request with the active Clerk
 * session token, so Postgres RLS sees the Clerk user / org claims.
 */
export function useSupabaseClient(): SupabaseClient | null {
  const { session } = useSession();

  return useMemo(() => {
    if (!url || !anonKey) return null;
    return createClient(url, anonKey, {
      accessToken: async () => (await session?.getToken()) ?? null,
    });
  }, [session]);
}
