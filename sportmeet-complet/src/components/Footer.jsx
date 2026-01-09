// sportmeet-complet/src/components/Footer.jsx
import React from "react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
        <span className="footerLeft">MatchFit © {year}</span>

        {/* Tu peux laisser vide, mais je conseille de supprimer l'espace inutile */}
        {/* <span className="footer-note"></span> */}
      </div>
    </footer>
  );
}
