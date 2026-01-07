import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export function Header({
  onOpenProfile,
  onOpenAuth,
  onLogout,
  onOpenCrushes,
  onOpenSettings,
  user
}) {
  const navigate = useNavigate();
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

  // ✅ Partager (Web Share API + fallback copie)
  const handleShare = async () => {
    const url = window.location.origin;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "MatchFit",
          text: "Rejoins-moi sur MatchFit 💪",
          url
        });
        return;
      }
    } catch {
      // (l’utilisateur peut annuler) -> on ignore
    }

    try {
      await navigator.clipboard.writeText(url);
      alert("Lien copié ✅");
    } catch {
      prompt("Copie ce lien :", url);
    }
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
    else navigate("/settings");
  };

  const handleLogout = async () => {
    closeMenu();
    await onLogout?.();
  };

  // ✅ Style dark pour le dropdown (fond foncé + texte clair)
  const menuStyle = {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    zIndex: 50,
    minWidth: 210,
    borderRadius: 14,
    padding: 8,
    background: "#111",
    color: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)"
  };

  const itemStyle = {
    width: "100%",
    justifyContent: "flex-start",
    borderRadius: 10,
    padding: "10px 10px",
    color: "#fff",
    background: "transparent",
    border: "1px solid rgba(255,255,255,.10)",
    cursor: "pointer"
  };

  const itemHoverIn = (e) => {
    e.currentTarget.style.background = "rgba(255,255,255,.10)";
    e.currentTarget.style.borderColor = "rgba(255,255,255,.20)";
  };

  const itemHoverOut = (e) => {
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.borderColor = "rgba(255,255,255,.10)";
  };

  const dividerStyle = {
    height: 1,
    margin: "8px 4px",
    background: "rgba(255,255,255,.12)"
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

          {/* ✅ Bouton Partager (petit icône) */}
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handleShare}
            title="Partager"
            aria-label="Partager"
            style={{ paddingInline: 10 }}
          >
            ⤴︎
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
              <div role="menu" style={menuStyle}>
                {!isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSignin}
                      onMouseEnter={itemHoverIn}
                      onMouseLeave={itemHoverOut}
                      style={itemStyle}
                      role="menuitem"
                    >
                      Se connecter
                    </button>

                    <button
                      type="button"
                      onClick={handleSignup}
                      onMouseEnter={itemHoverIn}
                      onMouseLeave={itemHoverOut}
                      style={{ ...itemStyle, marginTop: 8 }}
                      role="menuitem"
                    >
                      Créer un compte
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleProfile}
                      onMouseEnter={itemHoverIn}
                      onMouseLeave={itemHoverOut}
                      style={itemStyle}
                      role="menuitem"
                    >
                      Mon profil
                    </button>

                    <button
                      type="button"
                      onClick={handleSettings}
                      onMouseEnter={itemHoverIn}
                      onMouseLeave={itemHoverOut}
                      style={{ ...itemStyle, marginTop: 8 }}
                      role="menuitem"
                    >
                      Réglages
                    </button>

                    <div style={dividerStyle} />

                    <button
                      type="button"
                      onClick={handleLogout}
                      onMouseEnter={itemHoverIn}
                      onMouseLeave={itemHoverOut}
                      style={itemStyle}
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
