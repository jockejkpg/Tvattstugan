export const SUPABASE_URL = "https://jqstbegfwerztttsmgqy.supabase.co";
export const SUPABASE_ANON_KEY = "PASTA_IN_DIN_ANON_PUBLISHABLE_KEY_HAR";

export function createSupabaseClient() {
  if (!window.supabase) throw new Error("Supabase SDK saknas.");
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
