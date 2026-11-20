# Tech & GUARD corporate website

A responsive React, TypeScript and Vite website for Tech & GUARD (Pty) Ltd.

## Run locally

```bash
npm install
npm run dev
```

Run `npm run build` to check types and create a static production build in `dist/`. Deploy `dist/` to a static host. The public catalogue and protected administrator tools connect to the corporate Supabase project.

## Before publishing

- Confirm the descriptions and status of SmartBridge FET and the store with the company.
- Keep contact details current. The direct enquiry form stores submissions for administrator review and can send a separate team alert through Resend once `RESEND_API_KEY` is configured in Supabase. Email links open the visitor’s configured mail app with a prewritten draft.
- Confirm trademark, company and project details; replace abstract CSS project art with approved screenshots when available.
- Configure your domain, HTTPS and security headers at the hosting provider.

The public site has no analytics scripts or secret keys. Enquiry drafts stay on the visitor’s device until they send their email. Store administrator authentication and private uploads use Supabase.

## Independent store imports

The catalogue and private uploads use the existing TECHandGUARD Supabase project (`vthjdkwfvbfryofsmtdb`), in dedicated corporate tables. SmartBridge's active project is not used. The public browser key is publishable, and row-level security protects write access.

- CSV supports Shopify variants and a simple Title/SKU/Price/Stock/Image URL format. Up to 5 MB and 2,000 variants. A validation preview blocks invalid imports. Saving is atomic, keyed by SKU, preserves unlisted products, and returns imported variants to draft.
- Administrators review each draft and publish or unpublish it. Visitors only see published products.
- Product enquiries use a basket with prewritten email and WhatsApp drafts, and can be submitted to the administrator enquiry queue. A rate-limited Resend alert integration reports delivery status to the customer and staff queue; set `RESEND_API_KEY` as a Supabase Edge Function secret to enable it. The PayFast hosted-checkout flow, verified notifications, stock reservations and order queue are implemented, but checkout remains off until the owner configures merchant secrets and approves store policies and fulfilment details. Card details stay on PayFast. No tax calculation or delivery quote is claimed while those controls are not configured.
- Shopify ZIPs up to 20 MB are checked for archive structure, unsafe paths and expansion limits, then stored in a private bucket. This is a reference upload, not an automatic theme installer.
- Admin sign-in uses existing Supabase Auth accounts. No account is automatically promoted. Owner grants are recorded in private `corporate_private.staff_grants`; the account email must be verified before access is usable. Owner administrators can assign and revoke verified staff from the admin page. Never use user-editable metadata to grant admin access.
- Access tokens stay in memory, not local storage. Reload requires sign-in again; the Auth client refreshes an active memory session. Account registration/recovery requires configured Auth email delivery and redirect URLs.

Validation: production build; CSV variant/price/error tests; malformed ZIP tests; hosted transactional checks for administrator import, draft isolation, publication and anonymous-write denial. Hosted test records were rolled back. The public site contains six public pages plus a protected store administrator page. The supplied Dawn theme informed the storefront styling; its Shopify Liquid runtime is not executed by this React app.

## Executive review

See `docs/executive-review-20261014.md` for the CMO, CIO and CEO assessment, implemented improvements and remaining launch decisions. Run `node --experimental-strip-types --test tests/*.test.mjs` for import and API regression checks.

See `docs/admin-domain-rollout-20261015.md` for the owner/staff controls, catalogue status and GoDaddy/Supabase configuration.

See `docs/store-policy-review.md` for the policy draft, catalogue verification boundary, owner decisions still required, and enquiry-alert setup.

See `docs/mvp-readiness-20261015.md` for verified state, unresolved production blockers, and the portable AWS deployment configuration.

The protected `/account/` page shows customer requests; the `/admin/` dashboard manages inventory and request review. Run `db/test-corporate-orders.sql` transactionally after applying corporate migrations to verify workflow and access rules. Request submission is not a completed purchase.
