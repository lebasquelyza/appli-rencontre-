import React, { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProfileForm } from "./components/ProfileForm";
import { FiltersBar } from "./components/FiltersBar";
import { SwipeDeck } from "./components/SwipeDeck";
import { AuthModal } from "./components/AuthModal";
import { seedProfiles } from "./data/seedProfiles";

const LOCAL_STORAGE_KEY = "matchfit_profiles";

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

  const [matches, setMatches] = useState([]);
  const [highlightNewProfile, setHighlightNewProfile] = useState(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  /* -------------------------------
     Chargement profils (localStorage)
  -------------------------------- */
  useEffect(() => {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProfiles([...seedProfiles, ...parsed]);
      } catch {
        setProfiles(seedProfiles);
      }
    } else {
      setProfiles(seedProfiles);
    }
  }, []);

  useEffect(() => {
    const customProfiles = profiles.filter((p) => p.isCustom);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customProfiles));
  }, [profiles]);

  /* -------------------------------
     Création de profil
  -------------------------------- */
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

  /* -------------------------------
     Filtres
  -------------------------------- */
  const handleFiltersChange = (partial) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const handleResetFilters = () => {
    setFilters({ sport: "", level: "", city: "" });
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (filters.sport) {
        if (filters.sport === "Autre") {
          if (STANDARD_SPORTS.includes(p.sport)) return false;
        } else if (p.sport !== filters.sport) return false;
      }

      if (filters.level && p.level !== filters.level) return false;

      if (
        filters.city &&
        !p.city.toLowerCase().includes(filters.city.toLowerCase().trim())
      ) {
        return false;
      }

      return true;
    });
  }, [profiles, filters]);

  /* -------------------------------
     Match (like = match pour MVP)
  -------------------------------- */
  const handleMatch = (profile) => {
    setMatches((prev) => {
      if (prev.some((p) => p.id === profile.id)) return prev;
      return [profile, ...prev];
    });
  };

  return (
    <div className="app-root">
      <Header
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
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
              onLikeProfile={handleMatch}
              highlightId={highlightNewProfile}
            />

            {matches.length > 0 && (
              <div className="liked-list">
                <h3>Matchs</h3>
                <div className="liked-chips">
                  {matches.map((p) => (
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

      {/* ---------- MODALS ---------- */}

      {isProfileModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsProfileModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mon profil sportif</h3>
              <button className="btn-ghost" onClick={() => setIsProfileModalOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="modal-body">
              <ProfileForm onCreateProfile={handleCreateProfile} />
            </div>
          </div>
        </div>
      )}

      {isAuthModalOpen && (
        <AuthModal onClose={() => setIsAuthModalOpen(false)} />
      )}

      <Footer />
    </div>
  );
}
