# BetaQue Notes

A Notion-style WYSIWYG editor with AI-powered autocompletions.

## Authentication

This application uses a federated authentication system with a centralized NextAuth.js server running at the URL specified in the environment variable `NEXTAUTH_API_URL` (default: http://localhost:3003).

### Authentication Flow

1. When a user visits the application, the `AuthProvider` component checks if the user is authenticated by making a request to `${NEXTAUTH_API_URL}/api/auth/isAuthenticated`.
2. If the user is not authenticated, they are redirected to the login page on the authentication server.
3. After successful login, the user is redirected back to the application with their authentication state preserved.

### Configuration

To configure the authentication system, set the following environment variable:

```
NEXTAUTH_API_URL=http://localhost:3003
```

You can also set this in the `next.config.js` file.

## Development

```bash
# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. 