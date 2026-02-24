import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/shared/components/Navbar";

export const metadata: Metadata = {
    title: "IL BARBIERE OS | Reservas Premium",
    description: "Sistema Operativo de Reservas para IL BARBIERE Arroyo Seco",
    icons: {
        icon: "/assets/logo/logo-official.jpg",
        apple: "/assets/logo/logo-official.jpg",
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className="dark">
            <body className="bg-[#0a0a0a] text-white antialiased selection:bg-neon-cyan selection:text-black">
                <Navbar />
                <main className="pt-20">
                    {children}
                </main>
            </body>
        </html>
    );
}
