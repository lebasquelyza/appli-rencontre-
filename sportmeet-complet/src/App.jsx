// sportmeet-complet/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProfileForm } from "./components/ProfileForm";
import { FiltersBar } from "./components/FiltersBar";
import { SwipeDeck } from "./components/SwipeDeck";
import { AuthModal } from "./components/AuthModal";
import { CrushesPage } from "./components/CrushesPage";
import { seedProfiles } from "./data/seedProfiles";
import { supabase } from "./lib/supabase";

// ✅ Pages légales
import { Terms } from "./pages/Terms";
import { Cookies } from "./pages/Cookies";

// ✅ Page Réglages
import { Settings } from "./pages/Settings";

// ✅ Page Configurer compte
import { AccountSettings } from "./pages/AccountSettings";

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

// ✅ Convertit une publicUrl Supabase en "path" storage (bucket relatif)
function storagePathFromPublicUrl(publicUrl) {
  try {
    const u = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

// ✅ distance km
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

// ✅ garde un seul profil par user_id (le plus récent)
function dedupeByUserLatest(list) {
  const byUser = new Map();
  const noUser = [];

  for (const p of list) {
    if (!p.user_id) {
      noUser.push(p);
      continue;
    }

    const prev = byUser.get(p.user_id);
    if (!prev) {
      byUser.set(p.user_id, p);
      continue;
    }

    const prevTime = new Date(prev.createdAt).getTime();
    const curTime = new Date(p.createdAt).getTime();
    if (curTime >= prevTime) byUser.set(p.user_id, p);
  }

  return [...byUser.values(), ...noUser];
}

function HomePage({
  filters,
  onFiltersChange,
  onResetFilters,
  profilesError,
  loadingProfiles,
  filteredProfiles,
  handleLike,
  user,
  loadingMyProfile,
  myProfile,
  handleSaveProfile,
  isProfileModalOpen,
  setIsProfileModalOpen,
  isAuthModalOpen,
  setIsAuthModalOpen,
  profileToast,
  setProfileToast
}) {
  return (
    <>
      <main className="page">
        <div className="shell">
          <section className="card card-results">
            <FiltersBar filters={filters} onChange={onFiltersChange} onReset={onResetFilters} />

            {/* ✅ message après création / modification */}
            {profileToast ? (
              <p className="form-message" style={{ marginTop: 8 }}>
                {profileToast}{" "}
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setProfileToast("")}
                  style={{ marginLeft: 8 }}
                >
                  OK
                </button>
              </p>
            ) : null}

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
                onLikeProfile={handleLike}
                isAuthenticated={!!user}
                onRequireAuth={() => setIsAuthModalOpen(true)}
              />
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
    </>
  );
}

function CrushesFullPage({ user, onRequireAuth }) {
  const navigate = useNavigate();

  // si pas connecté -> ouvrir auth + retourner à l’accueil
  useEffect(() => {
    if (!user) {
      onRequireAuth?.();
      navigate("/", { replace: true });
    }
  }, [user, onRequireAuth, navigate]);

  return (
    <main className="page">
      <div className="shell">
        <CrushesPage crushes={[]} onBack={() => navigate("/")} />
      </div>
    </main>
  );
}

export default function App() {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);

  // ✅ Ajout radiusKm + myLocation
  const [filters, setFilters] = useState({
    sport: "",
    level: "",
    city: "",
    radiusKm: 0,
    myLocation: null // {lat, lon}
  });

  const [highlightNewProfile, setHighlightNewProfile] = useState(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState(null);

  const [user, setUser] = useState(null);

  // ✅ Mon profil (lié au compte)
  const [myProfile, setMyProfile] = useState(null); // row from DB mapped
  const [loadingMyProfile, setLoadingMyProfile] = useState(false);

  // ✅ liste filtrée (pour filtre distance async)
  const [filteredProfiles, setFilteredProfiles] = useState([]);

  // ✅ cache géocodage ville -> coords
  const [geoCache] = useState(() => new Map());

  // ✅ message profil créé / modifié
  const [profileToast, setProfileToast] = useState("");

  async function geocodeCity(cityText) {
    const city = (cityText || "").trim().toLowerCase();
    if (!city) return null;

    if (geoCache.has(city)) return geoCache.get(city);

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fr&q=${encodeURIComponent(
      city
    )}`;

    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        geoCache.set(city, null);
        return null;
      }

      const data = await res.json();
      const first = data?.[0];
      const coords = first ? { lat: Number(first.lat), lon: Number(first.lon) } : null;

      geoCache.set(city, coords);
      return coords;
    } catch (e) {
      console.error("geocodeCity error:", e);
      geoCache.set(city, null);
      return null;
    }
  }

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
     LOGOUT
  -------------------------------- */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMyProfile(null);
    setIsProfileModalOpen(false);
    navigate("/", { replace: true });
  };

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
      gender: data.gender ?? null,
      status: data.status ?? "active",
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
      gender: p.gender ?? null,
      status: p.status ?? "active",
      city: p.city,
      sport: p.sport,
      level: p.level,
      availability: p.availability || "",
      bio: p.bio || "",
      photo_urls: Array.isArray(p.photo_urls) ? p.photo_urls : [],
      isCustom: true,
      createdAt: p.created_at
    }));

    const deduped = dedupeByUserLatest(mapped);
    setProfiles(deduped.length ? deduped : seedProfiles);
    setLoadingProfiles(false);
  };

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------
     Realtime: met à jour la liste chez tous les clients
  -------------------------------- */
  useEffect(() => {
    const channel = supabase
      .channel("profiles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchProfiles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
     Delete photos from Supabase Storage (best-effort)
  -------------------------------- */
  const deleteProfilePhotosFromStorage = async (publicUrls) => {
    const paths = (publicUrls || []).map(storagePathFromPublicUrl).filter(Boolean);

    if (paths.length === 0) return;

    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) {
      console.error("Supabase remove error:", error);
    }
  };

  /* -------------------------------
     SAVE profil
     ✅ Ajouts:
       - logs env URL (sans key)
       - verify read après write (pour voir la vraie erreur)
       - message "Profil créé/Profil mis à jour"
       - fermeture modal
  -------------------------------- */
  const handleSaveProfile = async (data) => {
    const wasEdit = !!myProfile?.id;

    // ✅ debug (sans exposer la clé)
    console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL);

    const photos = Array.isArray(data.photos) ? data.photos : [];
    const keptPhotoUrls = Array.isArray(data.keptPhotoUrls) ? data.keptPhotoUrls : [];
    const hasNewPhotos = photos.length > 0;

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user ?? null;

    if (!currentUser) {
      setIsAuthModalOpen(true);
      throw new Error("AUTH_REQUIRED");
    }

    if (!data.name || !data.city || !data.sport || !data.level) {
      throw new Error("MISSING_FIELDS");
    }

    const ageNum = Number(data.age);
    if (!Number.isFinite(ageNum)) {
      throw new Error("AGE_REQUIRED");
    }
    if (ageNum < 16) {
      throw new Error("UNDER_16_BLOCKED");
    }

    const genderValue =
      data.gender === "female" || data.gender === "male" || data.gender === "other"
        ? data.gender
        : null;

    if (!myProfile && !hasNewPhotos) {
      throw new Error("PHOTO_REQUIRED");
    }

    const totalPhotosCount = (myProfile ? keptPhotoUrls.length : 0) + photos.length;
    if (totalPhotosCount > 5) throw new Error("MAX_5_PHOTOS");

    let profileId = myProfile?.id ?? null;

    if (!profileId) {
      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({
          user_id: currentUser.id,
          name: data.name,
          age: ageNum,
          gender: genderValue,
          status: "active",
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
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name: data.name,
          age: ageNum,
          gender: genderValue,
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

    if (!myProfile) {
      const uploaded = await uploadProfilePhotos(profileId, photos);

      const { error: updatePhotosErr } = await supabase
        .from("profiles")
        .update({ photo_urls: uploaded })
        .eq("id", profileId);

      if (updatePhotosErr) {
        console.error("update photo_urls error:", updatePhotosErr);
        throw updatePhotosErr;
      }
    } else {
      const previousUrls = Array.isArray(myProfile?.photo_urls) ? myProfile.photo_urls : [];
      const removedUrls = previousUrls.filter((u) => !keptPhotoUrls.includes(u));

      let nextUrls = keptPhotoUrls;

      if (hasNewPhotos) {
        const uploaded = await uploadProfilePhotos(profileId, photos);
        nextUrls = [...keptPhotoUrls, ...uploaded];
      }

      const { error: updatePhotosErr } = await supabase
        .from("profiles")
        .update({ photo_urls: nextUrls })
        .eq("id", profileId);

      if (updatePhotosErr) {
        console.error("update photo_urls error:", updatePhotosErr);
        throw updatePhotosErr;
      }

      await deleteProfilePhotosFromStorage(removedUrls);
    }

    // ✅ preuve: relire le profil après write (si RLS/env cassé, on le verra)
    const verify = await supabase
      .from("profiles")
      .select("id,user_id,name,created_at")
      .eq("id", profileId)
      .maybeSingle();

    console.log("VERIFY PROFILE:", verify);

    if (verify?.error) {
      // Si on ne peut pas relire, on force un message visible (souvent RLS)
      setProfileToast("Profil enregistré, mais lecture bloquée (vérifie RLS) ⚠️");
      // on ne throw pas ici pour ne pas casser l'UX
    }

    await fetchMyProfile();
    await fetchProfiles();

    setProfileToast(wasEdit ? "Profil mis à jour ✅" : "Profil créé ✅");

    // auto-hide après 3s
    window.clearTimeout(handleSaveProfile.__t);
    handleSaveProfile.__t = window.setTimeout(() => setProfileToast(""), 3000);

    setIsProfileModalOpen(false);
  };

  /* -------------------------------
     Filtres
  -------------------------------- */
  const handleFiltersChange = (partial) => setFilters((prev) => ({ ...prev, ...partial }));
  const handleResetFilters = () =>
    setFilters({ sport: "", level: "", city: "", radiusKm: 0, myLocation: null });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const cityQuery = (filters.city || "").toLowerCase().trim();
      const radiusKm = Number(filters.radiusKm || 0);
      const myLoc = filters.myLocation;

      const base = profiles.filter((p) => {
        if (user && p.user_id === user.id) return false;

        if (filters.sport) {
          if (filters.sport === "Autre") {
            if (STANDARD_SPORTS.includes(p.sport)) return false;
          } else if (p.sport !== filters.sport) return false;
        }
        if (filters.level && p.level !== filters.level) return false;

        if (cityQuery && !p.city.toLowerCase().includes(cityQuery)) return false;

        return true;
      });

      if (!radiusKm || radiusKm <= 0) {
        if (!cancelled) setFilteredProfiles(base);
        return;
      }

      if (!myLoc) {
        if (!cancelled) setFilteredProfiles(base);
        return;
      }

      const kept = [];
      for (const p of base) {
        const coords = await geocodeCity(p.city);
        if (!coords) continue;

        const d = haversineKm(
          { lat: myLoc.lat, lon: myLoc.lon },
          { lat: coords.lat, lon: coords.lon }
        );

        if (d <= radiusKm) kept.push(p);
      }

      if (!cancelled) setFilteredProfiles(kept);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [profiles, filters, user]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------------------------------
     Like/Swipe : bloqué si pas connecté
  -------------------------------- */
  const handleLike = async (profile) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    return;
  };

  const openProfileModal = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsProfileModalOpen(true);
  };

  // ✅ Ouvre une vraie page
  const openCrushesPage = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    navigate("/crushes");
  };

  return (
    <div className="app-root">
      <Header
        onOpenProfile={openProfileModal}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenCrushes={openCrushesPage}
        user={user}
      />

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onResetFilters={handleResetFilters}
              profilesError={profilesError}
              loadingProfiles={loadingProfiles}
              filteredProfiles={filteredProfiles}
              handleLike={handleLike}
              user={user}
              loadingMyProfile={loadingMyProfile}
              myProfile={myProfile}
              handleSaveProfile={handleSaveProfile}
              isProfileModalOpen={isProfileModalOpen}
              setIsProfileModalOpen={setIsProfileModalOpen}
              isAuthModalOpen={isAuthModalOpen}
              setIsAuthModalOpen={setIsAuthModalOpen}
              profileToast={profileToast}
              setProfileToast={setProfileToast}
            />
          }
        />

        <Route
          path="/crushes"
          element={<CrushesFullPage user={user} onRequireAuth={() => setIsAuthModalOpen(true)} />}
        />

        {/* ✅ Pages légales */}
        <Route path="/conditions" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />

        {/* ✅ Réglages */}
        <Route path="/settings" element={<Settings user={user} onOpenProfile={openProfileModal} />} />

        {/* ✅ Configurer compte */}
        <Route path="/account" element={<AccountSettings user={user} />} />
      </Routes>

      <Footer />
    </div>
  );
}
