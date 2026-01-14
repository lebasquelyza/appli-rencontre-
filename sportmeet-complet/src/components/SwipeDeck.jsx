// sportmeet-complet/src/components/SwipeDeck.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SwipeCard } from "./SwipeCard";

export function SwipeDeck({
  profiles,
  onLikeProfile,
  onReportProfile, // ✅ AJOUT: handler signalement
  isAuthenticated,
  onRequireAuth,

  // ✅ NOUVEAU: vrai si l'utilisateur a déjà créé son profil
  // ✅ DEFAULT: true pour ne jamais bloquer si la prop n'est pas passée
  hasMyProfile = true
}) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  // ✅ petit message "gate" quand pas de profil
  const [gateMsg, setGateMsg] = useState("");
  const gateTimerRef = useRef(null);

  // ✅ zoom
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomProfile, setZoomProfile] = useState(null);

  // ✅ pour pouvoir “revenir” au même scroll si besoin
  const scrollYRef = useRef(0);

  const showGate = (msg) => {
    setGateMsg(msg);
    if (gateTimerRef.current) window.clearTimeout(gateTimerRef.current);
    gateTimerRef.current = window.setTimeout(() => setGateMsg(""), 2200);
  };

  useEffect(() => {
    setIndex(0);
  }, [profiles]);

  useEffect(() => {
    return () => {
      if (gateTimerRef.current) window.clearTimeout(gateTimerRef.current);
    };
  }, []);

  const hasProfile = index < profiles.length;
  const currentProfile = hasProfile ? profiles[index] : null;

  const next = () => setIndex((i) => i + 1);

  const shareText = useMemo(
    () => "Je suis sur MatchFit 💪 Viens tester ! Partage à tes potes, ça peut aider 😉",
    []
  );

  const shareUrl =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://matchfit.app";

  const handleShare = async () => {
    const payload = { title: "MatchFit", text: shareText, url: shareUrl };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert("Message copié ✅");
    } catch {
      window.prompt("Copie ce message :", `${shareText}\n${shareUrl}`);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Lien copié ✅");
    } catch {
      window.prompt("Copie ce lien :", shareUrl);
    }
  };

  const isShareCard = !!currentProfile && currentProfile.__type === "share";

  const shareProfileForCard = useMemo(
    () => ({
      id: currentProfile?.id || "__share",
      name: "Partage MatchFit 💪",
      age: null,
      gender: null,
      city: "",
      sport: "",
      level: "",
      availability: "",
      bio:
        "Si tu veux rencontrer plus de partenaires d’entraînement, partage à tes potes. En espérant que ta/ton gymcrush en entendent parler 😉",
      photo_urls: [],
      isCustom: false
    }),
    [currentProfile?.id]
  );

  // ✅ gate centralisé pour actions (✕ / ❤ / ★ / 🚩)
  const guardAction = () => {
    if (isShareCard) return { ok: false, reason: "share" };

    if (!isAuthenticated) {
      onRequireAuth?.();
      return { ok: false, reason: "auth" };
    }

    if (hasMyProfile === false) {
      showGate("Crée ton profil avant de pouvoir trouver ta/ton partenaire 💪");
      return { ok: false, reason: "no_profile" };
    }

    return { ok: true };
  };

  const handleLike = async () => {
    const gate = guardAction();
    if (!gate.ok) return;

    if (!currentProfile || busy) return;

    setBusy(true);
    try {
      const ok = await onLikeProfile?.(currentProfile, { isSuper: false });
      if (ok === false) return;
      next();
    } finally {
      setBusy(false);
    }
  };

  const handleSuperLike = async () => {
    const gate = guardAction();
    if (!gate.ok) return;

    if (!currentProfile || busy) return;

    setBusy(true);
    try {
      const ok = await onLikeProfile?.(currentProfile, { isSuper: true });
      if (ok === false) return;
      next();
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    if (isShareCard) {
      if (busy) return;
      next();
      return;
    }

    const gate = guardAction();
    if (!gate.ok) return;

    if (busy) return;
    next();
  };

  // ✅ SIGNALER un profil (prompt rapide)
  const handleReport = async () => {
    const gate = guardAction();
    if (!gate.ok) return;

    if (!currentProfile || busy) return;

    // Stoppe la propagation pour ne pas ouvrir le zoom
    // (au cas où le bouton est dans une zone cliquable)
    const reasonsHint =
      "Raison ? (ex: faux profil, contenu inapproprié, harcèlement, mineur, spam)";
    const reason = (window.prompt(reasonsHint) || "").trim();
    if (!reason) return;

    const details = (window.prompt("Détails (optionnel)") || "").trim();

    setBusy(true);
    try {
      await onReportProfile?.(currentProfile, { reason, details });
      // Optionnel: passer au profil suivant après signalement
      next();
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => setIndex(0);

  const hasAny = Array.isArray(profiles) && profiles.length > 0;

  // ✅ ouvrir le profil en grand
  const openZoom = (p) => {
    if (!p || p.__type === "share") return;
    scrollYRef.current = window.scrollY || 0;
    setZoomProfile(p);
    setZoomOpen(true);
  };

  const closeZoom = () => {
    setZoomOpen(false);
    setZoomProfile(null);
  };

  // ✅ empêcher le scroll derrière quand zoom ouvert
  useEffect(() => {
    if (!zoomOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      // optionnel: revenir au scroll précédent
      // window.scrollTo(0, scrollYRef.current || 0);
    };
  }, [zoomOpen]);

  return (
    <div className="swipe-container" data-swipe-deck>
      {currentProfile ? (
        <>
          <div
            className="swipeStage"
            onClick={() => {
              if (isShareCard) return;
              openZoom(currentProfile);
            }}
            style={{ cursor: isShareCard ? "default" : "zoom-in" }}
          >
            {isShareCard ? (
              <SwipeCard key={shareProfileForCard.id} profile={shareProfileForCard} />
            ) : (
              <SwipeCard key={currentProfile.id} profile={currentProfile} />
            )}
          </div>

          {gateMsg && <div className="gate-toast">{gateMsg}</div>}

          {!isAuthenticated && !isShareCard ? (
            <div className="actions" style={{ flexDirection: "column", gap: 10 }}>
              <p className="form-message" style={{ margin: 0 }}>
                Connecte-toi pour liker ou passer des profils.
              </p>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequireAuth?.();
                }}
              >
                Se connecter
              </button>
            </div>
          ) : isShareCard ? (
            <div className="actions" style={{ justifyContent: "center", gap: 10 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
              >
                Partager
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
              >
                Copier le lien
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                title="Continuer"
              >
                Continuer
              </button>
            </div>
          ) : (
            <div className="actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="swBtn swBtnBad"
                onClick={handleSkip}
                disabled={busy}
                aria-label="Passer"
                title="Passer"
              >
                ✕
              </button>

              <button
                type="button"
                className="swBtn swBtnPrimary"
                onClick={handleLike}
                disabled={busy}
                aria-label="Liker"
                title="Liker"
              >
                ❤
              </button>

              <button
                type="button"
                className="swBtn swBtnGood"
                onClick={handleSuperLike}
                disabled={busy}
                aria-label="Super like"
                title="Super like"
              >
                ★
              </button>

              {/* ✅ BOUTON SIGNALER */}
              <button
                type="button"
                className="swBtn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReport();
                }}
                disabled={busy}
                aria-label="Signaler"
                title="Signaler ce profil"
                style={{ fontSize: 18 }}
              >
                🚩
              </button>
            </div>
          )}

          {/* ✅✅✅ ZOOM OVERLAY (Portal + inline styles) */}
          {zoomOpen &&
            zoomProfile &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                onClick={closeZoom}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9999,
                  background: "rgba(0,0,0,.35)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  display: "grid",
                  placeItems: "center",
                  padding: 14
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "min(560px, 100%)",
                    height: "min(calc(var(--appH, 100vh) * 0.78), 720px)"
                  }}
                >
                  <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    {/* ✅ signaler aussi dans le zoom */}
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        // on signale le profil zoomé (c’est le même que currentProfile la plupart du temps)
                        const gate = guardAction();
                        if (!gate.ok) return;

                        const reason = (window.prompt(
                          "Raison ? (ex: faux profil, contenu inapproprié, harcèlement, mineur, spam)"
                        ) || "").trim();
                        if (!reason) return;
                        const details = (window.prompt("Détails (optionnel)") || "").trim();
                        onReportProfile?.(zoomProfile, { reason, details });
                      }}
                      title="Signaler ce profil"
                    >
                      🚩 Signaler
                    </button>

                    <button type="button" className="btn-ghost" onClick={closeZoom}>
                      Fermer
                    </button>
                  </div>

                  <div style={{ height: "calc(100% - 46px)" }}>
                    <SwipeCard profile={zoomProfile} />
                  </div>
                </div>
              </div>,
              document.body
            )}
        </>
      ) : (
        <div className="swipe-empty" style={{ textAlign: "center" }}>
          {hasAny ? (
            <>
              <p style={{ marginBottom: 6, fontWeight: 700 }}>Plus personne à te présenter 😊</p>
              <p style={{ marginTop: 0, opacity: 0.9, lineHeight: 1.35 }}>
                Partage <strong>MatchFit</strong> à tes potes… en espérant que ton/ta{" "}
                <strong>gymcrush</strong> en entende parler 👀
              </p>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" className="btn-primary" onClick={handleShare}>
                  Partager
                </button>
                <button type="button" className="btn-ghost" onClick={handleCopy}>
                  Copier le lien
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <button type="button" className="btn-ghost" onClick={handleReset}>
                  Revoir des profils
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ marginBottom: 6, fontWeight: 700 }}>Aucun profil dans cette sélection.</p>
              <p style={{ marginTop: 0, opacity: 0.9 }}>
                Essaie d’élargir tes filtres, ou partage MatchFit pour attirer du monde 👇
              </p>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" className="btn-primary" onClick={handleShare}>
                  Partager
                </button>
                <button type="button" className="btn-ghost" onClick={handleCopy}>
                  Copier le lien
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
