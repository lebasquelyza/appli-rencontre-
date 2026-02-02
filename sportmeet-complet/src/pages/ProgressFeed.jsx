// sportmeet-complet/src/pages/ProgressFeed.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const LS_VIDEO_VOL = "mf_feed_video_vol";
const LS_MUSIC_VOL = "mf_feed_music_vol";

function readVol(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.min(1, Math.max(0, n));
  } catch {}
  return fallback;
}

function formatAgo(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}j`;
}

function useVisibility(threshold = 0.65) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => setVisible(!!entries?.[0]?.isIntersecting),
      { threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible];
}

function CommentsModal({ open, onClose, postId, user, onPosted }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    if (!postId) return;
    setLoading(true);
    setErr("");

    try {
      const { data, error } = await supabase
        .from("progress_comments")
        .select("id, post_id, user_id, body, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(80);

      if (error) {
        console.error("comments fetch error:", error);
        setErr("Impossible de charger les commentaires.");
        setRows([]);
        return;
      }

      const list = data || [];
      const authorIds = Array.from(new Set(list.map((c) => c.user_id).filter(Boolean)));
      const authorByUser = new Map();

      if (authorIds.length) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, name, photo_urls, created_at")
          .in("user_id", authorIds)
          .order("created_at", { ascending: false });

        if (pErr) console.error("comments profiles error:", pErr);

        for (const p of profs || []) {
          if (!p.user_id) continue;
          if (!authorByUser.has(p.user_id)) {
            authorByUser.set(p.user_id, {
              name: p.name || "Utilisateur",
              photo: Array.isArray(p.photo_urls) ? p.photo_urls[0] : ""
            });
          }
        }
      }

      setRows(
        list.map((c) => {
          const a = authorByUser.get(c.user_id) || { name: "Utilisateur", photo: "" };
          return { ...c, author_name: a.name, author_photo: a.photo };
        })
      );
    } catch (e) {
      console.error("comments load exception:", e);
      setErr("Impossible de charger les commentaires.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId]);

  const submit = async () => {
    if (!user?.id) {
      setErr("Connecte-toi pour commenter.");
      return;
    }
    const text = String(body || "").trim();
    if (!text) return;

    setLoading(true);
    setErr("");

    try {
      const { error } = await supabase.from("progress_comments").insert({
        post_id: postId,
        user_id: user.id,
        body: text
      });

      if (error) {
        console.error("comment insert error:", error);
        setErr(error.message || "Impossible d'envoyer le commentaire.");
        return;
      }

      setBody("");
      await load();
      onPosted?.();
    } catch (e) {
      console.error("comment submit exception:", e);
      setErr("Impossible d'envoyer le commentaire.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop modal-backdrop--blur" onClick={onClose}>
      <div
        className="modal-card modal-card--sheet allowScroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, 98vw)",
          maxHeight: "calc(var(--appH, 100vh) - 18px)",
          overflow: "hidden",
          borderRadius: 18
        }}
      >
        <div className="modal-header" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <h3 style={{ marginRight: "auto" }}>Commentaires</h3>
          <button className="btn-ghost btn-sm" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="modal-body modal-body--scroll allowScroll" style={{ paddingTop: 8 }}>
          {err ? (
            <p className="form-message error" style={{ marginBottom: 10 }}>
              {err}
            </p>
          ) : null}

          {loading ? (
            <p className="form-message">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="form-message">Aucun commentaire. Sois le/la premier(e) 🙂</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {rows.map((c) => (
                <div key={c.id} className="card" style={{ padding: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <img
                      src={c.author_photo || "/avatar.png"}
                      alt={c.author_name}
                      style={{ width: 28, height: 28, borderRadius: 999, objectFit: "cover" }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/avatar.png";
                      }}
                    />
                    <div style={{ lineHeight: 1.15 }}>
                      <div style={{ fontWeight: 800 }}>{c.author_name}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>{formatAgo(c.created_at)}</div>
                    </div>
                  </div>
                  <p style={{ margin: "8px 0 0", lineHeight: 1.35 }}>{c.body}</p>
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ padding: 12, marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Ajouter un commentaire</div>
            <textarea
              className="input"
              rows={2}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={user?.id ? "Écris un commentaire…" : "Connecte-toi pour commenter"}
              disabled={!user?.id || loading}
              style={{ width: "100%", resize: "vertical" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button className="btn-primary btn-sm" onClick={submit} disabled={!user?.id || loading || !body.trim()}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressItem({ post, user, onLike, liked, onOpenComments, onDeleted }) {
  const [ref, visible] = useVisibility(0.65);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // Global user preferences multipliers (from Settings)
  const [globalVideoVol, setGlobalVideoVol] = useState(() => readVol(LS_VIDEO_VOL, 1));
  const [globalMusicVol, setGlobalMusicVol] = useState(() => readVol(LS_MUSIC_VOL, 0.6));

  useEffect(() => {
    // Keep synced even in same tab
    const t = window.setInterval(() => {
      setGlobalVideoVol(readVol(LS_VIDEO_VOL, 1));
      setGlobalMusicVol(readVol(LS_MUSIC_VOL, 0.6));
    }, 800);
    return () => window.clearInterval(t);
  }, []);

  const baseVideoVol = Number(post.video_volume ?? 1);
  const baseMusicVol = Number(post.music_volume ?? 0.6);
  const effectiveVideoVol = Math.min(1, Math.max(0, globalVideoVol * baseVideoVol));
  const effectiveMusicVol = Math.min(1, Math.max(0, globalMusicVol * baseMusicVol));

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.volume = effectiveVideoVol;
    const a = audioRef.current;
    if (a) a.volume = effectiveMusicVol;
  }, [effectiveVideoVol, effectiveMusicVol]);

    useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;

    const playMusic = async () => {
      if (!post.music_url || !a) return;
      try {
        const start = Math.min(29, Math.max(0, Number(post.music_start_sec || 0)));
        a.currentTime = start;
        const pa = a.play();
        if (pa?.catch) pa.catch(() => {});
      } catch {}
    };

    const stopMusic = () => {
      try {
        a?.pause();
      } catch {}
    };

    if (visible) {
      if (post.media_type === "video") {
        // Autoplay video, but DO NOT autoplay music (music starts on user pause)
        try {
          const pv = v?.play();
          if (pv?.catch) pv.catch(() => {});
        } catch {}
        stopMusic();
      } else {
        // Photo post: autoplay music when visible
        stopMusic();
        playMusic();
      }
    } else {
      try {
        v?.pause();
      } catch {}
      stopMusic();
    }
  }, [visible, post.media_type, post.music_url, post.music_start_sec]);


  const onVideoTap = async () => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;

    const hasMusic = !!post.music_url && !!a;
    const start = Math.min(29, Math.max(0, Number(post.music_start_sec || 0)));

    if (!v.paused) {
      // User pauses -> start music (user gesture)
      try {
        v.pause();
      } catch {}
      if (hasMusic) {
        try {
          a.currentTime = start;
          const p = a.play();
          if (p?.catch) p.catch(() => {});
        } catch {}
      }
    } else {
      // User resumes -> stop music, resume video
      if (hasMusic) {
        try {
          a.pause();
        } catch {}
      }
      try {
        const p = v.play();
        if (p?.catch) p.catch(() => {});
      } catch {}
    }
  };
  const canDelete = !!user?.id && user.id === post.user_id;

  const deletePost = async () => {
    if (!canDelete) return;
    const ok = window.confirm("Supprimer ce post ?");
    if (!ok) return;

    const { error } = await supabase.from("progress_posts").update({ is_deleted: true }).eq("id", post.id);
    if (error) {
      console.error("delete post error:", error);
      return;
    }
    onDeleted?.(post.id);
  };

  const authorName = post?.author_name || "Utilisateur";
  const authorPhoto = post?.author_photo || "";

  return (
    <article
      ref={ref}
      className="card"
      style={{
        scrollSnapAlign: "start",
        padding: 12,
        borderRadius: 18,
        overflow: "hidden"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <img
          src={authorPhoto || "/avatar.png"}
          alt={authorName}
          style={{ width: 34, height: 34, borderRadius: 999, objectFit: "cover" }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/avatar.png";
          }}
        />
        <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {authorName}
          </div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{formatAgo(post.created_at)}</div>
        </div>

        {canDelete ? (
          <button className="btn-ghost btn-sm" onClick={deletePost} title="Supprimer">
            🗑️
          </button>
        ) : null}
      </div>

      {/* Media (TikTok logic: autoplay on visible) */}
      <div
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          background: "#000",
          aspectRatio: "9 / 16"
        }}
      >
        {post.media_type === "video" ? (
          <video
            ref={videoRef}
            src={post.media_url}
            playsInline
            loop
            controls={false}
            muted={false}
            onClick={onVideoTap}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <img
            src={post.media_url}
            alt={post.caption || "Progress"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}

        {post.music_url ? <audio ref={audioRef} src={post.music_url} preload="auto" /> : null}

        {/* Actions (like/comment) */}
        <div
          style={{
            position: "absolute",
            right: 10,
            bottom: 10,
            display: "grid",
            gap: 8
          }}
        >
          <button
            type="button"
            className={liked ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
            onClick={() => onLike?.(post)}
            aria-label="Like"
            title="Like"
            style={{ borderRadius: 999, backdropFilter: "blur(6px)" }}
          >
            ❤️ {post.likes_count ?? 0}
          </button>

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => onOpenComments?.(post)}
            aria-label="Commentaires"
            title="Commentaires"
            style={{ borderRadius: 999, backdropFilter: "blur(6px)" }}
          >
            💬 {post.comments_count ?? 0}
          </button>
        </div>
      </div>

      {/* Caption + music */}
      {post.caption ? <p style={{ margin: "10px 0 0", lineHeight: 1.35 }}>{post.caption}</p> : null}
      {post.music_title ? (
        <p style={{ margin: "8px 0 0", fontSize: 12, opacity: 0.8 }}>
          ♪ {post.music_title}
        </p>
      ) : null}
    </article>
  );
}

export 
function SoundPickerModal({ open, onClose, userId, onPick }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const audioRef = useRef(null);
  const stopTimerRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);

  const stop = () => {
    try {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
      const a = audioRef.current;
      if (a) { a.pause(); a.currentTime = 0; a.src = ""; }
    } catch {}
    setPlayingId(null);
  };

  const playPreview = (t) => {
    if (!t?.preview_url) return;
    const id = t.id || t.track_id;
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
      stopTimerRef.current = setTimeout(() => { try { a.pause(); } catch {} setPlayingId(null); }, 30000);
    } catch {}
  };

  const load = async () => {
    if (!userId) {
      setErr("Connecte-toi pour choisir un son.");
      setRows([]);
      return;
    }
    setLoading(true);
    setErr("");
    stop();
    try {
      const { data, error } = await supabase
        .from("music_library")
        .select("id, owner_id, provider, track_id, title, artist, artwork, preview_url, external_url, created_at")
        .or(`owner_id.is.null,owner_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.error("music_library select error:", error);
        setErr("Impossible de charger la bibliothèque.");
        setRows([]);
        return;
      }
      setRows(data || []);
    } catch (e) {
      console.error("music_library load exception:", e);
      setErr("Impossible de charger la bibliothèque.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setQ("");
    setErr("");
    setRows([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const filtered = React.useMemo(() => {
    const qx = String(q || "").toLowerCase().trim();
    return (rows || []).filter(r =>
      !qx || (`${r.title || ""} ${r.artist || ""}`).toLowerCase().includes(qx)
    );
  }, [rows, q]);

  if (!open) return null;

  return (
    <div className="modal-backdrop modal-backdrop--blur" onClick={onClose}>
      <div className="modal-card modal-card--sheet allowScroll" onClick={e => e.stopPropagation()}
        style={{ width: "min(920px,98vw)", maxHeight: "calc(var(--appH,100vh)-18px)", borderRadius: 18 }}>
        <div className="modal-header" style={{ display: "flex", alignItems: "center" }}>
          <h3 style={{ marginRight: "auto" }}>Choisir un son</h3>
          <button className="btn-ghost btn-sm" onClick={() => { stop(); onClose(); }}>Fermer</button>
        </div>

        <div className="modal-body modal-body--scroll allowScroll">
          <input className="input" placeholder="Filtrer…" value={q} onChange={e => setQ(e.target.value)} />

          {err ? <p className="form-message error">{err}</p> : null}
          <audio ref={audioRef} />

          {loading ? <p className="form-message">Chargement…</p> : null}

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {filtered.map(t => (
              <div key={t.id} className="card" style={{ padding: 10, display: "flex", gap: 10 }}>
                <img src={t.artwork || "/avatar.png"} style={{ width: 48, height: 48, borderRadius: 12 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900 }}>{t.title}</div>
                  <div style={{ opacity: .7, fontSize: 13 }}>{t.artist}</div>
                </div>

                {t.preview_url ? (
                  <button className="btn-ghost btn-sm" onClick={() => playPreview(t)}>
                    {playingId === t.id ? "⏸" : "▶"}
                  </button>
                ) : null}

                <button className="btn-primary btn-sm" onClick={() => { stop(); onPick(t); }}>
                  Utiliser
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function ProgressFeed({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [err, setErr] = useState("");
  const [likedSet, setLikedSet] = useState(() => new Set());

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState(null);


  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      const { data, error } = await supabase
        .from("progress_posts")
        .select(
          "id, user_id, media_url, media_type, caption, created_at, music_url, music_title, music_start_sec, music_volume, video_volume"
        )
        .eq("is_deleted", false)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(80);

      if (error) {
        console.error("progress_posts fetch error:", error);
        setErr("Impossible de charger le feed pour le moment.");
        setPosts([]);
        return;
      }

      const rows = data || [];
      const authorIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));

      const authorByUser = new Map();
      if (authorIds.length) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, name, photo_urls, created_at")
          .in("user_id", authorIds)
          .order("created_at", { ascending: false });

        if (pErr) console.error("progress feed profiles error:", pErr);

        for (const p of profs || []) {
          if (!p.user_id) continue;
          if (!authorByUser.has(p.user_id)) {
            authorByUser.set(p.user_id, {
              name: p.name || "Utilisateur",
              photo: Array.isArray(p.photo_urls) ? p.photo_urls[0] : ""
            });
          }
        }
      }

      const postIds = rows.map((r) => r.id);

      // likes count
      const likeCounts = new Map();
      if (postIds.length) {
        const { data: likeRows, error: lErr } = await supabase
          .from("progress_likes")
          .select("post_id")
          .in("post_id", postIds)
          .limit(8000);

        if (lErr) console.error("progress likes fetch error:", lErr);
        for (const lr of likeRows || []) likeCounts.set(lr.post_id, (likeCounts.get(lr.post_id) || 0) + 1);
      }

      // comments count
      const commentCounts = new Map();
      if (postIds.length) {
        const { data: cRows, error: cErr } = await supabase
          .from("progress_comments")
          .select("post_id")
          .in("post_id", postIds)
          .limit(8000);

        if (cErr) console.error("progress comments count fetch error:", cErr);
        for (const cr of cRows || []) commentCounts.set(cr.post_id, (commentCounts.get(cr.post_id) || 0) + 1);
      }

      // my liked set
      let myLiked = new Set();
      if (user?.id && postIds.length) {
        const { data: my, error: myErr } = await supabase
          .from("progress_likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        if (myErr) console.error("progress my likes fetch error:", myErr);
        myLiked = new Set((my || []).map((x) => x.post_id));
      }
      setLikedSet(myLiked);

      setPosts(
        rows.map((r) => {
          const a = authorByUser.get(r.user_id) || { name: "Utilisateur", photo: "" };
          return {
            ...r,
            author_name: a.name,
            author_photo: a.photo,
            likes_count: likeCounts.get(r.id) || 0,
            comments_count: commentCounts.get(r.id) || 0
          };
        })
      );
    } catch (e) {
      console.error("progress feed exception:", e);
      setErr("Impossible de charger le feed pour le moment.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onLike = async (post) => {
    if (!user?.id) {
      navigate("/settings");
      return;
    }
    if (!post?.id) return;

    const already = likedSet.has(post.id);

    // optimistic UI
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (already) next.delete(post.id);
      else next.add(post.id);
      return next;
    });

    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (already ? -1 : 1)) } : p))
    );

    try {
      if (already) {
        const { error } = await supabase.from("progress_likes").delete().eq("user_id", user.id).eq("post_id", post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("progress_likes").insert({ user_id: user.id, post_id: post.id });
        if (error) throw error;
      }
    } catch (e) {
      console.error("progress like error:", e);
      // revert
      setLikedSet((prev) => {
        const next = new Set(prev);
        if (already) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (already ? 1 : -1)) } : p))
      );
    }
  };

  const openComments = (post) => {
    if (!post?.id) return;
    setCommentsPostId(post.id);
    setCommentsOpen(true);
  };

  const onCommentPosted = () => {
    if (!commentsPostId) return;
    setPosts((prev) => prev.map((p) => (p.id === commentsPostId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p)));
  };

  const onDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <main className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Progressions</h2>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Scroll vertical + auto-play (logique TikTok)</div>
        </div>

        <button className="btn-primary" onClick={() => navigate("/post")} disabled={!user} title="Publier">
          + Publier
        </button>
      </div>

      {err ? <p className="form-message error">{err}</p> : null}

      {loading ? (
        <p className="form-message">Chargement…</p>
      ) : posts.length === 0 ? (
        <p className="form-message">Aucun post pour le moment.</p>
      ) : (
        <div
          className="allowScroll"
          style={{
            display: "grid",
            gap: 12,
            overflowY: "auto",
            scrollSnapType: "y mandatory",
            paddingBottom: 12,
            maxHeight: "calc(var(--appH, 100vh) - 160px)"
          }}
        >
          {posts.map((p) => (
            <ProgressItem
              key={p.id}
              post={p}
              user={user}
              onLike={onLike}
              liked={likedSet.has(p.id)}
              onOpenComments={openComments}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}

      <CommentsModal
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={commentsPostId}
        user={user}
        onPosted={onCommentPosted}
      />
    
      <SoundPickerModal
        open={soundPickerOpen}
        onClose={() => setSoundPickerOpen(false)}
        userId={user?.id}
        onPick={(t) => {
          try {
            localStorage.setItem(
              "mf_selected_track",
              JSON.stringify({
                provider: t.provider || "spotify",
                track_id: t.track_id,
                title: t.title,
                artist: t.artist,
                artwork: t.artwork,
                preview_url: t.preview_url,
                external_url: t.external_url
              })
            );
          } catch {}
          navigate("/create");
        }}
      />
    </main>
  );
}
