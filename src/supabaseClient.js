export const SUPABASE_URL = "https://jqstbegfwerztttsmgqy.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_oLbCALZI-QlTx-BAMl0BNw_PCYt6Xc9";

export function createSupabaseClient() {
  if (!window.supabase) throw new Error("Supabase SDK saknas.");
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
