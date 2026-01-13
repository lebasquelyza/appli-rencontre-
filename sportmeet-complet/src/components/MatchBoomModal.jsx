// sportmeet-complet/src/components/MatchBoomModal.jsx
import React, { useEffect } from "react";

export function MatchBoomModal({ open, onClose, matchName = "Match", photoUrl = "" }) {
  // ESC pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={() => onClose?.()}
      style={{ zIndex: 50 }}
      aria-label="Match modal"
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, calc(100vw - 24px))",
          margin: "0 auto",
          padding: 18,
          borderRadius: 18,
          position: "relative",
          textAlign: "center",
          overflow: "hidden",
          transformOrigin: "center",
          animation: "boomPop 420ms cubic-bezier(.2,.9,.2,1) both"
        }}
      >
        {/* Effet "bombe" (ondes) */}
        <div
          style={{
            position: "absolute",
            inset: -60,
            pointerEvents: "none",
            opacity: 0.7
          }}
        >
          <div style={{ position: "absolute", inset: 0, borderRadius: 9999, border: "2px solid rgba(255,255,255,.22)", animation: "boomRing 900ms ease-out both" }} />
          <div style={{ position: "absolute", inset: 18, borderRadius: 9999, border: "2px solid rgba(255,255,255,.16)", animation: "boomRing 900ms ease-out 110ms both" }} />
          <div style={{ position: "absolute", inset: 36, borderRadius: 9999, border: "2px solid rgba(255,255,255,.12)", animation: "boomRing 900ms ease-out 220ms both" }} />
        </div>

        {/* Close */}
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => onClose?.()}
          style={{ position: "absolute", top: 10, right: 10 }}
          aria-label="Fermer"
          title="Fermer"
        >
          ✕
        </button>

        {/* Contenu */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,.22)",
              transform: "rotate(-2deg)",
              animation: "boomFloat 1300ms ease-in-out 200ms infinite"
            }}
          >
            <img
              src={photoUrl || "/logo.png"}
              alt={matchName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 26, fontWeight: 900, letterSpacing: 0.2 }}>
          💥 C’est un match !
        </div>

        <div style={{ marginTop: 6, opacity: 0.9, fontSize: 15, lineHeight: 1.35 }}>
          Avec <strong>{matchName}</strong> — engage la conversation 😉
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
          <button type="button" className="btn-primary" onClick={() => onClose?.()}>
            OK
          </button>
        </div>

        {/* CSS anim inline (pas besoin de toucher tes fichiers CSS) */}
        <style>{`
          @keyframes boomPop {
            0% { transform: scale(.85); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes boomRing {
            0% { transform: scale(.55); opacity: 0; }
            30% { opacity: 1; }
            100% { transform: scale(1); opacity: 0; }
          }
          @keyframes boomFloat {
            0%, 100% { transform: translateY(0) rotate(-2deg); }
            50% { transform: translateY(-6px) rotate(1deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
