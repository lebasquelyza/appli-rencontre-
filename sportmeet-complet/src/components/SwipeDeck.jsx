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

  // ✅ Drag: pas de setState en continu
  const stageRef = useRef(null);
  const dragRafRef = useRef(null);
  const dragRef = useRef({ x: 0, y: 0 });

  const [dragging, setDragging] = useState(false);

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

  const SWIPE_X = 95;
  const SWIPE_Y = 115;

  // ✅ Superlike limit (front only)
  const SUPERLIKE_DAILY_LIMIT = 5;
  const SUPERLIKE_LS_KEY = "matchfit_superlikes_v1";

  const todayKey = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const readSuperlikeState = () => {
    try {
      if (typeof window === "undefined") return { day: todayKey(), count: 0 };
      const raw = window.localStorage.getItem(SUPERLIKE_LS_KEY);
      if (!raw) return { day: todayKey(), count: 0 };
      const parsed = JSON.parse(raw);
      if (!parsed?.day || typeof parsed?.count !== "number") return { day: todayKey(), count: 0 };
      if (parsed.day !== todayKey()) return { day: todayKey(), count: 0 };
      return parsed;
    } catch {
      return { day: todayKey(), count: 0 };
    }
  };

  const writeSuperlikeState = (state) => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(SUPERLIKE_LS_KEY, JSON.stringify(state));
    } catch {}
  };

  const canUseSuperlike = () => {
    const st = readSuperlikeState();
    return st.count < SUPERLIKE_DAILY_LIMIT;
  };

  const consumeSuperlike = () => {
    const st = readSuperlikeState();
    const nextState = {
      day: todayKey(),
      count: Math.min(SUPERLIKE_DAILY_LIMIT, (st.count || 0) + 1)
    };
    writeSuperlikeState(nextState);
    return nextState;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const vibrate = (pattern) => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(pattern);
      }
    } catch {}
  };

  const showFlash = (type) => {
    setFlash({ type, on: true });
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlash({ type: null, on: false }), 240);
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

  // ✅ Utils
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const lockScrollRef = useRef({ prevOverflow: "" });
  const lockScroll = () => {
    try {
      lockScrollRef.current.prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } catch {}
  };
  const unlockScroll = () => {
    try {
      document.body.style.overflow = lockScrollRef.current.prevOverflow || "";
    } catch {}
  };

  // ✅ Apply drag to DOM (pas de re-render)
  const applyDragDom = (x, y) => {
    dragRef.current.x = x;
    dragRef.current.y = y;

    const el = stageRef.current;
    if (!el) return;

    const rot = clamp(x / 18, -14, 14);
    el.style.setProperty("--dx", `${x}px`);
    el.style.setProperty("--dy", `${y}px`);
    el.style.setProperty("--rot", `${rot}deg`);

    // ✅ badges "texte" (si tu les gardes)
    const likeAlpha = clamp((x - 18) / 48, 0, 1);
    const nopeAlpha = clamp((-x - 18) / 48, 0, 1);
    const superAlpha = clamp((-y - 42) / 72, 0, 1);

    const likeEl = el.querySelector('[data-badge="like"]');
    const nopeEl = el.querySelector('[data-badge="nope"]');
    const superEl = el.querySelector('[data-badge="super"]');

    if (likeEl) likeEl.style.opacity = String(likeAlpha);
    if (nopeEl) nopeEl.style.opacity = String(nopeAlpha);
    if (superEl) superEl.style.opacity = String(superAlpha);

    // ✅ NOUVEAU : icônes ❤️ / ✕ qui suivent le swipe
    // progress = 0..1
    const likeP = clamp((x - 18) / 120, 0, 1);
    const nopeP = clamp((-x - 18) / 120, 0, 1);

    const heart = el.querySelector('[data-icon="heart"]');
    const cross = el.querySelector('[data-icon="cross"]');

    if (heart) {
      heart.style.opacity = String(likeP);
      heart.style.transform = `translate3d(${clamp(x * 0.08, 0, 22)}px, ${clamp(y * 0.04, -10, 10)}px, 0) scale(${0.92 + likeP * 0.14})`;
    }
    if (cross) {
      cross.style.opacity = String(nopeP);
      cross.style.transform = `translate3d(${clamp(x * 0.08, -22, 0)}px, ${clamp(y * 0.04, -10, 10)}px, 0) scale(${0.92 + nopeP * 0.14})`;
    }
  };

  const resetDragDom = () => {
    applyDragDom(0, 0);
  };

  // ✅ Fly-out animation
  const flyOut = async (dir) => {
    const w = typeof window !== "undefined" ? window.innerWidth || 360 : 360;
    const distX = Math.min(320, w * 0.75);
    const distY = Math.min(420, w * 0.95);

    if (dir === "right") applyDragDom(distX, -20);
    if (dir === "left") applyDragDom(-distX, -20);
    if (dir === "up") applyDragDom(0, -distY);

    await sleep(220);
  };

  // ✅ Actions
  const handleLike = async () => {
    const gate = guardAction();
    if (!gate.ok) return;
    if (!currentProfile || busy) return;

    setBusy(true);
    try {
      showFlash("like");
      vibrate([20]);

      await flyOut("right");
      next();
      resetDragDom();

      Promise.resolve(onLikeProfile?.(currentProfile, { isSuper: false })).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const handleSuperLike = async () => {
    const gate = guardAction();
    if (!gate.ok) return;
    if (!currentProfile || busy) return;

    if (!canUseSuperlike()) {
      showGate(`Tu as atteint la limite de ${SUPERLIKE_DAILY_LIMIT} superlikes aujourd’hui ⭐`);
      vibrate([30, 20, 30]);
      resetDragDom();
      return;
    }

    setBusy(true);
    try {
      showFlash("super");
      vibrate([15, 35, 15]);

      await flyOut("up");
      next();
      resetDragDom();

      consumeSuperlike();
      Promise.resolve(onLikeProfile?.(currentProfile, { isSuper: true })).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    if (isShareCard) {
      if (busy) return;
      await flyOut("left");
      next();
      resetDragDom();
      return;
    }

    const gate = guardAction();
    if (!gate.ok) return;
    if (busy) return;

    setBusy(true);
    try {
      showFlash("nope");
      vibrate([12]);

      await flyOut("left");
      next();
      resetDragDom();
    } finally {
      setBusy(false);
    }
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

  const stageStyle = {
    transform: `translate3d(var(--dx, 0px), var(--dy, 0px), 0) rotate(var(--rot, 0deg))`,
    transition: dragging ? "none" : "transform 220ms cubic-bezier(.2,.8,.2,1)",
    willChange: "transform",
    cursor: isShareCard ? "default" : !isAuthenticated ? "default" : dragging ? "grabbing" : "grab",
    touchAction: "pan-y",
    position: "relative"
  };

  // ✅ Badges texte (optionnels)
  const badgeCommon = {
    position: "absolute",
    top: 14,
    zIndex: 20,
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 1000,
    letterSpacing: 1.4,
    fontSize: 16,
    textTransform: "uppercase",
    userSelect: "none",
    pointerEvents: "none",
    border: "1px solid rgba(255,255,255,.22)",
    textShadow: "0 6px 18px rgba(0,0,0,.35)"
  };

  const badgeNope = {
    ...badgeCommon,
    left: 14,
    transform: "rotate(-10deg)",
    opacity: 0,
    background: "linear-gradient(180deg, rgba(255,80,92,.28), rgba(0,0,0,.10))",
    boxShadow: "0 10px 26px rgba(255,80,92,.18), 0 0 0 1px rgba(255,80,92,.14)",
    backdropFilter: dragging ? "none" : "blur(10px)",
    WebkitBackdropFilter: dragging ? "none" : "blur(10px)"
  };

  const badgeLike = {
    ...badgeCommon,
    right: 14,
    transform: "rotate(10deg)",
    opacity: 0,
    background: "linear-gradient(180deg, rgba(0,224,150,.26), rgba(0,0,0,.10))",
    boxShadow: "0 10px 26px rgba(0,224,150,.16), 0 0 0 1px rgba(0,224,150,.12)",
    backdropFilter: dragging ? "none" : "blur(10px)",
    WebkitBackdropFilter: dragging ? "none" : "blur(10px)"
  };

  const badgeSuper = {
    ...badgeCommon,
    left: "50%",
    transform: "translateX(-50%)",
    top: 12,
    opacity: 0,
    background: "linear-gradient(180deg, rgba(255,215,0,.22), rgba(0,0,0,.10))",
    boxShadow: "0 10px 26px rgba(255,215,0,.14), 0 0 0 1px rgba(255,215,0,.12)",
    backdropFilter: dragging ? "none" : "blur(10px)",
    WebkitBackdropFilter: dragging ? "none" : "blur(10px)"
  };

  // ✅ Icônes ❤️ / ✕ (les styles sont stables, juste opacity/transform changent via applyDragDom)
  const iconBase = {
    position: "absolute",
    top: 18,
    zIndex: 25,
    width: 62,
    height: 62,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontSize: 28,
    fontWeight: 900,
    userSelect: "none",
    pointerEvents: "none",
    opacity: 0,
    transform: "translate3d(0,0,0) scale(.92)",
    willChange: "transform, opacity",
    border: "1px solid rgba(255,255,255,.22)",
    background: "rgba(10,10,14,.52)",
    boxShadow: "0 14px 32px rgba(0,0,0,.22)",
    backdropFilter: dragging ? "none" : "blur(12px)",
    WebkitBackdropFilter: dragging ? "none" : "blur(12px)"
  };

  const heartStyle = {
    ...iconBase,
    right: 14
  };

  const crossStyle = {
    ...iconBase,
    left: 14
  };

  // ✅ Flash overlay
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
        background:
          "radial-gradient(circle at 70% 20%, rgba(0,224,150,.22), rgba(0,0,0,0) 55%), linear-gradient(180deg, rgba(0,224,150,.12), rgba(0,0,0,0))"
      };
    }
    if (flash.type === "super") {
      return {
        ...common,
        background:
          "radial-gradient(circle at 50% 10%, rgba(255,215,0,.20), rgba(0,0,0,0) 55%), linear-gradient(180deg, rgba(255,215,0,.10), rgba(0,0,0,0))"
      };
    }
    return {
      ...common,
      background:
        "radial-gradient(circle at 30% 20%, rgba(255,80,92,.22), rgba(0,0,0,0) 55%), linear-gradient(180deg, rgba(255,80,92,.12), rgba(0,0,0,0))"
    };
  })();

  const flashLabel = (() => {
    if (!flash.on) return null;

    const boxBase = {
      padding: "10px 14px",
      borderRadius: 999,
      fontWeight: 1000,
      letterSpacing: 1.2,
      border: "1px solid rgba(255,255,255,.22)",
      background: "rgba(10,10,14,.55)",
      backdropFilter: dragging ? "none" : "blur(12px)",
      WebkitBackdropFilter: dragging ? "none" : "blur(12px)",
      boxShadow: "0 12px 30px rgba(0,0,0,.22)"
    };

    if (flash.type === "like") return <div style={boxBase}>OUI ❤️</div>;
    if (flash.type === "super") return <div style={boxBase}>SUPERLIKE ★</div>;
    return <div style={boxBase}>NON ✕</div>;
  })();

  // ✅ Pointer handlers
  const onPointerDown = (e) => {
    if (zoomOpen) return;
    if (!currentProfile || busy) return;
    if (isShareCard) return;

    if (!isAuthenticated) {
      onRequireAuth?.();
      showGate("Connecte-toi pour swiper 💪");
      resetDragDom();
      return;
    }

    if (e.pointerType === "mouse" && e.button !== 0) return;

    pointerRef.current.active = true;
    pointerRef.current.startX = e.clientX;
    pointerRef.current.startY = e.clientY;
    pointerRef.current.lastX = e.clientX;
    pointerRef.current.lastY = e.clientY;
    pointerRef.current.moved = false;
    pointerRef.current.pointerId = e.pointerId;

    setDragging(true);
    lockScroll();
    resetDragDom();

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
      applyDragDom(clamp(dx, -220, 220), clamp(dy, -220, 160));
    });
  };

  const endPointer = () => {
    pointerRef.current.active = false;
    setDragging(false);
    unlockScroll();
  };

  const onPointerUp = async () => {
    if (!pointerRef.current.active) return;
    endPointer();

    if (!isAuthenticated) {
      resetDragDom();
      return;
    }

    if (!currentProfile || busy) {
      resetDragDom();
      return;
    }

    const dx = pointerRef.current.lastX - pointerRef.current.startX;
    const dy = pointerRef.current.lastY - pointerRef.current.startY;

    if (!pointerRef.current.moved) {
      resetDragDom();
      return;
    }

    if (dy < -SWIPE_Y && Math.abs(dx) < SWIPE_X) {
      await handleSuperLike();
      return;
    }

    if (dx > SWIPE_X) {
      await handleLike();
      return;
    }

    if (dx < -SWIPE_X) {
      await handleSkip();
      return;
    }

    resetDragDom();
  };

  const onPointerCancel = () => {
    if (!pointerRef.current.active) return;
    endPointer();
    resetDragDom();
  };

  return (
    <div className="swipe-container" data-swipe-deck>
      {currentProfile ? (
        <>
          <div
            ref={stageRef}
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
            {/* ✅ Flash feedback */}
            {!isShareCard && <div style={flashStyle}>{flashLabel}</div>}

            {/* ✅ Icônes ❤️ / ✕ */}
            {!isShareCard && (
              <>
                <div data-icon="cross" style={crossStyle}>
                  ✕
                </div>
                <div data-icon="heart" style={heartStyle}>
                  ❤
                </div>
              </>
            )}

            {/* ✅ Badges texte (si tu veux les garder) */}
            {!isShareCard && (
              <>
                <div data-badge="nope" style={badgeNope}>
                  NON
                </div>
                <div data-badge="like" style={badgeLike}>
                  OUI
                </div>
                <div data-badge="super" style={badgeSuper}>
                  SUPERLIKE ★
                </div>
              </>
            )}

            {isShareCard ? (
              <SwipeCard key={shareProfileForCard.id} profile={shareProfileForCard} reduceEffects={dragging} />
            ) : (
              <SwipeCard
                key={currentProfile.id}
                profile={currentProfile}
                reduceEffects={dragging}
                onReport={(payload) => onReportProfile?.(currentProfile, payload)}
              />
            )}
          </div>

          {gateMsg && <div className="gate-toast">{gateMsg}</div>}

          {/* (le reste inchangé) */}
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
                title={`Super like (limite ${SUPERLIKE_DAILY_LIMIT}/jour)`}
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
                      reduceEffects={false}
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
          {/* inchangé */}
          <p style={{ marginBottom: 6, fontWeight: 700 }}>
            {Array.isArray(profiles) && profiles.length > 0
              ? "Plus personne à te présenter 😊"
              : "Aucun profil dans cette sélection."}
          </p>
        </div>
      )}
    </div>
  );
}
