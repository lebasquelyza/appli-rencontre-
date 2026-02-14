// sportmeet-complet/src/pages/ProgressFeed.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

function ProgressItem({ post, user, onLike, liked, onOpenComments }) {
  const [ref, visible] = useVisibility(0.65);
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

  const onVideoTap = async () => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;

    const hasMusic = !!post.music_url && !!a;
    const start = Math.min(29, Math.max(0, Number(post.music_start_sec || 0)));

    if (!v.paused) {
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

  const authorName = post?.author_name || "Utilisateur";
  const authorPhoto = post?.author_photo || "";

  const [uiOpen, setUiOpen] = useState(true);
  const toggleUi = () => setUiOpen((v) => !v);

  const onMediaTap = () => {
    if (post.media_type === "video") onVideoTap();
    toggleUi();
  };

  return (
    <section
      ref={ref}
      className="mf-snap"
      style={{
        scrollSnapAlign: "start",
        height: "100%",
        position: "relative",
        borderRadius: 18,
        overflow: "hidden",
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.10)",
        boxShadow: "0 18px 50px rgba(0,0,0,.45)"
      }}
    >
      {/* Media */}
      <div onClick={onMediaTap} style={{ position: "absolute", inset: 0, background: "#000" }}>
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
          <img
            src={post.media_url}
            alt={post.caption || "Progress"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          // Mock (no media_url): CSS gradient background (always visible on iOS)
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: post.mock_bg ||
                "radial-gradient(800px 500px at 20% 20%, rgba(255,77,109,.30), transparent 55%), radial-gradient(700px 520px at 80% 30%, rgba(255,138,75,.22), transparent 55%), radial-gradient(700px 600px at 50% 90%, rgba(124,58,237,.18), transparent 60%), linear-gradient(180deg, rgba(8,8,12,.95), rgba(8,8,12,.95))"
            }}
          />
        )}
      </div>

      {post.music_url ? <audio ref={audioRef} src={post.music_url} preload="auto" /> : null}

      {/* UI */}
      {uiOpen ? (
        <>
          <div
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: 10,
              borderRadius: 999,
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(8px)",
              maxWidth: "calc(100% - 160px)"
            }}
          >
            <img
              src={authorPhoto || "/avatar.png"}
              alt={authorName}
              style={{ width: 34, height: 34, borderRadius: 999, objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/avatar.png";
              }}
            />
            <div style={{ lineHeight: 1.1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {authorName}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{formatAgo(post.created_at)}</div>
            </div>
          </div>

          {post.music_title ? (
            <div
              title={post.music_title}
              style={{
                position: "absolute",
                left: "50%",
                top: 14,
                transform: "translateX(-50%)",
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                maxWidth: "min(520px, calc(100% - 40px))"
              }}
            >
              <span aria-hidden>🎵</span>
              <span style={{ fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {post.music_title}
              </span>
            </div>
          ) : null}

          {/* Right rail actions */}
          <div
            style={{
              position: "absolute",
              right: 12,
              bottom: 16,
              display: "grid",
              gap: 10,
              justifyItems: "end"
            }}
          >
            <button
              type="button"
              className={liked ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
              onClick={(e) => {
                e.stopPropagation();
                onLike?.(post);
              }}
              aria-label="Like"
              title="Like"
              style={{ borderRadius: 999, background: liked ? undefined : "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
            >
              ❤️ {post.likes_count ?? 0}
            </button>

            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenComments?.(post);
              }}
              aria-label="Commentaires"
              title="Commentaires"
              style={{ borderRadius: 999, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
            >
              💬 {post.comments_count ?? 0}
            </button>
          </div>

          {/* Bottom caption */}
          <div
            style={{
              position: "absolute",
              left: 12,
              right: 84,
              bottom: 12,
              padding: 12,
              borderRadius: 16,
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(10px)"
            }}
          >
            {post.caption ? <div style={{ fontWeight: 800, lineHeight: 1.25 }}>{post.caption}</div> : null}
            {!post.caption && post.is_mock ? (
              <div style={{ fontWeight: 800, lineHeight: 1.25 }}>Mock post (exemple)</div>
            ) : null}
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              <span style={{ opacity: 0.85 }}>Astuce :</span> tape sur le média pour afficher/masquer l'UI
            </div>
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
            backdropFilter: "blur(8px)"
          }}
        >
          👁️
        </button>
      )}
    </section>
  );
}

function makeMockPosts() {
  const now = Date.now();
  const base = [
    {
      id: "mock-1",
      is_mock: true,
      user_id: "mock",
      media_type: "image",
      media_url: "", // empty -> use CSS gradient background
      caption: "Séance du jour 💪 (mock)",
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
      caption: "Progression : +10kg au squat ✅ (mock)",
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
      caption: "Avant / après 8 semaines 🔥 (mock)",
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

  return base;
}

function ProgressFeed({ user }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [err, setErr] = useState("");
  const [likedSet, setLikedSet] = useState(() => new Set());

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState(null);

  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);

  // ✅ Remove the "vertical line" / noise overlay drawn by body::before on some devices.
  useEffect(() => {
    document.body.classList.add("mf-noise-off");
    return () => document.body.classList.remove("mf-noise-off");
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderH(el.getBoundingClientRect().height || 0));
    ro.observe(el);
    setHeaderH(el.getBoundingClientRect().height || 0);
    return () => ro.disconnect();
  }, []);

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      let q = supabase
        .from("progress_posts")
        .select(
          "id, user_id, media_url, media_type, caption, created_at, music_url, music_title, music_start_sec, music_volume, video_volume, is_public"
        )
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(80);

      q = q.eq("is_public", true);

      const { data, error } = await q;

      if (error) {
        console.error("progress_posts fetch error:", error);
        setErr("Impossible de charger le feed pour le moment.");
        setPosts([]);
        return;
      }

      const rows = data || [];

      // attach minimal author info (best effort)
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

      const normalized = rows.map((r) => {
        const a = authorByUser.get(r.user_id) || { name: "Utilisateur", photo: "" };
        return {
          ...r,
          author_name: a.name,
          author_photo: a.photo,
          likes_count: likeCounts.get(r.id) || 0,
          comments_count: commentCounts.get(r.id) || 0
        };
      });

      // ✅ Always mix in mock posts so you can see the TikTok rendering.
      const mixed = [...makeMockPosts(), ...normalized];
      setPosts(mixed);
    } catch (e) {
      console.error("progress feed exception:", e);
      setErr("Impossible de charger le feed pour le moment.");
      setPosts(makeMockPosts());
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
    if (!post?.id || post.is_mock) return;

    const already = likedSet.has(post.id);

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
    if (!post?.id || post.is_mock) return;
    setCommentsPostId(post.id);
    setCommentsOpen(true);
  };

  const onCommentPosted = () => {
    if (!commentsPostId) return;
    setPosts((prev) => prev.map((p) => (p.id === commentsPostId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p)));
  };

  const snapH = useMemo(() => {
    // Take full remaining height under header (safe area included)
    const safeTop = 0;
    return `calc(var(--appH, 100dvh) - ${Math.round(headerH + safeTop)}px)`;
  }, [headerH]);

  return (
    <main
      className="page"
      style={{
        alignItems: "stretch",
        width: "100%",
        padding: 0,
        minHeight: "var(--appH, 100dvh)",
        background: "transparent",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* This style is intentionally inside this page so you don't have to touch global CSS. */}
      <style>{`
        /* Disable the noise overlay that can create a visible seam/line on some devices */
        body.mf-noise-off::before{ display:none !important; content:none !important; }
      `}</style>

      {/* Header */}
      <div
        ref={headerRef}
        style={{
          padding: "12px 14px",
          paddingTop: "calc(env(safe-area-inset-top) + 10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10
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

      {err ? <p className="form-message error" style={{ padding: "0 14px 10px" }}>{err}</p> : null}

      {/* TikTok snap container */}
      {loading ? (
        <p className="form-message" style={{ padding: "0 14px" }}>Chargement…</p>
      ) : posts.length === 0 ? (
        <p className="form-message" style={{ padding: "0 14px" }}>Aucun post pour le moment.</p>
      ) : (
        <div
          className="allowScroll"
          style={{
            height: snapH,
            overflowY: "auto",
            scrollSnapType: "y mandatory",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            padding: "0 14px 14px",
            display: "grid",
            gap: 12
          }}
        >
          {posts.map((p) => (
            <div key={p.id} style={{ height: snapH, scrollSnapAlign: "start" }}>
              <ProgressItem
                post={p}
                user={user}
                onLike={onLike}
                liked={likedSet.has(p.id)}
                onOpenComments={openComments}
              />
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
