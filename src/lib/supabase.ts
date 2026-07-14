import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

let _client: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseAdmin() {
  if (!_client) {
    _client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    )
  }
  return _client
}

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_, prop) {
    return Reflect.get(getSupabaseAdmin(), prop)
  },
})
