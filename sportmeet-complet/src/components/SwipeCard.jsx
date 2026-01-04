// sportmeet-complet/src/components/SwipeCard.jsx
import React from "react";

function hashToHue(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function SwipeCard({ profile }) {
  const initial = profile.name?.[0]?.toUpperCase() ?? "M";
  const hue = hashToHue(`${profile.name}-${profile.city}-${profile.sport}`);

  // ✅ Photo principale (upload Supabase)
  const mainPhoto = Array.isArray(profile.photo_urls) ? profile.photo_urls[0] : null;

  // ✅ Fond: photo si dispo, sinon ton gradient
  const bg = mainPhoto
    ? {
        backgroundImage: `url(${mainPhoto})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }
    : {
        background: `
          radial-gradient(900px 450px at 20% 20%, hsla(${hue}, 90%, 60%, .28), transparent 55%),
          radial-gradient(900px 450px at 80% 30%, hsla(${(hue + 40) % 360}, 90%, 60%, .20), transparent 60%),
          linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.25))
        `
      };

  return (
    <article className="card swipeCard">
      <div className="cardMedia swipeMedia" style={bg}>
        <div className="swipeAvatar">{initial}</div>

        <div className="cardOverlay">
          <div className="titleRow">
            <div className="h1">
              {profile.name}
              {profile.age ? `, ${profile.age}` : ""}
            </div>
            <div className="sub">{profile.city}</div>
          </div>

          <div className="chips">
            <span className="chip chip-accent">{profile.sport}</span>
            <span className="chip">{profile.level}</span>
            {profile.availability ? (
              <span className="chip chip-soft">📅 {profile.availability}</span>
            ) : null}
          </div>

          {profile.bio ? (
            <div className="swipeBio">
              {profile.bio.length > 220 ? `${profile.bio.slice(0, 220)}…` : profile.bio}
            </div>
          ) : null}

          <div className="swipeFooter">
            <span className="profile-meta-tag">
              {profile.isCustom ? "Profil réel (créé ici)" : "Profil de démonstration"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
