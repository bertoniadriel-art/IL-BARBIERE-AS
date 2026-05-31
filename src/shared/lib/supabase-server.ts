import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for Server Components and Route Handlers.
 * Uses the modern getAll/setAll cookie API from @supabase/ssr.
 * NOTE: cookies() from next/headers is ASYNC in Next 16 — must be awaited.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll can throw in Server Components (RSC context).
            // Middleware handles the actual cookie writes.
          }
        },
      },
    }
  );
}
