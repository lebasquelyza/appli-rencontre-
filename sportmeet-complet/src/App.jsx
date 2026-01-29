// sportmeet-complet/src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";

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
import { HiddenProfiles } from "./pages/HiddenProfiles";

const sendSessionToNative = (session) => {
  try {
    const access_token = session?.access_token ?? null;
    const refresh_token = session?.refresh_token ?? null;
    const expires_at = session?.expires_at ?? null;

    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "SUPABASE_SESSION",
          access_token,
          refresh_token,
          expires_at
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



const LEVEL_ORDER = ["Débutant", "Intermédiaire", "Confirmé"];

const SPORT_COMPAT = {
  Running: ["Fitness", "Cyclisme", "Randonnée"],
  Fitness: ["Running", "Musculation", "Natation"],
  Football: ["Basket", "Running", "Fitness"],
  Basket: ["Football", "Running", "Fitness"],
  Tennis: ["Running", "Fitness"],
  Cyclisme: ["Running", "Natation", "Randonnée"],
  Randonnée: ["Running", "Cyclisme"],
  Natation: ["Fitness", "Running", "Cyclisme"],
  Musculation: ["Fitness"]
};

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // ✅ Toujours en haut quand on change de page
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}


function availabilityTags(str = "") {
  const s = String(str || "").toLowerCase();
  const tags = new Set();
  if (s.includes("soir")) tags.add("soir");
  if (s.includes("matin")) tags.add("matin");
  if (s.includes("midi")) tags.add("midi");
  if (s.includes("week")) tags.add("weekend");
  if (s.includes("semaine")) tags.add("semaine");
  return tags;
}

function overlapScore(aTags, bTags) {
  if (!aTags.size || !bTags.size) return 0;
  let inter = 0;
  for (const t of aTags) if (bTags.has(t)) inter++;
  return inter / Math.max(aTags.size, bTags.size);
}

function levelDistance(a, b) {
  const ia = LEVEL_ORDER.indexOf(a);
  const ib = LEVEL_ORDER.indexOf(b);
  if (ia === -1 || ib === -1) return 2;
  return Math.abs(ia - ib);
}

// Score final (0..100)
function scoreCandidate({ myProfile, p, distanceKm }) {
  let score = 0;

  // SPORT
  if (myProfile?.sport && p?.sport) {
    if (p.sport === myProfile.sport) score += 45;
    else if ((SPORT_COMPAT[myProfile.sport] || []).includes(p.sport)) score += 25;
  } else {
    score += 5;
  }

  // NIVEAU
  if (myProfile?.level && p?.level) {
    const d = levelDistance(myProfile.level, p.level);
    score += d === 0 ? 20 : d === 1 ? 12 : 4;
  } else {
    score += 6;
  }

  // DISPO (overlap)
  const a = availabilityTags(myProfile?.availability || "");
  const b = availabilityTags(p?.availability || "");
  score += Math.round(overlapScore(a, b) * 20);

  // DISTANCE
  if (typeof distanceKm === "number" && isFinite(distanceKm)) {
    const distBonus = Math.max(0, 15 - (distanceKm / 100) * 15);
    score += distBonus;
  } else {
    score += 5;
  }

  // PROFIL COMPLET
  const photosCount = Array.isArray(p?.photo_urls) ? p.photo_urls.length : 0;
  if (photosCount >= 2) score += 5;
  if (String(p?.bio || "").length >= 30) score += 5;

  return score;
}

function safeFileExt(file) {
  const byMime = (file.type || "").split("/")[1];
  if (byMime) return byMime.replace("jpeg", "jpg");
  const byName = (file.name || "").split(".").pop();
  return (byName || "jpg").toLowerCase();
}

function randomId() {
  // ✅ Android/iOS safe (pas de crypto.randomUUID)
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2)
  );
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

