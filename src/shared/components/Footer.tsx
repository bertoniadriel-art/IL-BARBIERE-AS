import { Scissors, Instagram, MapPin, Phone } from "lucide-react";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="w-full bg-card border-t border-white/5 py-16 px-4">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="col-span-1 md:col-span-2">
                    <h3 className="text-2xl font-black mb-4 flex items-center gap-3 italic text-white uppercase tracking-tighter">
                        <img
                            src="/assets/logo/logo-official.jpg"
                            alt="IL BARBIERE Logo"
                            className="w-10 h-10 object-contain rounded-lg border border-white/10"
                        />
                        IL BARBIERE <span className="text-neon-cyan">OS</span>
                    </h3>
                    <p className="text-white/40 max-w-sm leading-relaxed">
                        Epicentro de estilo en Arroyo Seco. Fusionamos la barbería clásica con tecnología de vanguardia para una experiencia premium inigualable.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold mb-6 text-neon-cyan tracking-widest text-sm">UBICACIÓN</h4>
                    <ul className="space-y-4 text-white/50 text-sm">
                        <li className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-white/20 shrink-0" />
                            <span>San Martin 345,<br />Arroyo Seco, Santa Fe</span>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold mb-6 text-neon-purple tracking-widest text-sm">CONTACTO</h4>
                    <ul className="space-y-4 text-white/50 text-sm">
                        <li className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-white/20" />
                            <span>Santi: 3402503244</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-white/20" />
                            <span>Fede: 3402417023</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <a
                        href="https://instagram.com/ilbarbiere10"
                        target="_blank"
                        className="p-3 bg-white/5 rounded-full hover:bg-neon-gradient hover:text-black transition-all group"
                    >
                        <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </a>
                </div>

                <div className="text-xs text-white/20 flex flex-col md:flex-row items-center gap-2 md:gap-4 uppercase tracking-[0.2em]">
                    <p>© 2026 IL BARBIERE.</p>
                    <span className="hidden md:block">|</span>
                    <p className="font-black text-white/30">Powered by Adriel-IA Factory</p>
                    <span className="hidden md:block">|</span>
                    <Link href="/admin" className="hover:text-neon-cyan transition-colors">Admin Portal</Link>
                </div>
            </div>
        </footer>
    );
}
