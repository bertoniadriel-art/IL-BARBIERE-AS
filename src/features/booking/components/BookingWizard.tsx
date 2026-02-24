"use client";

import { useBookingStore } from "../bookingStore";
import { BarberSelector } from "./BarberSelector";
import { ServiceSelector } from "./ServiceSelector";
import { TimeSelector } from "./TimeSelector";
import { Confirmation } from "./Confirmation";

export function BookingWizard() {
    const step = useBookingStore((state) => state.step);

    return (
        <div className="w-full min-h-screen py-20 bg-background flex flex-col items-center justify-center">
            {/* Progress Indicator */}
            <div className="w-full max-w-md flex justify-between px-4 mb-4">
                {[1, 2, 3, 4].map((s) => (
                    <div
                        key={s}
                        className={`h-1 flex-1 mx-1 rounded-full transition-all duration-500 ${s <= step ? "bg-neon-gradient shadow-[0_0_5px_rgba(0,243,255,0.5)]" : "bg-white/10"
                            }`}
                    />
                ))}
            </div>

            {step === 1 && <BarberSelector />}
            {step === 2 && <ServiceSelector />}
            {step === 3 && <TimeSelector />}
            {step === 4 && <Confirmation />}
        </div>
    );
}
