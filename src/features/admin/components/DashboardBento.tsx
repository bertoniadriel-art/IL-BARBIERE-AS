"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, BadgeDollarSign, Users, Activity } from "lucide-react";
import { CalendarView } from "./CalendarView";

type Status = "pending" | "confirmed" | "attended" | string;

interface DashboardBentoProps {
    barber: { id: string; name: string } | null;
}

interface AppointmentRow {
    status: Status;
    deposit_paid: boolean;
    final_price: number | null;
    client_name: string | null;
    client_phone: string | null;
    appointment_date: string;
    appointment_time: string;
}

export function DashboardBento({ barber }: DashboardBentoProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<AppointmentRow[]>([]);

    const supabase = useMemo(() => createClientComponentClient(), []);

    useEffect(() => {
        if (!barber?.id) return;

        async function fetchMetrics() {
            try {
                setLoading(true);
                setError(null);

                const today = new Date();
                const start = startOfMonth(today);
                const end = endOfMonth(addMonths(today, 1)); // este mes + próximo

                const { data, error } = await supabase
                    .from("appointments")
                    .select(
                        "status, deposit_paid, final_price, client_name, client_phone, appointment_date, appointment_time"
                    )
                    .eq("barber_id", barber.id)
                    .gte("appointment_date", format(start, "yyyy-MM-dd"))
                    .lte("appointment_date", format(end, "yyyy-MM-dd"));

                if (error) {
                    throw error;
                }

                setRows((data as AppointmentRow[]) || []);
            } catch (err: any) {
                console.error("Error fetching dashboard metrics:", err);
                setError(err.message ?? "Error al cargar el dashboard");
            } finally {
                setLoading(false);
            }
        }

        fetchMetrics();
    }, [barber?.id, supabase]);

    const monthlyCashFlow = useMemo(
        () =>
            rows
                .filter((r) => r.status === "attended" || r.status === "confirmed")
                .reduce((acc, r) => acc + (r.final_price ?? 0), 0),
        [rows]
    );

    const pendingDeposits = useMemo(
        () => rows.filter((r) => r.status === "pending" && !r.deposit_paid),
        [rows]
    );

    const topClients = useMemo(() => {
        const map = new Map<string, { name: string; count: number }>();
        for (const r of rows) {
            const key = r.client_phone || r.client_name || "N/D";
            if (!key) continue;
            const current = map.get(key);
            if (current) {
                current.count += 1;
            } else {
                map.set(key, {
                    name: r.client_name || key,
                    count: 1,
                });
            }
        }
        return Array.from(map.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    }, [rows]);

    const uniqueClients = useMemo(() => {
        const set = new Set<string>();
        for (const r of rows) {
            const key = r.client_phone || r.client_name || "N/D";
            if (key) set.add(key);
        }
        return set.size;
    }, [rows]);

    const statusDistribution = useMemo(() => {
        const base = {
            pending: 0,
            confirmed: 0,
            attended: 0,
        };
        for (const r of rows) {
            if (r.status in base) {
                // @ts-expect-error indexed by known keys
                base[r.status] += 1;
            }
        }
        return base;
    }, [rows]);

    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat("es-AR", {
                style: "currency",
                currency: "ARS",
                maximumFractionDigits: 0,
            }),
        []
    );

    return (
        <div className="grid gap-6 lg:grid-cols-4 auto-rows-[minmax(0,1fr)]">
            {/* Card: Cashflow mensual */}
            <div className="glass-card border-neon-cyan/40 p-4 md:p-6 rounded-3xl flex flex-col justify-between lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
                            Flujo de caja mensual
                        </p>
                        <h3 className="text-xl md:text-2xl font-black mt-1 text-neon-cyan">
                            {loading ? "Cargando..." : currencyFormatter.format(monthlyCashFlow)}
                        </h3>
                        <p className="text-[10px] text-white/40 mt-1 uppercase">
                            Turnos atendidos + confirmados
                        </p>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-neon-cyan/20 flex items-center justify-center border border-neon-cyan/40 shadow-neon-glow">
                        <BadgeDollarSign className="w-5 h-5 text-neon-cyan" />
                    </div>
                </div>
                <div className="mt-4 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-neon-gradient"
                        style={{
                            width: rows.length ? `${Math.min(100, (rows.length / 20) * 100)}%` : "5%",
                        }}
                    />
                </div>
            </div>

            {/* Card: Pending deposits */}
            <div className="glass-card border-red-500/40 p-4 md:p-6 rounded-3xl flex flex-col justify-between lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-red-400 font-bold">
                            Señas pendientes
                        </p>
                        <h3 className="text-2xl font-black mt-1 text-white">
                            {loading ? "-" : pendingDeposits.length}
                        </h3>
                    </div>
                    <span className="inline-flex items-center justify-center rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                        {pendingDeposits.length > 0 ? "Revisar ahora" : "Al día"}
                    </span>
                </div>
                <div className="mt-3 space-y-1 text-[11px] text-white/60">
                    {pendingDeposits.slice(0, 3).map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                            <span className="truncate max-w-[60%]">
                                {p.client_name || "Cliente sin nombre"}
                            </span>
                            <span className="text-white/40 text-[10px]">
                                {p.appointment_date} {p.appointment_time?.slice(0, 5)} hs
                            </span>
                        </div>
                    ))}
                    {pendingDeposits.length > 3 && (
                        <p className="text-[10px] text-white/40 mt-1">
                            +{pendingDeposits.length - 3} pendientes más
                        </p>
                    )}
                </div>
            </div>

            {/* Card: Attendance & Loyalty chart */}
            <div className="glass-card border-neon-purple/40 p-4 md:p-6 rounded-3xl flex flex-col justify-between lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
                            Asistencia & fidelidad
                        </p>
                        <h3 className="text-xl font-black mt-1 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-neon-purple" />
                            {rows.length} turnos
                        </h3>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-neon-purple/20 flex items-center justify-center border border-neon-purple/40">
                        <Users className="w-5 h-5 text-neon-purple" />
                    </div>
                </div>
                <div className="space-y-2 mt-2">
                    {(["pending", "confirmed", "attended"] as Status[]).map((status) => {
                        const count = (statusDistribution as any)[status] || 0;
                        const pct = rows.length ? (count / rows.length) * 100 : 0;
                        const label =
                            status === "pending"
                                ? "Pendientes"
                                : status === "confirmed"
                                    ? "Confirmados"
                                    : "Atendidos";
                        const barColor =
                            status === "pending"
                                ? "bg-yellow-400"
                                : status === "confirmed"
                                    ? "bg-sky-400"
                                    : "bg-emerald-400";
                        return (
                            <div key={status}>
                                <div className="flex items-center justify-between text-[11px] text-white/60 mb-1">
                                    <span>{label}</span>
                                    <span className="text-white/40">
                                        {count} ({pct.toFixed(0)}%)
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${barColor}`}
                                        style={{ width: `${Math.max(5, pct)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3 border-t border-white/5 pt-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-1">
                        Top clientes del mes
                    </p>
                    <div className="space-y-1 text-[11px] text-white/80">
                        {topClients.length === 0 && (
                            <p className="text-white/30">Aún sin historial suficiente.</p>
                        )}
                        {topClients.map((c, idx) => (
                            <div key={c.name + idx} className="flex items-center justify-between">
                                <span>
                                    {idx + 1}. {c.name}
                                </span>
                                <span className="text-white/40">{c.count} turnos</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bloque grande: calendario mensual + resumen */}
            <div className="glass-card border-white/10 p-4 md:p-6 rounded-3xl lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
                            Agenda visual
                        </p>
                        <h3 className="text-xl md:text-2xl font-black flex items-center gap-2 mt-1">
                            <CalendarDays className="w-5 h-5 text-neon-cyan" />
                            Calendario del barbero
                        </h3>
                        <p className="text-[11px] text-white/40 mt-1">
                            {barber?.name
                                ? `Viendo la agenda de ${barber.name}`
                                : "Selecciona un barbero para ver su agenda."}
                        </p>
                    </div>
                    <div className="hidden md:block text-right text-[11px] text-white/40">
                        <p className="uppercase tracking-[0.2em] font-bold">Clientes únicos</p>
                        <p className="text-xl font-black text-white mt-1">
                            {loading ? "-" : uniqueClients}
                        </p>
                    </div>
                </div>
                <div className="mt-4">
                    {barber ? (
                        <CalendarView barber={barber} />
                    ) : (
                        <div className="py-10 text-center text-white/40 text-xs uppercase tracking-[0.3em]">
                            Inicia sesión como barbero para ver el calendario.
                        </div>
                    )}
                </div>
            </div>

            {/* Card pequeña extra para mobile-friendly spacing */}
            <div className="glass-card border-white/10 p-4 rounded-3xl flex flex-col justify-between lg:col-span-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-2">
                    Estado del sistema
                </p>
                {error ? (
                    <p className="text-xs text-red-400">
                        {error}
                    </p>
                ) : (
                    <p className="text-xs text-white/60">
                        {loading
                            ? "Cargando datos en tiempo real desde Supabase..."
                            : "Dashboard sincronizado con Supabase y filtrado por tu perfil de barbero."}
                    </p>
                )}
            </div>
        </div>
    );
}

