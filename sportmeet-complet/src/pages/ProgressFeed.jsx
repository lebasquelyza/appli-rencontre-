// sportmeet-complet/src/pages/ProgressFeed.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
        .limit(50);

      if (error) {
        console.error("comments fetch error:", error);
        setErr("Impossible de charger les commentaires.");
        setRows([]);
        return;
      }

      const list = data || [];

      // best-effort authors
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
        style={{ width: "min(820px, 96vw)", maxHeight: "calc(var(--appH, 100vh) - 40px)" }}
      >
        <div className="modal-header" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h3 style={{ marginRight: "auto" }}>Commentaires</h3>
          <button className="btn-ghost" onClick={onClose}>
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
                      <div style={{ fontWeight: 700 }}>{c.author_name}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>{formatAgo(c.created_at)}</div>
                    </div>
                  </div>
                  <p style={{ margin: "8px 0 0", lineHeight: 1.35 }}>{c.body}</p>
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ padding: 12, marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Ajouter un commentaire</div>
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

function ProgressItem({ post, onLike, liked, onOpenComments }) {
  const [ref, visible] = useVisibility(0.65);
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (post.media_type === "video") {
      if (visible) {
        v.muted = true;
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } else {
        try {
          v.pause();
        } catch {}
      }
    }
  }, [visible, post.media_type]);

  const authorName = post?.author_name || "Utilisateur";
  const authorPhoto = post?.author_photo || "";

  return (
    <article
      ref={ref}
      style={{
        height: "calc(var(--appH, 100vh))",
        scrollSnapAlign: "start",
        position: "relative",
        background: "#000",
        borderRadius: 18,
        overflow: "hidden"
      }}
    >
      {post.media_type === "video" ? (
        <video
          ref={videoRef}
          src={post.media_url}
          playsInline
          loop
          controls={false}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <img
          src={post.media_url}
          alt={post.caption || "Progress"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      <div
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 18,
          display: "flex",
          gap: 14,
          alignItems: "flex-end",
          justifyContent: "space-between"
        }}
      >
        <div style={{ maxWidth: "72%" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <img
              src={authorPhoto || "/avatar.png"}
              alt={authorName}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                objectFit: "cover",
                border: "1px solid rgba(255,255,255,.35)"
              }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/avatar.png";
              }}
            />
            <div style={{ color: "white" }}>
              <div style={{ fontWeight: 700, lineHeight: 1.1 }}>{authorName}</div>
              <div style={{ opacity: 0.85, fontSize: 12 }}>{formatAgo(post.created_at)}</div>
            </div>
          </div>

          {post.caption ? (
            <p style={{ marginTop: 10, marginBottom: 0, color: "white", opacity: 0.92, lineHeight: 1.35 }}>
              {post.caption}
            </p>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
          <button
            type="button"
            className={liked ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
            onClick={() => onLike?.(post)}
            title="Like"
            aria-label="Like"
          >
            ❤️ {post.likes_count ?? 0}
          </button>

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => onOpenComments?.(post)}
            title="Commenter"
            aria-label="Commenter"
          >
            💬 {post.comments_count ?? 0}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProgressFeed({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [err, setErr] = useState("");
  const [likedSet, setLikedSet] = useState(() => new Set());

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr("");

    try {
      const { data, error } = await supabase
        .from("progress_posts")
        .select("id, user_id, media_url, media_type, caption, created_at")
        .eq("is_deleted", false)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) {
        console.error("progress_posts fetch error:", error);
        setErr("Impossible de charger le feed pour le moment.");
        setPosts([]);
        return;
      }

      const rows = data || [];
      const authorIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));

      // best-effort authors
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
          .limit(5000);

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
          .limit(5000);

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

      const mapped = rows.map((r) => {
        const a = authorByUser.get(r.user_id) || { name: "Utilisateur", photo: "" };
        return {
          ...r,
          author_name: a.name,
          author_photo: a.photo,
          likes_count: likeCounts.get(r.id) || 0,
          comments_count: commentCounts.get(r.id) || 0
        };
      });

      setPosts(mapped);
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
      prev.map((p) =>
        p.id === post.id ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (already ? -1 : 1)) } : p
      )
    );

    try {
      if (already) {
        const { error } = await supabase
          .from("progress_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", post.id);
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
          p.id === post.id ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + (already ? 1 : -1)) } : p
        )
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
    setPosts((prev) =>
      prev.map((p) => (p.id === commentsPostId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
    );
  };

  return (
    <main className="page" style={{ minHeight: "calc(var(--appH, 100vh))" }}>
      <div className="shell">
        <section className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
            <button className="btn-ghost" onClick={() => navigate("/")}>
              ← Retour
            </button>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn-ghost btn-sm" onClick={load} disabled={loading}>
                Rafraîchir
              </button>
              <button className="btn-primary btn-sm" onClick={() => navigate("/post")} disabled={!user}>
                Publier
              </button>
            </div>
          </div>

          {err ? (
            <p className="form-message error" style={{ marginTop: 10 }}>
              {err}
            </p>
          ) : null}

          {loading ? (
            <p className="form-message" style={{ marginTop: 10 }}>
              Chargement du feed…
            </p>
          ) : posts.length === 0 ? (
            <p className="form-message" style={{ marginTop: 10 }}>
              Aucun post pour le moment. Sois la première personne à publier 💪
            </p>
          ) : (
            <div
              style={{
                marginTop: 12,
                height: "calc(var(--appH, 100vh) - 140px)",
                overflowY: "auto",
                scrollSnapType: "y mandatory",
                display: "grid",
                gap: 12
              }}
            >
              {posts.map((p) => (
                <ProgressItem
                  key={p.id}
                  post={p}
                  onLike={onLike}
                  liked={likedSet.has(p.id)}
                  onOpenComments={openComments}
                />
              ))}
            </div>
          )}
        </section>
      </div>

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
