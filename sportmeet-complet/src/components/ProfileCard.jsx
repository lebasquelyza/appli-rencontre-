// sportmeet-complet/src/components/ProfileCard.jsx
import React from "react";

export function ProfileCard({ profile, highlight, onContact }) {
  const initial = profile.name?.[0]?.toUpperCase() ?? "S";
  const hasAvailability = Boolean(profile.availability && profile.availability.trim());

  // Si tu as une photo dans ton profil, on l'utilise (sinon on reste en "no-photo")
  const photoUrl =
    profile.photoUrl ||
    profile.photo ||
    (Array.isArray(profile.photos) ? profile.photos?.[0] : null);

  const mediaStyle = photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined;

  return (
    <article
      className={[
        "profile-card",
        "card",
        "profile-swipeCard",
        photoUrl ? "has-photo" : "no-photo",
        highlight ? "profile-highlight" : "",
      ].join(" ")}
    >
      {/* Zone "photo" / background */}
      <div className="profile-media" style={mediaStyle} />

      {/* Avatar initial en haut à gauche (comme tes captures) */}
      <div className="profile-avatar-float">{initial}</div>

      {/* Overlay bottom (nom, tags, bio...) */}
      <div className="profile-overlay">
        <div className="profile-titleRow">
          <div className="profile-titleCol">
            <div className="profile-h1">
              {profile.name}
              {profile.age ? `, ${profile.age}` : ""}
            </div>
            <div className="profile-sub">{profile.city}</div>
          </div>

          <div className="profile-badges">
            <span className="chip chip-accent">{profile.sport}</span>
            <span className="chip">{profile.level}</span>
          </div>
        </div>

        {(profile.bio || hasAvailability) && (
          <div className="profile-bioWrap">
            {profile.bio && (
              // IMPORTANT : on ne coupe plus en JS => c'est le CSS qui clamp/scroll
              <p className="profile-bio clamp">{profile.bio}</p>
            )}

            {hasAvailability && (
              <p className="profile-availability">📅 {profile.availability}</p>
            )}
          </div>
        )}

        <div className="profile-footer">
          <div className="profile-meta">
            <span>{profile.isCustom ? "Profil récent" : "Profil démo"}</span>
          </div>

          <button type="button" className="btn-ghost" onClick={onContact}>
            Contacter
          </button>
        </div>
      </div>
    </article>
  );
}
