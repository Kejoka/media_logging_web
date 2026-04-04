## Media Logging PWA Version

### Demo

The setup for this project is quite extensive. If you wish to see the application in action, it's easier to use the deployed version:

[Media Logging Demo](https://media-logging-web.pages.dev)

### Setup

In order for this project to work you must create a `.env` File containing the following parameters:

```
PRIVATE_TMDB_V3_KEY=<your_key>
PUBLIC_SUPABASE_URL=<your_supabase_url>
PUBLIC_SUPABASE_ANON=<your_supabase_anon>
PRIVATE_IGDB_CLIENT=<your_igdb_client>
PRIVATE_IGDB_SECRET=<your_igdb_secret>
PRIVATE_IGDB_TOKEN=<your_igdb_token>
EDGE_SUPABASE_URL=<your_supabase_url>
EDGE_SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
PUBLIC_IGDB_SUPABASE=<true || false>
```

If you choose `false` for `PUBLIC_IGDB_SUPABASE`, you must refresh the `PRIVATE_IGDB_TOKEN` manually if it has expired.
if you choose `true` for `PUBLIC_IGDB_SUPABASE`, the token will be stored in supabase and also refresh automatically.

In order to get all those keys please refer to the respective api host's websites:

- [Supabase](https://supabase.com)
- [TMDB](https://developer.themoviedb.org/reference/intro/getting-started)
- [IGDB](https://api-docs.igdb.com/#getting-started)

### Supabase setup guide

Follow these steps to set up Supabase from scratch:

1. Create a new Supabase project and copy the project URL, anon key, and service role key from the project settings.
2. Open the SQL Editor and run [DB_SCHEMA.sql](DB_SCHEMA.sql). This creates the main tables, RLS policies, triggers, and the challenge/preference tables.
3. Run [NOTIFICATION_SCHEMA.sql](NOTIFICATION_SCHEMA.sql). This adds the notification/activity tables plus the retention index for `dismissed_at`.
4. Verify that the `auth.users` table is available through Supabase Auth, because the schema references it for profiles, media ownership, and notifications.
5. Add the required secrets to your environment or to Supabase secrets. Do not use names starting with `SUPABASE_` for Edge Function secrets because Supabase reserves that prefix:

```
PRIVATE_TMDB_V3_KEY=<your_key>
PRIVATE_IGDB_CLIENT=<your_igdb_client>
PRIVATE_IGDB_SECRET=<your_igdb_secret>
PRIVATE_IGDB_TOKEN=<your_igdb_token>
PUBLIC_SUPABASE_URL=<your_supabase_url>
PUBLIC_SUPABASE_ANON=<your_supabase_anon>
EDGE_SUPABASE_URL=<your_supabase_url>
EDGE_SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
PUBLIC_IGDB_SUPABASE=<true || false>
```

6. If you want Supabase to store and refresh the IGDB token automatically, set `PUBLIC_IGDB_SUPABASE=true` and keep the `igdb_store` table available.
7. Deploy the Edge Functions in `supabase/functions`.
8. Schedule `cleanup-retention` to run daily.
9. Schedule `refresh-media-metadata` to run weekly.
10. Test both functions once manually in the Supabase dashboard before enabling the schedules.

Relevant files:

- **[DB_SCHEMA.sql](DB_SCHEMA.sql)** - Main schema for profiles, media tables, preferences, and challenges.
- **[NOTIFICATION_SCHEMA.sql](NOTIFICATION_SCHEMA.sql)** - Notification tables and cleanup index.
- **[supabase/functions/cleanup-retention/index.ts](supabase/functions/cleanup-retention/index.ts)** - Daily retention cleanup job.
- **[supabase/functions/refresh-media-metadata/index.ts](supabase/functions/refresh-media-metadata/index.ts)** - Weekly metadata refresh job.

### Scheduled maintenance jobs

This project now includes Supabase Edge Functions for background maintenance:

- `supabase/functions/cleanup-retention` removes `user_activities` and `dismissed_activities` rows older than 30 days.
- `supabase/functions/refresh-media-metadata` refreshes `image`, `release`, and `averagerating` for `movies`, `shows`, and `games`.

Suggested schedules:

- Cleanup: daily
- Metadata refresh: weekly

Both functions expect the Supabase service role key so they can bypass RLS safely during maintenance runs.

To run this project in development mode use the following commands:

```
npm i
npm run dev
```
