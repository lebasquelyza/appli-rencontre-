import React from "react";

export function Header({ onOpenProfile, onOpenAuth }) {
  const handleProfileClick = () => {
    if (onOpenProfile) onOpenProfile();
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
          <span className="logoMark">SM</span>
          <div className="brandText">
            <div className="brandName">SportMeet</div>
            <div className="brandTag">Rencontres sportives par affinités, dans ta ville</div>
          </div>
        </div>

        <div className="topbarRight">
          <span className="badge">MVP · Front</span>

          <button type="button" className="btn-ghost" onClick={handleProfileClick}>
            Mon profil
          </button>

          <button type="button" className="btn-primary" onClick={handleAuthClick}>
            Se connecter
          </button>
        </div>
      </div>
    </header>
  );
}

