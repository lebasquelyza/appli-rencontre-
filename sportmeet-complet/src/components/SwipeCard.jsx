// sportmeet-complet/src/components/SwipeCard.jsx
import React, { useEffect, useRef, useState } from "react";

function hashToHue(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function SwipeCard({ profile, disablePhotoSwipe = false }) {
  const photos = Array.isArray(profile?.photo_urls) ? profile.photo_urls : [];
  const hasPhotos = photos.length > 0;

  const [index, setIndex] = useState(0);
  const startX = useRef(null);

  // ✅ reset photo index quand on change de profil
  useEffect(() => {
    setIndex(0);
  }, [profile?.id]);

  const initial = profile?.name?.[0]?.toUpperCase() ?? "M";
  const hue = hashToHue(`${profile?.name}-${profile?.city}-${profile?.sport}`);

  const bgFallback = {
    background: `
      radial-gradient(900px 450px at 20% 20%, hsla(${hue}, 90%, 60%, .28), transparent 55%),
      radial-gradient(900px 450px at 80% 30%, hsla(${(hue + 40) % 360}, 90%, 60%, .20), transparent 60%),
      linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.25))
    `
  };

  const onTouchStart = (e) => {
    if (disablePhotoSwipe) return;
    startX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (disablePhotoSwipe) return;
    if (startX.current === null) return;

    const dx = e.changedTouches[0].clientX - startX.current;

    if (Math.abs(dx) > 50) {
      if (dx < 0 && index < photos.length - 1) setIndex((i) => i + 1);
      if (dx > 0 && index > 0) setIndex((i) => i - 1);
    }
    startX.current = null;
  };

  const isDemo = !!profile?.isDemo;

  return (
    <article className="card swipeCard">
      <div
        className={`cardMedia swipeMedia ${hasPhotos ? "has-photo" : "no-photo"}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={!hasPhotos ? bgFallback : undefined}
      >
        {/* ✅ Badge Démo */}
        {isDemo ? <div className="demo-badge">Démo</div> : null}

        {/* Photos (si dispo) */}
        {hasPhotos && (
          <div className="photo-track" style={{ transform: `translateX(-${index * 100}%)` }}>
            {photos.map((src, i) => (
              <div key={src || i} className="photo-slide">
                <img src={src} alt={`photo-${i + 1}`} draggable="false" />
              </div>
            ))}
          </div>
        )}

        <div className="swipeAvatar">{initial}</div>

        {/* Dots (si plusieurs photos) */}
        {photos.length > 1 && (
          <div className="photo-dots" aria-label="Photos du profil">
            {photos.map((_, i) => (
              <span key={i} className={`dot ${i === index ? "active" : ""}`} />
            ))}
          </div>
        )}

        <div className="cardOverlay">
          <div className="titleRow">
            <div className="h1">
              {profile?.name}
              {profile?.age ? `, ${profile.age}` : ""}
            </div>
            <div className="sub">{profile?.city}</div>
          </div>

          <div className="chips">
            <span className="chip chip-accent">{profile?.sport}</span>
            <span className="chip">{profile?.level}</span>
            {profile?.availability ? (
              <span className="chip chip-soft">📅 {profile.availability}</span>
            ) : null}
          </div>

          {profile?.bio ? (
            <div className="swipeBio">
              {profile.bio.length > 220 ? `${profile.bio.slice(0, 220)}…` : profile.bio}
            </div>
          ) : null}

          <div className="swipeFooter">
            <span className="profile-meta-tag">
              {isDemo ? "Profil de démonstration" : "Profil réel (créé ici)"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
