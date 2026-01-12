import React from "react";
import { Link } from "react-router-dom";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <span className="footerLeft">MatchFit © {year}</span>

        <nav aria-label="Liens légaux" style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <Link to="/conditions" className="footerLink">
            Conditions
          </Link>
          <Link to="/privacy" className="footerLink">
            Confidentialité
          </Link>
          <Link to="/cookies" className="footerLink">
            Cookies
          </Link>
          <Link to="/account" className="footerLink">
            Supprimer compte
          </Link>
        </nav>
      </div>
    </footer>
  );
}
