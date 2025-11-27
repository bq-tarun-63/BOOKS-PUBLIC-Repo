import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    // any app-wide init
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}

