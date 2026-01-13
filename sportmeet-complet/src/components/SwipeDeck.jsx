// sportmeet-complet/src/components/SwipeDeck.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SwipeCard } from "./SwipeCard";

export function SwipeDeck({
  profiles,
  onLikeProfile,
  isAuthenticated,
  onRequireAuth,

  hasMyProfile = true
}) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  // ✅ petit message "gate" quand pas de profil
  const [gateMsg, setGateMsg] = useState("");
  const gateTimerRef = useRef(null);

  // ✅ NEW: modal preview (agrandir une carte)
  const [openPreview, setOpenPreview] = useState(false);

  const showGate = (msg) => {
    setGateMsg(msg);
    if (gateTimerRef.current) window.clearTimeout(gateTimerRef.current);
    gateTimerRef.current = window.setTimeout(() => setGateMsg(""), 2200);
  };

  useEffect(() => {
    setIndex(0);
    setOpenPreview(false);
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
      height: null,
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

  // ✅ gate centralisé pour actions (✕ / ❤ / ★)
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

  const handleReset = () => setIndex(0);

  const hasAny = Array.isArray(profiles) && profiles.length > 0;

  // ✅ ouvrir modal preview
  const openCardPreview = () => {
    if (!currentProfile || isShareCard) return;
    setOpenPreview(true);
  };

  const closeCardPreview = () => setOpenPreview(false);

  return (
    <div className="swipe-container" data-swipe-deck>
      {currentProfile ? (
        <>
          <div className="swipeStage">
            {isShareCard ? (
              <SwipeCard key={shareProfileForCard.id} profile={shareProfileForCard} />
            ) : (
              <SwipeCard
                key={currentProfile.id}
                profile={currentProfile}
                onOpen={openCardPreview}
              />
            )}
          </div>

          {/* ✅ modal preview agrandi + background dégradé */}
          {openPreview && currentProfile && !isShareCard && (
            <div
              className="modal-backdrop"
              onClick={closeCardPreview}
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,.78), rgba(0,0,0,.92))",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                zIndex: 9999
              }}
            >
              <div
                className="modal-card modal-card--sheet"
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "min(820px, 96vw)",
                  maxHeight: "calc(var(--appH, 100vh) - 40px)",
                  overflow: "hidden"
                }}
              >
                <div className="modal-header">
                  <h3 style={{ marginRight: "auto" }}>Profil</h3>
                  <button className="btn-ghost" onClick={closeCardPreview}>
                    Fermer
                  </button>
                </div>

                <div className="modal-body" style={{ paddingTop: 10 }}>
                  <div style={{ maxWidth: 760, margin: "0 auto" }}>
                    {/* IMPORTANT: pas de onOpen ici => pas de boucle */}
                    <SwipeCard profile={currentProfile} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ toast message */}
          {gateMsg && <div className="gate-toast">{gateMsg}</div>}

          {!isAuthenticated && !isShareCard ? (
            <div className="actions" style={{ flexDirection: "column", gap: 10 }}>
              <p className="form-message" style={{ margin: 0 }}>
                Connecte-toi pour liker ou passer des profils.
              </p>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => onRequireAuth?.()}
              >
                Se connecter
              </button>
            </div>
          ) : isShareCard ? (
            <div className="actions" style={{ justifyContent: "center", gap: 10 }}>
              <button type="button" className="btn-primary" onClick={handleShare}>
                Partager
              </button>
              <button type="button" className="btn-ghost" onClick={handleCopy}>
                Copier le lien
              </button>
              <button type="button" className="btn-ghost" onClick={next} title="Continuer">
                Continuer
              </button>
            </div>
          ) : (
            <div className="actions">
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
            </div>
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
