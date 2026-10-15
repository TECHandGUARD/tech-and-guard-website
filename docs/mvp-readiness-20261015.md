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

The dashboard requires secure login to configure SMTP and redirects. Dedicated Resend domain DNS is saved; verification and actual delivery are not complete. A recent signup log returned 200, but no second owner account exists; the exact failed attempt remains unidentified. Do not bypass email confirmation.

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
