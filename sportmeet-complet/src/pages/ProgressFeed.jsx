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

function useVisibility(threshold = 0.7) {
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

/* ---------------- COMMENTS MODAL ---------------- */

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

/* ---------------- ITEM (FULLSCREEN SNAP) ---------------- */

function ProgressItem({ post, user, onLike, liked, onOpenComments }) {
  const [ref, visible] = useVisibility(0.7);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const [globalVideoVol, setGlobalVideoVol] = useState(() => readVol(LS_VIDEO_VOL, 1));
  const [globalMusicVol, setGlobalMusicVol] = useState(() => readVol(LS_MUSIC_VOL, 0.6));

  useEffect(() => {
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
        try {
          const pv = v?.play();
          if (pv?.catch) pv.catch(() => {});
        } catch {}
        stopMusic();
      } else {
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

  const authorName = post?.author_name || "Utilisateur";
  const authorPhoto = post?.author_photo || "";

  const [uiOpen, setUiOpen] = useState(true);

  return (
    <section
      ref={ref}
      style={{
        height: "100dvh",
        width: "100%",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        position: "relative",
        overflow: "hidden",
        background: "#000"
      }}
      onClick={() => setUiOpen((v) => !v)}
    >
      {/* Media */}
      <div style={{ position: "absolute", inset: 0, background: "#000" }}>
        {post.media_type === "video" ? (
          <video
            ref={videoRef}
            src={post.media_url}
            playsInline
            loop
            controls={false}
            muted={false}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : post.media_url ? (
          <img src={post.media_url} alt={post.caption || "Progress"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                post.mock_bg ||
                "radial-gradient(800px 500px at 20% 20%, rgba(255,77,109,.30), transparent 55%), radial-gradient(700px 520px at 80% 30%, rgba(255,138,75,.22), transparent 55%), radial-gradient(700px 600px at 50% 90%, rgba(124,58,237,.18), transparent 60%), linear-gradient(180deg, rgba(8,8,12,.95), rgba(8,8,12,.95))"
            }}
          />
        )}
      </div>

      {post.music_url ? <audio ref={audioRef} src={post.music_url} preload="auto" /> : null}

      {uiOpen ? (
        <>
          {/* AUTHOR (smaller) */}
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 10,
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(0,0,0,0.30)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              maxWidth: "calc(100% - 170px)"
            }}
          >
            <img
              src={authorPhoto || "/avatar.png"}
              alt={authorName}
              style={{ width: 26, height: 26, borderRadius: 999, objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/avatar.png";
              }}
            />
            <div style={{ lineHeight: 1.05, minWidth: 0 }}>
              <div style={{ fontWeight: 850, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {authorName}
              </div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>{formatAgo(post.created_at)}</div>
            </div>
          </div>

          {/* MUSIC (optional) */}
          {post.music_title ? (
            <div
              title={post.music_title}
              style={{
                position: "absolute",
                left: "50%",
                top: 12,
                transform: "translateX(-50%)",
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.28)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                maxWidth: "min(520px, calc(100% - 40px))"
              }}
            >
              <span aria-hidden>🎵</span>
              <span style={{ fontWeight: 800, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {post.music_title}
              </span>
            </div>
          ) : null}

          {/* Right rail actions ALWAYS visible */}
          <div
            style={{
              position: "absolute",
              right: 12,
              top: "52%",
              transform: "translateY(-50%)",
              display: "grid",
              gap: 10,
              justifyItems: "end"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={liked ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
              onClick={() => onLike?.(post)}
              aria-label="Like"
              title="Like"
              style={{
                borderRadius: 999,
                background: liked ? undefined : "rgba(0,0,0,0.35)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)"
              }}
            >
              ❤️ {post.likes_count ?? 0}
            </button>

            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => onOpenComments?.(post)}
              aria-label="Commentaires"
              title="Commentaires"
              style={{
                borderRadius: 999,
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)"
              }}
            >
              💬 {post.comments_count ?? 0}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            setUiOpen(true);
          }}
          title="Afficher l'UI"
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            borderRadius: 999,
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)"
          }}
        >
          👁️
        </button>
      )}
    </section>
  );
}

/* ---------------- MOCK POSTS ---------------- */

