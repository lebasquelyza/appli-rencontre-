import React from "react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footerLeft">MatchFit © {year}</span>
        <span className="footer-note">
          
        </span>
      </div>
    </footer>
  );
}
