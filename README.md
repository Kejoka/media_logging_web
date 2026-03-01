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
PUBLIC_IGDB_SUPABASE=<true || false>
```

If you choose `false` for `PUBLIC_IGDB_SUPABASE`, you must refresh the `PRIVATE_IGDB_TOKEN` manually if it has expired.
if you choose `true` for `PUBLIC_IGDB_SUPABASE`, the token will be stored in supabase and also refresh automatically.

In order to get all those keys please refer to the respective api host's websites:

- [Supabase](https://supabase.com)
- [TMDB](https://developer.themoviedb.org/reference/intro/getting-started)
- [IGDB](https://api-docs.igdb.com/#getting-started)

In order to set up supabase with the correct tables run the following scripts in the Table Editor:

Refer to the SQL schema files for detailed table definitions:

- **[DB_SCHEMA.sql](DB_SCHEMA.sql)** - Contains the main database tables (profiles, users, games, movies, shows, books, preferences, etc.)
- **[NOTIFICATION_SCHEMA.sql](NOTIFICATION_SCHEMA.sql)** - Contains the notification system tables and activity logging

To run this project in development mode use the following commands:

```
npm i
npm run dev
```
