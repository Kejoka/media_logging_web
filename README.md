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
PRIVATE_MUSICBRAINZ_CONTACT=<your_email_or_contact_url>
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
2. Open the SQL Editor and run [DB_SCHEMA.sql](DB_SCHEMA.sql). It is the single idempotent schema for fresh and existing projects: it creates/repairs all tables, functions, triggers, indexes, and RLS policies, including Music and Notifications.
3. Verify that the `auth.users` table is available through Supabase Auth, because the schema references it for profiles, media ownership, and notifications.
4. Add the required secrets to your environment or to Supabase secrets. Do not use names starting with `SUPABASE_` for Edge Function secrets because Supabase reserves that prefix:

```
PRIVATE_TMDB_V3_KEY=<your_key>
PRIVATE_IGDB_CLIENT=<your_igdb_client>
PRIVATE_IGDB_SECRET=<your_igdb_secret>
PRIVATE_IGDB_TOKEN=<your_igdb_token>
PRIVATE_MUSICBRAINZ_CONTACT=<your_email_or_contact_url>
PUBLIC_SUPABASE_URL=<your_supabase_url>
PUBLIC_SUPABASE_ANON=<your_supabase_anon>
EDGE_SUPABASE_URL=<your_supabase_url>
EDGE_SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
PUBLIC_IGDB_SUPABASE=<true || false>
```

5. If you want Supabase to store and refresh the IGDB token automatically, set `PUBLIC_IGDB_SUPABASE=true` and keep the `igdb_store` table available.
6. Deploy the Edge Functions in `supabase/functions`.
7. Schedule `cleanup-retention` to run daily.
8. Schedule `refresh-media-metadata` to run weekly.
9. Test both functions once manually in the Supabase dashboard before enabling the schedules.

Relevant files:

- **[DB_SCHEMA.sql](DB_SCHEMA.sql)** - Complete idempotent schema for profiles, media tables, preferences, challenges, Music, and Notifications.
- **[supabase/functions/cleanup-retention/index.ts](supabase/functions/cleanup-retention/index.ts)** - Daily retention cleanup job.
- **[supabase/functions/refresh-media-metadata/index.ts](supabase/functions/refresh-media-metadata/index.ts)** - Weekly metadata refresh job.

### Scheduled maintenance jobs

This project now includes Supabase Edge Functions for background maintenance:

- `supabase/functions/cleanup-retention` removes `user_activities` and `dismissed_activities` rows older than 30 days, and attempts to remove `auth.audit_log_entries` older than 90 days.
- `supabase/functions/refresh-media-metadata` refreshes `image`, `release`, and `averagerating` for `movies`, `shows`, `games`, `books`, and MusicBrainz-backed music.

Suggested schedules:

- Cleanup: daily
- Metadata refresh: weekly

Schedules are managed in Supabase Cron/Dashboard and are not created automatically by deploying the functions. Both functions expect the Supabase service role key so they can bypass RLS safely during maintenance runs.

To inspect whether the cleanup job is scheduled:

```sql
select jobid, jobname, schedule, active, command
from cron.job
where jobname ilike '%cleanup%';
```

To inspect recent cleanup runs:

```sql
select jobid, status, start_time, end_time, return_message
from cron.job_run_details
where jobid in (select jobid from cron.job where jobname ilike '%cleanup%')
order by start_time desc
limit 20;
```

To run this project in development mode use the following commands:

```
npm i
npm run dev
```
