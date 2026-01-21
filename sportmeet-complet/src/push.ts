import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabaseClient";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushTokenWithSupabase() {
  if (!Device.isDevice) {
    console.log("⚠️ Push: il faut un appareil réel");
    return;
  }

  // ✅ Android channel obligatoire
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  // 1️⃣ Permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("❌ Permission notifications refusée");
    return;
  }

  // 2️⃣ Expo projectId (EAS)
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log("❌ projectId introuvable (extra.eas.projectId)");
    return;
  }

  const expoToken = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;

  console.log("✅ Expo push token :", expoToken);

  // 3️⃣ User connecté
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;

  if (!userId) {
    console.log("❌ Aucun utilisateur connecté");
    return;
  }

  // 4️⃣ Enregistrement DB (iOS + Android)
  const { error } = await supabase
    .from("user_push_tokens")
    .upsert(
      {
        user_id: userId,
        expo_push_token: expoToken,
        platform: Platform.OS, // ✅ ios / android
        updated_at: new Date().toISOString(),
      },
      { onConflict: "expo_push_token" }
    );

  if (error) {
    console.log("❌ Erreur Supabase push token :", error);
  } else {
    console.log("✅ Push token enregistré !");
  }
}
