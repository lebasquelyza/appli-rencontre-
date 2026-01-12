import React from "react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
        <span className="footerLeft">MatchFit © {year}</span>
      </div>
    </footer>
  );
}
