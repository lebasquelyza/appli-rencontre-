import React, { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ProfileForm } from "./components/ProfileForm";
import { FiltersBar } from "./components/FiltersBar";
import { SwipeDeck } from "./components/SwipeDeck";
import { AuthModal } from "./components/AuthModal";
import { MatchesPage } from "./components/MatchesPage";
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
  const [view, setView] = useState("swipe"); // "swipe" | "matches"

  const [profiles, setProfiles] = useState([]);
  const [filters, setFilters] = useState({ sport: "", level: "", city: "" });

  const [highlightNewProfile, setHighlightNewProfile] = useState(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState(null);

  const [user, setUser] = useState(null);
  const [myProfileId, setMyProfileId] = useState(null);

  // popup match
  const [matchPopup, setMatchPopup] = useState(null);
  // { matchId, otherProfile }

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
     Profiles
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

  const fetchMyProfileId = async () => {
    if (!user) {
      setMyProfileId(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) console.error("fetch my profile id error:", error);
    setMyProfileId(data?.id ?? null);
  };

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMyProfileId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* -------------------------------
     Upload photos
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
     Create profile (requires auth)
  -------------------------------- */
  const handleCreateProfile = async (data) => {
    const photos = Array.isArray(data.photos) ? data.photos : [];
    if (photos.length < 1) throw new Error("PHOTO_REQUIRED");
    if (photos.length > 5) throw new Error("MAX_5_PHOTOS");

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user ?? null;

    if (!currentUser) {
      setIsAuthModalOpen(true);
      throw new Error("AUTH_REQUIRED");
    }

    const optimisticId = `user-${Date.now()}`;

    const optimisticProfile = {
      id: optimisticId,
      user_id: currentUser.id,
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
      .select("id")
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      setProfiles((prev) => prev.filter((p) => p.id !== optimisticId));
      throw insertError;
    }

    const profileId = inserted.id;

    try {
      const urls = await uploadProfilePhotos(profileId, photos);
      if (!urls.length) throw new Error("UPLOAD_RETURNED_EMPTY_URLS");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ photo_urls: urls })
        .eq("id", profileId);

      if (updateError) throw updateError;

      // update optimistic + refresh myProfileId
      setProfiles((prev) =>
        prev.map((p) => (p.id === optimisticId ? { ...p, photo_urls: urls, id: profileId } : p))
      );
    } catch (err) {
      await supabase.from("profiles").delete().eq("id", profileId);
      setProfiles((prev) => prev.filter((p) => p.id !== optimisticId));
      throw err;
    }

    await fetchProfiles();
    await fetchMyProfileId();
  };

  /* -------------------------------
     Filters
  -------------------------------- */
  const handleFiltersChange = (partial) => setFilters((prev) => ({ ...prev, ...partial }));
  const handleResetFilters = () => setFilters({ sport: "", level: "", city: "" });

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // ne pas montrer mon propre profil dans le swipe
      if (user && p.user_id === user.id) return false;

      if (filters.sport) {
        if (filters.sport === "Autre") {
          if (STANDARD_SPORTS.includes(p.sport)) return false;
        } else if (p.sport !== filters.sport) return false;
      }
      if (filters.level && p.level !== filters.level) return false;
      if (filters.city && !p.city.toLowerCase().includes(filters.city.toLowerCase().trim())) return false;
      return true;
    });
  }, [profiles, filters, user]);

  /* -------------------------------
     LIKE -> MATCH MUTUEL -> POPUP MESSAGE
  -------------------------------- */
  const handleLikeProfile = async (profile) => {
    const { data: authData } = await supabase.auth.getUser();
    const me = authData?.user ?? null;

    if (!me) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!myProfileId) {
      // l’utilisateur doit d’abord créer son profil
      setIsProfileModalOpen(true);
      alert("Crée ton profil avant de liker 🙂");
      return;
    }

    const otherUserId = profile?.user_id;
    if (!otherUserId) {
      // profil démo / sans user
      return;
    }

    // 1) j’enregistre mon like (moi -> profil de l'autre)
    const { error: likeErr } = await supabase.from("likes").insert({
      liker_id: me.id,
      liked_profile_id: profile.id
    });

    // si déjà liké : pas grave
    if (likeErr && !String(likeErr.message || "").toLowerCase().includes("duplicate")) {
      console.error("like insert error:", likeErr);
      return;
    }

    // 2) vérifier si l'autre a déjà liké mon profil (other user -> my profile id)
    const { data: reverse, error: reverseErr } = await supabase
      .from("likes")
      .select("id")
      .eq("liker_id", otherUserId)
      .eq("liked_profile_id", myProfileId)
      .limit(1);

    if (reverseErr) console.error("reverse like check error:", reverseErr);

    const isMutual = Array.isArray(reverse) && reverse.length > 0;
    if (!isMutual) return;

    // 3) créer / récupérer le match
    const { data: existing, error: existingErr } = await supabase
      .from("matches")
      .select("*")
      .or(
        `and(user1_id.eq.${me.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${me.id})`
      )
      .limit(1);

    if (existingErr) console.error("existing match error:", existingErr);

    let matchRow = Array.isArray(existing) && existing.length ? existing[0] : null;

    if (!matchRow) {
      const { data: created, error: createErr } = await supabase
        .from("matches")
        .insert({ user1_id: me.id, user2_id: otherUserId })
        .select("*")
        .single();

      if (createErr) {
        // si course condition, on refetch
        console.error("create match error:", createErr);
        const { data: retry } = await supabase
          .from("matches")
          .select("*")
          .or(
            `and(user1_id.eq.${me.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${me.id})`
          )
          .limit(1);
        matchRow = Array.isArray(retry) && retry.length ? retry[0] : null;
      } else {
        matchRow = created;
      }
    }

    if (!matchRow) return;

    // 4) popup "c’est un match"
    setMatchPopup({ matchId: matchRow.id, otherProfile: profile });
  };

  const sendFirstMessage = async (matchId, text) => {
    const body = (text || "").trim();
    if (!body) return;

    const { data: authData } = await supabase.auth.getUser();
    const me = authData?.user ?? null;
    if (!me) return;

    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: me.id,
      body
    });
    if (error) {
      console.error("send first message error:", error);
      alert("Impossible d’envoyer le message pour le moment.");
      return;
    }

    setMatchPopup(null);
    setView("matches");
  };

  return (
    <div className="app-root">
      <Header
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        user={user}
      />

      <main className="page">
        <div className="shell">
          {/* mini nav simple */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              className={`btn-ghost btn-sm ${view === "swipe" ? "chip-accent" : ""}`}
              type="button"
              onClick={() => setView("swipe")}
            >
              Profils
            </button>
            <button
              className={`btn-ghost btn-sm ${view === "matches" ? "chip-accent" : ""}`}
              type="button"
              onClick={() => setView("matches")}
            >
              Matchs
            </button>
          </div>

          {view === "matches" ? (
            <MatchesPage onBack={() => setView("swipe")} />
          ) : (
            <section className="card card-results">
              <FiltersBar filters={filters} onChange={handleFiltersChange} onReset={handleResetFilters} />

              {!user && (
                <p className="form-message" style={{ marginTop: 8 }}>
                  Connecte-toi pour liker, matcher et discuter.
                </p>
              )}

              {user && !myProfileId && (
                <p className="form-message" style={{ marginTop: 8 }}>
                  Crée ton profil (bouton “Profil”) pour pouvoir liker et matcher.
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
                <SwipeDeck profiles={filteredProfiles} onLikeProfile={handleLikeProfile} />
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
              <ProfileForm onCreateProfile={handleCreateProfile} />
            </div>
          </div>
        </div>
      )}

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}

      {/* Popup Match */}
      {matchPopup && (
        <MatchPopup
          matchPopup={matchPopup}
          onClose={() => setMatchPopup(null)}
          onOpenMatches={() => {
            setMatchPopup(null);
            setView("matches");
          }}
          onSend={(text) => sendFirstMessage(matchPopup.matchId, text)}
        />
      )}

      <Footer />
    </div>
  );
}

function MatchPopup({ matchPopup, onClose, onOpenMatches, onSend }) {
  const other = matchPopup.otherProfile;
  const [text, setText] = useState("Salut 👋 On s’entraîne quand ?");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🎉 C’est un match !</h3>
          <button className="btn-ghost" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="modal-body">
          <p className="card-subtitle" style={{ marginTop: 0 }}>
            Vous vous êtes likés avec <b>{other?.name || "quelqu’un"}</b>. Envoie un message 👇
          </p>

          <div className="form" style={{ gap: 10 }}>
            <div className="form-group">
              <label>Message</label>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Écrire un message…" />
            </div>

            <button className="btn-primary btn-block" type="button" onClick={() => onSend(text)}>
              Envoyer le message
            </button>

            <button className="btn-ghost btn-block" type="button" onClick={onOpenMatches}>
              Voir mes matchs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
