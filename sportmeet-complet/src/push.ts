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
    console.log("Push uniquement sur vrai téléphone");
    return;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } =
      await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permission refusée");
    return;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log("projectId manquant");
    return;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;

  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes.user) {
    console.log("Utilisateur non connecté");
    return;
  }

  const { error } = await supabase
    .from("user_push_tokens")
    .upsert(
      {
        user_id: userRes.user.id,
        expo_push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "expo_push_token",
      }
    );

  if (error) {
    console.error("❌ PUSH ERROR", error);
  } else {
    console.log("✅ Push token enregistré");
  }
}
