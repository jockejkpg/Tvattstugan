// Fyll i dina värden från Supabase: Settings → API
export const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// Supabase SDK laddas via CDN i index.html (window.supabase)
export function createSupabaseClient() {
  if (!window.supabase) {
    throw new Error("Supabase SDK saknas. Kontrollera script-taggen i index.html.");
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
