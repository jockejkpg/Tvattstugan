// Fyll i dina värden från Supabase: Settings → API
export const SUPABASE_URL = "https://jqstbegfwerztttsmgqy.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_oLbCALZI-QlTx-BAMl0BNw_PCYt6Xc9";

// Supabase SDK laddas via CDN i index.html (window.supabase)
export function createSupabaseClient() {
  if (!window.supabase) {
    throw new Error("Supabase SDK saknas. Kontrollera script-taggen i index.html.");
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
