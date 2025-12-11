import React from "react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-content">
        <span>SportMeet © {year}</span>
        <span className="footer-note">
          Prototype démo — à connecter à une vraie API (auth, chat, géoloc) plus tard.
        </span>
      </div>
    </footer>
  );
}
