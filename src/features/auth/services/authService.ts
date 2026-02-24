import { supabase } from "@/shared/lib/supabase";

export const authService = {
    async signIn(email: string, password: string) {
        if (!supabase) return { data: null, error: new Error("Supabase no configurado") };
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    },

    async signOut() {
        if (!supabase) return { error: new Error("Supabase no configurado") };
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    async getSession() {
        if (!supabase) return null;
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    }
};
