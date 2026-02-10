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

function ModalSheet({ open, title, onClose, children, width = "min(920px, 98vw)" }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop modal-backdrop--blur" onClick={onClose}>
      <div
        className="modal-card modal-card--sheet allowScroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxHeight: "calc(var(--appH, 100vh) - 18px)",
          overflow: "hidden",
          borderRadius: 18
        }}
      >
        <div className="modal-header" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <h3 style={{ marginRight: "auto" }}>{title}</h3>
          <button className="btn-ghost btn-sm" onClick={onClose}>
            Fermer
          </button>
        </div>
        <div className="modal-body modal-body--scroll allowScroll" style={{ paddingTop: 8 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function RangeRow({ label, value, min, max, step = 0.01, onChange }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 800 }}>{label}</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>{Number(value).toFixed(2)}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        style={{ width: "100%", marginTop: 10 }}
      />
    </div>
  );
}

function uid() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

const EFFECT_PRESETS = [
  { key: "none", label: "Normal", filter: "none" },
  { key: "vivid", label: "Vif", filter: "contrast(1.15) saturate(1.25)" },
  { key: "bw", label: "Noir & blanc", filter: "grayscale(1) contrast(1.05)" },
  { key: "sepia", label: "Sépia", filter: "sepia(0.9) contrast(1.05) saturate(1.1)" },
  { key: "cool", label: "Froid", filter: "hue-rotate(320deg) saturate(1.15)" },
  { key: "warm", label: "Chaud", filter: "hue-rotate(20deg) saturate(1.2) contrast(1.05)" },
  { key: "soft", label: "Doux", filter: "brightness(1.05) saturate(0.95) contrast(0.95)" },
  { key: "blur", label: "Flou", filter: "blur(2px) contrast(1.05) saturate(1.05)" }
];

const EMOJIS = ["✨","🔥","💪","🏋️","⚡️","🌟","✅","🎯","😄","😂","😍","😎","🥳","🫶","❤️","💙","💚","💛","🧠","💥","🍀","🌈","🏆","📸","🎵","🧊","☀️","🌙","🍑","🍓"];

