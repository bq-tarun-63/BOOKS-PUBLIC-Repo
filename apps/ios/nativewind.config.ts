import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "rgb(229 231 235)",
        input: "rgb(229 231 235)",
        ring: "rgb(59 130 246)",
        background: "#ffffff",
        foreground: "#111827",
        primary: {
          DEFAULT: "#111827",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f3f4f6",
          foreground: "#111827",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f3f4f6",
          foreground: "#6b7280",
        },
        accent: {
          DEFAULT: "#111827",
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#111827",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
} satisfies Config;

