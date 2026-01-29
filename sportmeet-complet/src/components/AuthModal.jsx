// sportmeet-complet/src/components/AuthModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export function AuthModal({ onClose, initialMode = "signin" }) {
  // modes: signin | signup | reset
  const [mode, setMode] = useState(initialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // utilisé pour signin/signup

  // reset password
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [isError, setIsError] = useState(false);

  const [isAuthed, setIsAuthed] = useState(false);

  // ✅ proposer renvoi mail de confirmation
  const [canResendConfirm, setCanResendConfirm] = useState(false);

  const isResetMode = mode === "reset";

  // Détecte si on arrive via un lien "recovery" (reset password)
  const isRecoveryUrl = useMemo(() => {
    const h = window.location.hash || "";
    // Supabase met souvent access_token/refresh_token dans le hash
    return h.includes("type=recovery") || (h.includes("access_token=") && h.includes("refresh_token="));
  }, []);

  useEffect(() => {
    // si on arrive via lien recovery -> forcer mode reset
    if (isRecoveryUrl) {
      setMode("reset");
    } else {
      setMode(initialMode || "signin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode, isRecoveryUrl]);

  useEffect(() => {
    setMsg(null);
    setIsError(false);
    setCanResendConfirm(false);
  }, [mode]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsAuthed(!!data?.session?.user);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session?.user);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleForgotPassword = async () => {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      setIsError(true);
      setMsg("Entre ton email pour réinitialiser le mot de passe.");
      return;
    }

    setLoading(true);
    setMsg(null);
    setIsError(false);
    setCanResendConfirm(false);

    try {
      // ⚠️ mieux: envoyer vers / (on détecte ensuite recovery via hash)
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin
      });
      if (error) throw error;

      setIsError(false);
      setMsg("Email de réinitialisation envoyé 📩 Vérifie ta boîte mail.");
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      setIsError(true);
      setMsg(err?.message || "Erreur lors de l’envoi de l’email.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ renvoyer email de confirmation
  const handleResendConfirmation = async () => {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      setIsError(true);
      setMsg("Entre ton email pour renvoyer la confirmation.");
      return;
    }

    setLoading(true);
    setMsg(null);
    setIsError(false);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail
      });
      if (error) throw error;

      setIsError(false);
      setMsg("Email de confirmation renvoyé 📩");
      setCanResendConfirm(false);
    } catch (err) {
      console.error("RESEND CONFIRM ERROR:", err);
      setIsError(true);
      setMsg(err?.message || "Impossible de renvoyer l’email de confirmation.");
    } finally {
      setLoading(false);
    }
  };

  const submitSigninSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setIsError(false);
    setCanResendConfirm(false);

    try {
      const cleanEmail = (email || "").trim().toLowerCase();

      if (!cleanEmail || !password) {
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
        // ✅ IMPORTANT: redirection après clic sur l’email de confirmation
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            // ✅ FIX: bonne concat + page de confirmation
            emailRedirectTo: `${window.location.origin}/confirmed`
          }
        });
        if (error) throw error;

        // ✅ TEXTE DEMANDÉ
        // Quand email confirmation activée: user créé MAIS pas de session
        if (data?.user && !data?.session) {
          setIsError(false);
          setMsg("Rend toi dans tes mail pour confirmer ton compte");
          setCanResendConfirm(true); // propose renvoi si besoin
        } else {
          // selon config, il peut être connecté direct
          setIsError(false);
          setMsg("Compte créé ✅ Tu es connecté.");
          setTimeout(() => onClose?.(), 450);
        }

        // ✅ IMPORTANT: on reste en "signup" pour ne pas effacer le message via useEffect([mode])
        setPassword("");
        return;
      }

      // signin
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        const m = String(error?.message || "").toLowerCase();

        // ✅ cas email non confirmé
        if (m.includes("confirm") || m.includes("confirmed") || m.includes("verify") || m.includes("verified")) {
          setIsError(true);
          setMsg("⚠️ Tu dois confirmer ton email avant de te connecter.");
          setCanResendConfirm(true);
          return;
        }

        throw error;
      }

      setIsError(false);
      setMsg("Connecté ✅");
      setTimeout(() => onClose?.(), 350);
    } catch (err) {
      console.error("AUTH ERROR:", err);

      const full =
        err?.message ||
        err?.error_description ||
        err?.details ||
        (typeof err === "string" ? err : null);

      const text = String(full || "Erreur d’authentification.");

      // ✅ si l’erreur parle de confirmation, on propose le renvoi
      const low = text.toLowerCase();
      if (low.includes("confirm") || low.includes("confirmed") || low.includes("verify") || low.includes("verified")) {
        setCanResendConfirm(true);
      }

      setIsError(true);
      setMsg(text);
    } finally {
      setLoading(false);
    }
  };

  const submitUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setIsError(false);
    setCanResendConfirm(false);

    try {
      if (!newPassword || newPassword.length < 6) {
        setIsError(true);
        setMsg("Nouveau mot de passe : 6 caractères minimum.");
        return;
      }

      if (newPassword !== newPassword2) {
        setIsError(true);
        setMsg("Les mots de passe ne correspondent pas.");
        return;
      }

      // ✅ Met à jour le mot de passe du user en session (recovery)
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setIsError(false);
      setMsg("Mot de passe mis à jour ✅");

      // Nettoie l’URL (enlève le hash avec tokens)
      try {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch {
        // ignore
      }

      setTimeout(() => onClose?.(), 450);
    } catch (err) {
      console.error("UPDATE PASSWORD ERROR:", err);
      setIsError(true);
      setMsg(err?.message || "Erreur lors de la mise à jour du mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setMsg(null);
    setIsError(false);
    setCanResendConfirm(false);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMsg("Déconnecté ✅");
      setTimeout(() => onClose?.(), 350);
    } catch (err) {
      console.error("SIGNOUT ERROR:", err);
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
          <h3>
            {mode === "signup" ? "Créer un compte" : mode === "reset" ? "Nouveau mot de passe" : "Connexion"}
          </h3>
          <button className="btn-ghost" onClick={() => onClose?.()}>
            Fermer
          </button>
        </div>

        <div className="modal-body modal-body--scroll">
          {/* ✅ RESET PASSWORD */}
          {isResetMode ? (
            <form className="form" onSubmit={submitUpdatePassword}>
              <div className="form-group">
                <label htmlFor="newpass">Nouveau mot de passe</label>
                <input
                  id="newpass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6 caractères minimum"
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="newpass2">Confirmer</label>
                <input
                  id="newpass2"
                  type="password"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                  placeholder="Répète le mot de passe"
                  autoComplete="new-password"
                />
              </div>

              <button className="btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? "..." : "Mettre à jour le mot de passe"}
              </button>


              {/* ✅ Afficher aussi le lien en mode reset (utile sur Expo Go si la modal démarre en reset) */}
              <button
                type="button"
                onClick={() => setMode("signin")}
                disabled={loading}
                style={{
                  marginTop: 8,
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  opacity: 0.75,
                  textDecoration: "underline",
                  textAlign: "right",
                  width: "100%"
                }}
                aria-label="Mot de passe oublié"
                title="Mot de passe oublié"
              >
                Mot de passe oublié ?
              </button>

              {/* ✅ FIX build: pas de template string */}
              <p className={"form-message " + (msg ? (isError ? "error" : "success") : "")}>{msg}</p>
            </form>
          ) : (
            /* ✅ SIGNIN / SIGNUP */
            <form className="form" onSubmit={submitSigninSignup}>
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

                {/* ✅ lien discret "Mot de passe oublié ?" (visible aussi si on est en signup) */}
                {(
                  <button
                    type="button"
                    onClick={() => {
                      // si on est en signup, on repasse d'abord en signin
                      if (mode === "signup") setMode("signin");
                      handleForgotPassword();
                    }}
                    disabled={loading}
                    style={{
                      marginTop: 8,
                      padding: 0,
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 13,
                      opacity: 0.75,
                      textDecoration: "underline",
                      textAlign: "right",
                      width: "100%"
                    }}
                    aria-label="Mot de passe oublié"
                    title="Mot de passe oublié"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>

              <button className="btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? "..." : mode === "signup" ? "Créer mon compte" : "Se connecter"}
              </button>

              <button
                type="button"
                className="btn-ghost btn-block"
                onClick={() => setMode((m) => (m === "signup" ? "signin" : "signup"))}
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                {mode === "signup" ? "J’ai déjà un compte" : "Créer un compte"}
              </button>

              {/* ✅ Bouton pratique : aller à la connexion après signup */}
              {mode === "signup" && msg && !isError && (
                <button
                  type="button"
                  className="btn-ghost btn-block"
                  onClick={() => setMode("signin")}
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  Aller à la connexion
                </button>
              )}

              {/* ✅ renvoyer confirmation (affiché quand utile) */}
              {canResendConfirm && (
                <button
                  type="button"
                  className="btn-ghost btn-block"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  Renvoyer l’email de confirmation
                </button>
              )}

              {isAuthed && (
                <button
                  type="button"
                  className="btn-ghost btn-block"
                  onClick={handleSignOut}
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  Se déconnecter
                </button>
              )}

              {/* ✅ FIX build: pas de template string */}
              <p className={"form-message " + (msg ? (isError ? "error" : "success") : "")}>{msg}</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
