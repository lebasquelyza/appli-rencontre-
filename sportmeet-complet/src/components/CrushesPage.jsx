import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { SwipeCard } from "./SwipeCard";

/* ===============================
   Swipe left → supprimer
================================ */
function SwipeToDeleteRow({ children, onDelete }) {
  const startX = React.useRef(0);
  const currentX = React.useRef(0);
  const dragging = React.useRef(false);

  const [x, setX] = useState(0);
  const MAX = 90;

  const down = (e) => {
    dragging.current = true;
    startX.current = e.clientX;
    currentX.current = x;
  };

  const move = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const next = Math.max(-MAX, Math.min(0, currentX.current + dx));
    if (Math.abs(dx) > 6) e.preventDefault();
    setX(next);
  };

  const up = () => {
    dragging.current = false;
    setX(x < -MAX / 2 ? -MAX : 0);
  };

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16 }}>
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: MAX,
          background: "rgba(239,68,68,.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <button
          className="btn-primary btn-sm"
          onClick={onDelete}
          style={{ background: "transparent", border: "none" }}
        >
          Supprimer
        </button>
      </div>

      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging.current ? "none" : "transform .2s ease",
          touchAction: "pan-y"
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ===============================
   PAGE MESSAGES
================================ */
export function CrushesPage({ crushes = [], onHideMatch }) {
  const navigate = useNavigate();

  const [preview, setPreview] = useState(null);

  const openPreview = async (c) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", c.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setPreview(data);
  };

  const deleteConversation = async (matchId) => {
    await supabase.from("messages").delete().eq("match_id", matchId);
    await supabase.from("matches").delete().eq("id", matchId);
    onHideMatch?.({ match_id: matchId });
  };

  return (
    <>
      <div style={{ display: "grid", gap: 10 }}>
        {crushes.map((c) => (
          <SwipeToDeleteRow
            key={c.id}
            onDelete={() => deleteConversation(c.match_id)}
          >
            <div
              className="card"
              style={{
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 12
              }}
            >
              <img
                src={c.photo_urls?.[0]}
                alt={c.name}
                onClick={() => openPreview(c)}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 12,
                  objectFit: "cover",
                  cursor: "pointer"
                }}
              />

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900 }}>{c.name}</div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>
                  {c.last_message_body}
                </div>
              </div>

              <button
                className="btn-primary btn-sm"
                onClick={() => navigate(`/chat/${c.match_id}`)}
              >
                Ouvrir
              </button>
            </div>
          </SwipeToDeleteRow>
        ))}
      </div>

      {/* ===== Aperçu profil ===== */}
      {preview &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={() => setPreview(null)}
          >
            <div
              className="modal-card modal-card--sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Aperçu</h3>
                <button className="btn-ghost" onClick={() => setPreview(null)}>
                  Fermer
                </button>
              </div>

              <div className="modal-body allowScroll">
                <SwipeCard profile={preview} />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
