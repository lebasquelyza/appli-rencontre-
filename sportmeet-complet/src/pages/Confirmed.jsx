import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Confirmed({ onOpenAuth }) {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const run = async () => {
      // Si Supabase renvoie un code (PKCE), on l'échange contre une session (best effort)
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch (e) {
        console.error("confirmed page error:", e);
      } finally {
        setDone(true);
        // Nettoie l'URL (enlève ?code=...)
        try {
          window.history.replaceState(null, "", window.location.pathname);
        } catch {}
      }
    };

    run();
  }, []);

  return (
    <main className="page">
      <div className="shell">
        <section className="card" style={{ maxWidth: 560, margin: "16px auto", padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Compte confirmé 🎉</h2>

          <p className="form-message" style={{ marginTop: 8 }}>
            {done
              ? "Tu peux maintenant te connecter."
              : "Validation en cours…"}
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              className="btn-primary"
              onClick={() => {
                // Ouvre ton AuthModal en revenant à l'accueil et en l'ouvrant
                navigate("/", { replace: true });
                // petit délai pour laisser la navigation se faire
                setTimeout(() => onOpenAuth?.(), 0);
              }}
            >
              Se connecter
            </button>

            <button className="btn-ghost" onClick={() => navigate("/", { replace: true })}>
              Retour à l’accueil
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
