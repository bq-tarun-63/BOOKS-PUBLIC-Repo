import { Link } from "expo-router";
import { Text, View, Pressable, TextInput } from "react-native";
import { useState } from "react";
import * as SecureStore from "expo-secure-store";

export default function UserScreen() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  async function signIn() {
    if (!email) return;
    const payload = JSON.stringify({ email, name });
    await SecureStore.setItemAsync("auth_user", payload);
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 p-6 bg-white">
      <Text className="text-xl font-semibold">Sign in (MVP)</Text>
      <TextInput
        className="w-full border rounded-md p-3"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="w-full border rounded-md p-3"
        placeholder="Name (optional)"
        value={name}
        onChangeText={setName}
      />
      <Pressable className="bg-black rounded-md px-4 py-3" onPress={signIn}>
        <Text className="text-white">Save</Text>
      </Pressable>
      <Link className="text-blue-600" href="/notes">
        Continue to Notes
      </Link>
    </View>
  );
}

