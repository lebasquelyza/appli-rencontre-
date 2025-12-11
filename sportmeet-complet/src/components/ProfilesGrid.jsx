import React, { useState } from "react";
import { ProfileCard } from "./ProfileCard";
import { MatchModal } from "./MatchModal";

export function ProfilesGrid({ profiles, highlightId }) {
  const [selectedProfile, setSelectedProfile] = useState(null);

  const handleContact = (profile) => {
    setSelectedProfile(profile);
  };

  const handleCloseModal = () => setSelectedProfile(null);

  return (
    <>
      {profiles.length === 0 ? (
        <p className="no-results">
          Aucun profil ne correspond à ta recherche pour le moment. Modifie les filtres
          ou crée ton propre profil à gauche.
        </p>
      ) : (
        <div className="profiles-list">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              highlight={highlightId === profile.id}
              onContact={() => handleContact(profile)}
            />
          ))}
        </div>
      )}

      {selectedProfile && (
        <MatchModal profile={selectedProfile} onClose={handleCloseModal} />
      )}
    </>
  );
}
