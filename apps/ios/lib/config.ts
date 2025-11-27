import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra || {}) as Record<string, string>;

export const NEXTAUTH_API_URL = extra.NEXTAUTH_API_URL || "http://localhost:3001";
export const SOCKET_SERVER_URL = extra.SOCKET_SERVER_URL || "http://localhost:4000";
export const WEB_APP_URL = extra.WEB_APP_URL || "http://localhost:3000";

