import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

const WEB_URL = "https://appli-rencontre.netlify.app";
const WEB_MESSAGES_PATH = "/crushes"; // liste
const SAVE_PUSH_TOKEN_URL =
  "https://vnzlovsnxxoacvjaekjv.functions.supabase.co/save-push-token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomeWeb() {
  const webRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);

  // éviter appels multiples
  const savingRef = useRef(false);
  const lastSavedUserRef = useRef<string | null>(null);

  // éviter de traiter 3 fois la même session envoyée par le web
  const lastAccessTokenRef = useRef<string | null>(null);

  const gotoWeb = (url: string) => {
    webRef.current?.injectJavaScript(`
      try { window.location.href = "${url}"; } catch(e) {}
      true;
    `);
  };

  const maybeRegisterAndSavePushToken = async () => {
    try {
      if (savingRef.current) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        console.log("ℹ️ No session yet (mobile), skip save token");
        return;
      }

      if (lastSavedUserRef.current === userId) return;

      const perm = await Notifications.getPermissionsAsync();
      let finalStatus = perm.status;

      if (finalStatus !== "granted") {
        const req = await Notifications.requestPermissionsAsync();
        finalStatus = req.status;
      }

      if (finalStatus !== "granted") {
        console.log("❌ Notification permission not granted");
        return;
      }

      const projectId =
        (Constants.expoConfig as any)?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;

      const expoToken = projectId
        ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
        : (await Notifications.getExpoPushTokenAsync()).data;

      console.log("✅ ExpoPushToken:", expoToken);

      savingRef.current = true;

      const res = await fetch(SAVE_PUSH_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: expoToken,
          user_id: userId,
          platform: Platform.OS,
        }),
      });

      const txt = await res.text();
      console.log("✅ save-push-token:", res.status, txt);

      if (res.ok) lastSavedUserRef.current = userId;
    } catch (e) {
      console.log("❌ maybeRegisterAndSavePushToken error:", e);
    } finally {
      savingRef.current = false;
    }
  };

  // Réception session depuis le web
  const onMessage = async (event: any) => {
    try {
      const raw = event?.nativeEvent?.data;
      if (!raw) return;

      let msg: any;
      try {
        msg = JSON.parse(raw);
      } catch {
        msg = raw;
      }

      if (msg?.type === "SUPABASE_SESSION") {
        console.log("📩 Session reçue depuis le web");

        if (!msg?.access_token) return;

        // ✅ anti doublon (sinon ça resave 2-3 fois)
        if (lastAccessTokenRef.current === msg.access_token) return;
        lastAccessTokenRef.current = msg.access_token;

        await supabase.auth.setSession({
          access_token: msg.access_token,
          refresh_token: msg.refresh_token ?? msg.access_token,
        });

        await maybeRegisterAndSavePushToken();
      }
    } catch (e) {
      console.log("❌ onMessage error:", e);
    }
  };

  const onNavigationStateChange = (nav: any) => {
    if (nav?.url) console.log("🌐 WEBVIEW URL:", nav.url);
  };

  // ✅ Tap notification => /chat/<matchId> sinon /crushes
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data: any = response?.notification?.request?.content?.data;
      console.log("👉 notif tap data:", data);

      const matchId = data?.match_id ?? data?.matchId ?? data?.matchID;

      if (matchId) {
        gotoWeb(`${WEB_URL}/chat/${matchId}`);
      } else {
        gotoWeb(`${WEB_URL}${WEB_MESSAGES_PATH}`);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    maybeRegisterAndSavePushToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webRef}
        source={{ uri: WEB_URL }}
        onLoadEnd={() => setLoading(false)}
        onMessage={onMessage}
        onNavigationStateChange={onNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
      />

      {loading && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator />
        </View>
      )}
    </View>
  );
}

