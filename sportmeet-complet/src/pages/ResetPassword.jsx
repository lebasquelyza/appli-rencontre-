// sportmeet-complet/src/pages/ResetPassword.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!password || password.length < 6) {
      setMsg("Mot de passe trop court (min 6 caractères).");
      return;
    }
    if (password !== password2) {
      setMsg("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMsg("Lien invalide/expiré. Relance “mot de passe oublié”.");
        return;
      }
      setMsg("Mot de passe mis à jour ✅");
      setTimeout(() => navigate("/", { replace: true }), 900);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="shell">
        <section className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <h2>Réinitialiser le mot de passe</h2>

          {msg ? <p className="form-message" style={{ marginTop: 8 }}>{msg}</p> : null}

          <form className="form" onSubmit={onSubmit}>
            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>Confirmer</label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button className="btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? "..." : "Valider"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
