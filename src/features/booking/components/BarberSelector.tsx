"use client";

import { useBookingStore } from "../bookingStore";
import { User } from "lucide-react";

const BARBERS = [
    { id: "santi-id", name: "Santi Ducca", role: "Master Barber", image: "/assets/barbers/santi.png" },
    { id: "fede-id", name: "Fede Diaz", role: "Principal Barber", image: "/assets/barbers/fede.png" }
];

export function BarberSelector() {
    const setBarber = useBookingStore((state) => state.setBarber);

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold text-center mb-12 tracking-tighter">
                ELIGE TU <span className="text-neon-cyan uppercase">BARBERO</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {BARBERS.map((barber) => (
                    <button
                        key={barber.id}
                        onClick={() => setBarber(barber.id)}
                        className="group relative flex flex-col items-center p-8 glass-card hover:neon-border transition-all duration-300"
                    >
                        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-neon-cyan/20 mb-6 group-hover:scale-110 group-hover:border-neon-cyan transition-all duration-500 shadow-neon-glow/20">
                            <img
                                src={barber.image}
                                alt={barber.name}
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + barber.name;
                                }}
                            />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{barber.name}</h3>
                        <p className="text-white/40 uppercase text-xs tracking-[0.2em]">{barber.role}</p>

                        <div className="absolute inset-0 rounded-xl bg-neon-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                ))}
            </div>
        </div>
    );
}
