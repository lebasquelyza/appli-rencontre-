import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams } from "expo-router";

const WEB_URL = "https://match-fit.org";
const WEB_MESSAGES_PATH = "/crushes";

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
  console.log("🔥 HomeWeb mounted on", Platform.OS);

  const params = useLocalSearchParams();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const savingRef = useRef(false);
  const lastSavedUserRef = useRef<string | null>(null);
  const lastAccessTokenRef = useRef<string | null>(null);

  const gotoWeb = (url: string) => {
    console.log("🌐 gotoWeb:", url);
    webRef.current?.injectJavaScript(`
      try { window.location.href = "${url}"; } catch(e) {}
      true;
    `);
  };

  const maybeRegisterAndSavePushToken = async () => {
    try {
      if (savingRef.current) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      const userId = session?.user?.id;
      const jwt = session?.access_token;

      console.log("👤 userId =", userId);

      if (!userId) {
        console.log("⚠️ No user session yet");
        return;
      }

      if (lastSavedUserRef.current === userId) {
        console.log("ℹ️ token already saved for user");
        return;
      }

      const perm = await Notifications.getPermissionsAsync();
      let status = perm.status;

      if (status !== "granted") {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }

      if (status !== "granted") {
        console.log("❌ Notification permission denied");
        return;
      }

      const projectId =
        (Constants.expoConfig as any)?.extra?.eas?.projectId ??
        (Constants as any)?.easConfig?.projectId;

      const expoToken = projectId
        ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
        : (await Notifications.getExpoPushTokenAsync()).data;

      console.log("✅ ExpoPushToken:", expoToken);

      savingRef.current = true;

      const res = await fetch(SAVE_PUSH_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({
          token: expoToken,
          user_id: userId,
          platform: Platform.OS,
        }),
      });

      const txt = await res.text();
      console.log("🌐 save-push-token status =", res.status, txt);

      if (res.ok) {
        lastSavedUserRef.current = userId;
        console.log("✅ Push token saved in Supabase");
      }
    } catch (e) {
      console.log("❌ maybeRegisterAndSavePushToken error:", e);
    } finally {
      savingRef.current = false;
    }
  };

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
        console.log("📩 Session received from web");

        if (!msg?.access_token) return;

        if (lastAccessTokenRef.current === msg.access_token) {
          console.log("🔁 duplicate session ignored");
          return;
        }

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

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data: any = response?.notification?.request?.content?.data;

      console.log("👉 Notification tap:", data);

      const matchId = data?.match_id || data?.matchId || data?.matchID;

      if (matchId) gotoWeb(`${WEB_URL}/chat/${matchId}`);
      else gotoWeb(`${WEB_URL}${WEB_MESSAGES_PATH}`);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    maybeRegisterAndSavePushToken();
  }, []);

  // ✅ support /?open=<url> envoyé par _layout.tsx (notif)
  const initialUri = useMemo(() => {
    const open = typeof params.open === "string" ? params.open : "";
    const base = open || WEB_URL;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}v=1`; // change v=2 si besoin un jour
  }, [params.open]);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webRef}
        source={{ uri: initialUri }}
        onLoadEnd={() => setLoading(false)}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled={false}
        incognito
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
