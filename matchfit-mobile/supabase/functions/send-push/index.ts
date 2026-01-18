import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { user_id, title, body, data } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "user_id missing" }),
        { status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rows, error } = await supabase
      .from("user_push_tokens")
      .select("expo_push_token")
      .eq("user_id", user_id);

    if (error) throw error;

    const tokens = (rows ?? [])
      .map((r) => r.expo_push_token)
      .filter(Boolean);

    if (!tokens.length) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0 }),
        { status: 200 }
      );
    }

    const payload = tokens.map((to) => ({
      to,
      sound: "default",
      title: title ?? "Notification",
      body: body ?? "",
      data: data ?? {},
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    return new Response(text, { status: 200 });

  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500 }
    );
  }
});
