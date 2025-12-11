import React from "react";

export function Header() {
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
        <div className="header-badge">
          <span className="header-badge-pill">MVP Front</span>
          <span>Prêt pour GitHub + Netlify</span>
        </div>
      </div>
    </header>
  );
}
