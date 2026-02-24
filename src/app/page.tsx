import { Scissors, Calendar, ShieldCheck, Instagram, ArrowRight, Star, Clock, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/shared/components/Footer";

export default function Home() {
    const barbers = [
        { name: "Santi Ducca", role: "Master Barber", image: "/assets/barbers/santi.png" },
        { name: "Fede Diaz", role: "Especialista en Estilo", image: "/assets/barbers/fede.png" },
    ];

    return (
        <div className="flex flex-col items-center bg-background">
            {/* Hero Section */}
            <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-neon-cyan/5 rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-neon-purple/5 rounded-full blur-[140px] pointer-events-none" />

                <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-[0.2em] text-neon-cyan mb-8 uppercase">
                        <Zap className="w-3 h-3 fill-neon-cyan" />
                        Vuelve el estilo premium
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] italic">
                        CORTE <span className="text-transparent bg-clip-text bg-neon-gradient px-4">PREMIUM</span><br />
                        EXPERIENCIA <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">OS</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/50 mb-12 font-medium">
                        El Sistema Operativo de tu imagen personal. <br className="hidden md:block" />
                        Gestiona tus turnos con <span className="text-white">Santi o Fede</span> en Arroyo Seco con total precisión.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link
                            href="/reservar"
                            className="group relative px-10 py-5 bg-white text-black font-black rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 text-lg"
                        >
                            <div className="absolute inset-0 bg-neon-gradient opacity-0 group-hover:opacity-10 transition-opacity" />
                            <div className="flex items-center gap-3">
                                RESERVAR TURNO
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>

                        <a
                            href="https://instagram.com/ilbarbiere10"
                            target="_blank"
                            className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center gap-3 text-lg hover:bg-white/10 transition-all text-white/80"
                        >
                            <Instagram className="w-5 h-5" />
                            PORTAFOLIO
                        </a>
                    </div>
                </div>

                {/* Floating Badges */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-12 opacity-30 select-none hidden md:flex">
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-black">100%</span>
                        <span className="text-[10px] tracking-[0.3em] uppercase">Digitalizado</span>
                    </div>
                    <div className="h-8 w-px bg-white/20" />
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-black">ZERO</span>
                        <span className="text-[10px] tracking-[0.3em] uppercase">Fricción</span>
                    </div>
                    <div className="h-8 w-px bg-white/20" />
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-black">24/7</span>
                        <span className="text-[10px] tracking-[0.3em] uppercase">Reservas</span>
                    </div>
                </div>
            </section>

            {/* Barbers Section */}
            <section className="w-full py-24 px-4 bg-[#0d0d0d] relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tighter italic mb-4">
                                LOS <span className="text-neon-cyan">MAESTROS</span>
                            </h2>
                            <p className="text-white/40 max-w-md">Elige a tu profesional de confianza. Cada corte es una obra de ingeniería.</p>
                        </div>
                        <div className="h-px flex-1 bg-white/5 mx-12 hidden md:block" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {barbers.map((barber) => (
                            <div key={barber.name} className="group relative glass-card p-4 overflow-hidden">
                                <div className="aspect-[4/5] relative rounded-lg overflow-hidden mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                    <img
                                        src={barber.image}
                                        alt={barber.name}
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                                    />
                                    <div className="absolute bottom-6 left-6 z-20">
                                        <h3 className="text-3xl font-black text-white uppercase italic">{barber.name}</h3>
                                        <p className="text-neon-cyan font-bold tracking-widest text-xs uppercase">{barber.role}</p>
                                    </div>
                                </div>
                                <Link
                                    href={`/reservar?barber=${barber.name.split(' ')[0].toLowerCase()}`}
                                    className="w-full py-4 bg-white/5 rounded-xl border border-white/5 font-black uppercase tracking-widest text-sm hover:bg-neon-cyan hover:text-black transition-all text-center block"
                                >
                                    Me quiero cortar con {barber.name.split(' ')[0]}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            <Footer />
        </div>
    );
}
