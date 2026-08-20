# Google SSO + Supabase Auth URL configuration

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

If you see `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider:
missing OAuth secret"}` when clicking the button, that means the Google provider is toggled
**on** in the Supabase dashboard but the Client ID/Secret fields were left empty — go back
into step 2 and fill both in.

## Password reset redirecting to a Lovable domain instead of this app

This is the same category of issue as the OAuth secret above — not a code bug. The app
already computes the reset link dynamically and correctly:
`supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" })`
in `src/routes/auth.tsx`. But Supabase's Auth server only honors a `redirectTo` value if
it's present in the project's **allow-listed** redirect URLs — otherwise it silently
substitutes the project's default **Site URL**. If that Site URL is still set to a Lovable
preview/hosted domain (likely left over from when Lovable Cloud first provisioned this
Supabase project), every auth email link — password reset, signup confirmation — will land
back on that Lovable domain instead of wherever this app is actually deployed, no matter
what the code passes.

**Fix, in the Supabase Dashboard → Authentication → URL Configuration:**

1. Set **Site URL** to this app's real production URL (whichever domain it's actually
   deployed on — e.g. the Vercel domain, or a custom domain).
2. Under **Redirect URLs**, add every origin the app is actually served from that should be
   allowed to receive auth callbacks, e.g.:
   ```
   https://<your-production-domain>/**
   https://<your-vercel-preview-domain>/**
   http://localhost:8080/**
   ```
   (The `/**` wildcard covers `/dashboard`, `/reset-password`, etc. under that origin.)
3. Remove or stop relying on any Lovable preview URL as the Site URL, unless that's actually
   where the app should be live.

No code change accompanies this — the redirect URL Supabase actually uses is entirely a
function of this dashboard setting, not anything in this repo.
