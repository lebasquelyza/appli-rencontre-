// sportmeet-complet/src/pages/AccountSettings.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AccountSettings({ user }) {
  const navigate = useNavigate();

  const [action, setAction] = useState(""); // "suspend" | "delete"
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const reasons = useMemo(
    () => [
      "Tu as date ton/ta gymcrush ?",
      "Je ne l’utilise plus",
      "Je veux faire une pause",
      "Je reçois trop de notifications",
      "Je n’aime pas l’expérience",
      "Problème de sécurité / confidentialité",
      "Autre"
    ],
    []
  );

  const requireAuth = () => {
    if (!user) {
      setMsg("Connecte-toi pour configurer ton compte.");
      return false;
    }
    return true;
  };

  const handleSuspend = async () => {
    if (!requireAuth()) return;
    if (!reason) return setMsg("Choisis une raison.");

    setLoading(true);
    setMsg("");

    try {
      const fullReason = [reason, detail].filter(Boolean).join(" — ");

      const { error } = await supabase
        .from("profiles")
        .update({
          status: "suspended",
          suspended_at: new Date().toISOString(),
          suspension_reason: fullReason
        })
        .eq("user_id", user.id);

      if (error) throw error;

      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      setMsg("Impossible de suspendre le compte pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!requireAuth()) return;
    if (!reason) return setMsg("Choisis une raison.");

    setLoading(true);
    setMsg("");

    try {
      const fullReason = [reason, detail].filter(Boolean).join(" — ");

      // ✅ Option B : suppression complète via Edge Function (Auth + profil + photos)
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { reason: fullReason }
      });

      if (error) throw error;

      // Best-effort: si la session existe encore côté client
      await supabase.auth.signOut();

      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      setMsg("Impossible de supprimer le compte pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const onConfirm = () => {
    setMsg("");
    if (action === "suspend") return handleSuspend();
    if (action === "delete") return handleDeleteAccount();
    setMsg("Choisis une action (suspendre ou supprimer).");
  };

  return (
    <main className="page">
      <div className="shell">
        <section className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-ghost" onClick={() => navigate("/settings")}>
              ← Retour
            </button>
            <h1 style={{ margin: 0 }}>Configurer mon compte</h1>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Suspendre mon compte</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Ton profil ne sera plus accessible. Tu seras déconnecté.
              </p>

              <button
                className={action === "suspend" ? "btn-primary" : "btn-ghost"}
                type="button"
                onClick={() => setAction("suspend")}
                disabled={loading}
              >
                Choisir
              </button>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Supprimer mon compte</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Suppression complète (compte + profil + photos). Tu devras recréer un compte.
              </p>

              <button
                className={action === "delete" ? "btn-primary" : "btn-ghost"}
                type="button"
                onClick={() => setAction("delete")}
                disabled={loading}
              >
                Choisir
              </button>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Pourquoi ?</h3>

              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>Raison</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} disabled={loading}>
                  <option value="">Sélectionner…</option>
                  {reasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Détails (optionnel)</label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Tu peux préciser ici…"
                  disabled={loading}
                />
              </div>

              {msg && <div style={{ marginTop: 10, color: "tomato" }}>{msg}</div>}

              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button className="btn-primary" type="button" onClick={onConfirm} disabled={loading}>
                  Confirmer
                </button>
                <button
                  className="btn-ghost"
                  type="button"
                  onClick={() => navigate("/settings")}
                  disabled={loading}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
