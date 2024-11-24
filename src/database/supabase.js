import { createClient } from "@supabase/supabase-js";

const getClient = () => {
    const options = {
        db: {
            schema: "public",
        },
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
        global: {
            headers: { "x-my-custom-header": "unborn" },
        },
    };

    const supabase = createClient(Bun.env.SUPABASE_URL, Bun.env.SUPABASE_SERVICE_ROLE, options);

    return supabase;
};

export default getClient;
