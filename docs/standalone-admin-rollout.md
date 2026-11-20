# Standalone Tech & GUARD admin

The admin frontend now has its own Vite entry point and can be built and deployed separately from the public website. It calls the existing Tech & GUARD Supabase APIs for authentication, PostgREST/RPC operations, storage and Edge Functions. Database functions continue to enforce staff and owner authorization. The browser only uses the Supabase publishable key; never add a service-role key to this frontend.

Keep the backend on the Tech & GUARD Supabase project (`vthjdkwfvbfryofsmtdb`). SmartBridge FET uses a different Supabase project and remains separate.

## Deploy as a separate Amplify app

1. Create a second Amplify Hosting app from `TECHandGUARD/tech-and-guard-website`, using the existing GitHub connection.
2. Select `amplify-admin.yml` as the build specification. This app builds `apps/admin/dist`; the existing website continues to use `amplify.yml` and `dist/`.
3. Add the build variable `VITE_PUBLIC_STORE_URL=https://www.techandguard.co.za/store/`.
4. Add the Amplify SPA rewrite `/<*>` → `/index.html` with status `404-200`, and apply `admin-customHttp.yml` as the app's custom headers.
5. First verify the separate app at its Amplify default domain. Confirm the login page loads, an approved staff account can sign in, the Enquiries view can read its queue, and reset/confirmation links return to the standalone admin.

## Auth and domain cutover

Before verifying account recovery at the Amplify default domain, add that exact `https://<amplify-default-domain>/admin/` callback URL to Supabase Auth's redirect URL allowlist. Before custom-domain cutover, add `https://admin.techandguard.co.za/admin/` as well. The app sends confirmation and recovery callbacks to `<admin-origin>/admin/`.

Only after the default-domain checks pass, add `admin.techandguard.co.za` to the new Amplify app. Use the exact DNS record Amplify provides and have the domain owner approve that record. Then verify HTTPS, the security headers, sign-in, enquiry permissions, password recovery and sign-out on the custom domain.

The current `/admin/` route on the public site stays available during this rollout. Remove that embedded route only after the standalone domain and staff login have been verified, so the team is not locked out during cutover.
