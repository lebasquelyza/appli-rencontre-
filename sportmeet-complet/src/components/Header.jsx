import React from "react";

export function Header() {
  const handleAuthClick = () => {
    // Ici tu pourras plus tard ouvrir un modal ou rediriger vers /login
    alert("Ici on ouvrira la page de connexion / création de compte 🙂");
  };

  return (
    <header className="header">
      <div className="container header-content">
        <div className="header-title-group">
          <h1>
            <span className="header-logo-mark">SM</span>
            <span>SportMeet</span>
          </h1>
          <p>Rencontres entre sportifs par affinités, dans ta ville.</p>
        </div>

        <div className="header-right">
          <div className="header-badge">
            <span className="header-badge-pill">MVP Front</span>
            <span>Prêt pour GitHub + Netlify</span>
          </div>

          <button type="button" className="btn-auth" onClick={handleAuthClick}>
            Se connecter / Créer un compte
          </button>
        </div>
      </div>
    </header>
  );
}
