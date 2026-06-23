"use client";

import type { Appointment } from "./AppointmentCard";

export interface AgendaCompactProps {
    appointmentsByDate: Record<string, Appointment[]>;
}

function formatDayHeader(dateStr: string): string {
    // dateStr: "YYYY-MM-DD" → "LUN DD/MM"
    const [year, month, day] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const dayName = date.toLocaleDateString("es-AR", { weekday: "short" }).toUpperCase().replace(".", "");
    return `${dayName} ${day}/${month}`;
}

export function AgendaCompact({ appointmentsByDate }: AgendaCompactProps) {
    const sortedDates = Object.keys(appointmentsByDate).sort();

    return (
        <div className="space-y-6">
            {sortedDates.map((dateStr) => {
                const appointments = appointmentsByDate[dateStr];
                if (!appointments || appointments.length === 0) return null;

                return (
                    <div key={dateStr}>
                        <h4 className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold mb-3">
                            {formatDayHeader(dateStr)}
                        </h4>
                        <ul className="space-y-2">
                            {appointments.map((app) => (
                                <li key={app.id}>
                                    <span
                                        data-testid="agenda-entry"
                                        className={`text-sm ${app.status === "cancelled" ? "line-through opacity-50 text-white/40" : "text-white"}`}
                                    >
                                        {app.appointment_time?.slice(0, 5)} — {app.client_name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}
