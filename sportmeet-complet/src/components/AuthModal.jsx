import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function AuthModal({ onClose }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setMsg(null);
    setIsError(false);
  }, [mode]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setIsError(false);

    try {
      if (!email || !password) {
        setIsError(true);
        setMsg("Email et mot de passe requis.");
        return;
      }
      if (password.length < 6) {
        setIsError(true);
        setMsg("Mot de passe : 6 caractères minimum.");
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;

        setIsError(false);
        setMsg("Compte créé ✅ Tu peux maintenant te connecter.");
        setMode("signin");
        setPassword("");
        return;
      }

      // signin
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      setIsError(false);
      setMsg("Connecté ✅");
      // petite fermeture auto
      setTimeout(() => onClose?.(), 350);
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMsg(err?.message || "Erreur d’authentification.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setMsg(null);
    setIsError(false);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMsg("Déconnecté ✅");
      setTimeout(() => onClose?.(), 350);
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMsg(err?.message || "Erreur de déconnexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => onClose?.()}>
      <div className="modal-card modal-card--sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === "signup" ? "Créer un compte" : "Se connecter"}</h3>
          <button className="btn-ghost" onClick={() => onClose?.()}>
            Fermer
          </button>
        </div>

        <div className="modal-body modal-body--scroll">
          <form className="form" onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: toi@gmail.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 caractères minimum"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            <button className="btn-primary btn-block" type="submit" disabled={loading}>
              {loading
                ? "..."
                : mode === "signup"
                ? "Créer mon compte"
                : "Se connecter"}
            </button>

            <button
              type="button"
              className="btn-ghost btn-block"
              onClick={() => setMode((m) => (m === "signup" ? "signin" : "signup"))}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {mode === "signup"
                ? "J’ai déjà un compte"
                : "Créer un compte"}
            </button>

            <button
              type="button"
              className="btn-ghost btn-block"
              onClick={handleSignOut}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              Se déconnecter
            </button>

            <p className={`form-message ${msg ? (isError ? "error" : "success") : ""}`}>
              {msg}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
