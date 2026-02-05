import { createClient } from "@/lib/supabase/server";
import { type User } from "@supabase/supabase-js";

export const createTRPCContext = async (opts: { headers: Headers }) => {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return {
        user,
        db: supabase,
        ...opts,
    };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
