import React from "react";

export function Header({ onOpenProfile, onOpenAuth, user }) {
  const isAuthenticated = !!user;

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      onOpenAuth?.();
      return;
    }
    onOpenProfile?.();
  };

  const handleAuthClick = () => {
    if (onOpenAuth) {
      onOpenAuth();
    } else {
      alert("Ici on ouvrira la page de connexion / création de compte 🙂");
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          {/* Vrai logo */}
          <img className="brandLogo" src="/logo.png" alt="MatchFit" />

          <div className="brandText">
            <div className="brandName">MatchFit</div>
            <div className="brandTag">Trouve ton partenaire d’entraînement, dans ta ville</div>
          </div>
        </div>

        <div className="topbarRight">
          <span className="badge">MVP · Front</span>

          {/* ✅ Statut connexion */}
          {isAuthenticated ? (
            <span className="chip chip-soft" title={user?.email || "Connecté"}>
              ✅ Connecté
            </span>
          ) : (
            <span className="chip chip-soft">🔒 Non connecté</span>
          )}

          {/* ✅ Profil : accessible seulement si connecté */}
          <button type="button" className="btn-ghost btn-sm" onClick={handleProfileClick}>
            {isAuthenticated ? "Mon profil" : "Profil"}
          </button>

          {/* ✅ Bouton Connexion seulement si pas connecté */}
          {!isAuthenticated && (
            <button type="button" className="btn-primary btn-sm" onClick={handleAuthClick}>
              Connexion
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
