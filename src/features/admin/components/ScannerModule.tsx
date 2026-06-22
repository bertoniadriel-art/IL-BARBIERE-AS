"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, ShieldCheck, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/shared/lib/supabase";
import { addHours, format, isAfter, isToday, parseISO } from "date-fns";

export function ScannerModule() {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [appointment, setAppointment] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanError);

        async function onScanSuccess(decodedText: string) {
            scanner.clear();
            setScanResult(decodedText);

            if (!supabase) {
                setError("MODO DEMO: Supabase no configurado. No se puede validar el QR.");
                return;
            }

            // Look up appointment in The Vault
            const { data, error } = await supabase
                .from("appointments")
                .select("*, barbers(*)")
                .eq("qr_hash", decodedText)
                .single();

            if (error || !data) {
                setError("TURNO NO ENCONTRADO O INVÁLIDO");
                return;
            }

            // Validate appointment date is today
            const appointmentDate = parseISO(data.appointment_date);
            if (!isToday(appointmentDate)) {
                const formattedDate = format(appointmentDate, "dd/MM/yyyy");
                setError(`ESTE QR ES PARA EL DÍA ${formattedDate}, NO PARA HOY`);
                return;
            }

            // Validate QR hasn't expired (2h after appointment time)
            const appointmentDateTime = parseISO(`${data.appointment_date}T${data.appointment_time}`);
            const expiryTime = addHours(appointmentDateTime, 2);
            if (isAfter(new Date(), expiryTime)) {
                setError("ESTE QR YA VENCIÓ (VÁLIDO POR 2 HORAS)");
                return;
            }

            // Check if already attended
            if (data.status === "attended") {
                setError("ESTE TURNO YA FUE REGISTRADO");
                return;
            }

            setAppointment(data);

            // Automatically mark as attended
            await supabase
                .from("appointments")
                .update({ status: "attended" })
                .eq("id", data.id);
        }

        function onScanError(err: any) {
            // Quietly ignore scan errors
        }

        return () => {
            scanner.clear();
        };
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
            <h2 className="text-3xl font-black mb-8 flex items-center gap-4">
                <QrCode className="w-8 h-8 text-neon-cyan" /> EL ESCÁNER
            </h2>

            <div className="w-full glass-card overflow-hidden relative">
                {!scanResult ? (
                    <div id="reader" className="w-full min-h-[400px]" />
                ) : (
                    <div className="p-12 text-center animate-in zoom-in-95 duration-500">
                        {error ? (
                            <>
                                {error.includes("OTRO DÍA") ? (
                                    <Clock className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
                                ) : (
                                    <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                                )}
                                <h3 className={`text-2xl font-bold mb-4 ${error.includes("OTRO DÍA") ? "text-yellow-500" : "text-red-500"}`}>
                                    {error}
                                </h3>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-2 bg-white/10 rounded-full font-bold"
                                >
                                    REINTENTAR
                                </button>
                            </>
                        ) : appointment ? (
                            <>
                                <ShieldCheck className="w-20 h-20 text-neon-cyan mx-auto mb-6 shadow-neon-glow" />
                                <h3 className="text-3xl font-black text-white mb-2 uppercase">Check-in Exitoso</h3>
                                <div className="text-neon-cyan font-bold text-xl mb-6">{appointment.client_name}</div>

                                <div className="bg-white/5 rounded-2xl p-6 text-left space-y-2 mb-8 border border-white/10">
                                    <p className="text-white/40 text-xs font-bold uppercase">Barbero</p>
                                    <p className="font-bold text-lg">{appointment.barbers?.name}</p>
                                    <div className="h-px bg-white/10 my-2" />
                                    <p className="text-white/40 text-xs font-bold uppercase">Fecha y Hora</p>
                                    <p className="font-bold">{appointment.appointment_date} @ {appointment.appointment_time} HS</p>
                                </div>

                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full py-4 bg-neon-cyan text-black font-black rounded-xl shadow-neon-glow"
                                >
                                    ESCANEAR SIGUIENTE
                                </button>
                            </>
                        ) : (
                            <p>Procesando...</p>
                        )}
                    </div>
                )}
            </div>

            <p className="mt-8 text-white/40 text-sm text-center">
                Apunta la cámara al código QR del cliente para registrar su asistencia instantáneamente.
            </p>
        </div>
    );
}
