// supabase/functions/delete-account/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response("Missing env", { status: 500 });
    }

    // Le JWT utilisateur arrive via l'en-tête Authorization quand tu appelles functions.invoke()
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return new Response("Unauthorized", { status: 401 });

    // Client "user" (avec le JWT) pour récupérer l'identité du user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return new Response("Unauthorized", { status: 401 });

    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

    // Client admin (service role) pour supprimer en dur (DB/Storage/Auth)
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // (Optionnel) log avant suppression (table à créer plus bas)
    // Ne jamais stocker des infos sensibles inutiles.
    await admin.from("account_deletions").insert({
      user_id: userId,
      reason,
    }).catch(() => null);

    // 1) Supprimer Storage (ex: bucket "avatars" / "photos")
    // Adapte bucket + chemin selon ton app.
    // Exemple : tous les fichiers rangés sous un prefix userId/
    const bucketsToClean = ["photos", "avatars"];
    for (const bucket of bucketsToClean) {
      const { data: listed, error: listErr } = await admin.storage.from(bucket).list(userId, {
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

      if (!listErr && listed?.length) {
        const paths = listed.map((f) => `${userId}/${f.name}`);
        await admin.storage.from(bucket).remove(paths).catch(() => null);
      }
    }

    // 2) Supprimer les lignes DB liées (si tu n'as pas encore les cascades)
    // Adapte les tables à ton projet.
    // Si tu mets des FK ON DELETE CASCADE, beaucoup de ceci devient inutile.
    await admin.from("photos").delete().eq("user_id", userId).catch(() => null);
    await admin.from("profiles").delete().eq("user_id", userId).catch(() => null);

    // 3) Supprimer l'utilisateur Auth (le vrai hard delete)
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-account error:", e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
