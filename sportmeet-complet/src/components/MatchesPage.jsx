import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export function MatchesPage({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [profilesByUserId, setProfilesByUserId] = useState({});
  const [activeMatch, setActiveMatch] = useState(null); // { match, otherUserId, otherProfile }
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);

  const meRef = useRef(null);
  const msgSubRef = useRef(null);
  const matchSubRef = useRef(null);

  const fetchMatches = async () => {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    meRef.current = user ?? null;

    if (!user) {
      setMatches([]);
      setProfilesByUserId({});
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("fetch matches error:", error);
    const rows = data || [];
    setMatches(rows);
    setLoading(false);

    // charger profils des autres utilisateurs
    const otherUserIds = Array.from(
      new Set(
        rows
          .map((m) => (m.user1_id === user.id ? m.user2_id : m.user1_id))
          .filter(Boolean)
      )
    );

    if (!otherUserIds.length) {
      setProfilesByUserId({});
      return;
    }

    const { data: profs, error: pe } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", otherUserIds);

    if (pe) console.error("fetch other profiles error:", pe);

    const map = {};
    (profs || []).forEach((p) => {
      if (p.user_id) map[p.user_id] = p;
    });
    setProfilesByUserId(map);
  };

  const fetchMessages = async (matchId) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (error) console.error("fetch messages error:", error);
    setMessages(data || []);
  };

  // --------------------------
  // Realtime: matches (liste)
  // --------------------------
  useEffect(() => {
    // initial load
    fetchMatches();

    // subscribe to matches changes
    const ch = supabase
      .channel("rt-matches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        async () => {
          // simple et robuste : on refetch
          await fetchMatches();
        }
      )
      .subscribe();

    matchSubRef.current = ch;

    return () => {
      if (matchSubRef.current) supabase.removeChannel(matchSubRef.current);
      matchSubRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------
  // Realtime: messages (chat)
  // --------------------------
  useEffect(() => {
    // cleanup ancienne subscription
    if (msgSubRef.current) {
      supabase.removeChannel(msgSubRef.current);
      msgSubRef.current = null;
    }

    const matchId = activeMatch?.match?.id;
    if (!matchId) return;

    // charge l'historique
    fetchMessages(matchId);

    // subscribe aux messages du match
    const ch = supabase
      .channel(`rt-messages-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`
        },
        (payload) => {
          const row = payload?.new;
          if (!row?.id) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row].sort(
              (a, b) => new Date(a.created_at) - new Date(b.created_at)
            );
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`
        },
        async () => {
          // update rare : refetch pour rester simple
          await fetchMessages(matchId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`
        },
        async () => {
          await fetchMessages(matchId);
        }
      )
      .subscribe();

    msgSubRef.current = ch;

    return () => {
      if (msgSubRef.current) supabase.removeChannel(msgSubRef.current);
      msgSubRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMatch?.match?.id]);

  const title = useMemo(() => {
    if (!activeMatch) return "Mes matchs";
    const other = activeMatch.otherProfile;
    return other?.name ? `Chat avec ${other.name}` : "Chat";
  }, [activeMatch]);

  const sendMessage = async () => {
    const text = (msgText || "").trim();
    if (!text || !activeMatch?.match?.id) return;

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        match_id: activeMatch.match.id,
        sender_id: user.id,
        body: text
      });
      if (error) throw error;

      setMsgText("");
      // ✅ pas besoin de refetch : le realtime INSERT va l'ajouter
    } catch (e) {
      console.error("send message error:", e);
      alert("Impossible d’envoyer le message pour le moment.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="card card-results">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center"
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
          <div className="card-subtitle" style={{ marginTop: 6 }}>
            {activeMatch ? "Écris ton message 👇" : "Clique sur un match pour discuter."}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {activeMatch ? (
            <button className="btn-ghost btn-sm" type="button" onClick={() => setActiveMatch(null)}>
              ← Retour
            </button>
          ) : (
            <button className="btn-ghost btn-sm" type="button" onClick={onBack}>
              ← Profils
            </button>
          )}

          <button className="btn-ghost btn-sm" type="button" onClick={fetchMatches}>
            Rafraîchir
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading ? (
          <p className="form-message">Chargement…</p>
        ) : !activeMatch ? (
          matches.length === 0 ? (
            <p className="form-message">Aucun match pour le moment.</p>
          ) : (
            <div className="matches-list">
              {matches.map((m) => (
                <MatchRow
                  key={m.id}
                  match={m}
                  profilesByUserId={profilesByUserId}
                  onOpen={(payload) => setActiveMatch(payload)}
                />
              ))}
            </div>
          )
        ) : (
          <>
            <div className="chat-box">
              {messages.length === 0 ? (
                <p className="form-message">Aucun message. Dis “Salut 👋” !</p>
              ) : (
                messages.map((x) => <ChatBubble key={x.id} msg={x} />)
              )}
            </div>

            <div className="chat-input">
              <input
                type="text"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Écrire un message…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />
              <button className="btn-primary" type="button" onClick={sendMessage} disabled={sending}>
                {sending ? "..." : "Envoyer"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function MatchRow({ match, profilesByUserId, onOpen }) {
  const [me, setMe] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user ?? null));
  }, []);

  if (!me) return null;

  const otherUserId = match.user1_id === me.id ? match.user2_id : match.user1_id;
  const otherProfile = profilesByUserId?.[otherUserId];

  const name = otherProfile?.name || "Quelqu’un";
  const sport = otherProfile?.sport || "";
  const city = otherProfile?.city || "";

  return (
    <button
      type="button"
      className="match-row"
      onClick={() => onOpen({ match, otherUserId, otherProfile })}
      title="Ouvrir le chat"
    >
      <div className="match-row-left">
        <div className="match-row-title">{name}</div>
        <div className="match-row-sub">
          {sport ? `${sport}` : "Sport"}
          {city ? ` · ${city}` : ""}
        </div>
      </div>
      <div className="match-row-right">💬</div>
    </button>
  );
}

function ChatBubble({ msg }) {
  const [me, setMe] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data?.user ?? null));
  }, []);

  const mine = me && msg.sender_id === me.id;

  return (
    <div className={`chat-bubble ${mine ? "mine" : ""}`}>
      <div className="chat-body">{msg.body}</div>
      <div className="chat-time">
        {new Date(msg.created_at).toLocaleString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit"
        })}
      </div>
    </div>
  );
}
