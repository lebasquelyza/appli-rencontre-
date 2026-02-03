// sportmeet-complet/src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function MusicLibraryModal({ open, onClose, userId }) {
  const [tab, setTab] = useState("library");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState([]);

  const [libLoading, setLibLoading] = useState(false);
  const [libErr, setLibErr] = useState("");
  const [libScope, setLibScope] = useState("all");
  const [libQuery, setLibQuery] = useState("");
  const [library, setLibrary] = useState([]);

  const audioRef = React.useRef(null);
  const previewStopTimerRef = React.useRef(null);
  const [playingId, setPlayingId] = useState(null);

  const stop = () => {
    try {
      if (previewStopTimerRef.current) clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = null;
      const a = audioRef.current;
      if (a) { a.pause(); a.currentTime = 0; a.src = ""; }
    } catch {}
    setPlayingId(null);
  };

  const playPreview = (t) => {
    if (!t?.preview_url) return;
    const id = t.track_id || t.id;
    if (playingId === id) { stop(); return; }
    stop();
    try {
      const a = audioRef.current;
      if (!a) return;
      a.src = t.preview_url;
      a.currentTime = 0;
      const p = a.play();
      if (p?.catch) p.catch(() => {});
      setPlayingId(id);
      previewStopTimerRef.current = setTimeout(() => { try { a.pause(); } catch {} setPlayingId(null); }, 30000);
    } catch {}
  };

  const runSearch = async () => {
    const term = String(q || "").trim();
    if (!term) { setErr("Tape un titre ou un artiste."); return; }
    setLoading(true); setErr(""); stop();
    try {
      const res = await fetch(`/.netlify/functions/music-search?term=${encodeURIComponent(term)}&limit=25`);
      const data = await res.json();
      const list = Array.isArray(data?.results) ? data.results : [];
      setResults(list);
      if (!list.length) setErr("Aucun résultat.");
    } catch (e) {
      console.error("music-search error:", e);
      setErr("Recherche impossible.");
      setResults([]);
    } finally { setLoading(false); }
  };

  const loadLibrary = async () => {
    if (!userId) return;
    setLibLoading(true); setLibErr("");
    try {
      const { data, error } = await supabase
        .from("music_library")
        .select("id, owner_id, provider, track_id, title, artist, artwork, preview_url, external_url, created_at, created_by")
        .or(`owner_id.is.null,owner_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) { console.error("music_library select error:", error); setLibErr("Impossible de charger la bibliothèque."); setLibrary([]); return; }
      setLibrary(data || []);
    } catch (e) {
      console.error("music_library load exception:", e);
      setLibErr("Impossible de charger la bibliothèque.");
      setLibrary([]);
    } finally { setLibLoading(false); }
  };

  const addToLibrary = async (t) => {
    if (!userId) { setErr("Connecte-toi pour ajouter un son."); return; }
    setLoading(true); setErr("");
    try {
      const payload = {
        owner_id: userId,
        created_by: userId,
        provider: "spotify",
        track_id: String(t?.track_id || ""),
        title: String(t?.title || ""),
        artist: String(t?.artist || ""),
        artwork: String(t?.artwork || ""),
        preview_url: String(t?.preview_url || ""),
        external_url: String(t?.external_url || "")
      };
      const { error } = await supabase.from("music_library").insert(payload);
      if (error) { console.error("music_library insert error:", error); setErr("Déjà dans la bibliothèque (ou ajout impossible)."); }
      else { setErr("Ajouté à tes sons ✅"); loadLibrary(); }
    } catch (e) {
      console.error("music_library insert exception:", e);
      setErr("Impossible d’ajouter à la bibliothèque.");
    } finally { setLoading(false); }
  };

  const removeFromLibrary = async (row) => {
    if (!userId) return;
    const ok = window.confirm("Supprimer ce son de la bibliothèque ?");
    if (!ok) return;
    setLibLoading(true); setLibErr("");
    try {
      const { error } = await supabase.from("music_library").delete().eq("id", row.id);
      if (error) { console.error("music_library delete error:", error); setLibErr("Suppression impossible."); }
      else loadLibrary();
    } finally { setLibLoading(false); }
  };

  useEffect(() => {
    if (!open) return;
    setTab("library"); setQ(""); setResults([]); setErr("");
    setLibErr(""); setLibQuery(""); setLibScope("all");    stop();
    if (userId) loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const filteredLibrary = React.useMemo(() => {
    const qx = String(libQuery || "").trim().toLowerCase();
    return (library || []).filter((r) => {
      const isGlobal = r.owner_id == null;
      if (libScope === "global" && !isGlobal) return false;
      if (libScope === "mine" && isGlobal) return false;
      if (!qx) return true;
      return (`${r.title || ""} ${r.artist || ""}`).toLowerCase().includes(qx);
    });
  }, [library, libQuery, libScope]);

  if (!open) return null;

  return (
    


            {/* ✅ Mes infos (toujours visible, non modifiable) */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Mes infos</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>Informations de ton compte.</p>

              <div className="form" style={{ marginTop: 12 }}>
                <div className="form-group">
  <label>Email</label>
  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    <input
      type="email"
      value={email || "Non renseigné"}
      disabled
      readOnly
      style={{ ...whiteDisabledInputStyle, flex: "1 1 260px", minWidth: 240 }}
    />

    <button
      type="button"
      className="btn-ghost btn-sm"
      onClick={() => {
        setOpenEmailEdit((v) => !v);
        setNewEmail("");
      }}
      disabled={!user || loading}
      style={{ padding: "8px 10px" }}
    >
      {openEmailEdit ? "Annuler" : "Modifier"}
    </button>
  </div>
</div>

{openEmailEdit && (
  <>
    <div className="form-group">
      <label>Nouvelle adresse email</label>
      <input
        type="email"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        disabled={!user || loading}
        placeholder="nouvel@email.com"
        autoComplete="email"
      />
      <small style={{ display: "block", marginTop: 6, opacity: 0.75, lineHeight: 1.3 }}>
        Tu devras confirmer via un email (comme à l’inscription). Ton compte et ton ID ne changent pas.
      </small>
    </div>

    <button
      type="button"
      className="btn-primary btn-sm"
      onClick={changeEmail}
      disabled={!user || loading || !newEmail}
      style={{ padding: "10px 12px", width: "fit-content" }}
    >
      Confirmer l’email
    </button>
  </>
)}

                <div className="form-group">
                  <label>Nom</label>
                  <input value={displayName} disabled readOnly style={whiteDisabledInputStyle} />
                </div>

                <div className="form-group">
                  <label>Âge</label>
                  <input type="text" value={displayAge} disabled readOnly style={whiteDisabledInputStyle} />
                </div>

                {loading ? <small style={{ display: "block", marginTop: 6, opacity: 0.75 }}>...</small> : null}
              </div>
            </div>

            {/* ✅ Comment ça marche */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Comment ça marche</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Comprendre le swipe, les superlikes (5/semaine), les matchs et la sécurité.
              </p>

              <button className="btn-primary" onClick={() => navigate("/comment-ca-marche")}>
                Ouvrir
              </button>
            </div>

            {/* ✅ Mot de passe (dépliable) */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Mot de passe</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Change ton mot de passe (on n’affiche jamais l’ancien).
              </p>

              <button className="btn-primary" onClick={() => setOpenPassword((v) => !v)} disabled={!user}>
                {openPassword ? "Fermer" : "Ouvrir"}
              </button>

              {openPassword && (
                <div className="form" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      disabled={!user || loading}
                      autoComplete="new-password"
                      placeholder="6 caractères minimum"
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirmer</label>
                    <input
                      type="password"
                      value={newPass2}
                      onChange={(e) => setNewPass2(e.target.value)}
                      disabled={!user || loading}
                      autoComplete="new-password"
                      placeholder="Répète le mot de passe"
                    />
                  </div>

                  <button className="btn-primary" onClick={changePassword} disabled={!user || loading}>
                    Changer le mot de passe
                  </button>
                </div>
              )}
            </div>
{/* ✅ Configuration */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Configuration</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>Modifier ton profil, tes infos et tes préférences.</p>
              <button className="btn-primary" onClick={() => navigate("/account")} disabled={!user}>
                Configurer
              </button>
            </div>

            {/* ✅ Abonnement */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Abonnement</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>Gère ton abonnement (activation bientôt).</p>
              <button className="btn-primary" onClick={() => navigate("/subscription")} disabled={!user}>
                Ouvrir
              </button>
            </div>

            {/* ✅ Conditions */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Conditions d’utilisation</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>Règles, âge minimum (16+), contenu, suspension/bloquage.</p>
              <button className="btn-primary" onClick={() => navigate("/conditions")}>
                Ouvrir
              </button>
            </div>

            
            {/* 🎵 Bibliothèque musique */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Bibliothèque musique</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Accède aux sons globaux + tes sons, et ajoute des musiques depuis Spotify.
              </p>
              <button className="btn-primary" onClick={() => setMusicLibOpen(true)}>
                Ouvrir
              </button>
            </div>

            {/* ✅ Cookies */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Cookies</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Informations sur les cookies et le fonctionnement des sessions.
              </p>
              <button className="btn-primary" onClick={() => navigate("/cookies")}>
                Ouvrir
              </button>
            </div>

            {/* ✅ Nous contacter */}
            <div className="card" style={{ padding: 14 }}>
              <h3 style={{ marginTop: 0 }}>Nous contacter</h3>
              <p style={{ opacity: 0.85, marginTop: 6 }}>
                Une question ou besoin d’aide ? Écris-nous à{" "}
                <a href="mailto:sportifandpro@gmail.com" style={primaryLinkStyle}>
                  sportifandpro@gmail.com
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
          <MusicLibraryModal open={musicLibOpen} onClose={() => setMusicLibOpen(false)} userId={user?.id} />
    </main>
  );
}
