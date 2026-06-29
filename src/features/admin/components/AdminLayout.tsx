'use client';

import {
  BadgeDollarSign,
  CalendarDays,
  Crown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
} from 'lucide-react';
import { useState } from 'react';

export function AdminLayout({
  children,
  activeTab,
  onTabChange,
  onLogout,
  notificationCount = 0,
}: {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onLogout?: () => void;
  notificationCount?: number;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const currentTab = activeTab ?? 'agenda';

  const handleTabChange = (tab: string) => {
    if (onTabChange) onTabChange(tab);
  };

  const tabs = [
    {
      key: 'agenda',
      label: 'Agenda',
      icon: <CalendarDays className='w-5 h-5 flex-shrink-0' />,
      badge: notificationCount,
    },
    {
      key: 'scanner',
      label: 'Escáner QR',
      icon: <QrCode className='w-5 h-5 flex-shrink-0' />,
      badge: 0,
    },
    {
      key: 'finanzas',
      label: 'Finanzas',
      icon: <BadgeDollarSign className='w-5 h-5 flex-shrink-0' />,
      badge: 0,
    },
    {
      key: 'vip',
      label: 'Turnos VIP',
      icon: <Crown className='w-5 h-5 flex-shrink-0' />,
      badge: 0,
    },
  ];

  return (
    <div className='flex min-h-screen bg-[#0a0a0a] text-white'>
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-white/5 bg-[#111111] p-4 md:p-6 transition-all duration-300 ease-in-out
                ${isCollapsed ? 'w-16 md:w-20' : 'w-56 md:w-64'}`}
      >
        <div className='flex items-center justify-between mb-8 md:mb-12'>
          <div className='flex items-center gap-3 overflow-hidden'>
            <div className='p-1 bg-white/5 rounded-xl border border-white/10 flex-shrink-0'>
              <img
                src='/assets/logo/logo-official.jpg'
                alt='Logo'
                className='w-8 h-8 md:w-10 md:h-10 object-contain rounded-lg'
              />
            </div>
            <span
              className={`font-bold tracking-tighter uppercase leading-none text-[10px] md:text-xs whitespace-nowrap transition-opacity duration-200
                            ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
              EL BÚNKER <br />
              <span className='text-neon-cyan'>OS EDITION</span>
            </span>
          </div>
          <button
            type='button'
            onClick={() => setIsCollapsed((prev) => !prev)}
            className='inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors w-8 h-8 md:w-9 md:h-9'
            aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className='w-4 h-4' />
            ) : (
              <PanelLeftClose className='w-4 h-4' />
            )}
          </button>
        </div>

        <nav className='flex-1 space-y-2'>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl transition-all duration-200
                          ${
                            currentTab === tab.key
                              ? 'bg-neon-cyan text-black font-bold shadow-neon-glow'
                              : 'text-white/40 hover:bg-white/5 hover:text-white'
                          }`}
            >
              <div className='relative flex-shrink-0'>
                {tab.icon}
                {tab.badge > 0 && (
                  <span className='absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center'>
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-xs md:text-sm font-medium tracking-tight transition-opacity duration-200
                              ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </nav>

        <button
          onClick={onLogout}
          className='flex items-center gap-3 px-3 md:px-4 py-3 text-white/40 hover:text-red-500 transition-colors mt-auto'
        >
          <LogOut className='w-5 h-5 flex-shrink-0' />
          <span
            className={`text-xs md:text-sm font-medium tracking-tight transition-opacity duration-200
                        ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            Salir
          </span>
        </button>
      </aside>

      {/* Content Area */}
      <main className='flex-1 p-4 md:p-8 overflow-y-auto'>{children}</main>
    </div>
  );
}
