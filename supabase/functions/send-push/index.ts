// supabase/functions/send-push/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const EXPO_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  try {
    const body = await req.json();

    const { user_id, title, body: message, data } = body;

    if (!user_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing fields" }),
        { status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/user_push_tokens?user_id=eq.${user_id}`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    const tokens = await res.json();

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push token" }),
        { status: 200 }
      );
    }

    const messages = tokens.map((t: any) => ({
      to: t.expo_push_token,
      title,
      body: message,
      data,
      sound: "default",
    }));

    const expoRes = await fetch(EXPO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    const expoJson = await expoRes.json();

    return new Response(JSON.stringify(expoJson), { status: 200 });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500 }
    );
  }
});
