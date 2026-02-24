"use client";

import { useState } from "react";
import { ScannerModule } from "@/features/admin/components/ScannerModule";
import { CalendarView } from "@/features/admin/components/CalendarView";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { LoginForm } from "@/features/admin/components/LoginForm";

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

                    {activeTab === "dashboard" && (
                        <div className="flex gap-4">
                            <div className="p-4 glass-card text-center min-w-[120px] animate-in slide-in-from-top-4 duration-500">
                                <p className="text-xs text-white/40 font-bold mb-1 uppercase">Santi</p>
                                <p className="text-2xl font-black text-neon-cyan">8</p>
                            </div>
                            <div className="p-4 glass-card text-center min-w-[120px] animate-in slide-in-from-top-4 delay-150 duration-500">
                                <p className="text-xs text-white/40 font-bold mb-1 uppercase">Fede</p>
                                <p className="text-2xl font-black text-neon-purple">12</p>
                            </div>
                        </div>
                    )}
                </div>

                {activeTab === "calendar" && <CalendarView />}
                {activeTab === "scanner" && <ScannerModule />}
                {activeTab === "dashboard" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                        <div className="glass-card p-8 border-neon-cyan/20">
                            <h3 className="text-xl font-bold mb-4 uppercase tracking-tighter">Próximo Turno</h3>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center font-black text-neon-cyan">10:30</div>
                                <div>
                                    <p className="font-bold">Juan Carlos</p>
                                    <p className="text-white/40 text-sm">Con Santi Ducca</p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card p-8 border-neon-purple/20">
                            <h3 className="text-xl font-bold mb-4 uppercase tracking-tighter">Capacidad Hoy</h3>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                <div className="bg-neon-gradient w-[65%] h-full"></div>
                            </div>
                            <p className="text-right text-xs text-white/40 mt-2 font-bold uppercase">65% Reservado</p>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
