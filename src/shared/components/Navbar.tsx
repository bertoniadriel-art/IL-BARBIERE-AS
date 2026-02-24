"use client";

import { Scissors, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <img
                                    src="/assets/logo/logo-official.jpg"
                                    alt="IL BARBIERE Logo"
                                    className="w-full h-full object-contain rounded-lg border border-white/10 shadow-neon-glow-sm"
                                />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-white uppercase">
                                IL BARBIERE <span className="text-neon-cyan">OS</span>
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="/" className="text-sm font-medium text-white/70 hover:text-neon-cyan transition-colors">INICIO</Link>
                        <Link href="/admin" className="text-sm font-medium text-white/70 hover:text-neon-cyan transition-colors">GESTIÓN PERSONAL</Link>
                        <Link href="/reservar" className="px-5 py-2.5 bg-neon-cyan text-black font-bold rounded-lg hover:shadow-neon-glow transition-all">
                            RESERVAR
                        </Link>
                    </div>

                    {/* Mobile Button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 text-white hover:text-neon-cyan transition-colors"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-white/5 animate-in slide-in-from-top duration-300">
                    <div className="px-4 pt-2 pb-6 space-y-4">
                        <Link href="/" onClick={() => setIsOpen(false)} className="block text-lg font-bold text-white py-2 border-b border-white/5">INICIO</Link>
                        <Link href="/admin" onClick={() => setIsOpen(false)} className="block text-lg font-bold text-white py-2 border-b border-white/5">GESTIÓN PERSONAL</Link>
                        <Link href="/reservar" onClick={() => setIsOpen(false)} className="block w-full text-center py-4 bg-neon-cyan text-black font-black rounded-xl">
                            RESERVAR AHORA
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
