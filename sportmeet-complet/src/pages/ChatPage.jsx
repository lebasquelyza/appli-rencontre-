// sportmeet-complet/src/pages/ChatPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function ChatPage() {
  const navigate = useNavigate();
  const { matchId } = useParams(); // "demo" ou bigint en string
  const location = useLocation();

  const isDemo = matchId === "demo";
  const matchIdNum = useMemo(() => (isDemo ? null : Number(matchId)), [isDemo, matchId]);

  const stateCrush = location.state?.crush || null;

  const [me, setMe] = useState(null);
  const [crush, setCrush] = useState(stateCrush); // on sécurise via DB si absent
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  // ✅ mini toast in-app
  const [toast, setToast] = useState("");

  const scrollRef = useRef(null);
  const channelRef = useRef(null);

  const title = crush?.name || "Messages";
  const avatar = crush?.photo_urls?.[0] || crush?.photo || "/logo.png";

  const showToast = (txt) => {
    setToast(txt);
    window.clearTimeout(window.__chat_toast);
    window.__chat_toast = window.setTimeout(() => setToast(""), 2200);
  };

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

  // ✅ si on arrive via refresh/lien direct: récupérer le crush depuis DB
  useEffect(() => {
    const run = async () => {
      if (isDemo) return;
      if (!me?.id) return;
      if (!matchIdNum || Number.isNaN(matchIdNum)) return;

      // si on a déjà un crush avec un nom -> ok
      if (crush?.name) return;

      const { data: matchRow, error: matchErr } = await supabase
        .from("matches")
        .select("id, user1_id, user2_id")
        .eq("id", matchIdNum)
        .single();

      if (matchErr || !matchRow) {
        console.error("fetch match error:", matchErr);
        return;
      }

      const otherUserId = matchRow.user1_id === me.id ? matchRow.user2_id : matchRow.user1_id;

      const { data: profRow, error: profErr } = await supabase
        .from("profiles")
        .select("id, user_id, name, photo_urls, created_at")
        .eq("user_id", otherUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profErr) {
        console.error("fetch profile error:", profErr);
        return;
      }

      if (profRow) {
        setCrush({
          id: profRow.id,
          user_id: profRow.user_id,
          name: profRow.name,
          photo_urls: Array.isArray(profRow.photo_urls) ? profRow.photo_urls : []
        });
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, me?.id, matchIdNum]);

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
            body: stateCrush?.message || "Salut 👋 Ça te dit une séance cette semaine ? 💪",
            created_at: new Date().toISOString()
          }
        ]);
        return;
      }

      if (!matchIdNum || Number.isNaN(matchIdNum)) {
        setMessages([]);
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .select("id, match_id, sender_id, body, created_at")
        .eq("match_id", matchIdNum)
        .order("created_at", { ascending: true })
        .limit(300);

      if (error) {
        console.error("fetch messages error:", error);
        setMessages([]);
        return;
      }

      setMessages(data || []);

      const channel = supabase
        .channel(`messages:${matchIdNum}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchIdNum}` },
          (payload) => {
            const row = payload.new;
            if (!row?.id) return;

            setMessages((prev) => {
              // déjà présent ?
              if (prev.some((m) => m.id === row.id)) return prev;

              // ✅ anti-doublon : remplace un message optimiste temp- si même body/sender et proche dans le temps
              const idxTemp = prev.findIndex((m) => {
                if (!String(m.id || "").startsWith("temp-")) return false;
                if (m.sender_id !== row.sender_id) return false;
                if ((m.body || "") !== (row.body || "")) return false;

                const t1 = new Date(m.created_at).getTime();
                const t2 = new Date(row.created_at).getTime();
                return Math.abs(t2 - t1) < 15000; // 15s
              });

              if (idxTemp !== -1) {
                const copy = [...prev];
                copy[idxTemp] = row;
                return copy;
              }

              return [...prev, row];
            });

            // ✅ toast si message de l'autre
            const isMine = row.sender_id === me?.id;
            if (!isMine) showToast("Nouveau message 💬");
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    run();
    return cleanup;
  }, [isDemo, matchIdNum, stateCrush?.message, me?.id]);

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

    if (!me?.id || !matchIdNum || Number.isNaN(matchIdNum)) return;

    // ✅ envoi optimiste (effet "vrai chat")
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      match_id: matchIdNum,
      sender_id: me.id,
      body: text,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    const { error } = await supabase.from("messages").insert({
      match_id: matchIdNum,
      sender_id: me.id,
      body: text
    });

    if (error) {
      console.error("send message error:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      showToast("Erreur d’envoi ❌");
      return;
    }

    // ✅ push téléphone au destinataire (si token enregistré)
    try {
      const to_user_id = crush?.user_id;
      if (to_user_id) {
        await supabase.functions.invoke("notify", {
          body: {
            type: "message",
            to_user_id,
            title: `Message • ${title || "Match"}`,
            body: text,
            data: { match_id: matchIdNum }
          }
        });
      }
    } catch (e) {
      console.log("notify message error", e);
    }
  };

  return (
    <main className="page">
      <div className="shell">
        <div className="card" style={{ padding: 14, position: "relative" }}>
          {/* ✅ Toast */}
          {toast ? (
            <div
              style={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.65)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: 13,
                zIndex: 10
              }}
            >
              {toast}
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" className="btn-ghost btn-sm" onClick={() => navigate(-1)}>
              Retour
            </button>

            <img src={avatar} alt={title} style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover" }} />

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{title}</div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>{isDemo ? "Démo" : `Match #${matchId}`}</div>
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
                  <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6, textAlign: mine ? "right" : "left" }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
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
