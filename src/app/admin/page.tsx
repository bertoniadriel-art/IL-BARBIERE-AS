"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
const ScannerModule = dynamic(() => import("@/features/admin/components/ScannerModule").then(mod => mod.ScannerModule), { ssr: false });
import { CalendarView } from "@/features/admin/components/CalendarView";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { LoginForm } from "@/features/admin/components/LoginForm";
import { DashboardBento } from "@/features/admin/components/DashboardBento";

export default function AdminPage() {
    const [authenticatedBarber, setAuthenticatedBarber] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"dashboard" | "calendar" | "scanner">("dashboard");

    if (!authenticatedBarber) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <LoginForm onLogin={(barber) => setAuthenticatedBarber(barber)} />
            </div>
        );
    }

    return (
        <AdminLayout
            onTabChange={(tab: any) => setActiveTab(tab)}
            onLogout={() => setAuthenticatedBarber(null)}
        >
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter mb-2 uppercase italic text-neon-cyan">
                            HOLA, BARBERO
                        </h1>
                        <p className="text-white/40 uppercase tracking-widest text-xs">
                            {activeTab === "dashboard" ? "Resumen General" : activeTab === "calendar" ? "Agenda Dual" : "Escáner QR"}
                        </p>
                    </div>
                </div>

                {activeTab === "calendar" && <CalendarView barber={authenticatedBarber} />}
                {activeTab === "scanner" && <ScannerModule />}
                {activeTab === "dashboard" && (
                    <div className="animate-in fade-in duration-500">
                        <DashboardBento barber={authenticatedBarber} />
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
