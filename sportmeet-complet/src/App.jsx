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

export default function App() {
  const [profiles, setProfiles] = useState([]);

  const [filters, setFilters] = useState({
    sport: "",
    level: "",
    city: "",
    radiusKm: 0,
    myLocation: null
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState("signin");

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState(null);

  const [user, setUser] = useState(null);

  const [myProfile, setMyProfile] = useState(null);
  const [loadingMyProfile, setLoadingMyProfile] = useState(false);

  const [filteredProfiles, setFilteredProfiles] = useState([]);

  const [geoCache] = useState(() => new Map());

  // ✅ "Pages" simples (sans router)
  const [view, setView] = useState("home"); // "home" | "crushes" | "settings"

  // ✅ Crushs (MVP) : stockés localement
  const [crushes, setCrushes] = useState(() => {
    try {
      const raw = localStorage.getItem("matchfit_crushes");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const persistCrushes = (next) => {
    setCrushes(next);
    try {
      localStorage.setItem("matchfit_crushes", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const openAuth = (mode = "signin") => {
    setAuthInitialMode(mode);
    setIsAuthModalOpen(true);
  };

  // ✅ Ouvre automatiquement la modale en mode reset si lien recovery
  useEffect(() => {
    const h = window.location.hash || "";
    const isRecovery =
      h.includes("type=recovery") || (h.includes("access_token=") && h.includes("refresh_token="));
    if (isRecovery) openAuth("reset");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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
     Fetch mon profil
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
     Storage helpers (photos)
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

  const deleteProfilePhotosFromStorage = async (publicUrls) => {
    const paths = (publicUrls || []).map(storagePathFromPublicUrl).filter(Boolean);
    if (paths.length === 0) return;

    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) console.error("Supabase remove error:", error);
  };

  /* -------------------------------
     Save profil
  -------------------------------- */
  const handleSaveProfile = async (data) => {
    const photos = Array.isArray(data.photos) ? data.photos : [];
    const keptPhotoUrls = Array.isArray(data.keptPhotoUrls) ? data.keptPhotoUrls : [];
    const hasNewPhotos = photos.length > 0;

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user ?? null;

    if (!currentUser) {
      openAuth("signin");
      throw new Error("AUTH_REQUIRED");
    }

    if (!data.name || !data.city || !data.sport || !data.level) {
      throw new Error("MISSING_FIELDS");
    }

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

    await fetchMyProfile();
    await fetchProfiles();
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
     Like (MVP local) + ajout aux crushs
  -------------------------------- */
  const handleLike = async (profile) => {
    if (!user) {
      openAuth("signin");
      return;
    }
    if (!profile) return;

    const photo =
      Array.isArray(profile.photo_urls) && profile.photo_urls.length ? profile.photo_urls[0] : null;

    const next = [
      { id: profile.id, name: profile.name, photo },
      ...crushes.filter((c) => c.id !== profile.id)
    ];

    persistCrushes(next);
  };

  const openProfileModal = () => {
    if (!user) {
      openAuth("signin");
      return;
    }
    setIsProfileModalOpen(true);
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
            <CrushesPage crushes={crushes} onBack={() => setView("home")} />
          ) : view === "settings" ? (
            <div className="card" style={{ padding: 16 }}>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
              >
                <div>
                  <h2 style={{ margin: 0 }}>Réglages</h2>
                  <div style={{ opacity: 0.8, marginTop: 4 }}>Bientôt disponible.</div>
                </div>

                <button type="button" className="btn-ghost btn-sm" onClick={() => setView("home")}>
                  Retour
                </button>
              </div>

              <div className="card" style={{ marginTop: 14, padding: 14, borderRadius: 14, opacity: 0.9 }}>
                Ici tu pourras gérer tes préférences (notifications, confidentialité, etc.).
              </div>
            </div>
          ) : (
            <section className="card card-results">
              <FiltersBar filters={filters} onChange={handleFiltersChange} onReset={handleResetFilters} />

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
                  onRequireAuth={() => openAuth("signin")}
                />
              )}
            </section>
          )}
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

      {isAuthModalOpen && (
        <AuthModal initialMode={authInitialMode} onClose={() => setIsAuthModalOpen(false)} />
      )}

      <Footer />
    </div>
  );
}

