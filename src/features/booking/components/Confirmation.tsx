"use client";

import { useState } from "react";
import { useBookingStore } from "../bookingStore";
import { CheckCircle, Smartphone, QrCode, CreditCard, Share2, ArrowRight } from "lucide-react";
import QRCode from "react-qr-code";
import { supabase } from "@/shared/lib/supabase";
import { format } from "date-fns";

export function Confirmation() {
    const { barberId, serviceId, date, time, reset, setStep } = useBookingStore();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [qrValue, setQrValue] = useState("");

    // Format date for display and WhatsApp
    const formattedDate = date ? format(new Date(date + 'T12:00:00'), 'dd-MM-yyyy') : "";

    const barberNames = {
        "santi-id": "Santi Ducca",
        "fede-id": "Fede Diaz"
    };

    const serviceNames = {
        "s1": "Corte de Pelo",
        "s2": "Barba",
        "s3": "Corte + Barba",
        "s4": "Corte Niños"
    };

    const handleConfirm = async () => {
        if (!name || !phone) return;
        setIsSubmitting(true);

        const qrHash = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Save to Supabase (The Vault)
        if (supabase) {
            const { error } = await supabase.from("appointments").insert({
                barber_id: barberId === "santi-id" ? "f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2" : "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1",
                service_id: "00000000-0000-0000-0000-000000000001", // Placeholder or dynamic if possible
                client_name: name,
                client_phone: phone,
                appointment_date: date,
                appointment_time: time,
                qr_hash: qrHash,
                status: "pending"
            });

            if (error) {
                console.error("Error saving appointment:", error);
            }
        }

        setQrValue(qrHash);
        setIsConfirmed(true);
        setIsSubmitting(false);

        // WhatsApp Dynamic Link
        const message = `*IL BARBIERE OS - NUEVA RESERVA*\n\n` +
            `👤 *Cliente:* ${name}\n` +
            `✂️ *Servicio:* ${serviceNames[serviceId as keyof typeof serviceNames]}\n` +
            `📅 *Fecha:* ${formattedDate}\n` +
            `⏰ *Hora:* ${time} HS\n` +
            `💈 *Barbero:* ${barberNames[barberId as keyof typeof barberNames]}\n` +
            `🎟️ *Código:* ${qrHash}\n\n` +
            `_Confirmado vía IL BARBIERE OS_`;

        const waPhone = barberId === "santi-id" ? "3402503244" : "3402417023";
        window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, "_blank");
    };

    if (isConfirmed) {
        return (
            <div className="w-full max-w-xl mx-auto px-4 py-8 text-center animate-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-neon-cyan/20 rounded-full flex items-center justify-center mb-6 shadow-neon-glow">
                        <CheckCircle className="w-10 h-10 text-neon-cyan" />
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tighter mb-2">¡LISTO!</h2>
                    <p className="text-white/60 mb-6 uppercase tracking-widest text-[10px] font-black">Turno confirmado y enviado a WhatsApp</p>

                    <div className="w-full glass-card p-1 max-w-[260px] mx-auto mb-8 shadow-neon-glow border-2 border-neon-cyan overflow-hidden rounded-3xl">
                        <div className="bg-white p-6 rounded-2xl">
                            <QRCode value={qrValue} size={200} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                        </div>
                        <div className="py-4 text-white font-black text-2xl tracking-[0.3em] uppercase">{qrValue}</div>
                    </div>

                    <div className="w-full glass-card p-6 mb-8 border-white/5 text-left">
                        <div className="flex items-center gap-3 mb-4">
                            <CreditCard className="w-5 h-5 text-neon-purple" />
                            <h4 className="font-bold text-sm tracking-widest uppercase">Pagar Seña</h4>
                        </div>
                        <p className="text-white/40 text-xs mb-4">Para garantizar tu lugar, envía el comprobante al WhatsApp.</p>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-xs text-white/40 uppercase mb-1">CBU / ALIAS</p>
                            <p className="text-neon-purple font-black tracking-wider uppercase">FEDEDIAZ.14</p>
                            <p className="text-[10px] text-white/20 mt-2">BANCO MACRO - FEDERICO DIAZ</p>
                        </div>
                    </div>

                    <button
                        onClick={reset}
                        className="text-white/40 hover:text-neon-cyan font-bold uppercase tracking-widest text-xs transition-colors"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center mb-10">
                <button
                    onClick={() => setStep(3)}
                    className="text-white/40 hover:text-white transition-colors text-sm uppercase tracking-widest flex items-center gap-2"
                >
                    ← Volver
                </button>
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">
                    TU <span className="text-neon-cyan">IDENTIDAD</span>
                </h2>
                <div className="w-16" />
            </div>

            <div className="glass-card p-8 mb-8 border-neon-cyan/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 blur-3xl pointer-events-none" />
                <div className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 font-black italic">Nombre Completo</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Juan Pérez"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-neon-cyan transition-all text-white font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 font-black italic">WhatsApp (Sin 0 ni 15)</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="3402500000"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-neon-cyan transition-all text-white font-bold"
                        />
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 mb-10 border-white/5 bg-white/[0.02]">
                <h4 className="text-[10px] uppercase tracking-[0.3em] text-white/20 mb-6 font-black italic">Detalles de Protocolo</h4>
                <div className="grid grid-cols-2 gap-8 px-2">
                    <div className="space-y-1">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest uppercase">Fecha</p>
                        <p className="text-lg font-black italic">{formattedDate}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest uppercase">Hora</p>
                        <p className="text-lg font-black italic text-neon-cyan">{time} HS</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest uppercase">Servicio</p>
                        <p className="text-sm font-black italic uppercase">{serviceNames[serviceId as keyof typeof serviceNames]}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest uppercase">Barbero</p>
                        <p className="text-sm font-black italic uppercase">{barberNames[barberId as keyof typeof barberNames]}</p>
                    </div>
                </div>
            </div>

            <button
                disabled={!name || !phone || isSubmitting}
                onClick={handleConfirm}
                className="group w-full py-6 bg-white text-black font-black text-xl rounded-[2rem] shadow-neon-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-4 uppercase italic"
            >
                {isSubmitting ? "ENVIANDO DATOS..." : (
                    <>
                        CONFIRMAR RESERVA <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>
            <p className="text-center mt-6 text-white/20 text-[10px] font-bold uppercase tracking-widest">Al confirmar, serás redirigido a WhatsApp</p>
        </div>
    );
}
