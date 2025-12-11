import React, { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProfileForm } from "./components/ProfileForm";
import { FiltersBar } from "./components/FiltersBar";
import { SwipeDeck } from "./components/SwipeDeck";
import { seedProfiles } from "./data/seedProfiles";

const LOCAL_STORAGE_KEY = "sportmeet_profiles";

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [filters, setFilters] = useState({
    sport: "",
    level: "",
    city: "",
    search: ""
  });
  const [highlightNewProfile, setHighlightNewProfile] = useState(null);
  const [likedProfiles, setLikedProfiles] = useState([]);

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
      city: "",
      search: ""
    });
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (filters.sport && p.sport !== filters.sport) return false;
      if (filters.level && p.level !== filters.level) return false;
      if (filters.city && !p.city.toLowerCase().includes(filters.city.toLowerCase().trim()))
        return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const blob = `${p.name} ${p.city} ${p.sport} ${p.bio ?? ""} ${
          p.availability ?? ""
        }`.toLowerCase();
        if (!blob.includes(s)) return false;
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

  return (
    <div className="app-root">
      <Header />

      <main className="container main-layout">
        <section className="card card-form">
          <ProfileForm onCreateProfile={handleCreateProfile} />
        </section>

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
      </main>

      <Footer />
    </div>
  );
}

