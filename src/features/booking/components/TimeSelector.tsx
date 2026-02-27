"use client";

import { useState } from "react";
import { useBookingStore } from "../bookingStore";
import { format, addDays, isMonday, isSunday, startOfToday, getDay } from "date-fns";
import { es } from "date-fns/locale";

const BASE_TIMES = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30"
];

function isFedeVacation(date: Date) {
    // Bloqueo total para Fede: del sábado 14 al jueves 26 de marzo (cualquier año)
    const month = date.getMonth(); // 0-based, 2 = marzo
    const day = date.getDate();
    return month === 2 && day >= 14 && day <= 26;
}

export function TimeSelector() {
    const setDateTime = useBookingStore((state) => state.setDateTime);
    const setStep = useBookingStore((state) => state.setStep);
    const barberName = useBookingStore((state) => state.barberName);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Generate next 14 days, filtering Mondays and Sundays
    const days = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i))
        .filter(date => !isMonday(date) && !isSunday(date));

    const getAvailableTimesForDate = (dateStr: string) => {
        const date = new Date(dateStr + "T12:00:00");
        const dayOfWeek = getDay(date); // 0 Domingo ... 6 Sábado

        // Motor Santi: Martes a Viernes 10–19, Sábados 10–14
        if (barberName === "Santi Ducca") {
            // 2-5 => Martes-Viernes, 6 => Sábado
            if (dayOfWeek >= 2 && dayOfWeek <= 5) {
                return BASE_TIMES.filter((t) => t >= "10:00" && t <= "19:00");
            }
            if (dayOfWeek === 6) {
                return BASE_TIMES.filter((t) => t >= "10:00" && t <= "14:00");
            }
            // Otros días sin disponibilidad
            return [];
        }

        // Motor Fede: bloqueo total en vacaciones de marzo
        if (barberName === "Fede Diaz" && isFedeVacation(date)) {
            return [];
        }

        // Resto: usar grilla base (sin 09:00 fuera de Santi)
        return BASE_TIMES.filter((t) => t >= "10:00" && t <= "19:30");
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center mb-12">
                <button
                    onClick={() => setStep(2)}
                    className="text-white/40 hover:text-white transition-colors text-sm uppercase tracking-widest"
                >
                    ← Volver
                </button>
                <h2 className="text-3xl font-bold tracking-tighter">
                    FECHA Y <span className="text-neon-cyan uppercase">HORA</span>
                </h2>
                <div className="w-16" />
            </div>

            <div className="flex flex-col gap-10">
                {/* Date Horizontal Scroll */}
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {days.map((date) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const isSelected = selectedDate === dateStr;
                        const timesForDay = getAvailableTimesForDate(dateStr);
                        const isDisabledDay = timesForDay.length === 0;
                        return (
                            <button
                                key={dateStr}
                                onClick={() => !isDisabledDay && setSelectedDate(dateStr)}
                                disabled={isDisabledDay}
                                className={`flex-shrink-0 w-24 p-4 rounded-xl border flex flex-col items-center transition-all
                                    ${isDisabledDay
                                        ? "bg-white/5 border-white/5 text-white/20 cursor-not-allowed opacity-40"
                                        : isSelected
                                            ? "bg-neon-cyan border-neon-cyan text-black shadow-neon-glow"
                                            : "bg-white/5 border-white/10 text-white/60 hover:border-neon-cyan/50 hover:text-white"
                                    }`}
                            >
                                <span className="text-[10px] uppercase font-bold mb-1">
                                    {format(date, "EEE", { locale: es })}
                                </span>
                                <span className="text-2xl font-black">
                                    {format(date, "dd")}
                                </span>
                                <span className="text-[10px] uppercase font-bold mt-1">
                                    {format(date, "MMM", { locale: es })}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Time Grid */}
                {selectedDate && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 animate-in fade-in zoom-in-95 duration-300">
                        {getAvailableTimesForDate(selectedDate).length === 0 ? (
                            <div className="col-span-full text-center text-white/30 text-xs uppercase tracking-[0.2em]">
                                No hay horarios disponibles para este día.
                            </div>
                        ) : (
                            getAvailableTimesForDate(selectedDate).map((time) => (
                                <button
                                    key={time}
                                    onClick={() => setDateTime(selectedDate, time)}
                                    className="py-3 glass-card text-sm font-bold hover:neon-border hover:shadow-neon-glow transition-all"
                                >
                                    {time}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
