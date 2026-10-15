# Corporate MVP readiness — CEO, CIO and CRO

## Decision

The company website and enquiry catalogue are deployed through ChatGPT Sites. They are not yet a complete transactional store. GitHub contains portable React/TypeScript source, Supabase owns authentication/data and GoDaddy owns DNS. No visitor ChatGPT login or inference API is used by application code. Do not claim onboarding, email or checkout production-ready until the acceptance checks pass.

## CEO: accurate offer

Company details use supplied registration information; no registered-trademark or invented client-result claims. The CSV and Dawn theme are received: no need to upload them again. Dawn is Shopify Liquid and cannot execute as a React theme. Its design informed the storefront. The 16 CSV products are now published for enquiries; data still requires supplier confirmation. Generated imagery and unverified reviews are excluded.

Paid commerce needs real product photos, confirmed specifications/availability, delivery areas/costs/lead times, VAT treatment, returns/customer terms and an operational payment gateway. These business facts must not be invented.

## CIO: access and operations

Verified owner/staff roles live in private RLS tables and are enforced by database operations. Signup does not grant arbitrary admin access. Staff cannot escalate to owner; revocation blocks later writes. Tokens stay in memory; frontend key is publishable, not a service secret.

Known Auth error codes now give actionable sender/rate-limit/verification messages without exposing internal errors or account existence. A restricted CSP and no-referrer metadata are built into each route; HTTP security headers are prepared for Amplify, not yet verified in production.

Migration `20261015002140_corporate_trigger_hardening.sql` fixes the legacy timestamp trigger's mutable search_path. Private RLS tables without direct browser policies intentionally deny access. Legacy unrelated tables were not opened. Leaked-password protection is reported disabled; check Free-plan availability before changing it and do not upgrade. MFA, bot protection, monitoring/alert ownership and tested restore procedures remain hardening tasks.

The dashboard requires secure login to configure SMTP and redirects. Dedicated Resend domain DNS is saved; domain verification passed; actual delivery is not complete. A recent signup log returned 200, but no second owner account exists; the exact failed attempt remains unidentified. Do not bypass email confirmation.

No corporate Amplify app is deployed. Portable build/header files are ready; provider migration and production DNS cutover are still outstanding.

## CRO: conversion and revenue

Visitors can browse/search/filter supplied products and prepare an enquiry. Prices remain CSV values. Enquiry buttons open an email client; they do not store a lead automatically, reserve stock or create an order. Durable, rate-limited enquiry intake with retryable email remains a conversion gap.

Revenue launch needs successful checkout, verified webhooks, idempotent orders, stock reservation/release, failed-payment recovery, order emails and approved returns rules. A front-end success screen is insufficient evidence of payment.

## Acceptance gates

1. Anonymous visitor opens domain, store and contact without ChatGPT account.
2. New approved owner registers/receives confirmation/verifies/signs in; existing owner recovers password. Unapproved account cannot manage products.
3. Owner assigns verified staff; staff cannot assign owners; revocation blocks writes.
4. Catalogue shows 16 supplied products, correct prices, no generated images/reviews, clear stock/enquiry/delivery wording.
5. Production HTTP security headers and browser interactions pass with CSP enabled.
6. Before paid launch: test payment success/failure/webhook replay, stock handling, emails, shipping and returns.

Evidence: production/type build and 12 tests pass; public REST catalogue returns 16 rows; hosting reports apex HTTPS active. Owner/staff transactional checks are replayed in this change. Direct deployed-site HTTP checks from this execution environment returned 403, which does not establish a visitor-facing failure. Browser QA, email onboarding and paid checkout remain unverified. No real payment, paid upgrade or SmartBridge mutation.

References: https://supabase.com/docs/guides/auth/auth-smtp ; https://docs.aws.amazon.com/amplify/latest/userguide/custom-headers.html ; https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html

## Operations follow-up — 15 October 2026

The claim that the live site must be the older portfolio because PR #2 is unmerged was incorrect. The hosting service independently deployed saved version 10 from source commit d765963e8739caa4240ab4a04bb9da1babdad726; GitHub PR #2 contained the same work under its own commit history. Main is separate from the deployed Sites source.

Implemented next: dashboard sections for overview, products/stock, requests, imports/theme, team and account. Staff can edit product titles, descriptions, prices and stock with database validation and optimistic concurrency. Owners retain exclusive staff assignment. Customer account route is /account/; customers can see their own latest 20 requests. Admin sees latest 100 with review/cancellation controls and manual refresh. These limits are shown in the UI. There are no fabricated sales/revenue metrics.

