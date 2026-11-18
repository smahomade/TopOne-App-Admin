import { supabase } from './supabase';

/**
 * Returns the user's staff code, or null when they aren't staff.
 *
 * Staff are profiles with an admin_code. Codes are set by the salon owner in
 * the Supabase dashboard; the database rejects any change made from the app.
 * Throws when the profile can't be fetched (for example when offline), so
 * callers don't mistake a network failure for "not staff".
 */
export async function getStaffCode(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('admin_code')
    .eq('id', userId)
    .single();

  if (error) {
    // PGRST116: no profile row, so certainly not staff.
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data?.admin_code ?? null;
}
