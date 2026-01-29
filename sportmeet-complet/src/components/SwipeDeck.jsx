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
  onNeedMore,
  hasMyProfile = true
}) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ✅ bloque le swipe quand la modale "Signaler" est ouverte (pour permettre l'édition du texte)
  const [reportOpen, setReportOpen] = useState(false);

  const [gateMsg, setGateMsg] = useState("");
  const gateTimerRef = useRef(null);

  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomProfile, setZoomProfile] = useState(null);

  const scrollYRef = useRef(0);

  // ✅ Drag sans re-render pendant le move (DOM only)
  const stageRef = useRef(null);
  const dragRafRef = useRef(null);

  // ✅ Infinite feed: demande plus de profils quand on approche de la fin
  const needMoreLockRef = useRef({ key: "" });

  // ✅ refs DOM (pas de querySelector pendant le drag)
  const heartRef = useRef(null);
  const crossRef = useRef(null);

  // ✅ Flash feedback
  const [flash, setFlash] = useState({ type: null, on: false });
  const flashTimerRef = useRef(null);

  // ✅ Pointer tracking (+ vitesse pour un swipe plus "Tinder-like")
  const pointerRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
    pointerId: null,
    lastT: 0, // perf.now()
    vx: 0 // px/ms
  });

  const SWIPE_X = 95;
  const SWIPE_Y = 115;

  // ✅ Seuil de vitesse (px/ms) : swipe rapide validé même si distance faible
  const V_SWIPE = 0.45;

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

  const canUseSuperlike = () => readSuperlikeState().count < SUPERLIKE_DAILY_LIMIT;

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

  // ✅ Pré-charge quand il reste peu de cartes
  useEffect(() => {
    if (!onNeedMore) return;
    const len = Array.isArray(profiles) ? profiles.length : 0;
    const remaining = len - index;
    if (remaining <= 3) {
      const key = `${len}:${index}`;
      if (needMoreLockRef.current.key === key) return;
      needMoreLockRef.current.key = key;
      onNeedMore();
    }
  }, [index, profiles, onNeedMore]);

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

  // ✅ utils
  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

  // ✅ lock scroll (iOS/webview)
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

  // ✅ DOM writes minimal (transform + 2 opacities + 2 transforms)
  const applyDragDom = (x, y) => {
    const el = stageRef.current;
    if (!el) return;

    const rot = clamp(x / 18, -14, 14);

    // ✅ Android: écrire transform directement (plus fluide que setProperty sur CSS vars)
    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;

    // progress 0..1
    const likeP = clamp((x - 18) / 120, 0, 1);
    const nopeP = clamp((-x - 18) / 120, 0, 1);

    // ❤️ / ✕ (aucun querySelector ici)
    const heart = heartRef.current;
    const cross = crossRef.current;

    if (heart) {
      heart.style.opacity = String(likeP);
      heart.style.transform = `translate3d(0,0,0) scale(${0.92 + likeP * 0.14})`;
    }
    if (cross) {
      cross.style.opacity = String(nopeP);
      cross.style.transform = `translate3d(0,0,0) scale(${0.92 + nopeP * 0.14})`;
    }
  };

  const resetDragDom = () => applyDragDom(0, 0);

  // ✅ fly-out "plus fluide" : part de la position actuelle et continue vers l'extérieur (momentum)
  const flyOut = async (dir, meta = { dx: 0, dy: 0, vx: 0 }) => {
    const w = typeof window !== "undefined" ? window.innerWidth || 360 : 360;

    const base = Math.min(340, w * 0.85);
    const extra = clamp(Math.abs(meta.vx || 0) * 800, 0, 380); // momentum (px)
    const outX = dir === "right" ? base + extra : dir === "left" ? -(base + extra) : dir === "up" ? 0 : 0;

    const outY = dir === "up" ? -Math.min(520, w * 1.05) : -20 + clamp(meta.dy * 0.10, -40, 40);

    // réactive transition (car on coupe pendant le drag)
    if (stageRef.current) stageRef.current.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";

    if (dir === "right") applyDragDom(outX, outY);
    if (dir === "left") applyDragDom(outX, outY);
    if (dir === "up") applyDragDom(0, outY);

    await sleep(230);
  };

  const handleLike = async (meta) => {
    const gate = guardAction();
    if (!gate.ok) return;
    if (!currentProfile || busy) return;

    setBusy(true);
    try {
      showFlash("like");
      vibrate([20]);

      await flyOut("right", meta);
      next();
      resetDragDom();

      Promise.resolve(onLikeProfile?.(currentProfile, { isSuper: false })).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const handleSuperLike = async (meta) => {
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

      await flyOut("up", meta);
      next();
      resetDragDom();

      consumeSuperlike();
      Promise.resolve(onLikeProfile?.(currentProfile, { isSuper: true })).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async (meta) => {
    if (isShareCard) {
      if (busy) return;
      await flyOut("left", meta);
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

      await flyOut("left", meta);
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

  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  const stageStyle = {
    transform: "translate3d(0px, 0px, 0) rotate(0deg)",
    transition: "transform 220ms cubic-bezier(.2,.8,.2,1)", // sera mis à "none" pendant le drag via JS
    willChange: "transform",
    cursor: isShareCard ? "default" : !isAuthenticated ? "default" : "grab",
    // Perf Android: empêcher le navigateur d'interpréter le geste (scroll/zoom) pendant le swipe
    touchAction: reportOpen ? "auto" : "none",
    pointerEvents: reportOpen ? "none" : "auto",
    position: "relative",
    WebkitTapHighlightColor: "transparent",
    userSelect: reportOpen ? "text" : "none",
    WebkitUserSelect: reportOpen ? "text" : "none"
  };

  // ✅ icônes simples (pas de blur pendant drag)
  const iconBase = {
    position: "absolute",
    top: 18,
    zIndex: 25,
    width: 58,
    height: 58,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontSize: 28,
    fontWeight: 900,
    userSelect: reportOpen ? "text" : "none",
    pointerEvents: "none",
    opacity: 0,
    transform: "translate3d(0,0,0) scale(.92)",
    willChange: "transform, opacity",
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(10,10,14,.45)",
    boxShadow: isDragging ? "none" : "0 14px 32px rgba(0,0,0,.22)"
  };

  const heartStyle = { ...iconBase, right: 14 };
  const crossStyle = { ...iconBase, left: 14 };

  // ✅ flash overlay (inchangé)
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
      boxShadow: "0 12px 30px rgba(0,0,0,.22)"
    };
    if (flash.type === "like") return <div style={boxBase}>OUI ❤️</div>;
    if (flash.type === "super") return <div style={boxBase}>SUPERLIKE ★</div>;
    return <div style={boxBase}>NON ✕</div>;
  })();

  // ✅ pointer handlers (avec pointerId + vitesse)
  const onPointerDown = (e) => {
    if (reportOpen) return;
    if (zoomOpen || reportOpen) return;
    if (!currentProfile || busy) return;
    if (isShareCard) return;

    if (!isAuthenticated) {
      onRequireAuth?.();
      showGate("Connecte-toi pour swiper 💪");
      resetDragDom();
      return;
    }

    if (e.pointerType === "mouse" && e.button !== 0) return;

    // Empêche le navigateur (Android WebView) de “voler” le geste
    if (e.cancelable) e.preventDefault();

    pointerRef.current.active = true;
    pointerRef.current.startX = e.clientX;
    pointerRef.current.startY = e.clientY;
    pointerRef.current.lastX = e.clientX;
    pointerRef.current.lastY = e.clientY;
    pointerRef.current.moved = false;
    pointerRef.current.pointerId = e.pointerId;

    pointerRef.current.lastT = performance.now();
    pointerRef.current.vx = 0;

    setIsDragging(true);

    // coupe la transition pendant le drag (zéro re-render)
    if (stageRef.current) stageRef.current.style.transition = "none";

    resetDragDom();

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e) => {
    if (reportOpen) return;
    if (!pointerRef.current.active) return;
    if (pointerRef.current.pointerId != null && e.pointerId !== pointerRef.current.pointerId) return;

    if (e.cancelable) e.preventDefault();

    const dx = e.clientX - pointerRef.current.startX;
    const dy = e.clientY - pointerRef.current.startY;

    // vitesse horizontale (px/ms)
    const now = performance.now();
    const dt = Math.max(1, now - (pointerRef.current.lastT || now));
    pointerRef.current.vx = (e.clientX - pointerRef.current.lastX) / dt;
    pointerRef.current.lastT = now;

    pointerRef.current.lastX = e.clientX;
    pointerRef.current.lastY = e.clientY;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) pointerRef.current.moved = true;

    if (dragRafRef.current) return;
    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = null;
      applyDragDom(clamp(dx, -480, 480), clamp(dy, -260, 260)); // 🔥 plage élargie = moins de "butée" donc swipe plus fluide
    });
  };

  const endPointer = () => {
    pointerRef.current.active = false;
  };

  const onPointerUp = async (e) => {
    if (reportOpen) return;
    if (!pointerRef.current.active) return;
    if (pointerRef.current.pointerId != null && e?.pointerId != null && e.pointerId !== pointerRef.current.pointerId)
      return;

    endPointer();
    setIsDragging(false);

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
    const vx = pointerRef.current.vx || 0;

    if (!pointerRef.current.moved) {
      resetDragDom();
      return;
    }

    const meta = { dx, dy, vx };

    const shouldSuper = dy < -SWIPE_Y && Math.abs(dx) < SWIPE_X;
    const shouldLike = dx > SWIPE_X || vx > V_SWIPE;
    const shouldNope = dx < -SWIPE_X || vx < -V_SWIPE;

    if (shouldSuper) {
      await handleSuperLike(meta);
      return;
    }
    if (shouldLike) {
      await handleLike(meta);
      return;
    }
    if (shouldNope) {
      await handleSkip(meta);
      return;
    }

    // retour au centre (transition réactivée)
    if (stageRef.current) stageRef.current.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";
    resetDragDom();
  };

  const onPointerCancel = () => {
    if (reportOpen) return;
    if (!pointerRef.current.active) return;
    endPointer();
    setIsDragging(false);
    if (stageRef.current) stageRef.current.style.transition = "transform 220ms cubic-bezier(.2,.8,.2,1)";
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
            {!isShareCard && <div style={flashStyle}>{flashLabel}</div>}

            {/* ✅ Icônes ❤️ / ✕ (refs directes) */}
            {!isShareCard && (
              <>
                <div ref={crossRef} style={crossStyle}>
                  ✕
                </div>
                <div ref={heartRef} style={heartStyle}>
                  ❤
                </div>
              </>
            )}

            {isShareCard ? (
              <SwipeCard key={shareProfileForCard.id} profile={shareProfileForCard} reduceEffects={isAndroid || isDragging} isDragging={isDragging} />
            ) : (
              <SwipeCard
                key={currentProfile.id}
                profile={currentProfile}
                reduceEffects={isAndroid || isDragging}
                isDragging={isDragging}
                onReport={(payload) => onReportProfile?.(currentProfile, payload)}
                onReportOpen={() => setReportOpen(true)}
                onReportClose={() => setReportOpen(false)}
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
                onClick={() => handleSkip({ dx: 0, dy: 0, vx: 0 })}
                disabled={busy || reportOpen}
              >
                ✕
              </button>
              <button
                type="button"
                className="swBtn swBtnPrimary"
                onClick={() => handleLike({ dx: 0, dy: 0, vx: 0 })}
                disabled={busy || reportOpen}
              >
                ❤
              </button>
              <button
                type="button"
                className="swBtn swBtnGood"
                onClick={() => handleSuperLike({ dx: 0, dy: 0, vx: 0 })}
                disabled={busy || reportOpen}
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
                  // ⚠️ blur peut lag sur Android, on le coupe
                  backdropFilter: isAndroid ? "none" : "blur(14px)",
                  WebkitBackdropFilter: isAndroid ? "none" : "blur(14px)",
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
                      reduceEffects={isAndroid || isDragging}
                      onReport={(payload) => onReportProfile?.(zoomProfile, payload)}
                      onReportOpen={() => setReportOpen(true)}
                      onReportClose={() => setReportOpen(false)}
                    />
                  </div>
                </div>
              </div>,
              document.body
            )}
        </>
      ) : (
        <div className="swipe-empty" style={{ textAlign: "center" }}>
          {Array.isArray(profiles) && profiles.length > 0 ? (
            <p style={{ marginBottom: 6, fontWeight: 700 }}>Plus personne à te présenter 😊</p>
          ) : (
            <p style={{ marginBottom: 6, fontWeight: 700 }}>Partage à tes amis — avec un peu de chance, ton/ta gymcrush en entendra parler 💪✨</p>
          )}
          <div style={{ marginTop: 10, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn-primary" onClick={handleShare}>
              Partager
            </button>
            <button type="button" className="btn-ghost" onClick={handleCopy}>
              Copier le lien
            </button>
            <button type="button" className="btn-ghost" onClick={() => setIndex(0)}>
              Revoir des profils
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
