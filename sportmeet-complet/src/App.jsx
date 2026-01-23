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
import { Confirmed } from "./pages/Confirmed";
import { HowItWorks } from "./pages/HowItWorks";

const sendSessionToNative = (session) => {
  try {
    const access_token = session?.access_token ?? null;

    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "SUPABASE_SESSION",
          access_token,
        })
      );
    }
  } catch (e) {
    console.log("sendSessionToNative error", e);
  }
};


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

// ✅ Page "Compte en cours de vérification"
import { AccountReview } from "./pages/AccountReview";

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

/* -------------------------------
   ✅ LocalStorage helpers (profils masqués)
-------------------------------- */
function hiddenKeyForUser(userId) {
  return `matchfit_hidden_profiles_${userId || "anon"}`;
}

function loadHiddenIds(userId) {
  try {
    const raw = localStorage.getItem(hiddenKeyForUser(userId));
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter(Boolean));
  } catch {
    return new Set();
  }
}

function saveHiddenIds(userId, setObj) {
  try {
    const arr = Array.from(setObj || []);
    localStorage.setItem(hiddenKeyForUser(userId), JSON.stringify(arr));
  } catch {
    // ignore
  }
}

function HomePage({
  filters,
  onFiltersChange,
  onResetFilters,
  profilesError,
  loadingProfiles,
  filteredProfiles,
  handleLike,
  onReportProfile,
  userForUI,
  isSuspended,
  isInReview, // ✅ AJOUT
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
  const navigate = useNavigate();

  // ✅✅✅ LOCK scroll vertical page (Home uniquement) sans casser swipe horizontal ni pinch zoom
  useEffect(() => {
    const y = window.scrollY || 0;

    document.body.classList.add("noYScroll");
    document.body.style.top = `-${y}px`;

    const onTouchMove = (e) => {
      // ✅ garde pinch-zoom
      if (e.touches && e.touches.length > 1) return;

      // ✅ autorise le scroll dans les zones explicitement scrollables (modals)
      if (e.target?.closest?.(".allowScroll")) return;

      // ✅ autorise les gestes sur la carte (swipe lib)
      if (e.target?.closest?.(".swipeMedia, .swipeCard, .swipeStage")) return;

      // sinon on bloque (évite le “rebond” iOS)
      e.preventDefault();
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.body.classList.remove("noYScroll");
      const top = document.body.style.top;
      document.body.style.top = "";
      const restoreY = top ? Math.abs(parseInt(top, 10)) : y;
      window.scrollTo(0, restoreY);
    };
  }, []);

  return (
    <>
      <main className="page">
        <div className="shell">
          <section
            className="card card-results"
            style={{ padding: 8, maxWidth: 820, margin: "8px auto 0" }}
          >
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

            {/* ✅ BANNI / SUSPENDU */}
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

            {/* ✅ EN REVIEW */}
            {isInReview && !isSuspended ? (
              <div
                className="form-message"
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ lineHeight: 1.35 }}>
                  <strong>Compte en cours de vérification</strong> — tu ne peux pas créer/modifier ton profil pour le moment.
                  <div style={{ marginTop: 6, opacity: 0.9 }}>
                    Notre équipe examine les signalements reçus te concernant et t’enverra un email.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => navigate("/review")}
                  title="Voir la page de vérification"
                >
                  DÉTAILS
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
                onReportProfile={onReportProfile}
                // ✅ on interdit le swipe si compte en review ou suspendu
                isAuthenticated={!!userForUI && !isSuspended && !isInReview}
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

            {/* ✅✅✅ allowScroll : autorise le scroll dans la modal même si la page est lock */}
            <div className="modal-body modal-body--scroll allowScroll">
              <ProfileForm
                loadingExisting={loadingMyProfile}
                existingProfile={myProfile}
                onSaveProfile={handleSaveProfile}
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ Aperçu en GRAND + fond dégradé/blur */}
      {isPreviewModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsPreviewModalOpen(false)}
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,.78), rgba(0,0,0,.92))",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)"
          }}
        >
          <div
            className="modal-card modal-card--sheet"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(820px, 96vw)",
              maxHeight: "calc(var(--appH, 100vh) - 40px)",
              overflow: "hidden"
            }}
          >
            <div className="modal-header">
              <h3>Aperçu</h3>
              <button className="btn-ghost" onClick={() => setIsPreviewModalOpen(false)}>
                Fermer
              </button>
            </div>

            {/* ✅ allowScroll (au cas où l’aperçu dépasse sur petits écrans) */}
            <div className="modal-body allowScroll" style={{ paddingTop: 10 }}>
              {!myProfile ? (
                <p className="form-message">Aucun profil à prévisualiser.</p>
              ) : (
                <div style={{ maxWidth: 760, margin: "0 auto" }}>
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

// ✅ Test: vérifie que la PWA parle bien à Expo WebView
useEffect(() => {
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "PING" }));
  }
}, []);

