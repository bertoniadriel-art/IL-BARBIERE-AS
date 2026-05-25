"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Barber } from "@/shared/types";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/shared/lib/supabase";
import { authService } from "@/features/auth/services/authService";

const ScannerModule = dynamic(() => import("@/features/admin/components/ScannerModule").then(mod => mod.ScannerModule), { ssr: false });
import { CalendarView } from "@/features/admin/components/CalendarView";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { LoginForm } from "@/features/admin/components/LoginForm";
import { DashboardBento } from "@/features/admin/components/DashboardBento";

type AdminTab = "dashboard" | "calendar" | "scanner";

export default function AdminPage() {
    const [authenticatedBarber, setAuthenticatedBarber] = useState<Barber | null>(null);
    const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
    const [sessionLoading, setSessionLoading] = useState(true);

    useEffect(() => {
        if (!supabase) {
            setSessionLoading(false);
            return;
        }

        async function resolveSession() {
            const session = await authService.getSession();
            if (session) {
                const { data: barber } = await supabase!
                    .from("barbers")
                    .select("*")
                    .eq("auth_user_id", session.user.id)
                    .single();
                setAuthenticatedBarber(barber ?? null);
            }
            setSessionLoading(false);
        }

        resolveSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            if (session) {
                const { data: barber } = await supabase!
                    .from("barbers")
                    .select("*")
                    .eq("auth_user_id", session.user.id)
                    .single();
                setAuthenticatedBarber(barber ?? null);
            } else {
                setAuthenticatedBarber(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleLogout = async () => {
        await authService.signOut();
    };

    if (sessionLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <p className="text-white/40 uppercase tracking-widest text-xs">Verificando...</p>
            </div>
        );
    }

    if (!authenticatedBarber) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <LoginForm onLogin={() => {}} />
            </div>
        );
    }

    return (
        <AdminLayout
            onTabChange={(tab) => setActiveTab(tab as AdminTab)}
            onLogout={handleLogout}
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
