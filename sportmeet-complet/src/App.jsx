import React, { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProfileForm } from "./components/ProfileForm";
import { FiltersBar } from "./components/FiltersBar";
import { ProfilesGrid } from "./components/ProfilesGrid";
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

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (filters.sport && p.sport !== filters.sport) return false;
      if (filters.level && p.level !== filters.level) return false;
      if (filters.city && !p.city.toLowerCase().includes(filters.city.toLowerCase().trim()))
        return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const blob = `${p.name} ${p.city} ${p.sport} ${p.bio} ${p.availability}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [profiles, filters]);

  const handleResetFilters = () => {
    setFilters({
      sport: "",
      level: "",
      city: "",
      search: ""
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
          <FiltersBar filters={filters} onChange={handleFiltersChange} onReset={handleResetFilters} />
          <ProfilesGrid
            profiles={filteredProfiles}
            highlightId={highlightNewProfile}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
