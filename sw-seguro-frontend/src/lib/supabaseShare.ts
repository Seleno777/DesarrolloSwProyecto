import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabaseShare = createClient(url, anon, {
  auth: {
    storageKey: "sb-share-session", // 👈 clave distinta, NO pisa la sesión principal
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
