import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "../lib/supabase";

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let unsub: { unsubscribe: () => void } | null = null;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        router.replace(data.session ? "/(tabs)" : "/login");

        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
          router.replace(session ? "/(tabs)" : "/login");
        });

        unsub = sub.subscription;
      } catch (e: any) {
        console.log("❌ RootLayout auth error:", e);
        setErrMsg(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();

    return () => unsub?.unsubscribe?.();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Chargement…</Text>
      </View>
    );
  }

  if (errMsg) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>Erreur Supabase</Text>
        <Text selectable>{errMsg}</Text>
        <Text style={{ marginTop: 12 }}>
          Vérifie lib/supabase.ts (URL + anon key).
        </Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

