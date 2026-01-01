import React, { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProfileForm } from "./components/ProfileForm";
import { FiltersBar } from "./components/FiltersBar";
import { SwipeDeck } from "./components/SwipeDeck";
import { seedProfiles } from "./data/seedProfiles";

const LOCAL_STORAGE_KEY = "sportmeet_profiles";

// liste des sports standards utilisés dans les filtres
const STANDARD_SPORTS = [
  "Running",
  "Fitness",
  "Football",
  "Basket",
  "Tennis",
  "Cyclisme",
  "Randonnée",
  "Natation",
  "Musculation"
];

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [filters, setFilters] = useState({
    sport: "",
    level: "",
    city: ""
  });
  const [highlightNewProfile, setHighlightNewProfile] = useState(null);
  const [likedProfiles, setLikedProfiles] = useState([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Chargement initial : profils démo + profils custom (localStorage)
  useEffect(() => {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProfiles([...seedProfiles, ...parsed]);
      } catch (e) {
        console.error("Erreur de parsing localStorage", e);
        setProfiles(seedProfiles);
      }
    } else {
      setProfiles(seedProfiles);
    }
  }, []);

  // Sauvegarde des profils créés par l’utilisateur
  useEffect(() => {
    const customProfiles = profiles.filter((p) => p.isCustom);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customProfiles));
  }, [profiles]);

  const handleCreateProfile = (data) => {
    const id = `user-${Date.now()}`;
    const newProfile = {
      id,
      ...data,
      isCustom: true,
      createdAt: new Date().toISOString()
    };
    setProfiles((prev) => [newProfile, ...prev]);
    setHighlightNewProfile(id);
    setTimeout(() => setHighlightNewProfile(null), 3000);
  };

  const handleFiltersChange = (partial) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const handleResetFilters = () => {
    setFilters({
      sport: "",
      level: "",
      city: ""
    });
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Filtre sport
      if (filters.sport) {
        if (filters.sport === "Autre") {
          // "Autre sport" = on garde les profils dont le sport n'est pas dans la liste standard
          if (STANDARD_SPORTS.includes(p.sport)) return false;
        } else {
          if (p.sport !== filters.sport) return false;
        }
      }

      // Filtre niveau
      if (filters.level && p.level !== filters.level) return false;

      // Filtre ville
      if (
        filters.city &&
        !p.city.toLowerCase().includes(filters.city.toLowerCase().trim())
      ) {
        return false;
      }

      return true;
    });
  }, [profiles, filters]);

  const handleLikeProfile = (profile) => {
    setLikedProfiles((prev) => {
      if (prev.some((p) => p.id === profile.id)) return prev;
      return [profile, ...prev];
    });
  };

  const openProfileModal = () => setIsProfileModalOpen(true);
  const closeProfileModal = () => setIsProfileModalOpen(false);

  return (
    <div className="app-root">
      <Header
        onOpenProfile={openProfileModal}
        onOpenAuth={null} // à connecter plus tard à une vraie page d'auth
      />

      <main className="page">
        <div className="shell">
          <section className="card card-results">
            <FiltersBar
              filters={filters}
              onChange={handleFiltersChange}
              onReset={handleResetFilters}
            />

            <SwipeDeck
              profiles={filteredProfiles}
              onLikeProfile={handleLikeProfile}
              highlightId={highlightNewProfile}
            />

            {likedProfiles.length > 0 && (
              <div className="liked-list">
                <h3>Profils que tu as likés</h3>
                <div className="liked-chips">
                  {likedProfiles.map((p) => (
                    <span key={p.id} className="chip">
                      {p.name} · {p.sport} · {p.city}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Modal "Mon profil" avec le formulaire */}
      {isProfileModalOpen && (
        <div className="modal-backdrop" onClick={closeProfileModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mon profil sportif</h3>
              <button type="button" className="btn-ghost" onClick={closeProfileModal}>
                Fermer
              </button>
            </div>
            <div className="modal-body">
              <ProfileForm onCreateProfile={handleCreateProfile} />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
