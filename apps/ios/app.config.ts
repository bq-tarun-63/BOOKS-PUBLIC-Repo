import { ExpoConfig } from "expo/config";

const WEB_APP_URL = process.env.WEB_APP_URL || "http://localhost:3000";

const config: ExpoConfig = {
  name: "novel-ios-app",
  slug: "novel-ios-app",
  scheme: "betaque-notes",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.betaque.notes",
    infoPlist: {
      NSAppTransportSecurity: {
        // Allow http during local development if WEB_APP_URL is not HTTPS
        NSAllowsArbitraryLoads: WEB_APP_URL.startsWith("http://"),
      },
    },
  },
  extra: {
    NEXTAUTH_API_URL: process.env.NEXTAUTH_API_URL,
    SOCKET_SERVER_URL: process.env.SOCKET_SERVER_URL,
    WEB_APP_URL,
  },
};

export default config;