Migration 20261015051354_corporate_order_requests.sql adds private-by-default order requests and staff audit events. Verified accounts submit 1–25 distinct product lines with integer quantities 1–99, priced against published database products. Requests reject insufficient listed stock. Unknown stock remains subject to confirmation. They do not reserve stock, charge cards or trigger email. Five new requests per account per 24 hours; per-account advisory locks serialize concurrent checks. Per-user UUID keys make identical retries idempotent; altered retry payloads are rejected. Product price snapshots persist after catalogue edits. Customer/staff data is isolated with RLS. All mutations use guarded RPCs; private functions have fixed empty search_path and no PUBLIC/anon execution. No direct browser insert/update grants on orders.

Acceptance evidence: production/type build and 14 unit/API tests; hosted transactional order/security suite covering price tampering, retries, altered retries, hidden products, stock/quantity/duplicate checks, daily limit, cross-customer privacy, unverified denial, unauthorised staff actions, stale edits, prohibited paid status and auditing. Test users, products and orders rolled back; zero fixtures left. Existing staff security suite remains applicable. Browser and email delivery tests are still blocked/unverified.

Before onboarding: add exact /account/ and /admin/ redirects for apex and www, connect verified Resend SMTP securely, and test signup/reset. Before a Shopify replacement claim: corporate gateway credentials, server-verified payment webhooks, payment/order idempotency, real inventory reservation, final shipping/VAT/returns rules and end-to-end browser tests are still required. No Base44 changes, paid resources/upgrades, AWS cutover, live payment or automatic emails were made.

## Reliability follow-up — 15 October 2026

Updated the existing store and dashboard without a new project, schema or alternate order flow. Customer request history now distinguishes loading, failed fetches and empty results, includes a refresh action and identifies the latest-20 limit. Admin request search matches reference, customer, email, product or SKU within the latest 100 loaded requests, alongside the existing status filter.

Checkout snapshots the first submitted payload and key in memory. Network failures, unreadable responses, server errors and existing-request conflicts retain that exact attempt for retry; cart changes cannot silently alter it. A recognised HTTP 400 database rejection (except an existing-request conflict) permits correction and a fresh key. A synchronous submission guard prevents repeated clicks before React updates. No request names, notes or tokens are persisted in browser storage. Reloading loses the in-memory attempt; customers are directed to inspect saved requests before starting another submission. Cart limits now match the server's 25 distinct products and 99 units per product.

Validation: TypeScript/production build and 19 unit/API tests pass, including mutated-cart retries, immutable payload/key reuse, rejected-request correction and conflict preservation. The database schema and permissions are unchanged; prior database-suite evidence remains the same. Browser interaction checks are still unverified because the supported browser-control skill is unavailable in this environment. Email delivery, gateway credentials/webhook handling, inventory reservation and approved shipping/tax/returns rules remain open. This update does not activate payments or claim Shopify replacement readiness.

## Account email follow-up — 15 October 2026

Public Auth settings were read again: email signup is enabled, anonymous sign-in is disabled, and email confirmation remains required. Resend again reports the existing auth.techandguard.co.za domain verified with sending enabled. The available Supabase connector has no Auth SMTP/redirect configuration operation; sender configuration and actual delivery remain unverified. No new sending domain or API key was created and no email was sent during this change.

The existing account controls now offer confirmation-link resend and a 60-second UI cooldown after successful signup/resend/reset requests. Generic acknowledgements avoid claiming account existence or email delivery. Expired/rejected email callbacks display safe instructions without reflecting provider descriptions, and credential/error parameters are removed from the current URL after SDK initialization. Recovery intent in a URL alone does not show the password form: an established Auth session is required. Sign-out clears the recovery state; password-update sign-out errors are reported instead of silently redirecting.

Validation: TypeScript/production build and all 22 unit/API tests pass. Added cases cover expired/unknown callback errors, removal of URL credentials, preservation of unrelated navigation and recovery intent without treating it as authentication. No database or role changes. End-to-end browser and inbox delivery checks are still outstanding. Complete the exact Auth settings already recorded in docs/admin-domain-rollout-20261015.md through an authenticated dashboard session, then test confirmation, resend, expired/reused links and password reset.

Documentation consulted: https://supabase.com/docs/guides/auth/passwords ; https://supabase.com/docs/guides/auth/auth-email-templates ; installed @supabase/auth-js session initialization/resend types. Changelog was checked; the upcoming TLS cipher deprecation does not change the browser callback implementation.
