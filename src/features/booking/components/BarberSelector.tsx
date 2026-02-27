"use client";

import { useEffect, useState } from "react";
import { useBookingStore } from "../bookingStore";
import { supabase } from "@/shared/lib/supabase";
import { User } from "lucide-react";

interface Barber {
    id: string;
    name: string;
    role?: string | null;
    image?: string | null;
}

export function BarberSelector() {
    const setBarber = useBookingStore((state) => state.setBarber);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBarbers = async () => {
            try {
                if (!supabase) return;

                const { data, error } = await supabase
                    .from("barbers")
                    .select("id, name, role, image");

                if (error) {
                    console.error("Error fetching barbers from Supabase:", error);
                    return;
                }

                setBarbers(data || []);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBarbers();
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold text-center mb-12 tracking-tighter">
                ELIGE TU <span className="text-neon-cyan uppercase">BARBERO</span>
            </h2>

            {isLoading ? (
                <div className="flex justify-center items-center py-12 text-white/60 text-sm uppercase tracking-[0.2em]">
                    Cargando barberos...
                </div>
            ) : barbers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-white/60 text-sm uppercase tracking-[0.2em]">
                    <User className="w-6 h-6 text-white/40" />
                    No hay barberos configurados en la base de datos.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {barbers.map((barber) => (
                        <button
                            key={barber.id}
                            onClick={() => setBarber(barber.id, barber.name)}
                            className="group relative flex flex-col items-center p-8 glass-card hover:neon-border transition-all duration-300"
                        >
                            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-neon-cyan/20 mb-6 group-hover:scale-110 group-hover:border-neon-cyan transition-all duration-500 shadow-neon-glow/20">
                                <img
                                    src={barber.image || "/assets/barbers/default.png"}
                                    alt={barber.name}
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                            "https://api.dicebear.com/7.x/avataaars/svg?seed=" + barber.name;
                                    }}
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">{barber.name}</h3>
                            <p className="text-white/40 uppercase text-xs tracking-[0.2em]">
                                {barber.role || "Barbero"}
                            </p>

                            <div className="absolute inset-0 rounded-xl bg-neon-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
