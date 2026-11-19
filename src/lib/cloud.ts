// Cloud mode turns on when both Supabase variables are set at build time (see .env.example).
// Without them the app runs exactly as before: one board, saved in this browser.

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
export const cloudEnabled = supabaseUrl !== "" && supabaseAnonKey !== "";
