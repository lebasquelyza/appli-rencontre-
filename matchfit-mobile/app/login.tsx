import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const signIn = async () => {
    setMsg("Connexion...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg("❌ " + error.message);
    else {
      setMsg("✅ Connecté");
      router.replace("/(tabs)");
    }
  };

  const signUp = async () => {
    setMsg("Création du compte...");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg("❌ " + error.message);
    else setMsg("✅ Compte créé (vérifie ton email si demandé)");
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, marginBottom: 12 }}>Login MatchFit</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 8 }}
      />

      <TextInput
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 8 }}
      />

      <Button title="Se connecter" onPress={signIn} />
      <View style={{ height: 10 }} />
      <Button title="Créer un compte" onPress={signUp} />

      <Text style={{ marginTop: 16 }}>{msg}</Text>
    </View>
  );
}
