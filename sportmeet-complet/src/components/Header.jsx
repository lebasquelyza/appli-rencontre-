// sportmeet-complet/src/components/Header.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export function Header({ onOpenProfile, onOpenAuth, onLogout, onOpenCrushes, user }) {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="shell" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <button className="btn-ghost" onClick={() => navigate("/")}>
            SportMeet
          </button>

          <button className="btn-ghost" onClick={() => navigate("/settings")}>
            Réglages
          </button>

          <button className="btn-ghost" onClick={() => onOpenCrushes?.()} disabled={!user}>
            Crushes
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user ? (
            <>
              <button className="btn-primary" onClick={() => onOpenProfile?.()}>
                Mon profil
              </button>
              <button className="btn-ghost" onClick={() => onLogout?.()}>
                Déconnexion
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => onOpenAuth?.()}>
              Connexion
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

