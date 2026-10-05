# OmniSphere

OmniSphere is a responsive learning website for school subjects and practical life skills. It includes a personalized dashboard, topic library, interactive lessons and quizzes, saved lessons, progress, streaks, badges, settings, and optional accounts with cloud-synced progress.

The website works locally without an account. To enable real accounts and sync between devices, connect a Supabase project by following the steps below. Supabase and website hosting are separate: connecting Supabase enables accounts and cloud data, while publishing the website makes it available to other people.

## Run locally

Serve the site over HTTP; opening `index.html` directly as a file can prevent its JavaScript modules from loading.

With Node.js:

```sh
node dev-server.mjs
```

Or, with Python:

```sh
python -m http.server 4173
```

Open <http://localhost:4173>.

## Set up Supabase accounts and cloud saves

You need your own Supabase project. The project URL and publishable key are public browser settings; do not share or put a secret/service-role key in the website.

### 1. Create a Supabase project

1. Go to <https://supabase.com/dashboard> and sign in or create an account.
2. Choose **New project**, select an organization, enter a project name, and set a strong database password. Save that password somewhere private.
3. Wait for the project to finish starting.

### 2. Create the app's database tables

1. In your project, open **SQL Editor** and choose **New query**.
2. In this project, open [`supabase/migrations/20261005000000_create_learning_schema.sql`](./supabase/migrations/20261005000000_create_learning_schema.sql), copy all of its contents, and paste them into the SQL Editor.
3. Choose **Run**. The script creates the profile and lesson-progress tables and enables row-level security so signed-in learners can access only their own rows.

### 3. Add the public project settings

1. In the Supabase dashboard, open your project's **Connect** panel or **Project Settings → API Keys**.
2. Copy the **Project URL** and the **publishable key** (it may be labelled `anon` on older projects).
3. Open [`src/config.js`](./src/config.js) in this project and put those two values between the quotes:

   ```js
   export const SUPABASE_URL = 'https://your-project-id.supabase.co';
   export const SUPABASE_PUBLISHABLE_KEY = 'your-public-publishable-key';
   ```

   Keep the publishable key in the browser. Never use a key labelled **secret** or `service_role` here.

### 4. Allow local sign-in redirects

In Supabase, open **Authentication → URL Configuration**. Set **Site URL** to:

```text
http://localhost:4173
```

Add these entries to **Redirect URLs**:

```text
http://localhost:4173/**
http://127.0.0.1:4173/**
```

Email/password sign-in does not require Google or GitHub setup. To use the Google or GitHub buttons, complete the matching setup below. The provider's client ID and secret belong in Supabase's dashboard, not in this website's source code.

### Enable Google or GitHub sign-in

First, in Supabase, open **Authentication → Sign In / Providers** and select the provider you want. Supabase shows a **Callback URL** for that provider, usually:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

Keep this Supabase callback URL handy. It is where Google or GitHub sends the user back after authentication. This is different from the app redirect URL (`http://localhost:4173`).

**Google**

1. Open [Google Cloud Console → Google Auth Platform](https://console.cloud.google.com/auth/overview) and configure the OAuth consent screen. For local testing, add your Google account as a test user if the app is in testing mode.
2. Create an OAuth client with application type **Web application**.
3. Add `http://localhost:4173` to **Authorized JavaScript origins**.
4. Add the Supabase **Callback URL** from above to **Authorized redirect URIs**.
5. Copy the generated client ID and client secret into the Google provider settings in Supabase. Enable the provider and save.

**GitHub**

1. In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Set **Homepage URL** to `http://localhost:4173`.
3. Set **Authorization callback URL** to the Supabase **Callback URL** from above, then create the app.
4. Copy the GitHub **Client ID** into the GitHub provider settings in Supabase. Generate a client secret in GitHub and copy it into Supabase too. Enable the provider and save.

For either provider, return to Supabase **Authentication → URL Configuration** and allow the app URL under **Redirect URLs** (`http://localhost:4173/**` for local testing). Supabase redirects back to the app after the provider finishes sign-in. Reload the website and try the button again.

### 5. Try it

Restart the local server if needed, reload <http://localhost:4173>, choose **Connect account**, and create an account with an email address you can check. If email confirmation is enabled, click the link Supabase sends you and return to the site to sign in. Finish the learning-path setup and complete a lesson; the profile and progress should now be saved to your Supabase project.

If you deploy the site later, add its real HTTPS address to **Site URL** and **Redirect URLs** too. Do not use the localhost URL for a live site.

## Optional: account deletion

The account deletion control uses the included Supabase Edge Function. Deploy it before relying on that control; it needs the Supabase CLI:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy delete-account
```

Find the project reference in **Project Settings → General**. The function verifies the signed-in user and uses the server-side admin client to delete only that user's account. Its foreign keys then remove that user's profile and progress. The service-role key is managed by Supabase on the server and must never be copied into frontend code.

## Included learning areas

The library includes four academic groups and four real-world groups. Each area expands into topics with short lesson guidance, visual study prompts or practical checklists, quiz feedback, and a completion action.
