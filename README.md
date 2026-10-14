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
- Add an approved contact address and connect a real enquiry endpoint before promising form submissions. The contact form opens the visitor’s email app with their project brief; it does not send or store enquiries automatically.
- Confirm trademark, company and project details; replace abstract CSS project art with approved screenshots when available.
- Configure your domain, HTTPS and security headers at the hosting provider.

The public site has no analytics scripts or secret keys. Enquiry drafts stay on the visitor’s device until they send their email. Store administrator authentication and private uploads use Supabase.

## Independent store imports

The catalogue and private uploads use the existing TECHandGUARD Supabase project (`vthjdkwfvbfryofsmtdb`), in dedicated corporate tables. SmartBridge's active project is not used. The public browser key is publishable, and row-level security protects write access.

- CSV supports Shopify variants and a simple Title/SKU/Price/Stock/Image URL format. Up to 5 MB and 2,000 variants. A validation preview blocks invalid imports. Saving is atomic, keyed by SKU, preserves unlisted products, and returns imported variants to draft.
- Administrators review each draft and publish or unpublish it. Visitors only see published products.
- Product enquiries use a cart and open the visitor's email app. No payment, order submission, tax or delivery quote is claimed.
- Shopify ZIPs up to 20 MB are checked for archive structure, unsafe paths and expansion limits, then stored in a private bucket. This is a reference upload, not an automatic theme installer.
- Admin sign-in uses existing Supabase Auth accounts. No account is automatically promoted. An operator must verify the owner's account and add its ID to `corporate_private.store_admins` before admin sign-in is usable. Never use user-editable metadata to grant admin access.
- Access tokens stay in memory, not local storage. Reload or expiry requires sign-in again.

Validation: production build; CSV variant/price/error tests; malformed ZIP tests; hosted transactional checks for administrator import, draft isolation, publication and anonymous-write denial. Hosted test records were rolled back. The private review contains six public pages plus a protected store administrator page. Theme adaptation awaits approved reference files.
