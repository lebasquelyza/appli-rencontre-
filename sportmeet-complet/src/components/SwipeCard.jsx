// sportmeet-complet/src/components/SwipeCard.jsx
import React, { useEffect, useRef, useState } from "react";

function hashToHue(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function SwipeCard({ profile }) {
  const photos = Array.isArray(profile?.photo_urls) ? profile.photo_urls : [];
  const hasPhotos = photos.length > 0;

  const [index, setIndex] = useState(0);

  // ✅ bio repliable
  const [bioOpen, setBioOpen] = useState(false);

  // ✅ dispo repliable (comme bio)
  const [availOpen, setAvailOpen] = useState(false);

  const startX = useRef(null);

  useEffect(() => {
    setIndex(0);
    setBioOpen(false);
    setAvailOpen(false);
  }, [profile?.id]);

  // ✅ évite un index hors limite si la liste de photos change
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

  // ✅ taille (cm) => chip uniquement
  const heightNum = Number(profile?.height);
  const heightLabel = Number.isFinite(heightNum) && heightNum > 0 ? `${heightNum} cm` : "";

  // ✅ seuils (évite “coupé sans bouton”)
  const bioShowToggle = bio.length > 90;
  const availShowToggle = availability.length > 40;

  const toggleBio = () => {
    if (!bio) return;
    setBioOpen((v) => !v);
  };

  const toggleAvail = () => {
    if (!availability) return;
    setAvailOpen((v) => !v);
  };

  // ✅ si on touche bio/dispo => pas de swipe photo
  const isInTextZone = (target) =>
    !!target?.closest?.(".swipeBio, .bioToggle, .swipeAvail, .availToggle");

  const onTouchStart = (e) => {
    if (isInTextZone(e.target)) return;
    startX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (isInTextZone(e.target)) return;
    if (startX.current == null) return;

    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && index < photos.length - 1) setIndex((i) => i + 1);
      if (dx > 0 && index > 0) setIndex((i) => i - 1);
    }
    startX.current = null;
  };

  // ✅ si bio OU dispo open => on agrandit l’overlay (déroule vers le haut)
  const overlayOpen = bioOpen || availOpen;

  return (
    <article className="card swipeCard">
      <div
        className={`cardMedia swipeMedia ${hasPhotos ? "has-photo" : "no-photo"}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          ...(hasPhotos ? null : bgFallback),
          touchAction: "pan-y"
        }}
      >
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

          {/* ✅ chips: SPORT + NIVEAU + TAILLE */}
          {(profile?.sport || profile?.level || heightLabel) && (
            <div className="chips chips-oneLine">
              {profile?.sport && <span className="chip chip-accent">{profile.sport}</span>}
              {profile?.level && <span className="chip">{profile.level}</span>}
              {heightLabel && <span className="chip">📏 {heightLabel}</span>}
            </div>
          )}

          {/* ✅ DISPO repliable (comme bio) */}
          {availability && (
            <div className="availWrap">
              <div
                className={`swipeAvail ${availOpen ? "open" : "clamp"}`}
                role="button"
                tabIndex={0}
                onClick={toggleAvail}
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

          {/* ✅ BIO repliable */}
          {bio && (
            <div className="bioWrap">
              <div
                className={`swipeBio ${bioOpen ? "open" : "clamp"}`}
                role="button"
                tabIndex={0}
                onClick={toggleBio}
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
      </div>
    </article>
  );
}
