import React from "react";

export function ProfileCard({ profile, highlight, onContact }) {
  const initial = profile.name?.[0]?.toUpperCase() ?? "S";
  const hasAvailability = Boolean(profile.availability && profile.availability.trim());

  return (
    <article className={`profile-card ${highlight ? "profile-highlight" : ""}`}>
      <div className="profile-header-line">
        <div className="profile-main-info">
          <div className="profile-avatar">{initial}</div>
          <div className="profile-name-age">
            <strong>
              {profile.name}
              {profile.age ? `, ${profile.age} ans` : ""}
            </strong>
            <span className="profile-city">{profile.city}</span>
          </div>
        </div>
        <div className="profile-badges">
          <span className="chip chip-accent">{profile.sport}</span>
          <span className="chip">{profile.level}</span>
        </div>
      </div>

      {profile.bio && (
        <p className="profile-bio">
          {profile.bio.length > 150 ? `${profile.bio.slice(0, 150)}…` : profile.bio}
        </p>
      )}

      {hasAvailability && (
        <p className="profile-availability">📅 {profile.availability}</p>
      )}

      <div className="profile-footer-line">
        <div className="profile-meta">
          <span>{profile.isCustom ? "Profil récent" : "Profil démo"}</span>
        </div>
        <button type="button" className="btn-ghost" onClick={onContact}>
          Contacter
        </button>
      </div>
    </article>
  );
}
