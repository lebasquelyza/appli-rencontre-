import { useState } from "react";
import { Button, Text, View } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "../../lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen() {
  const [token, setToken] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const getTokenAndSave = async () => {
    try {
      setStatus("Demande permission...");

      if (!Device.isDevice) {
        setStatus("❌ Il faut un iPhone réel");
        return;
      }

      const perm = await Notifications.getPermissionsAsync();
      let finalStatus = perm.status;

      if (finalStatus !== "granted") {
        const req = await Notifications.requestPermissionsAsync();
        finalStatus = req.status;
      }

      if (finalStatus !== "granted") {
        setStatus("❌ Permission notifications refusée");
        return;
      }

      const projectId =
        (Constants.expoConfig as any)?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;

      if (!projectId) {
        setStatus("❌ projectId introuvable (app.json → extra.eas.projectId)");
        return;
      }

      setStatus("Récupération du token...");

      const expoToken = (await Notifications.getExpoPushTokenAsync({ projectId }))
        .data;

      console.log("✅ ExpoPushToken:", expoToken);
      setToken(expoToken);

      setStatus("Enregistrement dans Supabase...");

      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;

      if (!userId) {
        setStatus("⚠️ Pas connecté à Supabase (il faut un login pour associer le token)");
        return;
      }

      const { error } = await supabase.from("user_push_tokens").upsert({
        user_id: userId,
        expo_push_token: expoToken,
        platform: "ios",
        updated_at: new Date().toISOString(),
      });

      if (error) setStatus("❌ Supabase error: " + error.message);
      else setStatus("✅ Token enregistré dans Supabase !");
    } catch (e: any) {
      console.log("❌ Erreur:", e);
      setStatus("❌ Erreur: " + (e?.message ?? String(e)));
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, marginBottom: 12 }}>MatchFit Mobile</Text>
      <Button title="Activer notifications + sauver" onPress={getTokenAndSave} />
      <Text style={{ marginTop: 16 }}>{status}</Text>
      <Text style={{ marginTop: 16 }} selectable>
        {token}
      </Text>
    </View>
  );
}
