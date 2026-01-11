// sportmeet-complet/src/components/ProfileCard.jsx
import React from "react";

export function ProfileCard({ profile, highlight, onContact }) {
  const initial = profile.name?.[0]?.toUpperCase() ?? "S";

  const availabilityText = (profile.availability ?? "").trim();
  const hasAvailability = Boolean(availabilityText);

  // Photo si dispo
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
      <div className="profile-media" style={mediaStyle} />

      <div className="profile-avatar-float">{initial}</div>

      <div className="profile-overlay">
        <div className="profile-titleRow">
          <div className="profile-titleCol">
            <div className="profile-h1">
              {profile.name}
              {profile.age ? `, ${profile.age}` : ""}
            </div>
            <div className="profile-sub">{profile.city}</div>
          </div>

          {/* ✅ Chips sport + niveau */}
          <div className="profile-badges chips">
            <span className="chip chip-accent">{profile.sport}</span>
            <span className="chip">{profile.level}</span>
          </div>
        </div>

        {(profile.bio || hasAvailability) && (
          <div className="profile-bioWrap">
            {profile.bio && (
              <p className="profile-bio clamp">{profile.bio}</p>
            )}

            {/* ✅ Dispos en dessous = jamais coupées comme une chip */}
            {hasAvailability && (
              <p className="profile-availability clamp-2" title={availabilityText}>
                📅 {availabilityText}
              </p>
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
