// supabase/functions/purge-banned-users/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 1) Prendre les suppressions à exécuter maintenant
  const { data: jobs, error: jobsErr } = await supabase
    .from("account_deletions")
    .select("id, user_id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(25);

  if (jobsErr) {
    return new Response(JSON.stringify({ ok: false, step: "fetch_jobs", error: jobsErr.message }), { status: 500 });
  }

  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });
  }

  let processed = 0;
  const results: any[] = [];

  for (const job of jobs) {
    const jobId = job.id;
    const userId = job.user_id as string;

    // Marquer "processing" (best effort)
    await supabase
      .from("account_deletions")
      .update({ status: "processing", last_error: null })
      .eq("id", jobId);

    try {
      // 2) Purger les données app + récupérer les chemins storage
      const { data: purgeRows, error: purgeErr } = await supabase
        .rpc("purge_user_data", { p_user_id: userId });

      if (purgeErr) throw new Error(`purge_user_data: ${purgeErr.message}`);

      const storagePaths: string[] =
        (purgeRows?.[0]?.storage_paths as string[]) || [];

      // 3) Supprimer les photos storage (bucket profile-photos)
      if (storagePaths.length > 0) {
        const { error: storageErr } = await supabase
          .storage
          .from("profile-photos")
          .remove(storagePaths);

        if (storageErr) {
          // on n’échoue pas forcément tout si storage rate-limit, mais on log
          console.warn("storage remove error", storageErr.message);
        }
      }

      // 4) Supprimer le user Auth
      const { error: delAuthErr } = await supabase.auth.admin.deleteUser(userId);
      if (delAuthErr) throw new Error(`auth.deleteUser: ${delAuthErr.message}`);

      // 5) Marquer done
      await supabase
        .from("account_deletions")
        .update({ status: "done", processed_at: new Date().toISOString(), last_error: null })
        .eq("id", jobId);

      processed += 1;
      results.push({ jobId, userId, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      await supabase
        .from("account_deletions")
        .update({ status: "failed", last_error: msg })
        .eq("id", jobId);

      results.push({ jobId, userId, ok: false, error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed, results }), { status: 200 });
});
