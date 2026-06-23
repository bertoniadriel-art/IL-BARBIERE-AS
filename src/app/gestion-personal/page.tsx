import { DashboardShell } from '@/features/admin/components/DashboardShell';
import { LoginForm } from '@/features/admin/components/LoginForm';
import { createClient } from '@/shared/lib/supabase-server';

export default async function GestionPersonalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let barber = null;
  let barberError = null;

  if (user) {
    const { data, error } = await supabase
      .from('barbers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();
    barber = data ?? null;
    barberError = error;
  }

  if (barberError) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center p-4'>
        <div className='text-center'>
          <p className='text-red-400 text-sm font-bold mb-2'>Error de base de datos</p>
          <p className='text-white/40 text-xs'>{barberError.message}</p>
        </div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center p-4'>
        <LoginForm />
      </div>
    );
  }

  return <DashboardShell barber={barber} />;
}
