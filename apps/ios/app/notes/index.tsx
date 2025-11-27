import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { WEB_APP_URL } from "@/lib/config";
import { WebView } from "react-native-webview";
import * as SecureStore from "expo-secure-store";

export default function NotesIndex() {
  const [ready, setReady] = useState(false);
  const [injectedJS, setInjectedJS] = useState<string>("");

  useEffect(() => {
    (async () => {
      const u = (await SecureStore.getItemAsync("auth_user")) || "";
      const workspace = (await SecureStore.getItemAsync("workspace")) || "";
      const js = `
        try {
          const payload = ${JSON.stringify(u)};
          if (payload) {
            window.localStorage.setItem('auth_user', payload);
          }
          const ws = ${JSON.stringify(workspace)};
          if (ws) {
            const expires = new Date(Date.now() + 365*24*60*60*1000).toUTCString();
            document.cookie = 'workspace=' + ws + '; path=/; expires=' + expires;
          }
        } catch (e) {}
        true;
      `;
      setInjectedJS(js);
      setReady(true);
    })();
  }, []);
  const notesUrl = useMemo(() => {
    const base = WEB_APP_URL.replace(/\/$/, "");
    return `${base}/notes`;
  }, []);

  if (!ready) return null;

  return (
    <View className="flex-1 bg-white">
      <WebView
        source={{ uri: notesUrl }}
        originWhitelist={["*"]}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        setSupportMultipleWindows={false}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        style={{ flex: 1 }}
      />
    </View>
  );
}

