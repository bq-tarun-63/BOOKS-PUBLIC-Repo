/** @type {import('next').NextConfig} */
const nextConfig = {
  // Redirect rules
  redirects: async () => {
    return [
      {
        source: "/github",
        destination: "https://github.com/steven-tey/novel",
        permanent: true,
      },
      {
        source: "/sdk",
        destination: "https://www.npmjs.com/package/novel",
        permanent: true,
      },
      {
        source: "/npm",
        destination: "https://www.npmjs.com/package/novel",
        permanent: true,
      },
      {
        source: "/svelte",
        destination: "https://github.com/tglide/novel-svelte",
        permanent: false,
      },
      {
        source: "/vue",
        destination: "https://github.com/naveennaidu/novel-vue",
        permanent: false,
      },
      {
        source: "/vscode",
        destination:
          "https://marketplace.visualstudio.com/items?itemName=bennykok.novel-vscode",
        permanent: false,
      },
      {
        source: "/feedback",
        destination: "https://github.com/steven-tey/novel/issues",
        permanent: true,
      },
      {
        source: "/deploy",
        destination: "https://vercel.com/templates/next.js/novel",
        permanent: true,
      },
    ];
  },

  // Source maps in production
  productionBrowserSourceMaps: true,

  // External image domains
  images: {
    domains: ["lh3.googleusercontent.com"],
  },

  // Environment variables
  env: {
    GITHUB_USERNAME: process.env.GITHUB_USERNAME,
    GITHUB_REPO: process.env.GITHUB_REPO,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_APP_WEBHOOK_SECRET: process.env.GITHUB_APP_WEBHOOK_SECRET,
    NEXTAUTH_API_URL: process.env.NEXTAUTH_API_URL || "http://localhost:3001",
    ADMINS: process.env.ADMINS || "",
    DOMAIN: process.env.DOMAIN || "",
    SOCKET_SERVER_URL: process.env.SOCKET_SERVER_URL||"https://socket-sever-8.onrender.com",
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
    NEXT_PUBLIC_CJS_TOKEN:process.env.NEXT_PUBLIC_CJS_TOKEN,
    CONTENT_CLUSTERS: process.env.CONTENT_CLUSTERS,
    MARKETPLACE_ADMIN_EMAILS: process.env.MARKETPLACE_ADMIN_EMAILS,
  },

  // CORS headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          // {
          //   key: "Access-Control-Allow-Origin",
          //   value: process.env.NEXTAUTH_API_URL || "http://localhost:3000",
          // },
          {
            key: "Access-Control-Allow-Origin",
            value: "http://localhost:3002",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
    ];
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.[jt]sx?$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

module.exports = nextConfig;
