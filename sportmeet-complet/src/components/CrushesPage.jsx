// sportmeet-complet/src/components/CrushesPage.jsx
import React, { useEffect, useMemo, useState } from "react";

function chatKey(id) {
  return `chat_messages_${id}`;
}

function readChat(id) {
  try {
    const raw = localStorage.getItem(chatKey(id));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveChat(id, messages) {
  try {
    localStorage.setItem(chatKey(id), JSON.stringify(messages || []));
  } catch {}
}

export function CrushesPage({ crushes = [], superlikers = [], myPhotoUrl = "", onBack }) {
  // ✅ Démo Paul si aucun crush (pour preview)
  const demoCrush = useMemo(
    () => ({
      id: "__demo_paul",
      name: "Paul",
      photo: "", // on laisse vide => fallback sur ta photo client
      message: "Salut 👋 Ça te dit une séance cette semaine ? 💪"
    }),
    []
  );

  const list = crushes.length === 0 ? [demoCrush] : crushes;

  // ✅ Chat UI
  const [activeChat, setActiveChat] = useState(null); // {id,name,photo}
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  // ✅ fallback image = photo du crush -> sinon photo client -> sinon logo
  const getAvatar = (c) => c?.photo || myPhotoUrl || "/logo.png";

  // Ouvrir chat
  const openChat = (c) => {
    const chat = { id: c.id, name: c.name, photo: getAvatar(c) };
    setActiveChat(chat);

    const stored = readChat(c.id);

    // si démo Paul : seed un premier message si aucun historique
    if (!stored || stored.length === 0) {
      const seeded = [
        {
          id: `${Date.now()}-p1`,
          from: "them",
          text: c.message || "Salut 👋",
          ts: Date.now()
        }
      ];
      setMessages(seeded);
      saveChat(c.id, seeded);
      return;
    }

    setMessages(stored);
  };

  const closeChat = () => {
    setActiveChat(null);
    setMessages([]);
    setDraft("");
  };

  const sendMessage = () => {
    if (!activeChat) return;
    const text = (draft || "").trim();
    if (!text) return;

    const next = [
      ...messages,
      {
        id: `${Date.now()}-me`,
        from: "me",
        text,
        ts: Date.now()
      }
    ];

    setMessages(next);
    saveChat(activeChat.id, next);
    setDraft("");
  };

  // scroll en bas quand nouveau message
  useEffect(() => {
    const el = document.getElementById("chat-scroll");
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeChat?.id]);

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

      {/* ✅ Première carte Premium: SUPERLIKES */}
      <div className="card" style={{ marginTop: 14, padding: 14, borderRadius: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>Passe à Premium ⭐</div>
            <div style={{ opacity: 0.85, marginTop: 4 }}>
              pour voir qui t’a <strong>superlike</strong> et débloquer plus de superlikes.
            </div>

            <div style={{ marginTop: 10 }}>
              {superlikers.length === 0 ? (
                <div style={{ opacity: 0.8, fontSize: 14 }}>Aucun superlike pour le moment.</div>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {superlikers.slice(0, 8).map((p) => (
                    <div
                      key={p.user_id || p.id}
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                      title={`${p.name} t’a superlike ⭐`}
                    >
                      <img
                        src={p.photo || myPhotoUrl || "/logo.png"}
                        alt={p.name}
                        style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }}
                      />
                      <div style={{ fontSize: 14, fontWeight: 700, display: "flex", gap: 6, alignItems: "center" }}>
                        <span>{p.name}</span>
                        <span style={{ opacity: 0.85 }}>⭐</span>
                      </div>
                    </div>
                  ))}

                  {superlikers.length > 8 ? (
                    <div style={{ fontSize: 14, opacity: 0.85, alignSelf: "center" }}>
                      +{superlikers.length - 8}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <button type="button" className="btn-primary btn-sm" onClick={() => alert("Premium bientôt 🙂")}>
            Passer Premium
          </button>
        </div>
      </div>

      {/* ✅ Messages */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Messages</div>

        {crushes.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 8 }}>
            Aperçu (message de démo)
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((c) => {
            const preview =
              c.lastMessage?.trim?.() ||
              c.message?.trim?.() ||
              "Engage la conversation ;)";

            return (
              <div
                key={c.id}
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
                  style={{ width: 54, height: 54, borderRadius: 12, objectFit: "cover" }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ opacity: 0.8, marginTop: 2, fontSize: 14 }}>{preview}</div>
                </div>

                <button type="button" className="btn-ghost btn-sm" onClick={() => openChat(c)}>
                  Ouvrir
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ Zone chat */}
      {activeChat ? (
        <div className="card" style={{ marginTop: 14, padding: 12, borderRadius: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <img
              src={activeChat.photo || myPhotoUrl || "/logo.png"}
              alt={activeChat.name}
              style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{activeChat.name}</div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>Messagerie</div>
            </div>
            <button type="button" className="btn-ghost btn-sm" onClick={closeChat}>
              Fermer
            </button>
          </div>

          <div
            id="chat-scroll"
            style={{
              height: 260,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)"
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.from === "me" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: m.from === "me" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"
                }}
              >
                <div style={{ fontSize: 14, lineHeight: 1.35 }}>{m.text}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <input
              className="input"
              placeholder="Écris un message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn-primary" onClick={sendMessage}>
              Envoyer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
