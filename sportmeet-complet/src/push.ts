import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabaseClient";

// Important: iOS exige souvent d'avoir un handler pour l'affichage en foreground
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

  // 1) Permission
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

  // 2) Token (projectId requis sur beaucoup de projets Expo/EAS)
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    console.log("❌ projectId introuvable (eas.projectId).");
    console.log("Va dans app.json/app.config.js -> extra.eas.projectId");
    return;
  }

  const expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  console.log("✅ Expo push token:", expoToken);

  // 3) User connecté ?
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;

  if (!userId) {
    console.log("❌ Aucun user connecté Supabase");
    return;
  }

  // 4) Upsert en DB
  const { error } = await supabase.from("user_push_tokens").upsert({
    user_id: userId,
    expo_push_token: expoToken,
    platform: "ios",
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.log("❌ Erreur upsert token:", error);
  } else {
    console.log("✅ Token enregistré dans Supabase !");
  }
}
