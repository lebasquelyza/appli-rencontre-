import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { supabase } from "../../../lib/supabase";

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  useEffect(() => {
    if (!matchId) return;

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;

      supabase
        .from("match_reads")
        .upsert({
          match_id: Number(matchId),
          user_id: data.user.id,
          last_read_at: new Date().toISOString(),
        });
    });
  }, [matchId]);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>Chat du match #{matchId}</Text>
    </View>
  );
}
