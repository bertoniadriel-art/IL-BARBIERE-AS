import { createClient } from "@/shared/lib/supabase-server";
import { LoginForm } from "@/features/admin/components/LoginForm";
import { DashboardShell } from "@/features/admin/components/DashboardShell";

/**
 * Admin page — Server Component.
 * Session is read server-side via the @supabase/ssr cookie client.
 * If no authenticated barber → renders LoginForm (client component).
 * If authenticated → renders DashboardShell (client component).
 *
 * LoginForm calls router.refresh() after login so this server component
 * re-renders and picks up the new session cookie.
 */
export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let barber = null;

  if (user) {
    const { data } = await supabase
      .from("barbers")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();
    barber = data ?? null;
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <LoginForm />
      </div>
    );
  }

  return <DashboardShell barber={barber} />;
}
