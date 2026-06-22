"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Barber } from "@/shared/types";
import { authService } from "@/features/auth/services/authService";
import { AdminLayout } from "./AdminLayout";
import { DashboardBento } from "./DashboardBento";
import { CalendarView } from "./CalendarView";
import { KanbanBoard } from "./KanbanBoard";

const ScannerModule = dynamic(
  () => import("./ScannerModule").then((mod) => mod.ScannerModule),
  { ssr: false }
);

type AdminTab = "dashboard" | "calendar" | "scanner" | "kanban";

interface Props {
  barber: Barber;
}

/**
 * DashboardShell — client component that wraps all interactive admin UI.
 * The parent admin/page.tsx is a Server Component; this component handles
 * all client-side tab state, logout, and dynamic imports.
 */
export function DashboardShell({ barber }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>("kanban");

  const handleLogout = async () => {
    await authService.signOut();
    // Force server component re-render to pick up cleared session cookie
    window.location.reload();
  };

  return (
    <AdminLayout
      onTabChange={(tab) => setActiveTab(tab as AdminTab)}
      onLogout={handleLogout}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2 uppercase italic text-neon-cyan">
              HOLA, {barber.name.split(" ")[0].toUpperCase()}
            </h1>
            <p className="text-white/40 uppercase tracking-widest text-xs">
              {activeTab === "dashboard"
                ? "Resumen General"
                : activeTab === "calendar"
                  ? "Agenda Dual"
                  : activeTab === "kanban"
                    ? "Kanban de Turnos"
                    : "Escáner QR"}
            </p>
          </div>
        </div>

        {activeTab === "calendar" && <CalendarView barber={barber} />}
        {activeTab === "scanner" && <ScannerModule />}
        {activeTab === "kanban" && (
          <div className="animate-in fade-in duration-500">
            <KanbanBoard barber={barber} />
          </div>
        )}
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in duration-500">
            <DashboardBento barber={barber} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
