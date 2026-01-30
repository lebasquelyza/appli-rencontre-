// sportmeet-complet/src/components/CrushesPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { SwipeCard } from "./SwipeCard";



/* ===============================
   Swipe left → supprimer conversation
   (efface messages + match)
================================ */
function SwipeToDeleteRow({ children, onDelete, disabled }) {
  const startX = useRef(0);
  const startY = useRef(0);
  const baseX = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(false);

  const [x, setX] = useState(0);
  const MAX = 96; // largeur zone Supprimer

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const onPointerDown = (e) => {
    if (disabled) return;

    // ignore si on démarre sur un bouton/lien/champ
    if (e.target?.closest?.("input, textarea, select")) return;

    dragging.current = true;
    moved.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    baseX.current = x;

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e) => {
    if (!dragging.current || disabled) return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // si mouvement plutôt vertical, on laisse scroller
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) return;

    if (Math.abs(dx) > 6) moved.current = true;

    // swipe gauche = x négatif
    const next = clamp(baseX.current + dx, -MAX, 0);
    setX(next);

    // empêche la page de scroller quand on swipe horizontal
    if (moved.current) e.preventDefault?.();
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;

    // snap
    const opened = x < -MAX * 0.45;
    setX(opened ? -MAX : 0);
  };

  const close = () => setX(0);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16 }}>
      {/* zone derrière */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "stretch",
          background: "rgba(239,68,68,.18)",
          opacity: Math.min(1, Math.abs(x) / MAX),
          pointerEvents: x === 0 ? "none" : "auto",
        }}
      >
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => {
            if (disabled) return;
            onDelete?.();
            close();
          }}
          style={{
            width: MAX,
            borderRadius: 0,
            background: "rgba(239,68,68,.92)",
            border: "1px solid rgba(255,255,255,.18)"
          }}
        >
          Supprimer
        </button>
      </div>

      {/* contenu glissant */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translate3d(${x}px,0,0)`,
          transition: dragging.current ? "none" : "transform 180ms ease",
          touchAction: "pan-y",
          willChange: "transform"
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function CrushesPage({
  crushes = [],
  superlikers = [],
  myPhotoUrl = "",
  onBack,
  onHideMatch
}) {
  const navigate = useNavigate();

  // ✅ Aperçu profil (comme "Aperçu" de mon profil)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewProfile, setPreviewProfile] = useState(null);

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewProfile(null);
    setPreviewError("");
  };

  const openPreview = async (c) => {
    // demo fallback
    if (!c?.user_id) {
      setPreviewProfile(c);
      setPreviewOpen(true);
      return;
    }

    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewProfile(null);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", c.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setPreviewError("Impossible de charger le profil.");
        setPreviewLoading(false);
        return;
      }

      const mapped = {
        id: data.id,
        user_id: data.user_id ?? null,
        name: data.name,
        age: data.age ?? null,
        height: data.height ?? null,
        gender: data.gender ?? null,
        status: data.status ?? "active",
        city: data.city,
        sport: data.sport,
        level: data.level,
        availability: data.availability || "",
        bio: data.bio || "",
        photo_urls: Array.isArray(data.photo_urls) ? data.photo_urls : [],
        isCustom: true,
        createdAt: data.created_at
      };

      setPreviewProfile(mapped);
      setPreviewLoading(false);
    } catch (e) {
      setPreviewError("Erreur lors du chargement du profil.");
      setPreviewLoading(false);
    }
  };

  // ✅ suppression définitive conversation (messages + match)
  const [deletedMatchIds, setDeletedMatchIds] = useState(() => new Set());

  const deleteConversation = async (c) => {
    const mid = Number(c?.match_id);
    if (!Number.isFinite(mid)) return;

    const ok = window.confirm("Supprimer cette conversation ?\n\nLes messages seront effacés définitivement.");
    if (!ok) return;

    try {
      // 1) delete messages
      const { error: msgErr } = await supabase.from("messages").delete().eq("match_id", mid);
      if (msgErr) console.error("delete messages error", msgErr);

      // 2) delete match
      const { error: mErr } = await supabase.from("matches").delete().eq("id", mid);
      if (mErr) console.error("delete match error", mErr);

      setDeletedMatchIds((prev) => {
        const next = new Set(prev);
        next.add(mid);
        return next;
      });
    } catch (e) {
      console.error("deleteConversation exception", e);
      alert("Impossible de supprimer la conversation (permissions / RLS ?)");
    }
  };


  // ✅ Démo Paul si aucun crush (preview UI)
  const demoCrush = {
    id: "__demo_paul",
    name: "Paul",
    photo_urls: [],
    message: "Salut 👋 Ça te dit une séance cette semaine ? 💪",
    match_id: "demo"
  };

  const list = (crushes.length === 0 ? [demoCrush] : crushes).filter((c) => !deletedMatchIds.has(Number(c?.match_id)));

  // ✅ avatar du crush = photo du crush, jamais myPhotoUrl
  const getAvatar = (c) => c?.photo_urls?.[0] || c?.photo || "/logo.png";

  const openChat = (c) => {
    const matchId = c?.id === "__demo_paul" ? "demo" : c?.match_id;

    if (!matchId) {
      alert("Chat indisponible : match_id manquant.");
      return;
    }

    navigate(`/chat/${matchId}`, {
      state: {
        crush: {
          id: c.id,
          name: c.name,
          city: c.city,
          sport: c.sport,
          photo_urls: c.photo_urls || [],
          message: c.message || c.last_message_body || "Salut 👋",
          match_id: matchId
        },
        myPhotoUrl
      }
    });
  };

  const hide = (c) => {
    if (!onHideMatch) return;

    const ok = window.confirm(
      "Masquer ce match ?\n\n- Il disparaîtra de ta liste.\n- Tu pourras le ré-afficher plus tard."
    );
    if (!ok) return;

    onHideMatch(c);
  };

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Mes crush</h2>
          <div style={{ opacity: 0.8, marginTop: 4 }}>Retrouve tes matchs et tes messages.</div>
        </div>

        <button type="button" className="btn-ghost btn-sm" onClick={onBack}>
          Retour
        </button>
      </div>

      

      {/* ✅ Messages */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Messages</div>

        {crushes.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 8 }}>Aperçu (message de démo)</div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((c) => {
            const preview =
              c.last_message_body?.trim?.() ||
              c.lastMessage?.trim?.() ||
              c.message?.trim?.() ||
              "Engage la conversation 👋";

            const isDemo = c.id === "__demo_paul";

            return (
              <SwipeToDeleteRow disabled={!c?.match_id || isDemo} onDelete={() => deleteConversation(c)}>
              <div
                key={c.match_id || c.id}
                className="card"
                style={{
                  padding: 12,
                  borderRadius: 14,
                  display: "flex",
                  gap: 12,
                  alignItems: "center"
                }}
              >
                <img
                  src={getAvatar(c)}
                  alt={c.name}
                  onClick={() => openPreview(c)}
                  title="Voir le profil"
                  style={{ width: 54, height: 54, borderRadius: 12, objectFit: "cover", cursor: "pointer" }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div
                    style={{
                      opacity: 0.8,
                      marginTop: 2,
                      fontSize: 14,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {preview}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => openChat(c)}>
                    Ouvrir
                  </button>

                  {!isDemo ? (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      title="Masquer ce match"
                      onClick={() => hide(c)}
                      aria-label="Masquer ce match"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </div>
              </SwipeToDeleteRow>
            );
          })}
        </div>
      </div>
    </div>
  );
}