// ✅ Seed fallback batch (shuffle + pas de répétition immédiate) pour avoir du contenu même si peu de clients
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeSeedBatch(seedProfiles, poolRef, lastKeyRef, count) {
  const out = [];
  const n = Array.isArray(seedProfiles) ? seedProfiles.length : 0;
  if (!n || count <= 0) return out;

  // init pool if empty
  if (!Array.isArray(poolRef.current) || poolRef.current.length === 0) {
    poolRef.current = shuffleArray(Array.from({ length: n }, (_, i) => i));
  }

  for (let i = 0; i < count; i++) {
    // refill pool if exhausted
    if (poolRef.current.length === 0) {
      poolRef.current = shuffleArray(Array.from({ length: n }, (_, k) => k));
    }

    // pick next index
    let idx = poolRef.current.shift();

    // anti répétition immédiate: si on retombe sur la même seed que la dernière, on swap avec la suivante si possible
    const candidateKey = `seed_base_${idx}`;
    if (candidateKey === lastKeyRef.current && poolRef.current.length > 0) {
      const idx2 = poolRef.current.shift();
      poolRef.current.unshift(idx); // remettre idx dans la file
      idx = idx2;
    }

    const base = seedProfiles[idx];
    const uid = `seed_${Date.now()}_${Math.random().toString(16).slice(2)}_${i}`;
    lastKeyRef.current = `seed_base_${idx}`;

    out.push({
      ...base,
      id: uid,
      user_id: null,
      isSeed: true,
      isCustom: false
    });
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


function hiddenMetaKeyForUser(userId) {
  return `matchfit_hidden_profiles_meta_${userId || "anon"}`;
}

function loadHiddenMeta(userId) {
  try {
    const raw = localStorage.getItem(hiddenMetaKeyForUser(userId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveHiddenMeta(userId, list) {
  try {
    localStorage.setItem(hiddenMetaKeyForUser(userId), JSON.stringify(Array.isArray(list) ? list : []));
  } catch {
    // ignore
  }
}


function filtersKeyForUser(userId) {
  return `matchfit_filters_${userId || "anon"}`;
}

function loadFilters(userId) {
  try {
    const raw = localStorage.getItem(filtersKeyForUser(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      sport: parsed.sport || "",
      level: parsed.level || "",
      city: parsed.city || "",
      radiusKm: Number(parsed.radiusKm || 0),
      myLocation: parsed.myLocation || null
    };
  } catch {
    return null;
  }
}

function saveFilters(userId, filters) {
  try {
    localStorage.setItem(filtersKeyForUser(userId), JSON.stringify(filters || {}));
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
  onDeleteMyProfile,
  onNeedMoreProfiles
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
                userId={user?.id || "anon"}
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

      {isAuthModalOpen &&
        createPortal(
          <>
            <div className="blur-underlay" onClick={() => setIsAuthModalOpen(false)} />
            <AuthModal onClose={() => setIsAuthModalOpen(false)} />
          </>,
          document.body
        )}
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

// ✅ Debug mobile: affiche une erreur lisible si le JS crash (évite écran vide)
useEffect(() => {
  if (typeof window === "undefined") return;
  if (window.__MF_ERROR_HOOK__) return;
  window.__MF_ERROR_HOOK__ = true;

  const show = (msg) => {
    try {
      const id = "mf-fatal";
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.style.position = "fixed";
        el.style.left = "12px";
        el.style.right = "12px";
        el.style.bottom = "12px";
        el.style.zIndex = "99999";
        el.style.padding = "10px 12px";
        el.style.borderRadius = "12px";
        el.style.background = "rgba(0,0,0,.78)";
        el.style.color = "white";
        el.style.fontSize = "12px";
        el.style.lineHeight = "1.35";
        el.style.whiteSpace = "pre-wrap";
        document.body.appendChild(el);
      }
      el.textContent = "Erreur app (Android/iPhone) :\n" + String(msg || "inconnue");
    } catch {}
  };

  window.addEventListener("error", (e) => show(e?.message || e?.error?.message));
  window.addEventListener("unhandledrejection", (e) => show(e?.reason?.message || e?.reason));
}, []);


const navigate = useNavigate();

  // ✅ FIX iPhone: on verrouille la hauteur
  useEffect(() => {
    const setAppHeight = () => {
      const h = window.innerHeight || document.documentElement.clientHeight || 0;
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

  // ✅ Infinite feed (pagination + fallback seed)
  const [profilesPage, setProfilesPage] = useState(0);
  const [hasMoreProfiles, setHasMoreProfiles] = useState(true);
  const [loadingMoreProfiles, setLoadingMoreProfiles] = useState(false);
  const seenUserIdsRef = useRef(new Set());
  const seedCursorRef = useRef(0);
  const seedPoolRef = useRef([]);
  const seedLastKeyRef = useRef("");

  const [filters, setFilters] = useState(() => {
    // ✅ garder les derniers filtres même après déconnexion/reconnexion
    const saved = typeof window !== "undefined" ? loadFilters("anon") : null;
    return (
      saved || {
        sport: "",
        level: "",
        city: "",
        radiusKm: 0,
        myLocation: null
      }
    );
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
  // ✅ personnes qui m'ont superlike
  const [superlikers, setSuperlikers] = useState([]);

  // ✅ modal "boom" quand match
  const [matchBoom, setMatchBoom] = useState({ open: false, name: "", photoUrl: "" });

  // ✅ profils masqués (signalés) — persistant localStorage
  const [hiddenProfileIds, setHiddenProfileIds] = useState(() => new Set());
  const [hiddenProfilesMeta, setHiddenProfilesMeta] = useState(() => []);

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
    setHiddenProfilesMeta(loadHiddenMeta(uid));

    // ✅ restaurer les filtres de cet utilisateur (sinon fallback anon)
    const f = loadFilters(uid) || loadFilters("anon");
    if (f) setFilters(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ sauvegarder les profils masqués dans localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const uid = user?.id || "anon";
    saveHiddenIds(uid, hiddenProfileIds);
  }, [hiddenProfileIds, user?.id]);

useEffect(() => {
  if (typeof window === "undefined") return;
  const uid = user?.id || "anon";
  saveHiddenMeta(uid, hiddenProfilesMeta);
}, [hiddenProfilesMeta, user?.id]);


  useEffect(() => {
    const h = window.location.hash || "";
    const isRecovery =
      h.includes("type=recovery") || (h.includes("access_token=") && h.includes("refresh_token="));
    if (isRecovery) {
      setIsAuthModalOpen(true);

      // ✅ important sur Expo Go (WebView persistante) : éviter de rester bloqué en reset au prochain lancement
      try {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch {
        // ignore
      }
    }
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
    try { saveFilters("anon", filters); } catch {}
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
      setHiddenProfilesMeta([]);

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(hiddenKeyForUser(uid));
      localStorage.removeItem(hiddenMetaKeyForUser(uid));
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
  
const upsertHiddenMeta = (profile, reason = "") => {
  const snap = {
    id: profile?.id,
    name: profile?.name || "",
    age: profile?.age ?? null,
    city: profile?.city || "",
    sport: profile?.sport || "",
    level: profile?.level || "",
    photo_url: Array.isArray(profile?.photo_urls) ? profile.photo_urls[0] : profile?.photo_url || "",
    reason: reason || "",
    at: new Date().toISOString(),
    isSeed: !!profile?.isSeed,
    user_id: profile?.user_id ?? null
  };
  setHiddenProfilesMeta((prev) => {
    const arr = Array.isArray(prev) ? prev.slice() : [];
    const idx = arr.findIndex((x) => x?.id === snap.id);
    if (idx >= 0) arr[idx] = { ...arr[idx], ...snap };
    else arr.unshift(snap);
    return arr.slice(0, 200);
  });
};

const unhideOneProfile = (profileId) => {
  if (!profileId) return;
  setHiddenProfileIds((prev) => {
    const next = new Set(prev);
    next.delete(profileId);
    return next;
  });
  setHiddenProfilesMeta((prev) => (Array.isArray(prev) ? prev.filter((p) => p?.id !== profileId) : []));
};

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

        // 🚫 Profil seed / sans user_id (donc pas en base) → pas d'envoi DB, on masque seulement
    if (profile?.isSeed || !profile?.user_id) {
      setHiddenProfileIds(prev => {
        const next = new Set(prev);
        next.add(profile.id);
        return next;
      });
      upsertHiddenMeta(profile, reason);
      setProfileToast("Profil masqué ✅");
      return;
    }
    const { error } = await supabase.from("profile_reports").insert({
      reporter_id: user.id,
      reported_profile_id: profile.id,
      reported_user_id: profile.user_id ?? null,
      reason,
      details: details || null,
    });

    const msg = String(error?.message || "").toLowerCase();
    const isDup = msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists");
    if (error && isDup) {
      setHiddenProfileIds((prev) => {
        const next = new Set(prev);
        next.add(profile.id);
        return next;
      });
      setProfileToast("Tu as déjà signalé ce profil. Il est masqué ✅");
    } else if (error) {
      console.error("reportProfile error:", { error, profileId: profile?.id, reporterId: user?.id, payload });
      setProfileToast(error?.message || "Impossible de signaler ce profil.");
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
     ✅ Mes likes (pour retirer du feed)
  -------------------------------- */
  const fetchMyLikes = async () => {
    if (!user?.id) {
      setLikedProfileIds(new Set());
      return;
    }

    const { data: likesRows, error: lErr } = await supabase
      .from("likes")
      .select("liked_profile_id, created_at")
      .eq("liker_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (lErr) {
      console.error("fetchMyLikes error:", lErr);
      setLikedProfileIds(new Set());
      return;
    }

    const likedIds = Array.from(
      new Set((likesRows || []).map((x) => x.liked_profile_id).filter(Boolean))
    );

    setLikedProfileIds(new Set(likedIds));
  };

  useEffect(() => {
    fetchMyLikes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* -------------------------------
     Fetch tous les profils
  -------------------------------- */
  const fetchProfiles = async ({ reset = false } = {}) => {
    // reset = true : recharge depuis la page 0
    if (loadingMoreProfiles) return;

    setLoadingProfiles(true);
    setProfilesError(null);

    if (reset) {
      setProfiles([]);
      setProfilesPage(0);
      setHasMoreProfiles(true);
      seenUserIdsRef.current = new Set();
      seedCursorRef.current = 0;
    }

    const page = reset ? 0 : profilesPage;
    const from = page * 30;
    const to = from + 30 - 1;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Supabase fetch profiles error:", error);
        setProfilesError("Impossible de charger les profils pour le moment.");
        // fallback immédiat seed
        const seedBatch = makeSeedBatch(seedProfiles, seedPoolRef, seedLastKeyRef, 30);        setProfiles(seedBatch.length ? seedBatch : seedProfiles);
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

      // ✅ on garde seulement le plus récent par user_id (ordre desc => 1er rencontré)
      const nextReal = [];
      for (const p of mapped) {
        if ((p.status ?? "active") !== "active") continue;
        if (p.user_id) {
          if (seenUserIdsRef.current.has(p.user_id)) continue;
          seenUserIdsRef.current.add(p.user_id);
        }
        nextReal.push(p);
      }

      // ✅ plus de pages ?
      if ((data || []).length < 30) setHasMoreProfiles(false);

      // ✅ si tout début et pas assez de profils, on complète avec des seeds
      const MIN_PROFILES_TO_SHOW = 30;
      const merged = reset ? nextReal : null;

      if (reset) {
        const need = Math.max(0, MIN_PROFILES_TO_SHOW - nextReal.length);
        const seedBatch = makeSeedBatch(seedProfiles, seedPoolRef, seedLastKeyRef, need);        setProfiles([...nextReal, ...seedBatch]);
      } else {
        setProfiles((prev) => [...prev, ...nextReal]);
      }

      setProfilesPage(page + 1);
      setLoadingProfiles(false);
    } catch (e) {
      console.error("fetchProfiles exception:", e);
      const seedBatch = makeSeedBatch(seedProfiles, seedPoolRef, seedLastKeyRef, 30);      setProfiles(seedBatch.length ? seedBatch : seedProfiles);
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    fetchProfiles({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Charge plus de profils (réels si dispo, sinon seeds en attendant plus de clients)
  const loadMoreProfiles = async () => {
    if (loadingMoreProfiles) return;
    setLoadingMoreProfiles(true);
    try {
      if (hasMoreProfiles) {
        await fetchProfiles({ reset: false });
      } else {
        const seedBatch = makeSeedBatch(seedProfiles, seedPoolRef, seedLastKeyRef, 20);        if (seedBatch.length) setProfiles((prev) => [...prev, ...seedBatch]);
      }
    } finally {
      setLoadingMoreProfiles(false);
    }
  };

  /* -------------------------------
     Realtime profiles
  -------------------------------- */
  useEffect(() => {
    const channel = supabase
      .channel("profiles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchProfiles({ reset: true });
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
        const scored = base
          .map((p) => ({ p, s: scoreCandidate({ myProfile, p, distanceKm: null }) }))
          .sort((a, b) => b.s - a.s)
          .map((x) => x.p);

        if (!cancelled) setFilteredProfiles(withShareInterstitial(scored, 8));
        return;
      }

      if (!myLoc) {
        const scored = base
          .map((p) => ({ p, s: scoreCandidate({ myProfile, p, distanceKm: null }) }))
          .sort((a, b) => b.s - a.s)
          .map((x) => x.p);

        if (!cancelled) setFilteredProfiles(withShareInterstitial(scored, 8));
        return;
      }

      const kept = [];
      for (const p of base) {
        const coords = await geocodeCity(p.city);
        if (!coords) continue;

        const d = haversineKm({ lat: myLoc.lat, lon: myLoc.lon }, { lat: coords.lat, lon: coords.lon });
        if (d <= radiusKm) kept.push({ p, d });
      }

      const scored = kept
        .map(({ p, d }) => ({ p, s: scoreCandidate({ myProfile, p, distanceKm: d }) }))
        .sort((a, b) => b.s - a.s)
        .map((x) => x.p);

      if (!cancelled) setFilteredProfiles(withShareInterstitial(scored, 8));
      };

    run();
    return () => {
      cancelled = true;
    };
  }, [profiles, filters, user, myProfile, hiddenProfileIds, matchedUserIds, likedProfileIds]);

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
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);

  // Lundi 00:00 (semaine calendaire)
  const day = (startOfWeek.getDay() + 6) % 7; // Lundi=0 ... Dimanche=6
  startOfWeek.setDate(startOfWeek.getDate() - day);

  const { count, error: cntErr } = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .eq("liker_id", user.id)
    .eq("is_super", true)
    .gte("created_at", startOfWeek.toISOString());

  if (cntErr) console.error("superlike count error:", cntErr);

  if ((count || 0) >= 5) {
    setProfileToast("Tu as atteint la limite des 5 superlikes pour la semaine 😉");
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
    }

    fetchSuperlikers();
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
      <ScrollToTop />
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
              onNeedMoreProfiles={loadMoreProfiles}
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
          element={<Settings user={userForUI} onClearHiddenProfiles={clearHiddenProfiles} hiddenCount={hiddenProfilesMeta.length} />}
        />

        
<Route
  path="/hidden-profiles"
  element={
    <HiddenProfiles
      user={userForUI}
      hiddenProfiles={hiddenProfilesMeta}
      onUnhideOne={unhideOneProfile}
      onClearAll={clearHiddenProfiles}
    />
  }
/>
<Route path="/account" element={<AccountSettings user={userForUI} />} />
        <Route path="/subscription" element={<Subscription user={userForUI} />} />
      </Routes>

      

      {/* =============================== */}
      {/* 🔥 MODALS GLOBALES (PORTAL) */}
      {/* =============================== */}

      {isProfileModalOpen &&
        createPortal(
          <div
            className="modal-backdrop modal-backdrop--blur"
            onClick={() => setIsProfileModalOpen(false)}
          >
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
                  onClick={handleDeleteMyProfile}
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
          </div>,
          document.body
        )}

      {/* ✅ Aperçu en GRAND + fond dégradé/blur */}
      {isPreviewModalOpen &&
        createPortal(
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
          </div>,
          document.body
        )}


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
