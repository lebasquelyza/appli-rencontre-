// sportmeet-complet/src/pages/ChatPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function ChatPage() {
  const navigate = useNavigate();
  const { matchId } = useParams(); // "demo" ou uuid
  const location = useLocation();

  const crush = location.state?.crush || null;
  const myPhotoUrl = location.state?.myPhotoUrl || "";

  const isDemo = matchId === "demo";

  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  const scrollRef = useRef(null);
  const channelRef = useRef(null);

  const avatar = crush?.photo || myPhotoUrl || "/logo.png";
  const title = crush?.name || "Messages";

  // user
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

  // load + realtime
  useEffect(() => {
    const cleanup = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    const run = async () => {
      cleanup();

      if (isDemo) {
        setMessages([
          {
            id: "demo-1",
            sender_id: "them",
            body: crush?.message || "Salut 👋 Ça te dit une séance cette semaine ? 💪",
            created_at: new Date().toISOString()
          }
        ]);
        return;
      }

      // vrai match id requis
      if (!matchId) {
        setMessages([]);
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .select("id, match_id, sender_id, body, created_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true })
        .limit(300);

      if (error) {
        console.error("fetch messages error:", error);
        setMessages([]);
        return;
      }

      setMessages(data || []);

      const channel = supabase
        .channel(`messages:${matchId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
          (payload) => {
            const row = payload.new;
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    run();
    return cleanup;
  }, [matchId, isDemo, crush?.message]);

  // autoscroll
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    const text = (draft || "").trim();
    if (!text) return;

    if (isDemo) {
      setMessages((prev) => [
        ...prev,
        { id: `demo-${Date.now()}`, sender_id: "me", body: text, created_at: new Date().toISOString() }
      ]);
      setDraft("");
      return;
    }

    if (!me?.id || !matchId) return;

    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: me.id,
      body: text
    });

    if (error) {
      console.error("send message error:", error);
      return;
    }

    setDraft("");
  };

  return (
    <main className="page">
      <div className="shell">
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" className="btn-ghost btn-sm" onClick={() => navigate(-1)}>
              Retour
            </button>

            <img src={avatar} alt={title} style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover" }} />

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{title}</div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>{isDemo ? "Démo" : "Messagerie"}</div>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="card"
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              height: "60vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}
          >
            {messages.map((m) => {
              const mine = m.sender_id === "me" || (me?.id && m.sender_id === me.id);
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    padding: "10px 12px",
                    borderRadius: 14,
                    background: mine ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"
                  }}
                >
                  <div style={{ fontSize: 14, lineHeight: 1.35 }}>{m.body}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
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
      </div>
    </main>
  );
}
