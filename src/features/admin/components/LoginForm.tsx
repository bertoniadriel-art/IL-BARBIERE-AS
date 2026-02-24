"use client";

import { useState } from "react";
import { Lock, User, ShieldAlert } from "lucide-react";
import { supabase } from "@/shared/lib/supabase";

interface Props {
    onLogin: (barber: any) => void;
}

export function LoginForm({ onLogin }: Props) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // 🔥 PROTOCOLO FAILSAFE: Si son las credenciales maestras, entrar directo
        // Esto garantiza acceso al Búnker incluso si la DB tiene problemas de columnas
        if ((username.toLowerCase() === "santi" && password === "santi123") ||
            (username.toLowerCase() === "fede" && password === "fede123")) {

            const barberData = username.toLowerCase() === "santi"
                ? { id: "78c41016-d4f2-4946-a3b7-1c439cc7aedc", name: "Santi Ducca" }
                : { id: "065f5bb5-578a-4993-8bbe-275b5831b2eb", name: "Fede Diaz" };

            console.log("Failsafe Login Success:", barberData);
            onLogin(barberData);
            setLoading(false);
            return;
        }

        if (!supabase) {
            setError("Error de conexión: Supabase no configurado.");
            setLoading(false);
            return;
        }

        try {
            const { data, error: profileError } = await supabase
                .from("barbers")
                .select("*")
                .eq("username", username)
                .eq("password", password)
                .single();

            if (profileError || !data) {
                setError("Usuario o contraseña incorrectos.");
            } else {
                onLogin(data);
            }
        } catch (err) {
            console.error("Login Query Error:", err);
            setError("Error en el sistema de identificación.");
        }
        setLoading(false);
    };

    return (
        <div className="w-full max-w-md p-8 glass-card border-neon-purple/50 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-neon-purple/50">
                    <Lock className="w-8 h-8 text-neon-purple" />
                </div>
                <h2 className="text-2xl font-bold tracking-tighter">BÚNKER DE CONTROL</h2>
                <p className="text-white/40 text-sm mt-2 font-medium uppercase tracking-widest">Identificación Requerida</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Nombre de Usuario</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-neon-purple outline-none transition-all font-bold"
                            placeholder="Ej: santi"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Pin de Acceso</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-neon-purple outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold animate-in slide-in-from-top-2">
                        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-neon-purple text-black font-bold rounded-xl shadow-[0_0_20px_rgba(191,0,255,0.3)] hover:shadow-[0_0_30px_rgba(191,0,255,0.5)] transition-all disabled:opacity-50 uppercase tracking-widest text-sm"
                >
                    {loading ? "VERIFICANDO..." : "ACCEDER AL SISTEMA"}
                </button>
            </form>
        </div>
    );
}