const navigate = useNavigate();

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


  // ✅ user_ids déjà matchés (pour retirer du feed)
  const [matchedUserIds, setMatchedUserIds] = useState(() => new Set());

  // ✅ profils que j'ai likés (par profile.id) -> retirer du feed
  const [likedProfileIds, setLikedProfileIds] = useState(() => new Set());

  // ✅ profils likés mais pas matchés (pour l'écran "passe à premium")
  const [premiumLikes, setPremiumLikes] = useState([]);
  // ✅ personnes qui m'ont superlike
  const [superlikers, setSuperlikers] = useState([]);

  // ✅ modal "boom" quand match
  const [matchBoom, setMatchBoom] = useState({ open: false, name: "", photoUrl: "" });

  // ✅ profils masqués (signalés) — persistant localStorage
  const [hiddenProfileIds, setHiddenProfileIds] = useState(() => new Set());

  // ✅ Compte en cours de vérification (>=7 signalements)
  const [inReview, setInReview] = useState(false);

  const isSuspended = !!user && myProfile?.status === "suspended";
  const isInReview = !!user && !!inReview && !isSuspended;

  // 👉 on conserve userForUI pour l’affichage, mais on bloque les actions si review
  const userForUI = isSuspended ? null : user;

  // ✅ charger les profils masqués quand l'utilisateur change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const uid = user?.id || "anon";
    setHiddenProfileIds(loadHiddenIds(uid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ sauvegarder les profils masqués dans localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const uid = user?.id || "anon";
    saveHiddenIds(uid, hiddenProfileIds);
  }, [hiddenProfileIds, user?.id]);

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
     ✅ PUSH téléphone (Expo) : recevoir + sauvegarder le push token
     Le code natif (Expo) doit envoyer un message WebView:
     { type: "EXPO_PUSH_TOKEN", token: "ExponentPushToken[...]" }
  -------------------------------- */
  const upsertExpoPushToken = async (token) => {
    const t = String(token || "").trim();
    if (!user?.id || !t) return;

    try {
      const { error } = await supabase.from("user_push_tokens").upsert(
        {
          user_id: user.id,
          expo_push_token: t,
          platform: "expo",        },
        { onConflict: "expo_push_token" }
      );

      if (error) console.error("upsertExpoPushToken error:", error);
    } catch (e) {
      console.error("upsertExpoPushToken exception:", e);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const onMsg = (event) => {
      try {
        const raw = event?.data;
        const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!msg) return;

        if (msg.type === "EXPO_PUSH_TOKEN" && msg.token) {
          upsertExpoPushToken(msg.token);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("message", onMsg);
    document.addEventListener("message", onMsg); // ✅ support ReactNativeWebView

    // ✅ demande au natif d'envoyer le token (si implémenté côté Expo)
    try {
      if (window.ReactNativeWebView?.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "REQUEST_EXPO_PUSH_TOKEN" }));
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("message", onMsg);
      document.removeEventListener("message", onMsg);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  
  /* -------------------------------
     Auth session
  -------------------------------- */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(data?.session?.user ?? null);


    // ✅ AJOUT: envoie la session courante à Expo
    sendSessionToNative(data?.session ?? null);
};

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);


    // ✅ AJOUT: envoie la session à chaque login/logout
    sendSessionToNative(session ?? null);
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
    setInReview(false);
    setIsProfileModalOpen(false);
    setIsPreviewModalOpen(false);
    setCrushes([]);
    setHiddenProfileIds(new Set());
    setMatchedUserIds(new Set());
    setLikedProfileIds(new Set());
    setPremiumLikes([]);
    navigate("/", { replace: true });
  };

  /* -------------------------------
     ✅ CLEAR hidden profiles (pour Settings -> "Réinitialiser")
  -------------------------------- */
  const clearHiddenProfiles = () => {
    const uid = user?.id || "anon";

    setHiddenProfileIds(new Set());

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(hiddenKeyForUser(uid));
      } catch {
        // ignore
      }
    }

    setProfileToast("Profils masqués réinitialisés ✅");
    window.clearTimeout(clearHiddenProfiles.__t);
    clearHiddenProfiles.__t = window.setTimeout(() => setProfileToast(""), 2500);
  };

  /* -------------------------------
     ✅ Check "in review" via RPC
  -------------------------------- */
  const fetchReviewStatus = async () => {
    if (!user?.id) {
      setInReview(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc("my_account_in_review");
      if (error) {
        console.error("my_account_in_review error:", error);
        // par sécurité: si erreur, on ne bloque pas
        setInReview(false);
        return;
      }
      setInReview(!!data);
    } catch (e) {
      console.error("fetchReviewStatus exception:", e);
      setInReview(false);
    }
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
      height: data.height ?? null,
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
    fetchReviewStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* -------------------------------
     ✅ Redirection vers /review
  -------------------------------- */
  useEffect(() => {
    if (user?.id && isInReview) {
      // évite boucle si déjà sur /review
      if (window.location.pathname !== "/review") {
        navigate("/review", { replace: true });
      }
    }
  }, [user?.id, isInReview, navigate]);

  /* -------------------------------
     Fetch CRUSHES + hidden_matches
  -------------------------------- */
  const fetchCrushes = async () => {
    if (!user) {
      setCrushes([]);
      setMatchedUserIds(new Set());
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
      setMatchedUserIds(new Set());
      return;
    }

    const otherUserIds = matchesList
      .map((m) => (m.user1_id === user.id ? m.user2_id : m.user1_id))
      .filter(Boolean);

    const uniqOther = Array.from(new Set(otherUserIds));
    // ✅ pour retirer du feed : tous les user_id déjà matchés
    setMatchedUserIds(new Set(uniqOther));
    if (uniqOther.length === 0) {
      setCrushes([]);
      setMatchedUserIds(new Set());
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
     ✅ Realtime: nouveau MATCH (in-app)
  -------------------------------- */
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`rt-matches-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, async (payload) => {
        const m = payload?.new;
        if (!m) return;

        if (m.user1_id !== user.id && m.user2_id !== user.id) return;

        await fetchCrushes();
        setProfileToast("Nouveau match ✅");
        window.clearTimeout(window.__rt_toast);
        window.__rt_toast = window.setTimeout(() => setProfileToast(""), 2500);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
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
     ✅ SIGNALER un profil (profile_reports) + cacher du feed
  -------------------------------- */
  const reportProfile = async (profile, payload) => {
    if (!user || isSuspended) {
      if (isSuspended) setProfileToast("Compte suspendu — clique sur REPRENDRE pour continuer.");
      else setIsAuthModalOpen(true);
      return false;
    }

    if (!profile?.id) return false;

    const reason = (payload?.reason || "").trim();
    const details = (payload?.details || "").trim();

    if (!reason) {
      setProfileToast("Choisis une raison.");
      window.clearTimeout(reportProfile.__t);
      reportProfile.__t = window.setTimeout(() => setProfileToast(""), 2500);
      return false;
    }

    const { error } = await supabase.from("profile_reports").insert({
      reporter_id: user.id,
      reported_profile_id: profile.id,
      reason,
      details: details || null
    });

    const msg = String(error?.message || "").toLowerCase();
    if (error && msg.includes("duplicate")) {
      setHiddenProfileIds((prev) => {
        const next = new Set(prev);
        next.add(profile.id);
        return next;
      });
      setProfileToast("Tu as déjà signalé ce profil. Il est masqué ✅");
    } else if (error) {
      console.error("reportProfile error:", error);
      setProfileToast("Impossible de signaler ce profil.");
    } else {
      setHiddenProfileIds((prev) => {
        const next = new Set(prev);
        next.add(profile.id);
        return next;
      });
      setProfileToast("Signalement envoyé ✅ Profil masqué.");
      // on rafraîchit le statut review au cas où c’est le 7e report d’un compte (pour l’auteur)
      fetchReviewStatus();
    }

    window.clearTimeout(reportProfile.__t);
    reportProfile.__t = window.setTimeout(() => setProfileToast(""), 3000);
    return !error;
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
     ✅ Mes likes (pour retirer du feed + "passe à premium")
  -------------------------------- */
  const fetchMyLikesAndPremium = async () => {
    if (!user?.id) {
      setLikedProfileIds(new Set());
      setPremiumLikes([]);
      return;
    }

    // 1) récupérer tous mes likes
    const { data: likesRows, error: lErr } = await supabase
      .from("likes")
      .select("liked_profile_id, created_at")
      .eq("liker_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (lErr) {
      console.error("fetchMyLikes error:", lErr);
      setLikedProfileIds(new Set());
      setPremiumLikes([]);
      return;
    }

    const likedIds = Array.from(
      new Set((likesRows || []).map((x) => x.liked_profile_id).filter(Boolean))
    );

    setLikedProfileIds(new Set(likedIds));

    if (likedIds.length === 0) {
      setPremiumLikes([]);
      return;
    }

    // 2) charger les profils likés
    const { data: likedProfiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, user_id, name, photo_urls, created_at, status")
      .in("id", likedIds)
      .order("created_at", { ascending: false });

    if (pErr) {
      console.error("fetchMyLikes profiles error:", pErr);
      setPremiumLikes([]);
      return;
    }

    // 3) garder seulement ceux PAS matchés
    const noMatch = (likedProfiles || []).filter((p) => {
      if (!p?.id) return false;
      if ((p.status ?? "active") !== "active") return false;
      if (hiddenProfileIds.has(p.id)) return false;
      if (p.user_id && matchedUserIds.has(p.user_id)) return false; // exclut les matchés
      return true;
    });

    setPremiumLikes(noMatch);
  };

  useEffect(() => {
    fetchMyLikesAndPremium();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, matchedUserIds, hiddenProfileIds]);


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
      height: p.height ?? null,
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
      await fetchReviewStatus();

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
    if (!user || isSuspended || isInReview) {
      if (isSuspended) setProfileToast("Compte suspendu — clique sur REPRENDRE pour continuer.");
      else if (isInReview) setProfileToast("Compte en cours de vérification — action indisponible.");
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

      setIsPreviewModalOpen(false);
      setIsProfileModalOpen(true);

      setProfileToast("Profil supprimé ✅ Tu peux en recréer un.");
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
     SAVE profil
  -------------------------------- */
  const handleSaveProfile = async (data) => {
    if (isSuspended) throw new Error("SUSPENDED_ACCOUNT");
    if (isInReview) throw new Error("REVIEW_ACCOUNT"); // ✅ AJOUT

    const wasEdit = !!myProfile?.id;

    const photos = Array.isArray(data.photos) ? data.photos : [];
    const keptPhotoUrls = Array.isArray(data.keptPhotoUrls) ? data.keptPhotoUrls : [];
    const hasNewPhotos = photos.length > 0;

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user ?? null;

    if (!currentUser) {
      setIsAuthModalOpen(true);
      throw new Error("AUTH_REQUIRED");
    }

    if (!data.name || !data.city || !data.sport || !data.level) throw new Error("MISSING_FIELDS");

    const ageNum = Number(data.age);
    if (!Number.isFinite(ageNum)) throw new Error("AGE_REQUIRED");
    if (ageNum < 16) throw new Error("UNDER_16_BLOCKED");

    const rawHeight = data.height;
    const heightNum = rawHeight === "" || rawHeight == null ? null : Number(rawHeight);

    if (heightNum != null && !Number.isFinite(heightNum)) throw new Error("HEIGHT_REQUIRED");
    if (heightNum != null && (heightNum < 80 || heightNum > 250)) throw new Error("HEIGHT_INVALID");

    const genderValue =
      data.gender === "female" || data.gender === "male" || data.gender === "other" ? data.gender : null;

    if (!myProfile && !hasNewPhotos) throw new Error("PHOTO_REQUIRED");

    const totalPhotosCount = (myProfile ? keptPhotoUrls.length : 0) + photos.length;
    if (totalPhotosCount > 5) throw new Error("MAX_5_PHOTOS");

    let profileId = myProfile?.id ?? null;

    if (!profileId) {
      const { data: existing, error: exErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (exErr) console.error("check existing profile error:", exErr);

      if (existing?.id) {
        profileId = existing.id;

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: data.name,
            age: ageNum,
            height: heightNum,
            gender: genderValue,
            status: "active",
            city: data.city,
            sport: data.sport,
            level: data.level,
            availability: data.availability || "",
            bio: data.bio || ""
          })
          .eq("id", profileId);

        if (updateError) {
          console.error("update existing profile error:", updateError);
          throw new Error(updateError.message || "Update error");
        }
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("profiles")
          .insert({
            user_id: currentUser.id,
            name: data.name,
            age: ageNum,
            height: heightNum,
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

        if (insErr) {
          console.error("insert profile error:", insErr);
          // ✅ message lisible si RLS bloque (compte en review)
          throw new Error(insErr.message || "Insert error");
        }

        profileId = inserted.id;
      }
    } else {
      const updatePayload = {
        name: data.name,
        age: ageNum,
        gender: genderValue,
        city: data.city,
        sport: data.sport,
        level: data.level,
        availability: data.availability || "",
        bio: data.bio || ""
      };
      if (heightNum != null) updatePayload.height = heightNum;

      const { error: updateError } = await supabase.from("profiles").update(updatePayload).eq("id", profileId);

      if (updateError) {
        console.error("update profile error:", updateError);
        throw new Error(updateError.message || "Update error");
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
        throw new Error(updatePhotosErr.message || "Update photos error");
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
        throw new Error(updatePhotosErr.message || "Update photos error");
      }

      await deleteProfilePhotosFromStorage(removedUrls);
    }

    await fetchMyProfile();
    await fetchProfiles();
    await fetchCrushes();
    await fetchReviewStatus();

    setProfileToast(wasEdit ? "Profil mis à jour ✅" : "Profil créé ✅");
    window.clearTimeout(handleSaveProfile.__t);
    handleSaveProfile.__t = window.setTimeout(() => setProfileToast(""), 3000);

    setIsProfileModalOpen(false);
  };

  /* -------------------------------
     Filtres
  -------------------------------- */
  const handleFiltersChange = (partial) => setFilters((prev) => ({ ...prev, ...partial }));
  const handleResetFilters = () => setFilters({ sport: "", level: "", city: "", radiusKm: 0, myLocation: null });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const cityQuery = (filters.city || "").toLowerCase().trim();
      const radiusKm = Number(filters.radiusKm || 0);
      const myLoc = filters.myLocation;

      const base = profiles.filter((p) => {
        if (hiddenProfileIds.has(p.id)) return false;
        if (user && p.user_id === user.id) return false;


        // ✅ retire du feed les profils déjà matchés
        if (p.user_id && matchedUserIds.has(p.user_id)) return false;

        // ✅ retire du feed les profils déjà likés
        if (likedProfileIds.has(p.id)) return false;
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
        if (!cancelled) setFilteredProfiles(withShareInterstitial(base, 8));
        return;
      }

      if (!myLoc) {
        if (!cancelled) setFilteredProfiles(withShareInterstitial(base, 8));
        return;
      }

      const kept = [];
      for (const p of base) {
        const coords = await geocodeCity(p.city);
        if (!coords) continue;

        const d = haversineKm({ lat: myLoc.lat, lon: myLoc.lon }, { lat: coords.lat, lon: coords.lon });
        if (d <= radiusKm) kept.push(p);
      }

      if (!cancelled) setFilteredProfiles(withShareInterstitial(kept, 8));
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [profiles, filters, user, hiddenProfileIds, matchedUserIds, likedProfileIds]);

  /* -------------------------------
     Like/Swipe ✅ LIKE + SUPERLIKE + LIMIT 5/JOUR + MATCH
  -------------------------------- */
  const handleLike = async (profile, opts = {}) => {
    const isSuper = !!opts.isSuper;

    if (!user || isSuspended || isInReview) {
      if (isSuspended) setProfileToast("Compte suspendu — clique sur REPRENDRE pour continuer.");
      else if (isInReview) navigate("/review");
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
        setProfileToast("Limite atteinte : 5 superlikes par jour ⭐");
        window.clearTimeout(handleLike.__t);
        handleLike.__t = window.setTimeout(() => setProfileToast(""), 3000);
        return false;
      }
    }

    const { error: likeErr } = await supabase.from("likes").insert({
      liker_id: user.id,
      liked_profile_id: profile.id,
      is_super: isSuper
    });

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


    // ✅ retire immédiatement du feed (même avant le refresh)
    setLikedProfileIds((prev) => {
      const next = new Set(prev);
      next.add(profile.id);
      return next;
    });

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

      setMatchBoom({
        open: true,
        name: profile?.name || "Match",
        photoUrl: (profile?.photo_urls && profile.photo_urls[0]) || profile?.photo || ""
      });

      // ✅ push téléphone à l'autre (si token enregistré)
      try {
        const to_user_id = profile?.user_id;
        if (to_user_id) {
          await supabase.functions.invoke("notify", {
            body: {
              type: "match",
              to_user_id,
              title: "Nouveau match 🎉",
              body: "Vous avez un nouveau match !",
              data: { match_id: row?.match_id || row?.id || null }
            }
          });
        }
      } catch (e) {
        console.log("notify match error", e);
      }

    }

    fetchSuperlikers();
    fetchMyLikesAndPremium();
    return true;
  };

  const openProfileModal = () => {
    if (!user || isSuspended || isInReview) {
      if (isSuspended) setProfileToast("Compte suspendu — clique sur REPRENDRE pour continuer.");
      else if (isInReview) navigate("/review");
      else setIsAuthModalOpen(true);
      return;
    }
    setIsProfileModalOpen(true);
  };

  const openCrushesPage = () => {
    if (!user || isSuspended || isInReview) {
      if (isSuspended) setProfileToast("Compte suspendu — clique sur REPRENDRE pour continuer.");
      else if (isInReview) navigate("/review");
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
        {/* ✅ Page dédiée */}
        <Route path="/review" element={<AccountReview onLogout={handleLogout} />} />

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
              onReportProfile={reportProfile}
              userForUI={userForUI}
              isSuspended={isSuspended}
              isInReview={isInReview}
              loadingMyProfile={loadingMyProfile}
              myProfile={myProfile}
              handleSaveProfile={handleSaveProfile}
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
              user={userForUI && !isInReview ? userForUI : null}
              onRequireAuth={() => setIsAuthModalOpen(true)}
              crushes={crushes}
              superlikers={superlikers}
              myProfile={myProfile}
              onHideMatch={hideMatch}
            />
          }
        />

        <Route path="/chat/:matchId" element={<ChatPage />} />
        <Route path="/comment-ca-marche" element={<HowItWorks />} />
        <Route path="/conditions" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/confirmed" element={<Confirmed onOpenAuth={() => setIsAuthModalOpen(true)} />} />

        <Route
          path="/settings"
          element={<Settings user={userForUI} onClearHiddenProfiles={clearHiddenProfiles} />}
        />

        <Route path="/account" element={<AccountSettings user={userForUI} />} />
        <Route path="/subscription" element={<Subscription user={userForUI} premiumLikes={premiumLikes} />} />
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
