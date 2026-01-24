import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

const WEB_URL = "https://appli-rencontre.netlify.app";
const WEB_MESSAGES_PATH = "/crushes";
const SAVE_PUSH_TOKEN_URL = "https://vnzlovsnxxoacvjaekjv.functions.supabase.co/save-push-token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export default function HomeWeb() {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const savingRef = useRef(false);
  const lastSavedUserRef = useRef<string | null>(null);
  const lastAccessTokenRef = useRef<string | null>(null);

  // garde le token Expo en mémoire
  const expoTokenRef = useRef<string | null>(null);

  const gotoWeb = (url: string) => {
    webRef.current?.injectJavaScript(`
      try { window.location.href = "${url}"; } catch(e) {}
      true;
    `);
  };

  const getExpoPushToken = async () => {
    const perm = await Notifications.getPermissionsAsync();
    let status = perm.status;

    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return null;

    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;

    const token = projectId
      ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
      : (await Notifications.getExpoPushTokenAsync()).data;

    expoTokenRef.current = token;
    return token;
  };

  const postExpoTokenToWeb = (token: string) => {
    if (!token) return;
    const payload = JSON.stringify({ type: "EXPO_PUSH_TOKEN", token });

    // Android
    webRef.current?.postMessage(payload);

    // iOS (fallback)
    webRef.current?.injectJavaScript(`
      try { window.postMessage(${JSON.stringify(payload)}, "*"); } catch(e) {}
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

      const expoToken = expoTokenRef.current || (await getExpoPushToken());
      if (!expoToken) {
        console.log("❌ No push token (permission?)");
        return;
      }

      // utile si ta PWA veut aussi le token
      postExpoTokenToWeb(expoToken);

      savingRef.current = true;

      const res = await fetch(SAVE_PUSH_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: expoToken,
          user_id: userId,
          platform: Platform.OS
        })
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

      // le web demande le token push
      if (msg?.type === "REQUEST_EXPO_PUSH_TOKEN") {
        const token = expoTokenRef.current || (await getExpoPushToken());
        if (token) postExpoTokenToWeb(token);
        return;
      }

      // le web envoie la session
      if (msg?.type === "SUPABASE_SESSION") {
        if (!msg?.access_token) return;

        if (lastAccessTokenRef.current === msg.access_token) return;
        lastAccessTokenRef.current = msg.access_token;

        await supabase.auth.setSession({
          access_token: msg.access_token,
          refresh_token: msg.refresh_token ?? msg.access_token
        });

        // petit retry si auth pas encore prête
        const { data: u1 } = await supabase.auth.getUser();
        if (!u1?.user) await new Promise((r) => setTimeout(r, 500));

        await maybeRegisterAndSavePushToken();
      }
    } catch (e) {
      console.log("❌ onMessage error:", e);
    }
  };

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data: any = response?.notification?.request?.content?.data;
      const matchId = data?.match_id ?? data?.matchId ?? data?.matchID;

      if (matchId) gotoWeb(`${WEB_URL}/chat/${matchId}`);
      else gotoWeb(`${WEB_URL}${WEB_MESSAGES_PATH}`);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      await getExpoPushToken();
      await maybeRegisterAndSavePushToken();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webRef}
        source={{ uri: WEB_URL }}
        onLoadEnd={() => setLoading(false)}
        onMessage={onMessage}
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
            justifyContent: "center"
          }}
        >
          <ActivityIndicator />
        </View>
      )}
    </View>
  );
}
