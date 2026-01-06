import React, { useEffect, useRef, useState } from "react";

export function Header({
  onOpenProfile,
  onOpenAuth,
  onLogout,
  onOpenCrushes,
  onOpenSettings,
  user
}) {
  const isAuthenticated = !!user;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleCrushesClick = () => {
    if (!isAuthenticated) {
      onOpenAuth?.("signin");
      return;
    }
    onOpenCrushes?.();
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

  const handleSignin = () => {
    closeMenu();
    onOpenAuth?.("signin");
  };

  const handleSignup = () => {
    closeMenu();
    onOpenAuth?.("signup");
  };

  const handleProfile = () => {
    closeMenu();
    onOpenProfile?.();
  };

  const handleSettings = () => {
    closeMenu();
    if (onOpenSettings) onOpenSettings();
    else alert("Réglages bientôt 🙂");
  };

  const handleLogout = async () => {
    closeMenu();
    await onLogout?.();
  };

  // ✅ style menu : cohérent avec le header (ghost buttons)
  const menuItemStyle = {
    width: "100%",
    justifyContent: "flex-start",
    borderRadius: 10
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

          <button type="button" className="btn-ghost btn-sm" onClick={handleCrushesClick}>
            Mes crush
          </button>

          {/* ✅ Compte */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              title="Compte"
            >
              Compte <span style={{ marginLeft: 6, opacity: 0.9 }}>{menuOpen ? "▴" : "▾"}</span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  zIndex: 50,
                  minWidth: 210,
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
                      onClick={handleSignin}
                      style={menuItemStyle}
                      role="menuitem"
                    >
                      Se connecter
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={handleSignup}
                      style={menuItemStyle}
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
                      onClick={handleProfile}
                      style={menuItemStyle}
                      role="menuitem"
                    >
                      Mon profil
                    </button>

                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={handleSettings}
                      style={menuItemStyle}
                      role="menuitem"
                    >
                      Réglages
                    </button>

                    <div style={{ height: 1, opacity: 0.12, margin: "6px 4px", background: "#000" }} />

                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={handleLogout}
                      style={menuItemStyle}
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

