// sportmeet-complet/src/App.jsx
import React, { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProfileForm } from "./components/ProfileForm";
import { FiltersBar } from "./components/FiltersBar";
import { SwipeDeck } from "./components/SwipeDeck";
import { AuthModal } from "./components/AuthModal";
import { CrushesPage } from "./components/CrushesPage";
import { seedProfiles } from "./data/seedProfiles";
import { supabase } from "./lib/supabase";

const BUCKET = "profile-photos";

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

function safeFileExt(file) {
  const byMime = (file.type || "").split("/")[1];
  if (byMime) return byMime.replace("jpeg", "jpg");
  const byName = (file.name || "").split(".").pop();
  return (byName || "jpg").toLowerCase();
}

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);

  const [filters, setFilters] = useState({
    sport: "",
    level: "",
    city: "",
    radiusKm: 0,
    myLocation: null
  });

  const [view, setView] = useState("home"); // home | crushes | settings

  const [user, setUser] = useState(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileDirty, setIsProfileDirty] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState("signin");

  const [myProfile, setMyProfile] = useState(null);
  const [loadingMyProfile, setLoadingMyProfile] = useState(false);

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState(null);

  /* -------------------------------
     Auth
  -------------------------------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub?.subscription?.unsubscribe();
  }, []);

  const openAuth = (mode = "signin") => {
    setAuthInitialMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  /* -------------------------------
     Fetch profiles (mock ici)
  -------------------------------- */
  useEffect(() => {
    setProfiles(seedProfiles);
    setFilteredProfiles(seedProfiles);
  }, []);

  /* -------------------------------
     Navigation
  -------------------------------- */
  const openProfileModal = () => {
    if (!user) {
      openAuth("signin");
      return;
    }
    setIsProfileModalOpen(true);
  };

  const closeProfileAndGoHome = () => {
    if (isProfileDirty) {
      const ok = window.confirm(
        "Tu as des modifications non enregistrées.\n\nQuitter sans enregistrer ?"
      );
      if (!ok) return;
    }

    setIsProfileModalOpen(false);
    setIsProfileDirty(false);
    setView("home");
  };

  const openCrushes = () => {
    if (!user) {
      openAuth("signin");
      return;
    }
    setView("crushes");
  };

  const openSettings = () => {
    if (!user) {
      openAuth("signin");
      return;
    }
    setView("settings");
  };

  /* -------------------------------
     Render
  -------------------------------- */
  return (
    <div className="app-root">
      <Header
        user={user}
        onOpenProfile={openProfileModal}
        onOpenCrushes={openCrushes}
        onOpenSettings={openSettings}
        onOpenAuth={openAuth}
        onLogout={handleLogout}
      />

      <main className="page">
        <div className="shell">
          {view === "crushes" ? (
            <CrushesPage onBack={() => setView("home")} />
          ) : view === "settings" ? (
            <section className="card" style={{ padding: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <h2 style={{ margin: 0 }}>Réglages</h2>
                <button className="btn-ghost btn-sm" onClick={() => setView("home")}>
                  Retour
                </button>
              </div>
              <p style={{ marginTop: 12, opacity: 0.8 }}>
                Bientôt ici : notifications, confidentialité, compte premium…
              </p>
            </section>
          ) : (
            <section className="card card-results">
              <FiltersBar
                filters={filters}
                onChange={(p) => setFilters((f) => ({ ...f, ...p }))}
                onReset={() =>
                  setFilters({ sport: "", level: "", city: "", radiusKm: 0, myLocation: null })
                }
              />

              {!user && (
                <p className="form-message" style={{ marginTop: 8 }}>
                  Connecte-toi pour créer/éditer ton profil et swiper.
                </p>
              )}

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
                  onLikeProfile={() => {}}
                  isAuthenticated={!!user}
                  onRequireAuth={() => openAuth("signin")}
                />
              )}
            </section>
          )}
        </div>
      </main>

      {/* ---------- MODALE PROFIL ---------- */}
      {isProfileModalOpen && (
        <div className="modal-backdrop" onClick={closeProfileAndGoHome}>
          <div className="modal-card modal-card--sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mon profil sportif</h3>
              <button className="btn-ghost" onClick={closeProfileAndGoHome}>
                Retour
              </button>
            </div>

            <div className="modal-body modal-body--scroll">
              <ProfileForm
                loadingExisting={loadingMyProfile}
                existingProfile={myProfile}
                onSaveProfile={() => {}}
                onDirtyChange={setIsProfileDirty}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------- MODALE AUTH ---------- */}
      {isAuthModalOpen && (
        <AuthModal
          initialMode={authInitialMode}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      <Footer />
    </div>
  );
}
