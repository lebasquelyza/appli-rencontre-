import React from "react";

export function SwipeCard({ profile }) {
  const initial = profile.name?.[0]?.toUpperCase() ?? "S";

  return (
    <article className="swipe-card-big">
      <div className="swipe-card-header">
        <div className="swipe-card-avatar">{initial}</div>
        <div className="swipe-card-main">
          <h3>
            {profile.name}
            {profile.age ? `, ${profile.age} ans` : ""}
          </h3>
          <p className="swipe-card-city">{profile.city}</p>
        </div>
        <div className="swipe-card-badges">
          <span className="chip chip-accent">{profile.sport}</span>
          <span className="chip">{profile.level}</span>
        </div>
      </div>

      {profile.bio && (
        <p className="swipe-card-bio">
          {profile.bio.length > 220 ? `${profile.bio.slice(0, 220)}…` : profile.bio}
        </p>
      )}

      {profile.availability && (
        <p className="swipe-card-availability">📅 {profile.availability}</p>
      )}

      <div className="swipe-card-footer">
        <span className="profile-meta-tag">
          {profile.isCustom ? "Profil réel (créé ici)" : "Profil de démonstration"}
        </span>
      </div>
    </article>
  );
}
