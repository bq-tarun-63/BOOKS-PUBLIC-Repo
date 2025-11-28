# Fix: Public Server Database Connection Issue

## Problem
The public server cannot find published notes because it's either:
1. Not connected to MongoDB (MONGODB_URI not set)
2. Connected to a different MongoDB database
3. Connected to the same cluster but using a different database name

## Solution

### Step 1: Set Environment Variables

The public server needs the **exact same MongoDB connection** as your main app.

Create a `.env.local` file in `books-PUBLIC-SERVER/apps/web/` with:

```bash
# Required: Same MongoDB URI as your main app
MONGODB_URI="mongodb+srv://praveensharma:tPYBtzijGxwxOKCr@cluster0.s075vto.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Optional: Explicitly specify database name if different from URI default
# MONGODB_DB_NAME="your_database_name"

# Required: GitHub configuration (must match your main app)
# Format: "username/repository" or "organization/repository"
NEXT_PUBLIC_GITHUB_REPO="your-username/your-repo"
GITHUB_TOKEN="your_github_token"
GITHUB_USERNAME="your_username"

# Optional: GitHub repo for content storage
GITHUB_REPO="your-username/your-repo"
```

### Step 2: Verify the Connection

1. **Restart the public server** to pick up the new environment variables:
   ```bash
   cd books-PUBLIC-SERVER
   pnpm dev
   ```

2. **Check the startup logs** - you should now see:
   ```
   🔌 Connecting to MongoDB...
      URI: mongodb+srv://praveensharma:****@cluster0.s075vto.mongodb.net/...
      Database: (using default from URI)
   ✅ MongoDB connected (public-services)
      Database in use: test
   ```

3. **Visit the debug endpoint**: http://localhost:3302/api/public/debug
   
   This will show you:
   - Which database you're connected to
   - Total notes in the database
   - Number of published notes
   - Sample of published notes with their slugs

### Step 3: Test Your Published Notes

Once the debug endpoint shows published notes, try accessing them:

```bash
# If the debug endpoint shows a note with slug "r6-dZAgs"
http://localhost:3302/n/r6-dZAgs
```

## What Changed

### 1. Better Database Connection Logging
- `public-services.ts` now logs which database is being connected to
- Shows masked credentials for security
- Supports `MONGODB_DB_NAME` env var to explicitly set database name

### 2. Enhanced API Route Debugging
- `/api/public/note/[slugOrId]` now logs:
  - Database name
  - Collection stats
  - Published notes count
  - Search attempts

### 3. New Debug Endpoint
- `/api/public/debug` shows complete connection status
- Lists sample published notes
- Helps verify configuration

## Common Issues

### Issue: Debug endpoint shows 0 published notes
**Solution**: Make sure you've published notes from the main app:
1. Open a note in the main app (http://localhost:3000)
2. Click the publish button
3. Verify `isPubliclyPublished: true` in the response

### Issue: Different database names
If your main app uses a specific database name (not the default), you need to either:

**Option A**: Add database name to URI:
```bash
MONGODB_URI="mongodb+srv://user:pass@cluster.net/YOUR_DB_NAME?..."
```

**Option B**: Set explicit database name:
```bash
MONGODB_DB_NAME="YOUR_DB_NAME"
```

### Issue: Still getting 404
Check the console logs when accessing `/n/[slug]`:
- Look for the database name being used
- Check the published notes count
- Verify the slug matches exactly (case-sensitive)

## Testing Checklist

- [ ] Debug endpoint returns 200 OK
- [ ] Debug endpoint shows correct database name
- [ ] Debug endpoint shows published notes count > 0
- [ ] Debug endpoint lists your published notes
- [ ] Can access notes via `/n/[publicSlug]`
- [ ] Page loads note content correctly

## Need More Help?

Check the server logs for detailed information:
```bash
# When starting the server
🔌 Connecting to MongoDB...
✅ MongoDB connected (public-services)
   Database in use: [your-db-name]

# When accessing a note
[PUBLIC API] Looking for note with slug/id: r6-dZAgs
[PUBLIC API] Connected to database: [your-db-name]
[PUBLIC API] Published notes count: 5
[PUBLIC API] Searching by publicSlug: r6-dZAgs
```

These logs will tell you exactly what's happening.