function DraggableOverlay({ item, onUpdate, onDelete, boundsRef, children }) {
  const draggingRef = useRef(null);

  const onPointerDown = (e) => {
    e.stopPropagation();
    const bounds = boundsRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const startX = e.clientX;
    const startY = e.clientY;

    draggingRef.current = {
      startX,
      startY,
      startPxX: (item.xPct ?? 50),
      startPxY: (item.yPct ?? 50),
      w: bounds.width,
      h: bounds.height
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    const d = draggingRef.current;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const nx = Math.min(98, Math.max(2, d.startPxX + (dx / d.w) * 100));
    const ny = Math.min(98, Math.max(2, d.startPxY + (dy / d.h) * 100));
    onUpdate?.({ ...item, xPct: nx, yPct: ny });
  };

  const onPointerUp = (e) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    draggingRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      style={{
        position: "absolute",
        left: `${item.xPct ?? 50}%`,
        top: `${item.yPct ?? 50}%`,
        transform: "translate(-50%, -50%)",
        cursor: "grab",
        userSelect: "none",
        touchAction: "none"
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div style={{ position: "relative" }}>
        {children}
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(item.id);
          }}
          title="Supprimer"
          style={{
            position: "absolute",
            right: -10,
            top: -10,
            width: 26,
            height: 26,
            padding: 0,
            borderRadius: 999,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(8px)"
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ProgressItem({ post, user, onLike, liked, onOpenComments, onDeleted }) {
  const [ref, visible] = useVisibility(0.65);
  const boundsRef = useRef(null);
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

  // Overlay UI like a "story" (screenshot logic). Tap on media to show/hide overlays.
  const [uiOpen, setUiOpen] = useState(true);
  const toggleUi = () => setUiOpen((v) => !v);

  // Tools state (client-side, per item)
  const [activeTool, setActiveTool] = useState(null); // "text" | "effects" | "stickers" | "crop" | null
  const [effectsKey, setEffectsKey] = useState("none");

  const [crop, setCrop] = useState({ zoom: 1, x: 0, y: 0 }); // x/y in % translate (approx)
  const [texts, setTexts] = useState([]); // {id, text, color, size, bg, xPct, yPct}
  const [stickers, setStickers] = useState([]); // {id, emoji, size, xPct, yPct}

  const mediaFilter = EFFECT_PRESETS.find((p) => p.key === effectsKey)?.filter ?? "none";
  const mediaTransform = `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom})`;

  const onMediaTap = () => {
    // For videos we keep the existing play/pause+music behavior, and also toggle the UI.
    if (post.media_type === "video") onVideoTap();
    toggleUi();
  };

  const addText = (payload) => {
    const t = {
      id: uid(),
      text: payload.text || "Texte",
      color: payload.color || "#fff",
      size: payload.size || 28,
      bg: !!payload.bg,
      xPct: 50,
      yPct: 72
    };
    setTexts((prev) => [t, ...prev]);
  };

  const addSticker = (emoji) => {
    const s = { id: uid(), emoji, size: 44, xPct: 72, yPct: 52 };
    setStickers((prev) => [s, ...prev]);
  };

  const updateText = (nextItem) => setTexts((prev) => prev.map((t) => (t.id === nextItem.id ? nextItem : t)));
  const deleteText = (id) => setTexts((prev) => prev.filter((t) => t.id !== id));

  const updateSticker = (nextItem) => setStickers((prev) => prev.map((s) => (s.id === nextItem.id ? nextItem : s)));
  const deleteSticker = (id) => setStickers((prev) => prev.filter((s) => s.id !== id));

  const resetTools = () => {
    setEffectsKey("none");
    setCrop({ zoom: 1, x: 0, y: 0 });
    setTexts([]);
    setStickers([]);
  };

  return (
    <article
      ref={ref}
      className="card"
      style={{
        padding: 0,
        borderRadius: 18,
        overflow: "hidden"
      }}
    >
      <div
        ref={boundsRef}
        style={{
          position: "relative",
          background: "#000",
          // Big "story" viewer area, while keeping your page styles (card + spacing) intact.
          height: "min(70vh, 620px)",
          minHeight: 420
        }}
      >
        {/* Media container to support crop/zoom */}
        <div
          onClick={onMediaTap}
          style={{
            position: "absolute",
            inset: 0,
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
              muted={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: mediaFilter,
                transform: mediaTransform,
                transformOrigin: "center center"
              }}
            />
          ) : (
            <img
              src={post.media_url}
              alt={post.caption || "Progress"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: mediaFilter,
                transform: mediaTransform,
                transformOrigin: "center center"
              }}
            />
          )}
        </div>

        {post.music_url ? <audio ref={audioRef} src={post.music_url} preload="auto" /> : null}

        {/* Always-visible overlays (text + stickers) */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: uiOpen ? "auto" : "none" }}>
          {texts.map((t) => (
            <DraggableOverlay
              key={t.id}
              item={t}
              boundsRef={boundsRef}
              onUpdate={updateText}
              onDelete={deleteText}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: t.size,
                  color: t.color,
                  padding: t.bg ? "6px 10px" : 0,
                  borderRadius: t.bg ? 12 : 0,
                  background: t.bg ? "rgba(0,0,0,0.45)" : "transparent",
                  backdropFilter: t.bg ? "blur(10px)" : undefined,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.15,
                  maxWidth: "min(86vw, 520px)",
                  textShadow: "0 2px 10px rgba(0,0,0,0.45)"
                }}
              >
                {t.text}
              </div>
            </DraggableOverlay>
          ))}

          {stickers.map((s) => (
            <DraggableOverlay
              key={s.id}
              item={s}
              boundsRef={boundsRef}
              onUpdate={updateSticker}
              onDelete={deleteSticker}
            >
              <div style={{ fontSize: s.size, filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))" }}>{s.emoji}</div>
            </DraggableOverlay>
          ))}
        </div>

        {/* Overlay UI (screenshot-like) */}
        {uiOpen ? (
          <>
            {/* Top left: author */}
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
                maxWidth: "calc(100% - 140px)"
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

            {/* Top center: music pill like the screenshot */}
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
                <span
                  style={{
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {post.music_title}
                </span>
              </div>
            ) : null}

            {/* Top right: actions (settings / delete) */}
            <div style={{ position: "absolute", right: 12, top: 12, display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setActiveTool("settings")}
                title="Options"
                style={{ borderRadius: 999, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
              >
                ⚙️
              </button>
              {canDelete ? (
                <button
                  className="btn-ghost btn-sm"
                  onClick={deletePost}
                  title="Supprimer"
                  style={{ borderRadius: 999, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
                >
                  🗑️
                </button>
              ) : null}
            </div>

            {/* Right rail: screenshot-like tool icons + social actions */}
            <div
              style={{
                position: "absolute",
                right: 12,
                top: 84,
                bottom: 12,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 12
              }}
            >
              <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  title="Texte"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTool("text");
                  }}
                  style={{ borderRadius: 999, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
                >
                  Aa
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  title="Effets"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTool("effects");
                  }}
                  style={{ borderRadius: 999, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
                >
                  ✨
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  title="Stickers"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTool("stickers");
                  }}
                  style={{ borderRadius: 999, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
                >
                  😊
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  title="Recadrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTool("crop");
                  }}
                  style={{ borderRadius: 999, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
                >
                  ⛶
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
                <button
                  type="button"
                  className={liked ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike?.(post);
                  }}
                  aria-label="Like"
                  title="Like"
                  style={{
                    borderRadius: 999,
                    background: liked ? undefined : "rgba(0,0,0,0.35)",
                    backdropFilter: "blur(8px)"
                  }}
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
            </div>

            {/* Bottom left: caption */}
            <div
              style={{
                position: "absolute",
                left: 12,
                bottom: 12,
                right: 84,
                padding: 12,
                borderRadius: 16,
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(10px)"
              }}
            >
              {post.caption ? <div style={{ fontWeight: 800, lineHeight: 1.25 }}>{post.caption}</div> : null}
              {post.music_title ? (
                <div style={{ marginTop: post.caption ? 6 : 0, fontSize: 12, opacity: 0.9 }}>
                  ♪ {post.music_title}
                </div>
              ) : null}
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                <span style={{ opacity: 0.85 }}>Astuce :</span> tape sur le média pour afficher/masquer l'UI
              </div>
            </div>

            {/* Tool modals */}
            <ModalSheet
              open={activeTool === "settings"}
              title="Options"
              onClose={() => setActiveTool(null)}
              width="min(720px, 96vw)"
            >
              <div style={{ display: "grid", gap: 10 }}>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Outils (client)</div>
                  <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.35 }}>
                    Texte / stickers / effets / recadrage s’appliquent localement (dans ton feed). Si tu veux que ça se
                    sauvegarde en base, je te le branche sur Supabase ensuite.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button className="btn-ghost" onClick={resetTools}>
                    Réinitialiser
                  </button>
                  <button className="btn-primary" onClick={() => setActiveTool(null)}>
                    OK
                  </button>
                </div>
              </div>
            </ModalSheet>

            <ModalSheet
              open={activeTool === "effects"}
              title="Effets"
              onClose={() => setActiveTool(null)}
              width="min(760px, 96vw)"
            >
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                  {EFFECT_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      className={effectsKey === p.key ? "btn-primary" : "btn-ghost"}
                      onClick={() => setEffectsKey(p.key)}
                      style={{ justifyContent: "center" }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Aperçu</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    Effet actif : <b>{EFFECT_PRESETS.find((x) => x.key === effectsKey)?.label}</b>
                  </div>
                </div>
              </div>
            </ModalSheet>

            <ModalSheet
              open={activeTool === "stickers"}
              title="Stickers"
              onClose={() => setActiveTool(null)}
              width="min(760px, 96vw)"
            >
              <div style={{ display: "grid", gap: 10 }}>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Choisis un sticker</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: 8 }}>
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        className="btn-ghost btn-sm"
                        onClick={() => addSticker(e)}
                        style={{ fontSize: 20, height: 38, borderRadius: 12 }}
                        title={e}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {stickers.length ? (
                  <div className="card" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 900, marginBottom: 10 }}>Taille des stickers</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {stickers.slice(0, 6).map((s) => (
                        <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ fontSize: 22, width: 40, textAlign: "center" }}>{s.emoji}</div>
                          <input
                            type="range"
                            min={18}
                            max={120}
                            step={1}
                            value={s.size}
                            onChange={(e) => updateSticker({ ...s, size: Number(e.target.value) })}
                            style={{ width: "100%" }}
                          />
                          <button className="btn-ghost btn-sm" onClick={() => deleteSticker(s.id)}>
                            Supprimer
                          </button>
                        </div>
                      ))}
                      {stickers.length > 6 ? (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>Astuce : déplace-les directement sur l’image.</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </ModalSheet>

            <ModalSheet
              open={activeTool === "text"}
              title="Texte"
              onClose={() => setActiveTool(null)}
              width="min(760px, 96vw)"
            >
              <TextTool onAdd={addText} existing={texts} onUpdate={updateText} onDelete={deleteText} />
            </ModalSheet>

            <ModalSheet
              open={activeTool === "crop"}
              title="Recadrer"
              onClose={() => setActiveTool(null)}
              width="min(760px, 96vw)"
            >
              <div style={{ display: "grid", gap: 10 }}>
                <RangeRow label="Zoom" value={crop.zoom} min={1} max={2.5} step={0.01} onChange={(v) => setCrop((c) => ({ ...c, zoom: v }))} />
                <RangeRow label="Décalage horizontal" value={crop.x} min={-30} max={30} step={0.5} onChange={(v) => setCrop((c) => ({ ...c, x: v }))} />
                <RangeRow label="Décalage vertical" value={crop.y} min={-30} max={30} step={0.5} onChange={(v) => setCrop((c) => ({ ...c, y: v }))} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn-ghost" onClick={() => setCrop({ zoom: 1, x: 0, y: 0 })}>
                    Réinitialiser
                  </button>
                  <button className="btn-primary" onClick={() => setActiveTool(null)}>
                    OK
                  </button>
                </div>
              </div>
            </ModalSheet>
          </>
        ) : (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleUi();
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
      </div>
    </article>
  );
}

function TextTool({ onAdd, existing, onUpdate, onDelete }) {
  const [text, setText] = useState("");
  const [size, setSize] = useState(34);
  const [color, setColor] = useState("#ffffff");
  const [bg, setBg] = useState(true);

  const colors = [
    { k: "#ffffff", n: "Blanc" },
    { k: "#000000", n: "Noir" },
    { k: "#ffdd57", n: "Jaune" },
    { k: "#ff4d8d", n: "Rose" },
    { k: "#4dd2ff", n: "Bleu" },
    { k: "#52ff7a", n: "Vert" }
  ];

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="card" style={{ padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Ajouter du texte</div>
        <textarea
          className="input"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écris quelque chose…"
          style={{ width: "100%", resize: "vertical" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Taille</div>
            <input
              type="range"
              min={16}
              max={64}
              step={1}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 12, opacity: 0.75 }}>{size}px</div>
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Couleur</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {colors.map((c) => (
                <button
                  key={c.k}
                  className={color === c.k ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
                  onClick={() => setColor(c.k)}
                  style={{ borderRadius: 999 }}
                >
                  {c.n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
            <input type="checkbox" checked={bg} onChange={(e) => setBg(e.target.checked)} />
            Fond “glass”
          </label>

          <button
            className="btn-primary"
            onClick={() => {
              const t = String(text || "").trim();
              if (!t) return;
              onAdd?.({ text: t, size, color, bg });
              setText("");
            }}
            style={{ marginLeft: "auto" }}
          >
            Ajouter
          </button>
        </div>
      </div>

      {existing?.length ? (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Tes textes (déplace-les sur l’image)</div>
          <div style={{ display: "grid", gap: 10 }}>
            {existing.slice(0, 6).map((t) => (
              <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.text}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="range"
                    min={16}
                    max={80}
                    step={1}
                    value={t.size}
                    onChange={(e) => onUpdate?.({ ...t, size: Number(e.target.value) })}
                    style={{ width: 140 }}
                  />
                  <button className="btn-ghost btn-sm" onClick={() => onDelete?.(t.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
            {existing.length > 6 ? <div style={{ fontSize: 12, opacity: 0.7 }}>Tu peux en ajouter autant que tu veux 🙂</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}



function ProgressFeed({ user }) {
  // Volumes globaux du feed (stockés en localStorage)
  const [videoVol, setVideoVol] = useState(() => readVol(LS_VIDEO_VOL, 1));
  const [musicVol, setMusicVol] = useState(() => readVol(LS_MUSIC_VOL, 0.6));

  const setVol = (key, v) => {
    const x = Math.min(1, Math.max(0, Number(v)));
    try { localStorage.setItem(key, String(x)); } catch {}
    return x;
  };


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
    <main className="page" style={{ position: "relative" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Progressions</h2>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn-ghost btn-sm"
            onClick={() => navigate("/progress/mine")}
            title="Mes publications"
            style={{
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              fontSize: 10,
              padding: "4px 7px",
            }}
          >
            Mes publications
          </button>

          <button className="btn-primary" onClick={() => navigate("/post")} disabled={!user} title="Publier">
            + Publier
          </button>
        </div>
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
            paddingBottom: 12
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
    </main>
  );
}

export { ProgressFeed };
export default ProgressFeed;
