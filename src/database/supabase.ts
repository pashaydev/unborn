import { createClient, SupabaseClient, SupabaseClientOptions } from "@supabase/supabase-js";
import { Database } from "../../database.types";

/**
 * Creates and returns a Supabase client instance with specified options.
 *
 * @returns {import("@supabase/supabase-js").SupabaseClient} The Supabase client instance.
 */
const getClient = (): SupabaseClient<Database> | undefined => {
    let options: SupabaseClientOptions<"public"> = {
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

    if (Bun.env.SUPABASE_URL && Bun.env.SUPABASE_SERVICE_ROLE) {
        const supabase = createClient<Database>(
            Bun.env.SUPABASE_URL,
            Bun.env.SUPABASE_SERVICE_ROLE,
            options
        );

        return supabase;
    }
};

export default getClient;
