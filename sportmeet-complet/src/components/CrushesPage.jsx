// sportmeet-complet/src/components/CrushesPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export function CrushesPage({ crushes = [], superlikers = [], myPhotoUrl = "", onBack }) {
  // ✅ Démo Paul si aucun crush (preview UI)
  const demoCrush = useMemo(
    () => ({
      id: "__demo_paul",
      name: "Paul",
      photo: "",
      message: "Salut 👋 Ça te dit une séance cette semaine ? 💪",
      match_id: null // pas de match réel -> chat local uniquement
    }),
    []
  );

  const list = crushes.length === 0 ? [demoCrush] : crushes;

  const [activeChat, setActiveChat] = useState(null); // {id,name,photo,match_id,isDemo}
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  const [me, setMe] = useState(null);

  const scrollRef = useRef(null);
  const subRef = useRef(null);

  const getAvatar = (c) => c?.photo || myPhotoUrl || "/logo.png";

  // auth uid
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setMe(data?.user ?? null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const openChat = async (c) => {
    const isDemo = c.id === "__demo_paul" || !c.match_id;
    setActiveChat({
      id: c.id,
      name: c.name,
      photo: getAvatar(c),
      match_id: c.match_id || null,
      isDemo
    });

    setDraft("");

    // cleanup ancien realtime
    if (subRef.current) {
      supabase.removeChannel(subRef.current);
      subRef.current = null;
    }

    // DEMO = local
    if (isDemo) {
      setMessages([
        {
          id: "demo-1",
          sender_id: "them",
          body: c.message || "Salut 👋",
          created_at: new Date().toISOString()
        }
      ]);
      return;
    }

    // 1) fetch messages du match
    const { data, error } = await supabase
      .from("messages")
      .select("id, match_id, sender_id, body, created_at")
      .eq("match_id", c.match_id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("fetch messages error:", error);
      setMessages([]);
      return;
    }

    setMessages(data || []);

    // 2) realtime sur ce match
    const channel = supabase
      .channel(`messages:${c.match_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${c.match_id}` },
        (payload) => {
          const row = payload.new;
          setMessages((prev) => {
            // anti-doublon
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    subRef.current = channel;
  };

  const closeChat = () => {
    setActiveChat(null);
    setMessages([]);
    setDraft("");
    if (subRef.current) {
      supabase.removeChannel(subRef.current);
      subRef.current = null;
    }
  };

  const sendMessage = async () => {
    if (!activeChat) return;
    const text = (draft || "").trim();
    if (!text) return;

    // Demo: ajoute localement
    if (activeChat.isDemo || !activeChat.match_id) {
      setMessages((prev) => [
        ...prev,
        {
          id: `demo-${Date.now()}`,
          sender_id: "me",
          body: text,
          created_at: new Date().toISOString()
        }
      ]);
      setDraft("");
      return;
    }

    if (!me?.id) return;

    const { error } = await supabase.from("messages").insert({
      match_id: activeChat.match_id,
      sender_id: me.id,
      body: text
    });

    if (error) {
      console.error("send message error:", error);
      return;
    }

    setDraft("");
  };

  // scroll bas
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activeChat?.match_id, activeChat?.id]);

  // cleanup
  useEffect(() => {
    return () => {
      if (subRef.current) supabase.removeChannel(subRef.current);
    };
  }, []);

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

      {/* Premium superlikes */}
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
                </div>
              )}
            </div>
          </div>

          <button type="button" className="btn-primary btn-sm" onClick={() => alert("Premium bientôt 🙂")}>
            Passer Premium
          </button>
        </div>
      </div>

      {/* Messages list */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Messages</div>

        {crushes.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 8 }}>
            Aperçu (message de démo)
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((c) => {
            const preview = c.lastMessage?.trim?.() || c.message?.trim?.() || "Engage la conversation ;)";
            return (
              <div
                key={c.id}
                className="card"
                style={{ padding: 12, borderRadius: 14, display: "flex", gap: 12, alignItems: "center" }}
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

      {/* Chat box */}
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
              <div style={{ opacity: 0.75, fontSize: 13 }}>
                {activeChat.isDemo ? "Démo" : "Messagerie (temps réel)"}
              </div>
            </div>
            <button type="button" className="btn-ghost btn-sm" onClick={closeChat}>
              Fermer
            </button>
          </div>

          <div
            ref={scrollRef}
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
            {messages.map((m) => {
              const isMine = me?.id && m.sender_id === me.id;
              const align = isMine ? "flex-end" : "flex-start";
              const bg = isMine ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)";
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.sender_id === "me" ? "flex-end" : m.sender_id === "them" ? "flex-start" : align,
                    maxWidth: "80%",
                    padding: "10px 12px",
                    borderRadius: 14,
                    background: bg
                  }}
                >
                  <div style={{ fontSize: 14, lineHeight: 1.35 }}>{m.body}</div>
                </div>
              );
            })}
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
