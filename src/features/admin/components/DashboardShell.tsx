'use client';

import { authService } from '@/features/auth/services/authService';
import type { Barber } from '@/shared/types';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { CalendarView } from './CalendarView';
import { DashboardBento } from './DashboardBento';
import { KanbanBoard } from './KanbanBoard';
import { QuickAddModal } from './QuickAddModal';

const ScannerModule = dynamic(() => import('./ScannerModule').then((mod) => mod.ScannerModule), {
  ssr: false,
});

type AdminTab = 'dashboard' | 'calendar' | 'scanner' | 'kanban';

interface Props {
  barber: Barber;
}

/**
 * DashboardShell — client component that wraps all interactive admin UI.
 * The parent admin/page.tsx is a Server Component; this component handles
 * all client-side tab state, logout, and dynamic imports.
 */
export function DashboardShell({ barber }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>('kanban');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  const handleLogout = async () => {
    await authService.signOut();
    // Force server component re-render to pick up cleared session cookie
    window.location.reload();
  };

  return (
    <>
      <AdminLayout onTabChange={(tab) => setActiveTab(tab as AdminTab)} onLogout={handleLogout}>
        <div className='max-w-6xl mx-auto'>
          <div className='flex justify-between items-end mb-12'>
            <div>
              <h1 className='text-4xl font-black tracking-tighter mb-2 uppercase italic text-neon-cyan'>
                HOLA, {barber.name.split(' ')[0].toUpperCase()}
              </h1>
              <p className='text-white/40 uppercase tracking-widest text-xs'>
                {activeTab === 'dashboard'
                  ? 'Resumen General'
                  : activeTab === 'calendar'
                    ? 'Agenda Dual'
                    : activeTab === 'kanban'
                      ? 'Kanban de Turnos'
                      : 'Escáner QR'}
              </p>
            </div>
          </div>

          {activeTab === 'calendar' && <CalendarView barber={barber} />}
          {activeTab === 'scanner' && <ScannerModule />}
          {activeTab === 'kanban' && (
            <div className='animate-in fade-in duration-500'>
              <KanbanBoard key={refetchKey} barber={barber} />
            </div>
          )}
          {activeTab === 'dashboard' && (
            <div className='animate-in fade-in duration-500'>
              <DashboardBento barber={barber} />
            </div>
          )}
        </div>
      </AdminLayout>

      <button
        type='button'
        onClick={() => setIsQuickAddOpen(true)}
        className='fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#00f3ff] to-[#bc00ff] text-black text-2xl font-bold shadow-lg shadow-cyan-500/30 flex items-center justify-center cursor-pointer border-none'
        aria-label='Nuevo turno'
      >
        +
      </button>

      <QuickAddModal
        barber={barber}
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={() => setRefetchKey((k) => k + 1)}
      />
    </>
  );
}
