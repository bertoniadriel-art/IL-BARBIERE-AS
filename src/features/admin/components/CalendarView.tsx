"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { format, startOfToday } from "date-fns";
import { Clock, User, Phone } from "lucide-react";

export function CalendarView() {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const today = format(startOfToday(), "yyyy-MM-dd");

    useEffect(() => {
        async function fetchAppointments() {
            if (!supabase) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("appointments")
                .select(`
          *,
          barbers(name)
        `)
                .eq("appointment_date", today)
                .order("appointment_time", { ascending: true });

            if (!error && data) {
                setAppointments(data);
            }
            setLoading(false);
        }

        fetchAppointments();
    }, [today]);

    const filterByBarber = (barberName: string) =>
        appointments.filter(app => app.barbers?.name.includes(barberName));

    const AppointmentCard = ({ app }: { app: any }) => (
        <div className={`p-4 rounded-xl border mb-3 transition-all ${app.status === 'attended' ? 'bg-neon-cyan/5 border-neon-cyan/20 opacity-60' : 'bg-white/5 border-white/10'
            }`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neon-cyan" />
                    <span className="font-bold text-lg">{app.appointment_time.slice(0, 5)}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${app.status === 'attended' ? 'bg-neon-cyan text-black' : 'bg-white/10 text-white/40'
                    }`}>
                    {app.status}
                </span>
            </div>
            <h4 className="font-bold text-white mb-1">{app.client_name}</h4>
            <div className="flex items-center gap-2 text-xs text-white/40">
                <Phone className="w-3 h-3" /> {app.client_phone}
            </div>
        </div>
    );

    if (loading) return <div className="text-center py-20 text-white/40 uppercase tracking-[0.3em] font-bold">Cargando Agenda...</div>;

    if (!supabase) return (
        <div className="text-center py-12 p-8 glass-card border-yellow-500/20">
            <h3 className="text-xl font-bold text-yellow-500 mb-2 uppercase">Modo Offline</h3>
            <p className="text-white/40 text-sm">Configura las variables de entorno de Supabase para ver la agenda real.</p>
        </div>
    );
    return (
        <div className="w-full animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Santi's Column */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-neon-cyan/10 border border-neon-cyan/20 rounded-2xl mb-6 shadow-neon-glow">
                        <div className="w-10 h-10 rounded-full bg-neon-cyan flex items-center justify-center">
                            <User className="text-black" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl uppercase tracking-tighter">Santi Ducca</h3>
                            <p className="text-[10px] text-neon-cyan font-bold uppercase">Master Barber</p>
                        </div>
                    </div>

                    <div className="min-h-[400px]">
                        {filterByBarber("Santi").length > 0 ? (
                            filterByBarber("Santi").map(app => <AppointmentCard key={app.id} app={app} />)
                        ) : (
                            <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl text-white/20">
                                Sin turnos hoy
                            </div>
                        )}
                    </div>
                </div>

                {/* Fede's Column */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-neon-purple/10 border border-neon-purple/20 rounded-2xl mb-6 shadow-[0_0_20px_rgba(188,0,255,0.15)]">
                        <div className="w-10 h-10 rounded-full bg-neon-purple flex items-center justify-center">
                            <User className="text-black" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl uppercase tracking-tighter">Fede Diaz</h3>
                            <p className="text-[10px] text-neon-purple font-bold uppercase">Principal Barber</p>
                        </div>
                    </div>

                    <div className="min-h-[400px]">
                        {filterByBarber("Fede").length > 0 ? (
                            filterByBarber("Fede").map(app => <AppointmentCard key={app.id} app={app} />)
                        ) : (
                            <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl text-white/20">
                                Sin turnos hoy
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
