import { supabase } from "@/shared/lib/supabase-client";
import type { AppointmentStatus } from "@/shared/types";

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error("Supabase no configurado") };
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);
  return { error: error ? new Error(error.message) : null };
}
