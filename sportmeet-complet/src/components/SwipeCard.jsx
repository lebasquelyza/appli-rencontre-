// sportmeet-complet/src/components/SwipeCard.jsx
import React, { useEffect, useRef, useState } from "react";

function hashToHue(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

const REPORT_REASONS = [
  "Faux profil / arnaque",
  "Contenu inapproprié",
  "Harcèlement",
  "Mineur",
  "Spam",
  "Autre"
];

export function SwipeCard({ profile, onOpen, onReport }) {
  const photos = Array.isArray(profile?.photo_urls) ? profile.photo_urls : [];
  const hasPhotos = photos.length > 0;

  const [index, setIndex] = useState(0);

  // ✅ bio repliable
  const [bioOpen, setBioOpen] = useState(false);

  // ✅ dispo repliable (comme bio)
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

    // reset report modal
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

  // ✅ CHANGEMENT ICI :
  // Avant: const bioShowToggle = bio.length > 90;
  // Maintenant: si bio existe => afficher "Voir +"
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
    // évite que le tap déclenche un openZoom si tu doubles vite
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
    // si on a tap pour changer la photo, on ne doit pas ouvrir
    if (!onOpen) return;
    if (isInTextZone(e.target)) return;

    const dt = Date.now() - (lastTapRef.current || 0);
    if (dt < 250) return;

    onOpen();
  };

  const overlayOpen = bioOpen || availOpen;

  const openReport = (e) => {
    e?.stopPropagation?.();
    if (!onReport) return;
    setReportOpen(true);
  };

  const closeReport = () => {
    setReportOpen(false);
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
    <article className="card swipeCard">
      <div
        className={`cardMedia swipeMedia ${hasPhotos ? "has-photo" : "no-photo"}`}
        onClick={(e) => {
          // 1) si photos: tap = navigation
          // 2) sinon: click = open
          if (hasPhotos) handleTapMedia(e);
          else onClickCard(e);
        }}
        style={{
          ...(hasPhotos ? null : bgFallback),
          touchAction: "pan-y", // le swipe horizontal est géré par SwipeDeck
          cursor: onOpen ? "pointer" : "default",
          position: "relative"
        }}
      >
        {/* ✅ Bouton signaler (si onReport est fourni) */}
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
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              cursor: "pointer"
            }}
          >
            🚩
          </button>
        ) : null}

        {hasPhotos && (
          <div className="photo-track" style={{ transform: `translateX(-${index * 100}%)` }}>
            {photos.map((src, i) => (
              <div key={src || i} className="photo-slide">
                <img src={src} alt="" draggable="false" />
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

        <div className={`cardOverlay ${overlayOpen ? "bio-open" : ""}`}>
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

              {/* ✅ Toujours afficher si bio existe */}
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
        {reportOpen && (
          <div
            className="reportModal"
            onClick={(e) => {
              e.stopPropagation();
              closeReport();
            }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: "rgba(0,0,0,.55)",
              display: "grid",
              placeItems: "center",
              padding: 14
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(460px, 100%)",
                borderRadius: 16,
                background: "rgba(20,20,20,.92)",
                color: "white",
                padding: 14,
                boxShadow: "0 10px 30px rgba(0,0,0,.35)"
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 800 }}>Signaler ce profil</div>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={closeReport}
                  style={{ marginLeft: "auto" }}
                >
                  Fermer
                </button>
              </div>

              <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10, lineHeight: 1.35 }}>
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
                    background: "rgba(255,255,255,.06)",
                    color: "white"
                  }}
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r} style={{ color: "black" }}>
                      {r}
                    </option>
                  ))}
                </select>

                <label style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>Détails (optionnel)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  placeholder="Explique brièvement ce qui pose problème…"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,.15)",
                    background: "rgba(255,255,255,.06)",
                    color: "white",
                    resize: "vertical"
                  }}
                />

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                  <button type="button" className="btn-ghost" onClick={closeReport}>
                    Annuler
                  </button>
                  <button type="button" className="btn-primary" onClick={submitReport} disabled={!reportReason}>
                    Envoyer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
