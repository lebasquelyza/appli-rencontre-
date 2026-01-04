import React, { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProfileForm } from "./components/ProfileForm";
import { FiltersBar } from "./components/FiltersBar";
import { SwipeDeck } from "./components/SwipeDeck";
import { AuthModal } from "./components/AuthModal";
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
      photo_urls: Array.isArray(p.photo_urls) ? p.photo_urls : [],
      isCustom: true,
      createdAt: p.created_at
    }));

    setProfiles(mapped.length ? mapped : seedProfiles);
    setLoadingProfiles(false);
  };

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------
     Upload photos (Storage) + URLs publiques
  -------------------------------- */
  const uploadProfilePhotos = async (profileId, files) => {
    const urls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = safeFileExt(file);
      const path = `profiles/${profileId}/${randomId()}-${i + 1}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (data?.publicUrl) urls.push(data.publicUrl);
    }

    return urls;
  };

  /* -------------------------------
     Création de profil => INSERT Supabase + photos
  -------------------------------- */
  const handleCreateProfile = async (data) => {
    const photos = Array.isArray(data.photos) ? data.photos : [];

    if (photos.length < 1) throw new Error("PHOTO_REQUIRED");
    if (photos.length > 5) throw new Error("MAX_5_PHOTOS");

    const optimisticId = `user-${Date.now()}`;

    const optimisticProfile = {
      id: optimisticId,
      name: data.name,
      age: data.age ?? null,
      city: data.city,
      sport: data.sport,
      level: data.level,
      availability: data.availability || "",
      bio: data.bio || "",
      photo_urls: [],
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    setProfiles((prev) => [optimisticProfile, ...prev]);
    setHighlightNewProfile(optimisticId);
    setTimeout(() => setHighlightNewProfile(null), 3000);

    // 1) Insert profil (récupérer l'id réel)
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        name: data.name,
        age: data.age ?? null,
        city: data.city,
        sport: data.sport,
        level: data.level,
        availability: data.availability || "",
        bio: data.bio || ""
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      setProfiles((prev) => prev.filter((p) => p.id !== optimisticId));
      throw insertError;
    }

    const profileId = inserted.id;

    try {
      // 2) Upload photos
      const urls = await uploadProfilePhotos(profileId, photos);

      // 3) Update profil avec photo_urls
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ photo_urls: urls })
        .eq("id", profileId);

      if (updateError) {
        console.error("Supabase update photo_urls error:", updateError);
        throw updateError;
      }
    } catch (err) {
      await supabase.from("profiles").delete().eq("id", profileId);
      setProfiles((prev) => prev.filter((p) => p.id !== optimisticId));
      throw err;
    }

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

      {/* ✅ MODAL PROFIL : plein écran mobile + scroll interne */}
      {isProfileModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsProfileModalOpen(false)}>
          <div className="modal-card modal-card--sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mon profil sportif</h3>
              <button className="btn-ghost" onClick={() => setIsProfileModalOpen(false)}>
                Fermer
              </button>
            </div>

            <div className="modal-body modal-body--scroll">
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
