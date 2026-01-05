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
  const [filters, setFilters] = useState({ sport: "", level: "", city: "" });

  const [highlightNewProfile, setHighlightNewProfile] = useState(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState(null);

  const [user, setUser] = useState(null);

  // ✅ Mon profil (lié au compte)
  const [myProfile, setMyProfile] = useState(null); // row from DB mapped
  const [loadingMyProfile, setLoadingMyProfile] = useState(false);

  /* -------------------------------
     Auth session
  -------------------------------- */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(data?.session?.user ?? null);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  /* -------------------------------
     Fetch mon profil (lié à user_id)
  -------------------------------- */
  const fetchMyProfile = async () => {
    if (!user) {
      setMyProfile(null);
      return;
    }
    setLoadingMyProfile(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("fetchMyProfile error:", error);
      setMyProfile(null);
      setLoadingMyProfile(false);
      return;
    }

    if (!data) {
      setMyProfile(null);
      setLoadingMyProfile(false);
      return;
    }

    setMyProfile({
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      age: data.age ?? null,
      city: data.city,
      sport: data.sport,
      level: data.level,
      availability: data.availability || "",
      bio: data.bio || "",
      photo_urls: Array.isArray(data.photo_urls) ? data.photo_urls : [],
      isCustom: true,
      createdAt: data.created_at
    });

    setLoadingMyProfile(false);
  };

  useEffect(() => {
    fetchMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* -------------------------------
     Fetch tous les profils
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
      user_id: p.user_id ?? null,
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
     Upload photos -> URLs publiques
  -------------------------------- */
  const uploadProfilePhotos = async (profileId, files) => {
    const urls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = safeFileExt(file);
      const path = `profiles/${profileId}/${randomId()}-${i + 1}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

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
     SAVE profil : INSERT si pas existant, UPDATE sinon
     ✅ lié à user_id
     ✅ photos optionnelles en édition : si pas de nouvelles photos -> on garde l’existant
  -------------------------------- */
  const handleSaveProfile = async (data) => {
    const photos = Array.isArray(data.photos) ? data.photos : [];
    const hasNewPhotos = photos.length > 0;

    // Auth required
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user ?? null;

    if (!currentUser) {
      setIsAuthModalOpen(true);
      throw new Error("AUTH_REQUIRED");
    }

    // validations
    if (!data.name || !data.city || !data.sport || !data.level) {
      throw new Error("MISSING_FIELDS");
    }

    // ⚠️ si création (pas de profil existant), on exige au moins 1 photo
    if (!myProfile && !hasNewPhotos) {
      throw new Error("PHOTO_REQUIRED");
    }

    if (hasNewPhotos && photos.length > 5) throw new Error("MAX_5_PHOTOS");

    // 1) INSERT ou UPDATE du profil (sans photo_urls pour le moment)
    let profileId = myProfile?.id ?? null;

    if (!profileId) {
      // INSERT
      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({
          user_id: currentUser.id,
          name: data.name,
          age: data.age ?? null,
          city: data.city,
          sport: data.sport,
          level: data.level,
          availability: data.availability || "",
          bio: data.bio || ""
        })
        .select("*")
        .single();

      if (insertError) {
        console.error("insert profile error:", insertError);
        throw insertError;
      }

      profileId = inserted.id;
    } else {
      // UPDATE
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name: data.name,
          age: data.age ?? null,
          city: data.city,
          sport: data.sport,
          level: data.level,
          availability: data.availability || "",
          bio: data.bio || ""
        })
        .eq("id", profileId);

      if (updateError) {
        console.error("update profile error:", updateError);
        throw updateError;
      }
    }

    // 2) Photos : seulement si l’utilisateur a sélectionné des nouvelles
    if (hasNewPhotos) {
      const urls = await uploadProfilePhotos(profileId, photos);

      const { error: updatePhotosErr } = await supabase
        .from("profiles")
        .update({ photo_urls: urls })
        .eq("id", profileId);

      if (updatePhotosErr) {
        console.error("update photo_urls error:", updatePhotosErr);
        throw updatePhotosErr;
      }
    }

    // 3) refresh
    await fetchMyProfile();
    await fetchProfiles();
  };

  /* -------------------------------
     Filtres
  -------------------------------- */
  const handleFiltersChange = (partial) => setFilters((prev) => ({ ...prev, ...partial }));
  const handleResetFilters = () => setFilters({ sport: "", level: "", city: "" });

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // ne pas montrer mon propre profil
      if (user && p.user_id === user.id) return false;

      if (filters.sport) {
        if (filters.sport === "Autre") {
          if (STANDARD_SPORTS.includes(p.sport)) return false;
        } else if (p.sport !== filters.sport) return false;
      }
      if (filters.level && p.level !== filters.level) return false;
      if (filters.city && !p.city.toLowerCase().includes(filters.city.toLowerCase().trim())) {
        return false;
      }
      return true;
    });
  }, [profiles, filters, user]);

  /* -------------------------------
     Like (MVP local)
  -------------------------------- */
  const handleLike = () => {};

  const openProfileModal = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsProfileModalOpen(true);
  };

  return (
    <div className="app-root">
      <Header
        onOpenProfile={openProfileModal}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        user={user}
      />

      <main className="page">
        <div className="shell">
          <section className="card card-results">
            <FiltersBar filters={filters} onChange={handleFiltersChange} onReset={handleResetFilters} />

            {!user && (
              <p className="form-message" style={{ marginTop: 8 }}>
                Connecte-toi pour créer/éditer ton profil.
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
              <SwipeDeck profiles={filteredProfiles} onLikeProfile={handleLike} />
            )}
          </section>
        </div>
      </main>

      {/* ---------- MODALS ---------- */}
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
              <ProfileForm
                loadingExisting={loadingMyProfile}
                existingProfile={myProfile}
                onSaveProfile={handleSaveProfile}
              />
            </div>
          </div>
        </div>
      )}

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}

      <Footer />
    </div>
  );
}