function makeMockPosts() {
  const now = Date.now();
  return [
    {
      id: "mock-1",
      is_mock: true,
      user_id: "mock",
      media_type: "image",
      media_url: "",
      caption: null,
      created_at: new Date(now - 45 * 60 * 1000).toISOString(),
      music_title: "Julia — Mt. Joy",
      likes_count: 128,
      comments_count: 12,
      author_name: "Alex",
      author_photo: "",
      mock_bg:
        "radial-gradient(800px 500px at 10% 10%, rgba(255,77,109,.35), transparent 55%), radial-gradient(700px 520px at 85% 25%, rgba(255,138,75,.22), transparent 55%), linear-gradient(180deg, rgba(8,8,12,.95), rgba(8,8,12,.95))"
    },
    {
      id: "mock-2",
      is_mock: true,
      user_id: "mock",
      media_type: "image",
      media_url: "",
      caption: null,
      created_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      music_title: "Energy — Drake",
      likes_count: 301,
      comments_count: 44,
      author_name: "Maya",
      author_photo: "",
      mock_bg:
        "radial-gradient(820px 520px at 80% 20%, rgba(124,58,237,.30), transparent 55%), radial-gradient(720px 520px at 25% 80%, rgba(70,80,255,.20), transparent 55%), linear-gradient(180deg, rgba(8,8,12,.95), rgba(8,8,12,.95))"
    },
    {
      id: "mock-3",
      is_mock: true,
      user_id: "mock",
      media_type: "image",
      media_url: "",
      caption: null,
      created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      music_title: "Blinding Lights — The Weeknd",
      likes_count: 522,
      comments_count: 61,
      author_name: "Nina",
      author_photo: "",
      mock_bg:
        "radial-gradient(820px 520px at 20% 20%, rgba(255,138,75,.28), transparent 55%), radial-gradient(720px 520px at 70% 80%, rgba(255,77,109,.22), transparent 55%), linear-gradient(180deg, rgba(8,8,12,.95), rgba(8,8,12,.95))"
    }
  ];
}

/* ---------------- MAIN FEED ---------------- */

