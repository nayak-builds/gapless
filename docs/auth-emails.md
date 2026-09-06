# Auth emails (Gapless)

Supabase sends these. The app cannot change the inbox sender or body at runtime. Paste the templates below into the **production** (and matching preview) Supabase project: **Authentication → Email Templates**.

Until you add **custom SMTP**, the From line stays `Supabase Auth` / `noreply@mail.app.supabase.io`. Custom SMTP (your domain as Gapless) needs a provider and is often a paid or card-gated step — confirm before enabling. Templates still work on the free mailer.

Also set **Authentication → URL configuration**: Site URL = the app origin; Redirect URLs include `{origin}/auth/callback`.

Keep `{{ .ConfirmationURL }}` exactly as written. Do not wrap it in extra encoding.

OTP / link lifetime is **Authentication → Settings** (mailer OTP expiry). The copy below says the link expires; if you change expiry, the wording still holds.

Source HTML: [`docs/auth-emails/confirm-signup.html`](auth-emails/confirm-signup.html), [`docs/auth-emails/reset-password.html`](auth-emails/reset-password.html).

## Confirm signup

**Subject:** Confirm your email to use Gapless

Paste the HTML from `confirm-signup.html` into the Confirm signup template body.

## Reset password

**Subject:** Reset your Gapless password

Paste the HTML from `reset-password.html` into the Reset password template body.

## After you save

Sign up with a real inbox and open the message. The button must land on Gapless (Site URL / redirect), not the Supabase docs. Check spam once; if it lands there, custom SMTP + SPF/DKIM is the next step (ask before paying).
