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
  const [bioOpen, setBioOpen] = useState(false);
  const startX = useRef(null);

  useEffect(() => {
    setIndex(0);
    setBioOpen(false);
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

  // ✅ IMPORTANT: on considère que toute la bio est une zone "interactive"
  // => pas de swipe photo quand on touche la bio
  const isInBio = (target) => !!target?.closest?.(".swipeBio, .bioToggle");

  const onTouchStart = (e) => {
    if (isInBio(e.target)) return;
    startX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (isInBio(e.target)) return;
    if (startX.current == null) return;

    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && index < photos.length - 1) setIndex((i) => i + 1);
      if (dx > 0 && index > 0) setIndex((i) => i - 1);
    }
    startX.current = null;
  };

  const bio = (profile?.bio || "").trim();
  const bioIsLong = bio.length > 160; // un peu plus sensible que 220

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

        {/* ✅ quand bioOpen => l’overlay monte (via CSS .bio-open) */}
        <div className={`cardOverlay ${bioOpen ? "bio-open" : ""}`}>
          <div className="titleRow">
            <div className="h1">
              {profile?.name}
              {profile?.age ? `, ${profile.age}` : ""}
            </div>
            {profile?.city && <div className="sub">{profile.city}</div>}
          </div>

          {(profile?.sport || profile?.level || profile?.availability) && (
            <div className="chips chips-oneLine">
              {profile?.sport && <span className="chip chip-accent">{profile.sport}</span>}
              {profile?.level && <span className="chip">{profile.level}</span>}
              {profile?.availability && (
                <span className="chip chip-soft">📅 {profile.availability}</span>
              )}
            </div>
          )}

          {bio && (
            <div className="bioWrap">
              {/* ✅ clic sur la bio = ouvre/ferme */}
              <div
                className={`swipeBio ${bioOpen ? "open" : "clamp"}`}
                role={bioIsLong ? "button" : undefined}
                tabIndex={bioIsLong ? 0 : undefined}
                onClick={() => {
                  if (!bioIsLong) return;
                  setBioOpen((v) => !v);
                }}
                onKeyDown={(e) => {
                  if (!bioIsLong) return;
                  if (e.key === "Enter" || e.key === " ") setBioOpen((v) => !v);
                }}
                title={bioIsLong ? "Clique pour dérouler" : undefined}
              >
                {bio}
              </div>

              {/* ✅ optionnel: garde le bouton "Voir +" si tu veux */}
              {bioIsLong && (
                <button
                  type="button"
                  className="bioToggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBioOpen((v) => !v);
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

