import React, { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProfileForm } from "./components/ProfileForm";
import { FiltersBar } from "./components/FiltersBar";
import { SwipeDeck } from "./components/SwipeDeck";
import { AuthModal } from "./components/AuthModal";
import { seedProfiles } from "./data/seedProfiles";
import { supabase } from "./lib/supabase";

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

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState(null);

  /* -------------------------------
     Supabase = source principale
  -------------------------------- */
  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    setProfilesError(null);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch profiles error:", error);
      setProfilesError("Impossible de charger les profils pour le moment.");
      // Fallback : seedProfiles (optionnel)
      setProfiles(seedProfiles);
      setLoadingProfiles(false);
      return;
    }

    const mapped = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age ?? null,
      city: p.city,
      sport: p.sport,
      level: p.level,
      availability: p.availability || "",
      bio: p.bio || "",
      isCustom: true,
      createdAt: p.created_at
    }));

    // Si base vide : fallback sur seed (optionnel)
    setProfiles(mapped.length ? mapped : seedProfiles);
    setLoadingProfiles(false);
  };

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------
     Création de profil => INSERT Supabase
  -------------------------------- */
  const handleCreateProfile = async (data) => {
    // On garde ton highlight logique, mais l'id final sera celui de Supabase
    const optimisticId = `user-${Date.now()}`;

    // Optimistic UI (optionnel mais agréable) :
    const optimisticProfile = {
      id: optimisticId,
      ...data,
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    setProfiles((prev) => [optimisticProfile, ...prev]);
    setHighlightNewProfile(optimisticId);
    setTimeout(() => setHighlightNewProfile(null), 3000);

    const { error } = await supabase.from("profiles").insert({
      name: data.name,
      age: data.age ?? null,
      city: data.city,
      sport: data.sport,
      level: data.level,
      availability: data.availability || "",
      bio: data.bio || ""
    });

    if (error) {
      console.error("Supabase insert error:", error);
      // On retire l’optimistic si insert fail
      setProfiles((prev) => prev.filter((p) => p.id !== optimisticId));
      throw error;
    }

    // Recharge depuis Supabase pour avoir l’ID réel + ordre propre
    await fetchProfiles();
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

            {profilesError && (
              <p className="form-message error" style={{ marginTop: 8 }}>
                {profilesError}
              </p>
            )}

            {loadingProfiles ? (
              <p className="form-message">Chargement des profils…</p>
            ) : (
              <SwipeDeck
                profiles={filteredProfiles}
                onLikeProfile={handleMatch}
                highlightId={highlightNewProfile}
              />
            )}

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

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}

      <Footer />
    </div>
  );
}
