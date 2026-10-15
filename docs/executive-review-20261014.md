# Corporate website executive review — 14 October 2026

Scope: TECHandGUARD/tech-and-guard-website and the owner-private corporate review site. This is a source and deployment review, not a customer usability study or an independent hosted security assessment. Browser QA is unavailable in this managed environment. No scores, revenue forecasts or customer results are invented.

## Executive judgement

The website is a credible private portfolio review, but public acquisition and transactional commerce are not yet ready. Launch the services portfolio first once enquiry handling and public-host verification pass. Keep commerce as enquiry-only until products, owner access and fulfilment/payment responsibilities are settled. SmartBridge is a live pilot with a direct link, not evidence of independently measured customer outcomes.

## CMO: clarity, credibility and conversion

Already present: six pages, readable light styling, company registration details, direct live SmartBridge links, service-specific contact links, honest catalogue/payment status.

Implemented in this review: a specific South African small-business audience and concrete website/store/workflow offer; a three-step brief/scope/proposal explanation; contact expectations and a copy/view fallback; the generated commerce asset is actually used and remains labelled illustrative. The original visual is not a real client store screenshot.

Still lacking:

| Priority | Gap | Exact place/action | Evidence of completion |
| --- | --- | --- | --- |
| P0 | Enquiries rely on a visitor sending email | `src/main.tsx` Contact; choose an authorised inbox owner and tracked intake process before adding a backend endpoint | A real enquiry reaches the inbox, is recorded once and has a named follow-up owner |
| P1 | Limited proof of completed client work | `src/main.tsx` Projects and `public/images/`; obtain client permission, actual URLs/screenshots and factual deliverables | One approved case study with real scope, company contribution and link; no invented results |
| P1 | Search acquisition is unproven | `index.html`, `scripts/build-pages.mjs`; establish the approved public origin, canonical/social metadata and search-readable page content | Inspect rendered/indexable content and page-specific metadata on the public origin; current page shells require JavaScript |
| P1 | No measurement baseline | Agree reporting before installing analytics | Weekly qualified enquiries, proposals, wins and acquisition source; denominator and date range included |
| P2 | No offer-specific landing pages | Extend Services only after selecting the primary buyer/offer | Each page answers audience, deliverables, exclusions and next step without generic repeated copy |

## CIO: resilience, access and operations

Already present in source: dedicated corporate Supabase project, browser-publishable key, product RLS, private admin allowlist, private theme bucket, atomic reviewed imports and draft isolation. These are positive design controls, not a fresh live penetration-test result.

Implemented in this review: 15-second abortable API requests; malformed/empty response checks; predictable errors without exposing backend text; failed/expired session cleanup; strict `true` administrator check; administrator sign-in only completes after catalogue loading succeeds; unmounted catalogue requests cancel; sign-out is disabled during ongoing admin mutations. Five new API regression tests complement three import/archive tests. Access tokens remain in memory. No automatic write retry was introduced.

| Priority | Gap | Exact place/action | Evidence of completion |
| --- | --- | --- | --- |
| P0 | End-to-end browser flows not verified | Home, Services, Projects, Contact, Store, `/admin/` | Desktop and narrow-mobile navigation, direct reloads, mail/copy fallback, empty/error catalogue, admin denial and approved admin import/publish pass |
| P0 | Store owner access is not enabled/verified | `corporate_private.store_admins` in project `vthjdkwfvbfryofsmtdb` | Owner identity confirmed; exact Auth UUID explicitly authorised; another account cannot administer |
| P0 | Public domain/headers not verified | Final host and DNS for `techandguard.co.za` | HTTPS, redirects, page URLs, CSP-compatible resources, frame policy, MIME protection and referrer policy tested; do not move DNS merely because the private review deploys |
| P1 | No operational alert/recovery evidence | Hosting/Supabase settings plus a runbook | Named responder, uptime/API failure check, last known good web release and tested restore/export procedure within Free limits |
| P1 | Dependencies and quality gates lack repository automation | `package.json`, tests and CI configuration | Production build and both test files run for PRs; dependency findings triaged, not merely counted |
| P1 | Auth expiry requires manual sign-in | `src/store-api.ts`, `src/Store.tsx` | Approved owner understands reload/expiry behaviour; expired action safely fails without displaying success |
| P1 | Records/uploads retention not defined | Corporate private tables and theme bucket | Named owner, approved retention schedule and deletion/export procedure; no reuse of SmartBridge policies without review |

## CEO: focus, delivery economics and accountability

The first commercial objective should be qualified service enquiries, not an empty store checkout. Define one primary buyer and offer, then use genuine project evidence to support it. Website/store/application services should each have an agreed scope and delivery owner. This is a recommendation, not a promise of revenue or an authorised pricing change.

Before taking a paid engagement, decide proposal pricing, deposits/milestones, revision limits, client content responsibilities, third-party recurring costs, intellectual-property handover and support terms. Have the applicable client agreement and privacy notice reviewed for the actual corporate business. These decisions must be approved; this review does not draft enforceable legal terms or assign invented fees.

Track weekly: qualified enquiries, time to first response, proposals sent, proposal wins, delivery hours versus estimate, gross margin per engagement, overdue receivables and recurring infrastructure costs. Measure real records before selecting targets. Assign an owner for each measure.

## Release sequence and decisions

1. **Service portfolio:** approve the offer/contact owner and case-study permissions; finish browser/public-host verification and an enquiry delivery test.
2. **Enquiry-only catalogue:** verify the corporate administrator identity, supply the actual CSV and review/publish real products. Confirm who handles stock, delivery and enquiries.
3. **Paid store:** only after explicit provider activation, tested payment callbacks/refunds, inventory/order tracking, fulfilment rules and applicable customer terms. Yoco remains paused. No paid upgrade or paid staging branch is authorised.

No domain change, admin promotion, analytics installation, payment activation, pricing change or external messages occurred during this review. Existing SmartBridge deployment and data are separate.

## Files changed and verification

- `src/main.tsx`, `src/styles.css`: offer clarity, engagement process, contact fallback and commerce image use.
- `src/store-api.ts`, `src/Store.tsx`: API bounds, response/session checks and safe administrative loading.
- `tests/store-api.test.mjs`: five failure/session/upload regression tests.
- This review: accountable release sequence and unresolved decisions.

Validation commands: `npm run build`, `node --experimental-strip-types --test tests/*.test.mjs`, `git diff --check`. Publication of the private review confirms deployment, not browser interaction or public-domain readiness.
