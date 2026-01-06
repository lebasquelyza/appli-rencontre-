// sportmeet-complet/src/pages/AccountSettings.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AccountSettings({ user, myProfile }) {
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

  const requireAuthOrBack = () => {
    if (!user) {
      navigate("/settings");
      return false;
    }
    return true;
  };

  const handleSuspend = async () => {
    if (!requireAuthOrBack()) return;

    if (!reason) {
      setMsg("Choisis une raison.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          status: "suspended",
          suspended_at: new Date().toISOString(),
          suspension_reason: [reason, detail].filter(Boolean).join(" — ")
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

  const handleDeleteRequest = async () => {
    if (!requireAuthOrBack()) return;

    if (!reason) {
      setMsg("Choisis une raison.");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const fullReason = [reason, detail].filter(Boolean).join(" — ");

      const { error } = await supabase.from("account_deletion_requests").insert({
        user_id: user.id,
        reason: fullReason
      });

      if (error) throw error;

      // Optionnel : on peut aussi “suspendre” immédiatement le profil
      await supabase
        .from("profiles")
        .update({
          status: "suspended",
          suspended_at: new Date().toISOString(),
          suspension_reason: `Demande suppression — ${fullReason}`
        })
        .eq("user_id", user.id);

      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      setMsg("Impossible d’envoyer la demande de suppression pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const onConfirm = async () => {
    setMsg("");
    if (action === "suspend") return handleSuspend();
    if (action === "delete") return handleDeleteRequest();
    setMsg("Choisis une action.");
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

          {!user && (
            <p className="form-message" style={{ marginTop: 12 }}>
              Connecte-toi pour accéder à la configuration du compte.
            </p>
          )}

          {user && myProfile?.status === "suspended" && (
            <p className="form-message error" style={{ marginTop: 12 }}>
              Ton compte est actuellement suspendu.
            </p>
          )}

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
                disabled={!user}
              >
                Choisir
              </button>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Supprimer mon compte</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                On enregistre une demande de suppression. Tu seras déconnecté.
              </p>
              <button
                className={action === "delete" ? "btn-primary" : "btn-ghost"}
                type="button"
                onClick={() => setAction("delete")}
                disabled={!user}
              >
                Choisir
              </button>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Pourquoi ?</h3>

              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>Raison</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)}>
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
                />
              </div>

              {msg && <div style={{ marginTop: 10, color: "tomato" }}>{msg}</div>}

              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={onConfirm}
                  disabled={!user || loading}
                  title={!user ? "Connecte-toi" : ""}
                >
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
