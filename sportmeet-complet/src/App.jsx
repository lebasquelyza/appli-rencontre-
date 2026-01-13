// sportmeet-complet/src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import { Header } from "./components/Header";
import { ProfileForm } from "./components/ProfileForm";
import { FiltersBar } from "./components/FiltersBar";
import { SwipeDeck } from "./components/SwipeDeck";
import { SwipeCard } from "./components/SwipeCard";
import { AuthModal } from "./components/AuthModal";
import { CrushesPage } from "./components/CrushesPage";
import { seedProfiles } from "./data/seedProfiles";
import { supabase } from "./lib/supabase";

// ✅ effet "bombe" match (modal centre)
import { MatchBoomModal } from "./components/MatchBoomModal";

// ✅ Pages légales
import { Terms } from "./pages/Terms";
import { Cookies } from "./pages/Cookies";

// ✅ Page Réglages
import { Settings } from "./pages/Settings";

// ✅ Page Configurer compte
import { AccountSettings } from "./pages/AccountSettings";

// ✅ Page Abonnement
import { Subscription } from "./pages/Subscription";

// ✅ Page Chat
import { ChatPage } from "./pages/ChatPage";

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

// ✅ Ajoute une carte “share” entre profils
function withShareInterstitial(list, every = 8) {
  const out = [];
  let k = 0;

  for (let i = 0; i < list.length; i++) {
    out.push(list[i]);

    if ((i + 1) % every === 0 && i < list.length - 1) {
      k += 1;
      out.push({ id: `__share_${k}`, __type: "share" });
    }
  }

  return out;
}

function HomePage({
  filters,
  onFiltersChange,
  onResetFilters,
  profilesError,
  loadingProfiles,
  filteredProfiles,
  handleLike,
  userForUI,
  isSuspended,
  loadingMyProfile,
  myProfile,
  handleSaveProfile,
  isProfileModalOpen,
  setIsProfileModalOpen,
  isAuthModalOpen,
  setIsAuthModalOpen,
  profileToast,
  setProfileToast,
  onResumeAccount,
  resumeLoading,
  resumeError,
  isPreviewModalOpen,
  setIsPreviewModalOpen,
  onDeleteMyProfile
}) {
  return (
    <>
      <main className="page">
        <div className="shell">
          <section className="card card-results" style={{ padding: 8, maxWidth: 820, margin: "8px auto 0" }}>
            <FiltersBar filters={filters} onChange={onFiltersChange} onReset={onResetFilters} />

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

            {isSuspended ? (
              <div
                className="form-message error"
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ lineHeight: 1.35 }}>
                  <strong>Compte suspendu</strong> — tant que tu n’as pas repris ton compte, tu ne peux pas utiliser
                  l’application.
                  {myProfile?.suspension_reason ? (
                    <div style={{ marginTop: 6, opacity: 0.9 }}>Raison : {myProfile.suspension_reason}</div>
                  ) : null}
                  {resumeError ? <div style={{ marginTop: 6, opacity: 0.9 }}>{resumeError}</div> : null}
                </div>

                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={onResumeAccount}
                  disabled={resumeLoading}
                  title="Réactiver mon compte"
                >
                  {resumeLoading ? "..." : "REPRENDRE"}
                </button>
              </div>
            ) : null}

            {!userForUI && !isSuspended && (
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
                isAuthenticated={!!userForUI && !isSuspended}
                onRequireAuth={() => setIsAuthModalOpen(true)}
                hasMyProfile={!!myProfile?.id}
              />
            )}
          </section>
        </div>
      </main>

      {/* ---------- MODALS ---------- */}
      {isProfileModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsProfileModalOpen(false)}>
          <div className="modal-card modal-card--sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <h3 style={{ marginRight: "auto" }}>Mon profil sportif</h3>

              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setIsPreviewModalOpen(true)}
                disabled={!myProfile}
                title="Voir l’aperçu (statique, sans swipe)"
              >
                Aperçu
              </button>

              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={onDeleteMyProfile}
                disabled={!myProfile}
                title="Supprimer mon profil"
              >
                Supprimer
              </button>

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

      {isPreviewModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsPreviewModalOpen(false)}>
          <div className="modal-card modal-card--sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Aperçu</h3>
              <button className="btn-ghost" onClick={() => setIsPreviewModalOpen(false)}>
                Fermer
              </button>
            </div>

            <div className="modal-body" style={{ paddingTop: 10 }}>
              {!myProfile ? (
                <p className="form-message">Aucun profil à prévisualiser.</p>
              ) : (
                <div style={{ maxWidth: 520, margin: "0 auto" }}>
                  <SwipeCard profile={myProfile} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}
    </>
  );
}

