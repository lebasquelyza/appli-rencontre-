// sportmeet-complet/src/components/SwipeCard.jsx
import React, { useEffect, useRef, useState } from "react";

function hashToHue(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function SwipeCard({ profile }) {
  const photos = Array.isArray(profile?.photo_urls) ? profile.photo_urls : [];
  const hasPhotos = photos.length > 0;

  const [index, setIndex] = useState(0);
  const startX = useRef(null);

  const [bioOpen, setBioOpen] = useState(false);

  useEffect(() => {
    setIndex(0);
    setBioOpen(false);
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
    startX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;

    if (Math.abs(dx) > 50) {
      if (dx < 0 && index < photos.length - 1) setIndex((i) => i + 1);
      if (dx > 0 && index > 0) setIndex((i) => i - 1);
    }
    startX.current = null;
  };

  const city = (profile?.city || "").trim();
  const sport = (profile?.sport || "").trim();
  const level = (profile?.level || "").trim();
  const bio = (profile?.bio || "").trim();

  const bioIsLong = bio.length > 220;

  return (
    <article className="card swipeCard">
      <div
        className={`cardMedia swipeMedia ${hasPhotos ? "has-photo" : "no-photo"}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={!hasPhotos ? bgFallback : undefined}
      >
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
            {city ? <div className="sub">{city}</div> : null}
          </div>

          {(sport || level || profile?.availability) && (
            <div className="chips">
              {sport ? <span className="chip chip-accent">{sport}</span> : null}
              {level ? <span className="chip">{level}</span> : null}
              {profile?.availability ? (
                <span className="chip chip-soft">📅 {profile.availability}</span>
              ) : null}
            </div>
          )}

          {bio ? (
            <div className="bioWrap">
              <div className={`swipeBio ${bioOpen ? "open" : "clamp"}`}>{bio}</div>

              {bioIsLong ? (
                <button
                  type="button"
                  className="bioToggle"
                  onClick={() => setBioOpen((v) => !v)}
                >
                  {bioOpen ? "Réduire" : "Voir +"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
