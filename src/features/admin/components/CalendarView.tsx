"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import {
    format,
    startOfToday,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameDay,
    isSameMonth,
} from "date-fns";
import { Clock, User, Phone, ChevronLeft, ChevronRight, PlusCircle, X } from "lucide-react";

interface CalendarViewProps {
    barber: { id: string; name: string } | null;
}

export function CalendarView({ barber }: CalendarViewProps) {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState<Date>(startOfToday());
    const [selectedDate, setSelectedDate] = useState<string>(format(startOfToday(), "yyyy-MM-dd"));

    const [isOverbookModalOpen, setIsOverbookModalOpen] = useState(false);
    const [overbookDate, setOverbookDate] = useState<string>(format(startOfToday(), "yyyy-MM-dd"));
    const [overbookTime, setOverbookTime] = useState<string>("10:00");
    const [overbookClientName, setOverbookClientName] = useState<string>("");
    const [overbookClientPhone, setOverbookClientPhone] = useState<string>("");
    const [overbookPrice, setOverbookPrice] = useState<string>("");
    const [isCreatingOverbook, setIsCreatingOverbook] = useState(false);

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start, end });

    useEffect(() => {
        async function fetchAppointments() {
            if (!supabase || !barber?.id) {
                setLoading(false);
                return;
            }

            setLoading(true);

            const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
            const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

            const { data, error } = await supabase
                .from("appointments")
                .select(
                    `
                *,
                barbers(name)
            `
                )
                .eq("barber_id", barber.id)
                .gte("appointment_date", monthStart)
                .lte("appointment_date", monthEnd)
                .order("appointment_date", { ascending: true })
                .order("appointment_time", { ascending: true });

            if (!error && data) {
                setAppointments(data);
            }
            setLoading(false);
        }

        fetchAppointments();
    }, [currentMonth, barber?.id]);

    const appointmentsByDate = useMemo(() => {
        const map: Record<string, any[]> = {};
        for (const app of appointments) {
            const key = app.appointment_date;
            if (!map[key]) map[key] = [];
            map[key].push(app);
        }
        return map;
    }, [appointments]);

    const selectedAppointments = appointmentsByDate[selectedDate] || [];

    // Analytics
    const monthlyCashFlow = useMemo(
        () =>
            appointments
                .filter((app) => app.status === "attended" || app.status === "confirmed")
                .reduce((sum, app) => sum + (app.final_price || 0), 0),
        [appointments]
    );

    const topClients = useMemo(() => {
        const counts = new Map<string, { name: string; count: number }>();
        for (const app of appointments) {
            const key = app.client_phone || app.client_name || "N/D";
            const existing = counts.get(key);
            if (existing) {
                existing.count += 1;
            } else {
                counts.set(key, {
                    name: app.client_name || key,
                    count: 1,
                });
            }
        }
        return Array.from(counts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    }, [appointments]);

    const uniqueClientsThisMonth = useMemo(() => {
        const set = new Set<string>();
        for (const app of appointments) {
            set.add(app.client_phone || app.client_name || "N/D");
        }
        return set.size;
    }, [appointments]);

    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat("es-AR", {
                style: "currency",
                currency: "ARS",
                maximumFractionDigits: 0,
            }),
        []
    );

    const AppointmentCard = ({ app }: { app: any }) => (
        <div
            className={`p-4 rounded-xl border mb-3 transition-all ${app.status === "attended"
                ? "bg-neon-cyan/5 border-neon-cyan/20 opacity-80"
                : app.status === "confirmed"
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : "bg-white/5 border-white/10"
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neon-cyan" />
                    <span className="font-bold text-lg">{app.appointment_time?.slice(0, 5)}</span>
                </div>
                <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${app.status === "attended"
                        ? "bg-neon-cyan text-black"
                        : app.status === "confirmed"
                            ? "bg-emerald-500 text-black"
                            : "bg-white/10 text-white/40"
                        }`}
                >
                    {app.status}
                </span>
            </div>
            <h4 className="font-bold text-white mb-1">{app.client_name}</h4>
            <div className="flex items-center gap-2 text-xs text-white/40">
                <Phone className="w-3 h-3" /> {app.client_phone}
            </div>
            {app.final_price != null && (
                <p className="mt-2 text-xs text-neon-cyan font-bold">
                    {currencyFormatter.format(app.final_price)} estimados
                </p>
            )}
        </div>
    );

    const handlePrevMonth = () => {
        setCurrentMonth((prev) => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth((prev) => addMonths(prev, 1));
    };

    const openOverbookModal = (date?: string) => {
        const effectiveDate = date || selectedDate;
        setOverbookDate(effectiveDate);
        setIsOverbookModalOpen(true);
    };

    const closeOverbookModal = () => {
        if (isCreatingOverbook) return;
        setIsOverbookModalOpen(false);
        setOverbookClientName("");
        setOverbookClientPhone("");
        setOverbookPrice("");
    };

    const handleCreateOverbook = async () => {
        if (!supabase || !barber?.id) return;
        if (!overbookClientName || !overbookTime || !overbookDate) return;

        setIsCreatingOverbook(true);

        try {
            const payload: any = {
                barber_id: barber.id,
                client_name: overbookClientName,
                client_phone: overbookClientPhone,
                appointment_date: overbookDate,
                appointment_time: overbookTime,
                status: "confirmed",
                final_price: overbookPrice ? Number(overbookPrice) : null,
                qr_hash: `MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            };

            const { error } = await supabase.from("appointments").insert(payload);

            if (error) {
                console.error("Error creating overbook appointment:", error);
            } else {
                // refresh appointments for current month
                const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
                const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

                const { data: refreshed, error: refreshError } = await supabase
                    .from("appointments")
                    .select(
                        `
                        *,
                        barbers(name)
                    `
                    )
                    .eq("barber_id", barber.id)
                    .gte("appointment_date", monthStart)
                    .lte("appointment_date", monthEnd)
                    .order("appointment_date", { ascending: true })
                    .order("appointment_time", { ascending: true });

                if (!refreshError && refreshed) {
                    setAppointments(refreshed);
                }

                setSelectedDate(overbookDate);
                closeOverbookModal();
            }
        } finally {
            setIsCreatingOverbook(false);
        }
    };

    if (!supabase) {
        return (
            <div className="text-center py-12 p-8 glass-card border-yellow-500/20">
                <h3 className="text-xl font-bold text-yellow-500 mb-2 uppercase">Modo Offline</h3>
                <p className="text-white/40 text-sm">Configura las variables de entorno de Supabase para ver la agenda real.</p>
            </div>
        );
    }

    return (
        <div className="w-full animate-in fade-in duration-500">
            {/* Analytics + actions */}
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-stretch md:justify-between">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                    <div className="glass-card p-4 border-neon-cyan/30 flex flex-col justify-between">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold mb-2">
                            Flujo de Caja Mensual
                        </p>
                        <p className="text-2xl md:text-3xl font-black text-neon-cyan">
                            {currencyFormatter.format(monthlyCashFlow)}
                        </p>
                        <p className="text-[10px] text-white/30 mt-2 uppercase">Turnos atendidos + confirmados</p>
                    </div>
                    <div className="glass-card p-4 border-white/10 flex flex-col justify-between">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold mb-2">
                            Clientes más fieles
                        </p>
                        <div className="space-y-1 text-xs">
                            {topClients.length === 0 && (
                                <p className="text-white/30">Sin datos este mes.</p>
                            )}
                            {topClients.map((client, idx) => (
                                <div
                                    key={client.name + idx}
                                    className="flex items-center justify-between text-white/80"
                                >
                                    <span className="font-semibold">
                                        {idx + 1}. {client.name}
                                    </span>
                                    <span className="text-white/40">{client.count} turnos</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="glass-card p-4 border-neon-purple/30 flex flex-col justify-between">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold mb-2">
                            Nuevos clientes del mes
                        </p>
                        <p className="text-2xl md:text-3xl font-black text-neon-purple">
                            {uniqueClientsThisMonth}
                        </p>
                        <p className="text-[10px] text-white/30 mt-2 uppercase">Clientes únicos en tu agenda</p>
                    </div>
                </div>
                <div className="flex md:flex-col gap-3 md:w-52">
                    <button
                        type="button"
                        onClick={() => openOverbookModal()}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 text-white font-black uppercase tracking-[0.25em] text-[10px] px-4 py-3 shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:bg-red-500 transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Agregar Sobreturno
                    </button>
                </div>
            </div>

            {/* Calendar */}
            <div className="glass-card border-white/10 p-4 md:p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold">
                            Calendario Mensual
                        </p>
                        <h3 className="text-xl md:text-2xl font-black mt-1">
                            {format(currentMonth, "MMMM yyyy")}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-white/40 text-xs uppercase tracking-[0.3em]">
                        Cargando agenda...
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-7 gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 text-center">
                            <span>Lun</span>
                            <span>Mar</span>
                            <span>Mié</span>
                            <span>Jue</span>
                            <span>Vie</span>
                            <span>Sáb</span>
                            <span>Dom</span>
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {daysInMonth.map((day) => {
                                const dateKey = format(day, "yyyy-MM-dd");
                                const isSelected = selectedDate === dateKey;
                                const isToday = isSameDay(day, startOfToday());
                                const inCurrentMonth = isSameMonth(day, currentMonth);
                                const countForDay = (appointmentsByDate[dateKey] || []).length;

                                return (
                                    <button
                                        key={dateKey}
                                        type="button"
                                        onClick={() => setSelectedDate(dateKey)}
                                        className={`aspect-square rounded-2xl border text-sm flex flex-col items-center justify-center gap-1 transition-all
                                            ${inCurrentMonth ? "text-white" : "text-white/20"}
                                            ${isSelected
                                                ? "bg-neon-cyan text-black border-neon-cyan shadow-neon-glow"
                                                : "bg-white/5 border-white/5 hover:bg-white/10"
                                            }
                                        `}
                                    >
                                        <span className="font-bold">
                                            {format(day, "d")}
                                        </span>
                                        <span
                                            className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isToday ? "" : "opacity-60"
                                                }`}
                                        >
                                            {isToday ? "HOY" : ""}
                                        </span>
                                        {countForDay > 0 && (
                                            <span className="mt-1 px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-bold">
                                                {countForDay} T
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Appointments list for selected day */}
            <div className="glass-card border-white/10 p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold">
                            Turnos del día
                        </p>
                        <h3 className="text-lg md:text-xl font-black mt-1">
                            {format(new Date(selectedDate), "dd 'de' MMMM")}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => openOverbookModal(selectedDate)}
                        className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <PlusCircle className="w-3 h-3" />
                        Sobreturno
                    </button>
                </div>
                {selectedAppointments.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-white/5 rounded-2xl text-white/20 text-sm">
                        Sin turnos para este día.
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {selectedAppointments.map((app) => (
                            <AppointmentCard key={app.id} app={app} />
                        ))}
                    </div>
                )}
            </div>

            {/* Overbook Modal */}
            {isOverbookModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md mx-4 glass-card border-red-500/40 p-6 relative animate-in zoom-in-95 duration-300">
                        <button
                            type="button"
                            onClick={closeOverbookModal}
                            className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="mb-4">
                            <p className="text-[10px] uppercase tracking-[0.25em] text-red-400 font-bold mb-1">
                                Agregar Sobreturno
                            </p>
                            <h3 className="text-xl font-black">Forzar turno manual</h3>
                            <p className="text-xs text-white/40 mt-1">
                                Este turno se creará ignorando las validaciones automáticas de horarios.
                            </p>
                        </div>
                        <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 font-bold">
                                        Fecha
                                    </label>
                                    <input
                                        type="date"
                                        value={overbookDate}
                                        onChange={(e) => setOverbookDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 font-bold">
                                        Hora
                                    </label>
                                    <input
                                        type="time"
                                        value={overbookTime}
                                        onChange={(e) => setOverbookTime(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 font-bold">
                                    Nombre del Cliente
                                </label>
                                <input
                                    type="text"
                                    value={overbookClientName}
                                    onChange={(e) => setOverbookClientName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan"
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 font-bold">
                                    WhatsApp del Cliente
                                </label>
                                <input
                                    type="tel"
                                    value={overbookClientPhone}
                                    onChange={(e) => setOverbookClientPhone(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan"
                                    placeholder="Sin 0 ni 15"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 font-bold">
                                    Precio Estimado ($)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={overbookPrice}
                                    onChange={(e) => setOverbookPrice(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan"
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={isCreatingOverbook || !overbookClientName || !overbookDate || !overbookTime}
                            onClick={handleCreateOverbook}
                            className="mt-6 w-full py-3 rounded-2xl bg-red-600 text-white font-black uppercase tracking-[0.25em] text-[11px] hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                        >
                            {isCreatingOverbook ? "Creando Sobreturno..." : "Confirmar Sobreturno"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
