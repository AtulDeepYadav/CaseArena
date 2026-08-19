# Google SSO setup

The app's code is already wired for Google sign-in end to end:

- `src/routes/auth.tsx` — the "Continue with Google" button calls
  `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: origin + "/dashboard" } })`.
- The Supabase client (`src/integrations/supabase/client.ts`) has `detectSessionInUrl`
  on by default, so it automatically picks up the session from the redirect back from
  Google — no extra callback route is needed.
- `handle_new_user()` (in `supabase/master_setup.sql`) already creates a `profiles` row
  from `raw_user_meta_data` on first sign-in, regardless of whether the user came in via
  email/password or Google — no changes needed there either.

**What's left is not code** — it's provider configuration in two dashboards neither of
which this repo's contents can reach: Google Cloud Console and the Supabase project
dashboard. Whoever has access to those needs to do the following once:

## 1. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create (or pick)
   a project.
2. **APIs & Services → OAuth consent screen** — configure it (External user type is fine
   for a student-facing app), fill in the app name/support email, and add the scopes
   `email`, `profile`, `openid` (the Supabase default is already fine here).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized redirect URIs** — add exactly:
     ```
     https://bbfhftgwjmvltrnabjvw.supabase.co/auth/v1/callback
     ```
     (this project's ref, from `supabase/config.toml`; get it wrong and Google will
     reject the callback with `redirect_uri_mismatch`).
   - Save, then copy the **Client ID** and **Client Secret** it generates.

## 2. Supabase Dashboard

1. Open this project → **Authentication → Providers → Google**.
2. Toggle it **on**, paste in the Client ID and Client Secret from step 1, save.
3. **Authentication → URL Configuration** — make sure the production site URL (and any
   preview/staging URLs, e.g. the Vercel domain) are listed under **Redirect URLs**, since
   Supabase only allows redirecting back to an allow-listed origin after the OAuth
   handshake. The app itself redirects to `/dashboard` on this origin.

## Verifying it works

Once both are set, click "Continue with Google" on `/auth` in the deployed app — it should
bounce to Google's account picker, then land back on `/dashboard` already signed in, with
a `profiles` row auto-created for the new account. No further code changes are needed for
this to work once the above is in place.
