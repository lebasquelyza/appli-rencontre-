import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";

function NotificationRouter() {
  const router = useRouter();

  useEffect(() => {
    const handle = (data: any) => {
      if (!data) return;

      const type = data?.type;
      const matchId = data?.match_id ?? data?.matchId;

      if ((type === "NEW_MESSAGE" || type === "NEW_MATCH") && matchId) {
        const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://appli-rencontre.netlify.app";
        // 👉 on ouvre la WebView directement sur /chat/:matchId
        router.push(`/?open=${encodeURIComponent(`${WEB_URL}/chat/${matchId}`)}`);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handle(response.notification.request.content.data);
    });

    (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) handle(last.notification.request.content.data);
    })();

    return () => sub.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <NotificationRouter />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
