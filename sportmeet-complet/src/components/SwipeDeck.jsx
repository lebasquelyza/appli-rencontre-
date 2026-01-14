// sportmeet-complet/src/components/SwipeDeck.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SwipeCard } from "./SwipeCard";

export function SwipeDeck({
  profiles,
  onLikeProfile,
  onReportProfile,
  isAuthenticated,
  onRequireAuth,
  hasMyProfile = true
}) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const [gateMsg, setGateMsg] = useState("");
  const gateTimerRef = useRef(null);

  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomProfile, setZoomProfile] = useState(null);

  const scrollYRef = useRef(0);

  // ✅ Drag state for visuals
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const dragRafRef = useRef(null);

  // ✅ Flash feedback (NON / OUI / SUPERLIKE)
  const [flash, setFlash] = useState({ type: null, on: false });
  const flashTimerRef = useRef(null);

  // ✅ Pointer tracking
  const pointerRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    pointerId: null
  });

  const SWIPE_X = 95; // seuil like/skip
  const SWIPE_Y = 115; // seuil superlike (haut)

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const vibrate = (pattern) => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(pattern);
      }
    } catch {}
  };

  const showFlash = (type) => {
    // type: "nope" | "like" | "super"
    setFlash({ type, on: true });
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlash({ type: null, on: false }), 220);
  };

  const showGate = (msg) => {
    setGateMsg(msg);
    if (gateTimerRef.current) window.clearTimeout(gateTimerRef.current);
    gateTimerRef.current = window.setTimeout(() => setGateMsg(""), 2200);
  };

  useEffect(() => setIndex(0), [profiles]);

  useEffect(() => {
    return () => {
      if (gateTimerRef.current) window.clearTimeout(gateTimerRef.current);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
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
    typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://matchfit.app";

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

  const resetDrag = () => setDrag({ x: 0, y: 0, active: false });

  const handleLike = async () => {
    const gate = guardAction();
    if (!gate.ok) return;
    if (!currentProfile || busy) return;

    setBusy(true);
    try {
      const ok = await onLikeProfile?.(currentProfile, { isSuper: false });
      if (ok === false) return;

      // ✅ feedback
      showFlash("like");
      vibrate([20]);

      await sleep(140);
      next();
    } finally {
      setBusy(false);
      resetDrag();
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

      // ✅ feedback
      showFlash("super");
      vibrate([15, 35, 15]);

      await sleep(160);
      next();
    } finally {
      setBusy(false);
      resetDrag();
    }
  };

  const handleSkip = async () => {
    if (isShareCard) {
      if (busy) return;
      next();
      resetDrag();
      return;
    }

    const gate = guardAction();
    if (!gate.ok) return;

    if (busy) return;

    // ✅ feedback
    showFlash("nope");
    vibrate([12]);

    await sleep(120);
    next();
    resetDrag();
  };

  const handleReset = () => setIndex(0);

  const hasAny = Array.isArray(profiles) && profiles.length > 0;

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

  useEffect(() => {
    if (!zoomOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [zoomOpen]);

  // ✅ Apply transform based on drag
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rotate = clamp(drag.x / 18, -14, 14); // deg

  const stageStyle = {
    transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${rotate}deg)`,
    transition: drag.active ? "none" : "transform 180ms ease",
    willChange: "transform",
    cursor: isShareCard ? "default" : drag.active ? "grabbing" : "grab",
    touchAction: "pan-y",
    position: "relative"
  };

  // ✅ Badge styles (drag hints)
  const badgeCommon = {
    position: "absolute",
    top: 16,
    zIndex: 20,
    padding: "8px 12px",
    borderRadius: 14,
    fontWeight: 900,
    letterSpacing: 1,
    fontSize: 14,
    background: "rgba(0,0,0,.45)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,.18)",
    userSelect: "none",
    pointerEvents: "none"
  };

  const badgeNope = {
    ...badgeCommon,
    left: 14,
    transform: "rotate(-10deg)",
    opacity: clamp((-drag.x - 40) / 70, 0, 1)
  };

  const badgeLike = {
    ...badgeCommon,
    right: 14,
    transform: "rotate(10deg)",
    opacity: clamp((drag.x - 40) / 70, 0, 1)
  };

  const badgeSuper = {
    ...badgeCommon,
    left: "50%",
    transform: "translateX(-50%)",
    top: 14,
    opacity: clamp((-drag.y - 60) / 90, 0, 1)
  };

  // ✅ Flash overlay styles
  const flashStyle = (() => {
    if (!flash.on) return { opacity: 0, pointerEvents: "none" };

    const common = {
      position: "absolute",
      inset: 0,
      zIndex: 30,
      display: "grid",
      placeItems: "center",
      borderRadius: 18,
      transition: "opacity 160ms ease",
      pointerEvents: "none",
      opacity: 1
    };

    if (flash.type === "like") {
      return {
        ...common,
        background: "linear-gradient(180deg, rgba(0,255,150,.10), rgba(0,0,0,0))"
      };
    }
    if (flash.type === "super") {
      return {
        ...common,
        background: "linear-gradient(180deg, rgba(255,215,0,.12), rgba(0,0,0,0))"
      };
    }
    // nope
    return {
      ...common,
      background: "linear-gradient(180deg, rgba(255,80,80,.10), rgba(0,0,0,0))"
    };
  })();

  const flashLabel = (() => {
    if (!flash.on) return null;
    const box = {
      padding: "10px 14px",
      borderRadius: 16,
      fontWeight: 1000,
      letterSpacing: 1,
      background: "rgba(0,0,0,.55)",
      border: "1px solid rgba(255,255,255,.18)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)"
    };
    if (flash.type === "like") return <div style={box}>OUI ❤️</div>;
    if (flash.type === "super") return <div style={box}>SUPERLIKE ★</div>;
    return <div style={box}>NON ✕</div>;
  })();

  // ✅ Pointer handlers (drag + validate)
  const onPointerDown = (e) => {
    if (zoomOpen) return;
    if (!currentProfile || busy) return;
    if (isShareCard) return;

    if (e.pointerType === "mouse" && e.button !== 0) return;

    pointerRef.current.active = true;
    pointerRef.current.startX = e.clientX;
    pointerRef.current.startY = e.clientY;
    pointerRef.current.lastX = e.clientX;
    pointerRef.current.lastY = e.clientY;
    pointerRef.current.moved = false;
    pointerRef.current.pointerId = e.pointerId;

    setDrag({ x: 0, y: 0, active: true });

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e) => {
    if (!pointerRef.current.active) return;

    const dx = e.clientX - pointerRef.current.startX;
    const dy = e.clientY - pointerRef.current.startY;

    pointerRef.current.lastX = e.clientX;
    pointerRef.current.lastY = e.clientY;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) pointerRef.current.moved = true;

    if (dragRafRef.current) return;
    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = null;
      setDrag({
        x: clamp(dx, -220, 220),
        y: clamp(dy, -220, 160),
        active: true
      });
    });
  };

  const onPointerUp = async () => {
    if (!pointerRef.current.active) return;
    pointerRef.current.active = false;

    if (!currentProfile || busy) {
      resetDrag();
      return;
    }

    const dx = pointerRef.current.lastX - pointerRef.current.startX;
    const dy = pointerRef.current.lastY - pointerRef.current.startY;

    // tap (pas un swipe) => zoom
    if (!pointerRef.current.moved) {
      resetDrag();
      return;
    }

    // superlike up
    if (dy < -SWIPE_Y && Math.abs(dx) < SWIPE_X) {
      await handleSuperLike();
      return;
    }

    // right = like
    if (dx > SWIPE_X) {
      await handleLike();
      return;
    }

    // left = nope
    if (dx < -SWIPE_X) {
      await handleSkip();
      return;
    }

    // not enough => back to center
    resetDrag();
  };

  const onPointerCancel = () => {
    pointerRef.current.active = false;
    resetDrag();
  };

  return (
    <div className="swipe-container" data-swipe-deck>
      {currentProfile ? (
        <>
          <div
            className="swipeStage"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onClick={() => {
              if (pointerRef.current.moved) return;
              if (isShareCard) return;
              openZoom(currentProfile);
            }}
            style={stageStyle}
          >
            {/* ✅ Flash feedback (validation) */}
            {!isShareCard && <div style={flashStyle}>{flashLabel}</div>}

            {/* ✅ Badges visibles pendant le swipe */}
            {!isShareCard && (
              <>
                <div style={badgeNope}>NON</div>
                <div style={badgeLike}>OUI</div>
                <div style={badgeSuper}>SUPERLIKE ★</div>
              </>
            )}

            {isShareCard ? (
              <SwipeCard key={shareProfileForCard.id} profile={shareProfileForCard} />
            ) : (
              <SwipeCard
                key={currentProfile.id}
                profile={currentProfile}
                onReport={(payload) => onReportProfile?.(currentProfile, payload)}
              />
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
            </div>
          )}

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
                  <div style={{ marginBottom: 10, display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" className="btn-ghost" onClick={closeZoom}>
                      Fermer
                    </button>
                  </div>

                  <div style={{ height: "calc(100% - 46px)" }}>
                    <SwipeCard
                      profile={zoomProfile}
                      onReport={(payload) => onReportProfile?.(zoomProfile, payload)}
                    />
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
