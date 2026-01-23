// supabase/functions/send-push/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const EXPO_URL = "https://exp.host/--/api/v2/push/send";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return json({ ok: true }, 200);

  try {
    const payload = await req.json();

    // ✅ Nouveau format
    // type: "message" | "match"
    // to_user_id: uuid receveur
    // match_id: number (bigint)
    // sender_name/body (si message)
    // other_name (si match)
    const {
      type,
      to_user_id,
      match_id,
      sender_name,
      body: msgBody,
      other_name,
      badge,
    } = payload ?? {};

    if (!type || !to_user_id || match_id === undefined || match_id === null) {
      return json(
        { error: "Missing fields: type, to_user_id, match_id" },
        400
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return json(
        { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        500
      );
    }

    // 1) Récupère les tokens du receveur
    const res = await fetch(
      `${supabaseUrl}/rest/v1/user_push_tokens?user_id=eq.${to_user_id}&select=expo_push_token`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    const tokens = await res.json();

    if (!tokens || tokens.length === 0) {
      return json({ success: true, sent: 0, reason: "No push token" }, 200);
    }

    // 2) Build titre + body automatiquement
    let title = "MatchFit";
    let message = "Notification";

    if (type === "message") {
      title = `💬 ${sender_name ?? "Nouveau message"}`;
      message = (msgBody ?? "Tu as reçu un message").toString().slice(0, 140);
    } else if (type === "match") {
      title = "❤️ Nouveau match !";
      message = `${other_name ?? "Quelqu’un"} a matché avec toi`;
    } else {
      // fallback si type inconnu
      title = "MatchFit";
      message = "Nouvelle notification";
    }

    // 3) Data utile pour ouvrir le chat direct
    const data = {
      type,
      match_id,
      url: `/chat/${match_id}`,
    };

    const messages = tokens
      .map((t: any) => t.expo_push_token)
      .filter((x: any) => typeof x === "string" && x.length > 0)
      .map((expoToken: string) => ({
        to: expoToken,
        title,
        body: message,
        data,
        sound: "default",
        ...(typeof badge === "number" ? { badge } : {}),
      }));

    const expoRes = await fetch(EXPO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    const expoJson = await expoRes.json();

    return json({ success: true, sent: messages.length, expo: expoJson }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
