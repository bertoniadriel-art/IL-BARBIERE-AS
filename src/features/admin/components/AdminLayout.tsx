"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, QrCode, Calendar, Scissors, LogOut } from "lucide-react";

export function AdminLayout({ children, onTabChange, onLogout }: { children: React.ReactNode, onTabChange?: (tab: string) => void, onLogout?: () => void }) {
    const [activeTab, setActiveTab] = useState("dashboard");

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        if (onTabChange) onTabChange(tab);
    };

    return (
        <div className="flex min-h-screen bg-[#0a0a0a] text-white">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 bg-[#111111] p-6 flex flex-col">
                <div className="flex items-center gap-4 mb-12">
                    <div className="p-1 bg-white/5 rounded-xl border border-white/10">
                        <img
                            src="/assets/logo/logo-official.jpg"
                            alt="Logo"
                            className="w-10 h-10 object-contain rounded-lg"
                        />
                    </div>
                    <span className="font-bold tracking-tighter uppercase leading-none text-xs">EL BÚNKER <br /><span className="text-neon-cyan">OS EDITION</span></span>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => handleTabChange("dashboard")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "dashboard" ? "bg-neon-cyan text-black font-bold shadow-neon-glow" : "text-white/40 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5" /> Dashboard
                    </button>
                    <button
                        onClick={() => handleTabChange("calendar")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "calendar" ? "bg-neon-cyan text-black font-bold shadow-neon-glow" : "text-white/40 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <Calendar className="w-5 h-5" /> Agenda Dual
                    </button>
                    <button
                        onClick={() => handleTabChange("scanner")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "scanner" ? "bg-neon-cyan text-black font-bold shadow-neon-glow" : "text-white/40 hover:bg-white/5 hover:text-white"
                            }`}
                    >
                        <QrCode className="w-5 h-5" /> Escáner QR
                    </button>
                </nav>

                <button
                    onClick={onLogout}
                    className="flex items-center gap-3 px-4 py-3 text-white/40 hover:text-red-500 transition-colors mt-auto"
                >
                    <LogOut className="w-5 h-5" /> Salir
                </button>
            </aside>

            {/* Content Area */}
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