function ProgressFeed({ user }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [err, setErr] = useState("");
  const [likedSet, setLikedSet] = useState(() => new Set());

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState(null);

  const scrollerRef = useRef(null);
  const refreshingRef = useRef(false);
  const lastRefreshRef = useRef(0);

  // Track newest post timestamp to fetch "newer posts" when user pulls down at top
  const newestCreatedAtRef = useRef(null);

  useEffect(() => {
    document.body.classList.add("mf-noise-off");
    return () => document.body.classList.remove("mf-noise-off");
  }, []);

  const normalizeWithAuthorsAndCounts = async (rows) => {
    const authorIds = Array.from(new Set((rows || []).map((r) => r.user_id).filter(Boolean)));
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

    const postIds = (rows || []).map((r) => r.id);

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

    return (rows || []).map((r) => {
      const a = authorByUser.get(r.user_id) || { name: "Utilisateur", photo: "" };
      return {
        ...r,
        author_name: a.name,
        author_photo: a.photo,
        likes_count: likeCounts.get(r.id) || 0,
        comments_count: commentCounts.get(r.id) || 0
      };
    });
  };

  const loadInitial = async () => {
    setLoading(true);
    setErr("");

    try {
      const { data, error } = await supabase
        .from("progress_posts")
        .select(
          "id, user_id, media_url, media_type, caption, created_at, music_url, music_title, music_start_sec, music_volume, video_volume, is_public"
        )
        .eq("is_deleted", false)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(80);

      if (error) {
        console.error("progress_posts fetch error:", error);
        setErr("Impossible de charger le feed pour le moment.");
        setPosts(makeMockPosts());
        newestCreatedAtRef.current = null;
        return;
      }

      const rows = data || [];
      const normalized = await normalizeWithAuthorsAndCounts(rows);

      // Track newest timestamp for refresh
      newestCreatedAtRef.current = normalized?.[0]?.created_at || null;

      // Mix mocks at the end so real posts stay "normal"
      setPosts(normalized.length ? [...normalized, ...makeMockPosts()] : makeMockPosts());
    } catch (e) {
      console.error("progress feed exception:", e);
      setErr("Impossible de charger le feed pour le moment.");
      setPosts(makeMockPosts());
      newestCreatedAtRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ REAL LOGIC: when user scrolls UP at TOP, fetch NEWER posts and show them immediately
  const fetchNewerPosts = async () => {
    const newest = newestCreatedAtRef.current;
    if (!newest) {
      await loadInitial();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("progress_posts")
        .select(
          "id, user_id, media_url, media_type, caption, created_at, music_url, music_title, music_start_sec, music_volume, video_volume, is_public"
        )
        .eq("is_deleted", false)
        .eq("is_public", true)
        .gt("created_at", newest)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("fetch newer error:", error);
        return;
      }

      const rows = data || [];
      if (!rows.length) return;

      const normalized = await normalizeWithAuthorsAndCounts(rows);

      // update newest
      newestCreatedAtRef.current = normalized?.[0]?.created_at || newest;

      setPosts((prev) => {
        const prevNoMocks = prev.filter((p) => !p.is_mock);
        const prevMocks = prev.filter((p) => p.is_mock);

        // dedupe by id
        const existing = new Set(prevNoMocks.map((p) => p.id));
        const toAdd = normalized.filter((p) => !existing.has(p.id));

        if (!toAdd.length) return prev;
        return [...toAdd, ...prevNoMocks, ...prevMocks];
      });

      // show the newest immediately
      const el = scrollerRef.current;
      if (el) {
        try {
          requestAnimationFrame(() => {
            try {
              el.scrollTo({ top: 0, behavior: "auto" });
            } catch {}
          });
        } catch {}
      }
    } catch (e) {
      console.error("fetchNewerPosts exception:", e);
    }
  };

  // Pull-to-refresh trigger: at the very top
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;

    if (el.scrollTop > 2) return;

    const now = Date.now();
    if (refreshingRef.current) return;
    if (now - lastRefreshRef.current < 1200) return;

    refreshingRef.current = true;
    lastRefreshRef.current = now;

    Promise.resolve(fetchNewerPosts())
      .catch(() => {})
      .finally(() => {
        refreshingRef.current = false;
      });
  };

  const onLike = async (post) => {
    if (!user?.id) {
      navigate("/settings");
      return;
    }
    if (!post?.id || post.is_mock) return;

    const already = likedSet.has(post.id);

    setLikedSet((prev) => {
      const next = new Set(prev);
      if (already) next.delete(post.id);
      else next.add(post.id);
      return next;
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (already ? -1 : 1)) }
          : p
      )
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
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (already ? 1 : -1)) }
            : p
        )
      );
    }
  };

  const openComments = (post) => {
    if (!post?.id || post.is_mock) return;
    setCommentsPostId(post.id);
    setCommentsOpen(true);
  };

  const onCommentPosted = () => {
    if (!commentsPostId) return;
    setPosts((prev) =>
      prev.map((p) => (p.id === commentsPostId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
    );
  };

  return (
    <main
      style={{
        width: "100%",
        height: "var(--appH, 100dvh)",
        minHeight: "var(--appH, 100dvh)",
        padding: 0,
        margin: 0,
        position: "relative",
        overflow: "hidden",
        background: "transparent"
      }}
    >
      {/* Local CSS only */}
      <style>{`
        body.mf-noise-off::before{ display:none !important; content:none !important; }
        .mf-tiktok-scroll{ scrollbar-width:none; -ms-overflow-style:none; }
        .mf-tiktok-scroll::-webkit-scrollbar{ width:0 !important; height:0 !important; display:none !important; }
      `}</style>

      {/* Header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "12px 14px",
          paddingTop: "calc(env(safe-area-inset-top) + 10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          background: "rgba(0,0,0,0.18)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn-ghost btn-sm" onClick={() => navigate("/")} title="Retour">
            ←
          </button>
          <h2 style={{ margin: 0 }}>Progressions</h2>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn-ghost btn-sm"
            onClick={() => navigate("/feed/mine")}
            title="Mes publications"
            style={{ borderRadius: 999, background: "rgba(255,255,255,0.10)", fontSize: 10, padding: "4px 8px" }}
          >
            Mes publications
          </button>

          <button
            className="btn-primary btn-sm"
            onClick={() => navigate("/post")}
            disabled={!user}
            title="Publier"
            style={{ padding: "8px 12px", borderRadius: 999, fontSize: 14, lineHeight: "16px" }}
          >
            + Publier
          </button>
        </div>
      </div>

      {err ? (
        <p className="form-message error" style={{ padding: "0 14px 10px" }}>
          {err}
        </p>
      ) : null}

      {/* TikTok snap container */}
      {loading ? (
        <p className="form-message" style={{ padding: "0 14px" }}>
          Chargement…
        </p>
      ) : posts.length === 0 ? (
        <p className="form-message" style={{ padding: "0 14px" }}>
          Aucun post pour le moment.
        </p>
      ) : (
        <div
          className="allowScroll mf-tiktok-scroll"
          ref={scrollerRef}
          onScroll={handleScroll}
          style={{
            position: "absolute",
            inset: 0,
            height: "var(--appH, 100dvh)",
            overflowY: "auto",
            scrollSnapType: "y mandatory",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            scrollPaddingTop: "96px"
          }}
        >
          {posts.map((p) => (
            <div key={p.id} style={{ height: "100dvh", scrollSnapAlign: "start", scrollSnapStop: "always" }}>
              <ProgressItem post={p} user={user} onLike={onLike} liked={likedSet.has(p.id)} onOpenComments={openComments} />
            </div>
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
    </main>
  );
}

export default ProgressFeed;
