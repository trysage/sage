import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Service-role key: bypasses Row Level Security — server-side use only.
// Will be a no-op client if env vars are missing (acceptable while Supabase isn't wired up).
export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder");
