# Yilian's Site — Setup Guide

Files:
- `index.html` — the marketing site
- `services.html` — full service menu (reads from Firestore)
- `book.html` — public booking form (writes to Firestore)
- `admin.html` — password-protected dashboard: **Bookings**, **Services**, **Gallery**, and **Settings** tabs
- `firebase-config.js` — shared config, **edit this first**
- `site-data.js` — shared read helpers the public pages use to load services/gallery/settings
- `api/send-email.js` — Vercel serverless function that emails via Resend

## What Yilian can change herself in `/admin.html` — no code, no calling you

- **Services** — add, edit, delete, reorder, set pricing (starting/fixed/ask), and turn any service on or off. First visit to this tab shows a "Load Starter Menu" button that seeds it with the current site's services so nothing has to be re-typed.
- **Gallery** — upload or delete photos directly; they show up on the homepage gallery immediately.
- **Settings** — working hours per day, appointment length, blocked days off (holidays/vacation), and WhatsApp/Instagram/location contact info.

Everything above is stored in Firestore and read live by `index.html`, `services.html`, and `book.html` — she never touches a file.

## 1. Firebase setup (database + login)

1. Go to https://console.firebase.google.com → **Create a project**.
2. In the project, go to **Build > Firestore Database** → Create database → start in **production mode**.
3. Go to **Build > Authentication** → **Get started** → enable the **Email/Password** sign-in method.
4. Still in Authentication, go to the **Users** tab → **Add user** → create Yilian's login (her email + a password). This is the only account that can log into `admin.html`.
5. Go to **Project settings** (gear icon top-left) → scroll to **Your apps** → click the `</>` (web) icon → register an app (nickname anything) → copy the `firebaseConfig` object it gives you.
6. Paste those values into `firebase-config.js`, replacing the placeholders.

### Firestore security rules
In Firestore → **Rules** tab, replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bookings/{bookingId} {
      // anyone can submit a new request
      allow create: if request.resource.data.status == 'pending';
      // only logged-in admin (Yilian) can read the list or change status
      allow read, update: if request.auth != null;
      allow delete: if false;
    }
    match /services/{serviceId} {
      // anyone can read the menu; only logged-in admin can add/edit/delete
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /gallery/{photoId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /settings/{settingId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

This means: the public can create new pending bookings through `book.html`, and can read (but not change) the services menu, gallery, and business settings. Only Yilian (logged in through `admin.html`) can write to any of those, or see/confirm/decline bookings.

### Storage note

Firebase now requires its paid Blaze plan for Cloud Storage (even the free-tier usage needs a card on file), so image uploads (gallery photos + booking inspo photos) use **Cloudinary** instead — see section 2 below. Firebase itself (Firestore + Auth) stays on the free Spark plan, no card needed.

## 2. Cloudinary setup (image uploads — no card required)

1. Create a free account at https://cloudinary.com/users/register/free — email/Google/GitHub signup, no credit card.
2. On the Dashboard home page, copy your **Cloud Name** (shown near the top, under your account name).
3. Go to the gear icon (**Settings**) → **Upload** tab → scroll to **Upload presets** → **Add upload preset**.
   - Set **Signing Mode** to **Unsigned**.
   - Save, then copy the preset name it's given (or set your own before saving).
4. Open `cloudinary-config.js` and paste in your **Cloud Name** and **Upload Preset** name.
5. Still in Settings, go to the **API Keys** tab and copy your **API Key** and **API Secret** — you'll need these for Vercel in step 4 below (deleting photos requires these; they're never put in any file in this project, only added directly as Vercel environment variables).

## 3. Resend setup (emails)

1. Create an account at https://resend.com.
2. Go to **API Keys** → create one → copy it (you'll only see it once).
3. (Optional but recommended) Go to **Domains** → add and verify Yilian's domain, so emails come from `bookings@herdomain.com` instead of Resend's shared test domain. Until that's done, emails can only be sent to Yilian's own verified email — fine for testing, not for real client emails.

## 4. Deploy to Vercel

1. Push this folder to a GitHub repo, then import it at https://vercel.com/new — or install the Vercel CLI and run `vercel` from this folder.
2. Add environment variables (Project → Settings → Environment Variables, or `vercel env add`):
   - `RESEND_API_KEY` — from step 3 above
   - `YILIAN_EMAIL` — where new-booking notifications should go
   - `FROM_EMAIL` — e.g. `bookings@herdomain.com` once verified, or leave unset to use Resend's test address
   - `CLOUDINARY_CLOUD_NAME` — from step 2 above
   - `CLOUDINARY_API_KEY` — from step 2 above
   - `CLOUDINARY_API_SECRET` — from step 2 above
3. Deploy. Vercel automatically detects `api/send-email.js` and `api/delete-image.js` as serverless functions — no extra config needed.
4. (Optional) Add her custom domain under Project → Settings → Domains.

## 5. Try it out

- Visit `/book.html`, submit a test request.
- Log into `/admin.html` with the account you created in step 1.4.
- Click **Confirm** — that slot should now show as taken if you go back to `/book.html` and pick the same date.

## 6. First-time admin setup (do this once after deploying)

1. Log into `/admin.html` → **Services** tab → click **Load Starter Menu** (this loads the current site's services into Firestore so `services.html`, the homepage, and `book.html` all have something to show). Edit, reorder, or delete from there afterward.
2. Go to the **Settings** tab, check the working hours are correct, and click **Save Settings** at least once — this is what turns on Firestore-driven hours everywhere (before the first save, the site quietly falls back to the defaults in `firebase-config.js`).
3. (Optional) Go to the **Gallery** tab and upload a few real photos — until then, the homepage keeps showing the placeholder blossom icons.

## Editing business hours / slot length / blocked days

Log into `/admin.html` → **Settings** tab. Toggle days open/closed, set start/end times, set the appointment length, and add blocked days off (holidays, vacation) — all without touching code. `firebase-config.js` only holds a one-time fallback (`DEFAULT_BUSINESS_HOURS`) used to pre-fill that form the very first time it's opened.