function CrushesFullPage({ user, onRequireAuth, crushes, superlikers, myProfile, onHideMatch }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      onRequireAuth?.();
      navigate("/", { replace: true });
    }
  }, [user, onRequireAuth, navigate]);

  return (
    <main className="page">
      <div className="shell">
        <CrushesPage
          crushes={crushes}
          superlikers={superlikers}
          myPhotoUrl={myProfile?.photo_urls?.[0] || ""}
          onBack={() => navigate("/")}
          onHideMatch={onHideMatch}
        />
      </div>
    </main>
  );
}

export default function App() {
  const navigate = useNavigate();

  // ✅ FIX: gérer les liens de confirmation email Supabase (PKCE: ?code=...)
  // Sans ça, certains flows de confirmation peuvent laisser la session/état incohérent.
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code) return;

    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) console.error("exchangeCodeForSession error:", error);

      // nettoyer l'URL (enlève ?code=...)
      try {
        window.history.replaceState({}, document.title, url.origin + url.pathname);
      } catch {
        // ignore
      }
    })();
  }, []);

  // ✅ FIX iPhone: on verrouille la hauteur
  useEffect(() => {
    const setAppHeight = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--appH", `${h}px`);
    };

    setAppHeight();
    window.addEventListener("orientationchange", setAppHeight);

    const onVis = () => {
      if (!document.hidden) setAppHeight();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("orientationchange", setAppHeight);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const [profiles, setProfiles] = useState([]);

  const [filters, setFilters] = useState({
    sport: "",
    level: "",
    city: "",
    radiusKm: 0,
    myLocation: null
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState(null);

  const [user, setUser] = useState(null);

  const [myProfile, setMyProfile] = useState(null);
  const [loadingMyProfile, setLoadingMyProfile] = useState(false);

  const [filteredProfiles, setFilteredProfiles] = useState([]);

  const [geoCache] = useState(() => new Map());

  const [profileToast, setProfileToast] = useState("");

  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");

  // ✅ Inbox DB (matches/messages)
  const [crushes, setCrushes] = useState([]);

  // ✅ personnes qui m'ont superlike
  const [superlikers, setSuperlikers] = useState([]);

  // ✅ modal "boom" quand match
  const [matchBoom, setMatchBoom] = useState({ open: false, name: "", photoUrl: "" });

  const isSuspended = !!user && myProfile?.status === "suspended";
  const userForUI = isSuspended ? null : user;

  useEffect(() => {
    const h = window.location.hash || "";
    const isRecovery =
      h.includes("type=recovery") || (h.includes("access_token=") && h.includes("refresh_token="));
    if (isRecovery) setIsAuthModalOpen(true);
  }, []);

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
    setIsPreviewModalOpen(false);
    setCrushes([]);
    navigate("/", { replace: true });
  };

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

    if (error || !data) {
      if (error) console.error("fetchMyProfile error:", error);
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
      suspended_at: data.suspended_at ?? null,
      suspension_reason: data.suspension_reason ?? null,
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
     Fetch CRUSHES + hidden_matches
  -------------------------------- */
  const fetchCrushes = async () => {
    if (!user) {
      setCrushes([]);
      return;
    }

    const { data: hiddenRows, error: hErr } = await supabase
      .from("hidden_matches")
      .select("match_id")
      .eq("user_id", user.id);

    if (hErr) console.error("hidden_matches fetch error:", hErr);
    const hiddenSet = new Set(
      (hiddenRows || [])
        .map((x) => Number(x.match_id))
        .filter((n) => Number.isFinite(n))
    );

    const { data: matchesRows, error: mErr } = await supabase
      .from("matches")
      .select("id, user1_id, user2_id, created_at")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (mErr) {
      console.error("fetchCrushes matches error:", mErr);
      setCrushes([]);
      return;
    }

    const matchesList = (matchesRows || []).filter((m) => !hiddenSet.has(Number(m.id)));
    if (matchesList.length === 0) {
      setCrushes([]);
      return;
    }

    const otherUserIds = matchesList
      .map((m) => (m.user1_id === user.id ? m.user2_id : m.user1_id))
      .filter(Boolean);

    const uniqOther = Array.from(new Set(otherUserIds));
    if (uniqOther.length === 0) {
      setCrushes([]);
      return;
    }

    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, user_id, name, city, sport, photo_urls, created_at, status")
      .in("user_id", uniqOther)
      .order("created_at", { ascending: false });

    if (pErr) {
      console.error("fetchCrushes profiles error:", pErr);
      setCrushes([]);
      return;
    }

    const byUser = new Map();
    for (const p of profs || []) {
      if (!p.user_id) continue;
      if (!byUser.has(p.user_id)) byUser.set(p.user_id, p);
    }

    const ids = matchesList.map((m) => m.id);

    const { data: msgRows, error: msgErr } = await supabase
      .from("messages")
      .select("id, match_id, body, created_at, sender_id")
      .in("match_id", ids)
      .order("created_at", { ascending: false })
      .limit(800);

    if (msgErr) console.error("fetchCrushes last messages error:", msgErr);

    const lastByMatch = new Map();
    for (const mm of msgRows || []) {
      if (!lastByMatch.has(mm.match_id)) lastByMatch.set(mm.match_id, mm);
    }

    const next = matchesList
      .map((m) => {
        const otherUserId = m.user1_id === user.id ? m.user2_id : m.user1_id;
        const prof = otherUserId ? byUser.get(otherUserId) : null;
        const last = lastByMatch.get(m.id);

        return {
          id: `match-${m.id}`,
          match_id: m.id,
          user_id: otherUserId,
          name: prof?.name || "Match",
          city: prof?.city || "",
          sport: prof?.sport || "",
          photo_urls: Array.isArray(prof?.photo_urls) ? prof.photo_urls : [],
          last_message_body: last?.body || "",
          last_message_at: last?.created_at || null
        };
      })
      .filter(Boolean);

    setCrushes(next);
  };

  useEffect(() => {
    fetchCrushes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* -------------------------------
     Masquer un match
  -------------------------------- */
  const hideMatch = async (c) => {
    if (!user?.id) return;
    if (!c?.match_id) return;

    const { error } = await supabase.from("hidden_matches").insert({
      user_id: user.id,
      match_id: Number(c.match_id)
    });

    const msg = String(error?.message || "").toLowerCase();
    if (error && !msg.includes("duplicate")) {
      console.error("hideMatch error:", error);
      setProfileToast("Impossible de masquer ce match (RLS ?).");
      window.clearTimeout(hideMatch.__t);
      hideMatch.__t = window.setTimeout(() => setProfileToast(""), 3000);
      return;
    }

    await fetchCrushes();
    setProfileToast("Match masqué ✅");
    window.clearTimeout(hideMatch.__t);
    hideMatch.__t = window.setTimeout(() => setProfileToast(""), 2500);
  };

  /* -------------------------------
     Fetch superlikers
  -------------------------------- */
  const fetchSuperlikers = async () => {
    if (!user || !myProfile?.id) {
      setSuperlikers([]);
      return;
    }

    const { data: likesData, error: likesErr } = await supabase
      .from("likes")
      .select("liker_id, created_at")
      .eq("liked_profile_id", myProfile.id)
      .eq("is_super", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (likesErr) {
      console.error("fetchSuperlikers likes error:", likesErr);
      setSuperlikers([]);
      return;
    }

    const likerIds = Array.from(new Set((likesData || []).map((x) => x.liker_id).filter(Boolean)));
    if (likerIds.length === 0) {
      setSuperlikers([]);
      return;
    }

    const { data: profs, error: profErr } = await supabase
      .from("profiles")
      .select("id, user_id, name, photo_urls, created_at")
      .in("user_id", likerIds)
      .order("created_at", { ascending: false });

    if (profErr) {
      console.error("fetchSuperlikers profiles error:", profErr);
      setSuperlikers([]);
      return;
    }

    setSuperlikers(
      (profs || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        photo_urls: Array.isArray(p.photo_urls) ? p.photo_urls : []
      }))
    );
  };

  useEffect(() => {
    fetchSuperlikers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, myProfile?.id]);

  /* -------------------------------
     Fetch tous les profils
  -------------------------------- */
  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    setProfilesError(null);

    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

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
    const realActive = deduped.filter((p) => (p.status ?? "active") === "active");

    const MIN_PROFILES_TO_SHOW = 30;
    const need = Math.max(0, MIN_PROFILES_TO_SHOW - realActive.length);
    const demoSlice = seedProfiles.slice(0, need);

    const finalList = [...realActive, ...demoSlice];

    setProfiles(finalList.length ? finalList : seedProfiles);
    setLoadingProfiles(false);
  };

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------
     Realtime profiles
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
     REPRENDRE: réactiver le compte
  -------------------------------- */
  const handleResumeAccount = async () => {
    setResumeError("");
    if (!user || !myProfile?.id) return;

    setResumeLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          status: "active",
          suspended_at: null,
          suspension_reason: null
        })
        .eq("id", myProfile.id);

      if (error) {
        console.error("resume account error:", error);
        setResumeError("Impossible de reprendre le compte. Vérifie tes permissions (RLS).");
        return;
      }

      await fetchMyProfile();
      await fetchProfiles();
      await fetchCrushes();

      setProfileToast("Compte repris ✅");
      window.clearTimeout(handleResumeAccount.__t);
      handleResumeAccount.__t = window.setTimeout(() => setProfileToast(""), 3000);
    } finally {
      setResumeLoading(false);
    }
  };

  /* -------------------------------
     Upload photos -> URLs publiques
  -------------------------------- */
  const uploadProfilePhotos = async (profileId, files) => {
    const urls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = safeFileExt(file);
      const path = `profiles/${profileId}/${randomId()}-${i + 1}.${ext}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
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
     Delete photos from Supabase Storage (best-effort)
  -------------------------------- */
  const deleteProfilePhotosFromStorage = async (publicUrls) => {
    const paths = (publicUrls || []).map(storagePathFromPublicUrl).filter(Boolean);
    if (paths.length === 0) return;

    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) console.error("Supabase remove error:", error);
  };

  /* -------------------------------
     SUPPRIMER mon profil
  -------------------------------- */
  const handleDeleteMyProfile = async () => {
    if (!user || isSuspended) {
      if (isSuspended) setProfileToast("Compte suspendu — clique sur REPRENDRE pour continuer.");
      else setIsAuthModalOpen(true);
      return;
    }

    if (!myProfile?.id) {
      setProfileToast("Aucun profil à supprimer.");
      window.clearTimeout(handleDeleteMyProfile.__t);
      handleDeleteMyProfile.__t = window.setTimeout(() => setProfileToast(""), 3000);
      return;
    }

    const ok = window.confirm(
      "⚠️ Supprimer ton profil ?\n\n- Tes infos et photos seront supprimées.\n- Cette action est irréversible."
    );
    if (!ok) return;

    try {
      const urls = Array.isArray(myProfile.photo_urls) ? myProfile.photo_urls : [];
      await deleteProfilePhotosFromStorage(urls);

      const { error } = await supabase.from("profiles").delete().eq("id", myProfile.id);

      if (error) {
        console.error("delete profile error:", error);
        setProfileToast("Impossible de supprimer le profil (RLS ?).");
        window.clearTimeout(handleDeleteMyProfile.__t);
        handleDeleteMyProfile.__t = window.setTimeout(() => setProfileToast(""), 3500);
        return;
      }

      setMyProfile(null);
      await fetchProfiles();
      await fetchCrushes();

      setIsProfileModalOpen(false);
      setIsPreviewModalOpen(false);

      setProfileToast("Profil supprimé ✅");
      window.clearTimeout(handleDeleteMyProfile.__t);
      handleDeleteMyProfile.__t = window.setTimeout(() => setProfileToast(""), 3000);
    } catch (e) {
      console.error("handleDeleteMyProfile error:", e);
      setProfileToast("Erreur lors de la suppression.");
      window.clearTimeout(handleDeleteMyProfile.__t);
      handleDeleteMyProfile.__t = window.setTimeout(() => setProfileToast(""), 3500);
    }
  };

  /* -------------------------------
     Like/Swipe ✅ LIKE + SUPERLIKE + LIMIT 5/JOUR + MATCH
  -------------------------------- */
  const handleLike = async (profile, opts = {}) => {
    const isSuper = !!opts.isSuper;

    if (!user || isSuspended) {
      if (isSuspended) setProfileToast("Compte suspendu — clique sur REPRENDRE pour continuer.");
      else setIsAuthModalOpen(true);
      return false;
    }

    if (!myProfile?.id) {
      setProfileToast("Crée ton profil avant de swiper 🙂");
      window.clearTimeout(handleLike.__t);
      handleLike.__t = window.setTimeout(() => setProfileToast(""), 2500);
      return false;
    }

    if (!profile?.id) return false;

    // ✅ Limite 5 superlikes / jour (DB count)
    if (isSuper) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { count, error: cntErr } = await supabase
        .from("likes")
        .select("id", { count: "exact", head: true })
        .eq("liker_id", user.id)
        .eq("is_super", true)
        .gte("created_at", startOfToday.toISOString());

      if (cntErr) console.error("superlike count error:", cntErr);

      if ((count || 0) >= 5) {
        // ✅ IMPORTANT : pas de swipe quand limite atteinte
        setProfileToast("Limite atteinte : 5 superlikes par jour ⭐");
        window.clearTimeout(handleLike.__t);
        handleLike.__t = window.setTimeout(() => setProfileToast(""), 3000);
        return false;
      }
    }

    // 1) enregistrer like/superlike
    const { error: likeErr } = await supabase.from("likes").insert({
      liker_id: user.id,
      liked_profile_id: profile.id,
      is_super: isSuper
    });

    // doublon -> upgrade possible
    const msg = String(likeErr?.message || "").toLowerCase();
    if (likeErr && msg.includes("duplicate")) {
      if (isSuper) {
        const { error: upErr } = await supabase
          .from("likes")
          .update({ is_super: true })
          .eq("liker_id", user.id)
          .eq("liked_profile_id", profile.id);

        if (upErr) console.error("upgrade to superlike error:", upErr);
      }
    } else if (likeErr) {
      console.error("Like insert error:", likeErr);
    }

    // 2) créer match si réciproque (RPC => retourne matched + match_id)
    const { data, error: rpcErr } = await supabase.rpc("create_match_if_mutual", {
      p_liked_profile_id: profile.id
    });

    if (rpcErr) {
      console.error("Match RPC error:", rpcErr);
      return true;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (row?.matched) {
      await fetchCrushes();

      // ✅ effet "bombe" (le client ferme puis clique sur "Messages")
      setMatchBoom({
        open: true,
        name: profile?.name || "Match",
        photoUrl: (profile?.photo_urls && profile.photo_urls[0]) || profile?.photo || ""
      });
    }

    fetchSuperlikers();
    return true;
  };

  const openProfileModal = () => {
    if (!user || isSuspended) {
      if (isSuspended) setProfileToast("Compte suspendu — clique sur REPRENDRE pour continuer.");
      else setIsAuthModalOpen(true);
      return;
    }
    setIsProfileModalOpen(true);
  };

  const openCrushesPage = () => {
    if (!user || isSuspended) {
      if (isSuspended) setProfileToast("Compte suspendu — clique sur REPRENDRE pour continuer.");
      else setIsAuthModalOpen(true);
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
        user={userForUI}
      />

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              filters={filters}
              onFiltersChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
              onResetFilters={() => setFilters({ sport: "", level: "", city: "", radiusKm: 0, myLocation: null })}
              profilesError={profilesError}
              loadingProfiles={loadingProfiles}
              filteredProfiles={filteredProfiles}
              handleLike={handleLike}
              userForUI={userForUI}
              isSuspended={isSuspended}
              loadingMyProfile={loadingMyProfile}
              myProfile={myProfile}
              handleSaveProfile={() => {}}
              isProfileModalOpen={isProfileModalOpen}
              setIsProfileModalOpen={setIsProfileModalOpen}
              isAuthModalOpen={isAuthModalOpen}
              setIsAuthModalOpen={setIsAuthModalOpen}
              profileToast={profileToast}
              setProfileToast={setProfileToast}
              onResumeAccount={handleResumeAccount}
              resumeLoading={resumeLoading}
              resumeError={resumeError}
              isPreviewModalOpen={isPreviewModalOpen}
              setIsPreviewModalOpen={setIsPreviewModalOpen}
              onDeleteMyProfile={handleDeleteMyProfile}
            />
          }
        />

        <Route
          path="/crushes"
          element={
            <CrushesFullPage
              user={userForUI}
              onRequireAuth={() => setIsAuthModalOpen(true)}
              crushes={crushes}
              superlikers={superlikers}
              myProfile={myProfile}
              onHideMatch={hideMatch}
            />
          }
        />

        <Route path="/chat/:matchId" element={<ChatPage />} />

        <Route path="/conditions" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />

        <Route path="/settings" element={<Settings user={userForUI} onOpenProfile={openProfileModal} />} />
        <Route path="/account" element={<AccountSettings user={userForUI} />} />
        <Route path="/subscription" element={<Subscription user={userForUI} />} />
      </Routes>

      <MatchBoomModal
        open={matchBoom.open}
        matchName={matchBoom.name}
        photoUrl={matchBoom.photoUrl}
        onClose={() => setMatchBoom({ open: false, name: "", photoUrl: "" })}
      />

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)",
          textAlign: "center",
          fontSize: 14,
          opacity: 0.7,
          pointerEvents: "none",
          zIndex: 0
        }}
      >
        MatchFit © {new Date().getFullYear()}
      </div>
    </div>
  );
}
