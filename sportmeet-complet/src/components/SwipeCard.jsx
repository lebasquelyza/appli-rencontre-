// sportmeet-complet/src/components/SwipeCard.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function hashToHue(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

const REPORT_REASONS = [
  "Faux profil",
  "Arnaque / Scam",
  "Spam / publicité",
  "Harcèlement / insultes",
  "Contenu sexuel ou nudité",
  "Discours haineux",
  "Violence ou menaces",
  "Profil de mineur",
  "Usurpation d’identité",
  "Autre"
];

// ✅ petit helper: évite re-render inutiles quand le parent bouge
function SwipeCardImpl({ profile, onOpen, onReport, onReportOpen, onReportClose, reduceEffects = false, isDragging = false }) {
  const photos = Array.isArray(profile?.photo_urls) ? profile.photo_urls : [];
  const hasPhotos = photos.length > 0;

  const isAndroid =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);


  const [index, setIndex] = useState(0);

  // ✅ bio repliable
  const [bioOpen, setBioOpen] = useState(false);

  // ✅ dispo repliable
  const [availOpen, setAvailOpen] = useState(false);

  // ✅ modal signalement
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");

  // ✅ anti double tap
  const lastTapRef = useRef(0);

  useEffect(() => {
    setIndex(0);
    setBioOpen(false);
    setAvailOpen(false);

    setReportOpen(false);
    setReportReason(REPORT_REASONS[0]);
    setReportDetails("");
  }, [profile?.id]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, photos.length - 1)));
  }, [photos.length]);

  const initial = profile?.name?.[0]?.toUpperCase() ?? "M";
  const hue = hashToHue(`${profile?.name}-${profile?.city}-${profile?.sport}`);

  const bgFallback = {
    background: `
      radial-gradient(900px 450px at 20% 20%, hsla(${hue}, 90%, 60%, .28), transparent 55%),
      radial-gradient(900px 450px at 80% 30%, hsla(${(hue + 40) % 360}, 90%, 60%, .20), transparent 60%),
      linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.25))
    `
  };

  const bio = (profile?.bio || "").trim();
  const availability = (profile?.availability || "").trim();

  const heightNum = Number(profile?.height);
  const heightLabel = Number.isFinite(heightNum) && heightNum > 0 ? `${heightNum} cm` : "";

  const bioShowToggle = bio.length > 0;
  const availShowToggle = availability.length > 40;

  const toggleBio = () => {
    if (!bio) return;
    setBioOpen((v) => !v);
  };

  const toggleAvail = () => {
    if (!availability) return;
    setAvailOpen((v) => !v);
  };

  const isInTextZone = (target) =>
    !!target?.closest?.(".swipeBio, .bioToggle, .swipeAvail, .availToggle, .reportBtn, .reportModal");

  // ✅ Navigation photos via TAP (gauche/droite)
  const handleTapMedia = (e) => {
    if (isInTextZone(e.target)) return;
    if (!hasPhotos) return;

    const now = Date.now();
    lastTapRef.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;

    if (isLeft) {
      if (index > 0) setIndex((i) => i - 1);
    } else {
      if (index < photos.length - 1) setIndex((i) => i + 1);
    }
  };

  const onClickCard = (e) => {
    if (!onOpen) return;
    if (isDragging) return; // 🔥 évite d'ouvrir le profil pendant un swipe
    if (isInTextZone(e.target)) return;

    const dt = Date.now() - (lastTapRef.current || 0);
    if (dt < 250) return;

    onOpen();
  };

  const overlayOpen = bioOpen || availOpen;

  const openReport = (e) => {
    e?.stopPropagation?.();
    if (!onReport) return;
    onReportOpen?.();
    setReportOpen(true);
  };

  const closeReport = () => {
    setReportOpen(false);
    onReportClose?.();
  };

  const submitReport = async () => {
    if (!onReport) return;
    const reason = (reportReason || "").trim();
    const details = (reportDetails || "").trim();
    if (!reason) return;

    await onReport({ reason, details });
    closeReport();
  };

  return (
    <article
      className="card swipeCard"
      style={{
        // Perf Android: éviter la sélection/scroll “parasite” pendant un drag
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTapHighlightColor: "transparent"
      }}
    >
      <div
        className={`cardMedia swipeMedia ${hasPhotos ? "has-photo" : "no-photo"}`}
        onClick={(e) => {
          if (isDragging) return;
          if (hasPhotos) handleTapMedia(e);
          else onClickCard(e);
        }}
        style={{
          ...(hasPhotos ? null : bgFallback),
          // Laisser SwipeDeck gérer le geste global. Ici on évite juste le scroll parasite.
          touchAction: "none",
          cursor: onOpen ? "pointer" : "default",
          position: "relative"
        }}
      >
        {/* ✅ Bouton signaler */}
        {typeof onReport === "function" ? (
          <button
            type="button"
            className="reportBtn"
            onClick={openReport}
            title="Signaler ce profil"
            aria-label="Signaler ce profil"
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 5,
              border: "none",
              borderRadius: 999,
              padding: "8px 10px",
              background: "rgba(0,0,0,.42)",
              color: "white",
              backdropFilter: reduceEffects || isAndroid ? "none" : "blur(8px)",
              WebkitBackdropFilter: reduceEffects || isAndroid ? "none" : "blur(8px)",
              cursor: "pointer"
            }}
          >
            🚩
          </button>
        ) : null}

        {hasPhotos && (
          <div
            className="photo-track"
            style={{
              transform: `translateX(-${index * 100}%)`,
              willChange: "transform"
            }}
          >
            {photos.map((src, i) => (
              <div key={src || i} className="photo-slide">
                <img
                  src={src}
                  alt=""
                  draggable="false"
                  loading="lazy"
                  decoding="async"
                  style={{ transform: "translateZ(0)" }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="swipeAvatar">{initial}</div>

        {photos.length > 1 && (
          <div className="photo-dots">
            {photos.map((_, i) => (
              <span key={i} className={`dot ${i === index ? "active" : ""}`} />
            ))}
          </div>
        )}

        <div className={`cardOverlay ${overlayOpen ? "bio-open" : ""}`} style={{ pointerEvents: isDragging ? "none" : "auto" }}>
          <div className="titleRow">
            <div className="h1">
              {profile?.name}
              {profile?.age ? `, ${profile.age}` : ""}
            </div>
            {profile?.city && <div className="sub">{profile.city}</div>}
          </div>

          {(profile?.sport || profile?.level || heightLabel) && (
            <div className="chips chips-oneLine">
              {profile?.sport && <span className="chip chip-accent">{profile.sport}</span>}
              {profile?.level && <span className="chip">{profile.level}</span>}
              {heightLabel && <span className="chip">📏 {heightLabel}</span>}
            </div>
          )}

          {availability && (
            <div className="availWrap">
              <div
                className={`swipeAvail ${availOpen ? "open" : "clamp"}`}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAvail();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggleAvail();
                }}
                title={availOpen ? "Clique pour réduire" : "Clique pour dérouler"}
              >
                📅 {availability}
              </div>

              {availShowToggle && (
                <button
                  type="button"
                  className="availToggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAvail();
                  }}
                >
                  {availOpen ? "Réduire" : "Voir +"}
                </button>
              )}
            </div>
          )}

          {bio && (
            <div className="bioWrap">
              <div
                className={`swipeBio ${bioOpen ? "open" : "clamp"}`}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBio();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggleBio();
                }}
                title={bioOpen ? "Clique pour réduire" : "Clique pour dérouler"}
              >
                {bio}
              </div>

              {bioShowToggle && (
                <button
                  type="button"
                  className="bioToggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBio();
                  }}
                >
                  {bioOpen ? "Réduire" : "Voir +"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ✅ Modal Signalement */}
        {reportOpen &&
          createPortal(
            <div
              className="reportModal"
              onMouseDown={(e) => {
                // ✅ ferme seulement si on clique sur le fond (pas sur la popup)
                if (e.target === e.currentTarget) closeReport();
              }}
              onTouchStart={(e) => {
                if (e.target === e.currentTarget) closeReport();
              }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                pointerEvents: "auto",
                touchAction: "auto",
                background: "rgba(0,0,0,.45)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                display: "grid",
                placeItems: "center",
                padding: 14
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="allowScroll"
                style={{
                  width: "min(620px, 92vw)",
                  touchAction: "auto",
                  pointerEvents: "auto",
                  maxHeight: "calc(var(--appH, 100vh) - 40px)",
                  overflow: "auto",
                  borderRadius: 20,
                  background: "rgba(20,20,20,.92)",
                  color: "white",
                  padding: 16,
                  boxShadow: "0 18px 50px rgba(0,0,0,.5)"
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>Signaler ce profil</div>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={closeReport}
                    style={{ marginLeft: "auto" }}
                  >
                    Fermer
                  </button>
                </div>

                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12, lineHeight: 1.35 }}>
                  {profile?.name ? (
                    <span>
                      Profil : <strong>{profile.name}</strong>
                    </span>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontSize: 13, opacity: 0.9 }}>Raison</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      padding: "10px 12px",
                      border: "1px solid rgba(255,255,255,.15)",
                      background: "rgba(0,0,0,.35)",
                      color: "white"
                    }}
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r} style={{ color: "#111", background: "#fff" }}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <label style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>Détails (optionnel)</label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={4}
                    placeholder="Explique brièvement ce qui pose problème…"
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      padding: "10px 12px",
                      border: "1px solid rgba(255,255,255,.15)",
                      background: "rgba(0,0,0,.35)",
                      color: "white",
                      resize: "vertical",
                      userSelect: "text",
                      WebkitUserSelect: "text"
                    }}
                  />

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                    <button type="button" className="btn-ghost" onClick={closeReport}>
                      Annuler
                    </button>
                    <button type="button" className="btn-primary" onClick={submitReport} disabled={!reportReason}>
                      Envoyer
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </article>
  );
}

// ✅ Memo: ne re-render pas la card quand le parent bouge pendant le drag
export const SwipeCard = React.memo(
  SwipeCardImpl,
  (prev, next) =>
    prev.profile?.id === next.profile?.id &&
    prev.reduceEffects === next.reduceEffects &&
    prev.onOpen === next.onOpen &&
    prev.onReport === next.onReport
);
