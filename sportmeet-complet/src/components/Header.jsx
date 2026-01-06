import React, { useEffect, useRef, useState } from "react";

export function Header({ onOpenProfile, onOpenAuth, onLogout, user }) {
  const isAuthenticated = !!user;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      onOpenAuth?.();
      return;
    }
    onOpenProfile?.();
  };

  const toggleMenu = () => setMenuOpen((v) => !v);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) closeMenu();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleOpenAuth = () => {
    closeMenu();
    onOpenAuth?.();
  };

  const handleLogout = async () => {
    closeMenu();
    await onLogout?.();
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <img className="brandLogo" src="/logo.png" alt="MatchFit" />
          <div className="brandText">
            <div className="brandName">MatchFit</div>
            <div className="brandTag">Trouve ton partenaire d’entraînement, dans ta ville</div>
          </div>
        </div>

        <div className="topbarRight">
          <span className="badge">MVP · Front</span>

          {/* ✅ Statut */}
          {isAuthenticated ? (
            <span className="chip chip-soft" title={user?.email || "Connecté"}>
              ✅ Connecté
            </span>
          ) : (
            <span className="chip chip-soft">🔒 Non connecté</span>
          )}

          <button type="button" className="btn-ghost btn-sm" onClick={handleProfileClick}>
            {isAuthenticated ? "Mon profil" : "Profil"}
          </button>

          {/* ✅ Bouton multi-actions */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              title="Compte"
            >
              Compte{" "}
              <span style={{ marginLeft: 6, opacity: 0.9 }}>
                {menuOpen ? "▴" : "▾"}
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  zIndex: 50,
                  minWidth: 180,
                  borderRadius: 12,
                  padding: 8,
                  background: "var(--card, #fff)",
                  boxShadow: "0 10px 30px rgba(0,0,0,.12)"
                }}
              >
                {!isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={handleOpenAuth}
                      style={{ width: "100%", justifyContent: "flex-start" }}
                      role="menuitem"
                    >
                      Se connecter
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={handleOpenAuth}
                      style={{ width: "100%", justifyContent: "flex-start" }}
                      role="menuitem"
                    >
                      Créer un compte
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={handleLogout}
                      style={{ width: "100%", justifyContent: "flex-start" }}
                      role="menuitem"
                    >
                      Se déconnecter
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
