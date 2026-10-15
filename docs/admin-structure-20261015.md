# Tech & Guard administration structure

Reference: five supplied Base44 dashboard photographs and the supplied code/entity listing, 15 October 2026. They establish navigation and intended modules, not working backend implementations. The new dashboard uses a dark, scrollable sidebar with a standalone workspace, responsive navigation and a Back to Store link. Base44 editor chrome is not part of the website.

The user explicitly requested improved grouping rather than copying every duplicate entry. Inventory and inventory alerts are combined. Stock Adjustments remains a dedicated workspace.

| Area | Functional in this update | Important outstanding work |
| --- | --- | --- |
| Overview | Operational dashboard, request/stock summaries, recent requests, shortcuts | Paid-sales analytics and conversion tracking |
| Sales & catalogue | Product editing/publication, request review/search, customers derived from latest 100 requests | Categories/collections, full customer directory, product creation beyond CSV imports, image/variant management |
| Inventory & suppliers | Inventory and alerts in one view, stock adjustments, per-product and global movement history | Supplier/purchasing records, customer back-in-stock subscriptions, reservations for paid orders |
| Customer support | Navigation and scope identified | Support inbox/tickets, feedback/moderation, customer groups |
| Marketing | Navigation and scope identified | Campaign drafts/sending, consented subscribers, coupons/promotions and performance |
| Shipping & services | Navigation and scope identified | Shipping areas/rates, dispatch/fulfilment, services/bookings |
| Payments & finance | Explicitly unpaid request subtotals and status breakdown | Gateway credentials, verified payment webhooks, invoices/refunds and tax configuration |
| Documents & content | Navigation and scope identified | Secure document storage/access, content/SEO editor, email templates and course materials |
| Team & administration | Owner-managed staff roles, permission explanation, CSV/theme import, owner-only store audit events, account password settings | Custom permission sets, tasks/calendar/shifts, monitoring, feature flags and maintenance controls |

## Truthful states

Unbuilt tools are disabled with a visible Planned label; they do not open dummy CRUD pages. A checkbox can hide planned entries. Feature readiness lists what works and what still needs implementation. Request and customer summaries show their latest-100 scope. Unknown stock is not treated as zero in alerts. Unpaid values are not called revenue. Finance does not claim to accept payments, issue invoices or calculate tax. Audit Logs includes recorded store events only, not all authentication or system logs.

## Code

- `src/AdminShell.tsx`, `src/admin.css`: application frame and responsive sidebar.
- `src/admin-navigation.ts`: one route/menu definition, grouping, owner filtering and legacy inventory-alert route alias.
- `src/AdminOverview.tsx`, `src/admin-insights.ts`: real operational summaries, customer request view, permissions and readiness.
- `src/InventoryWorkspace.tsx`: combined stock/alerts, dedicated adjustments, global stock history and owner audit viewer.
- `src/StoreAdmin.tsx`: existing authentication and data controller; reuses existing product, order, import and account implementations.
- `supabase/migrations/20261015082040_corporate_admin_history_views.sql`: read-only role-checked APIs over existing private records. Stock history is available to authorised staff; store audit events require owner status. No tables or direct browser table grants were added.

Stock adjustment navigation is locked while a submission is pending or uncertain. The original idempotency key/payload stays available for retry; browser navigation warns before abandoning the operation. In-place refresh keeps the adjustment form mounted. Hash navigation permits back/forward without reloading the memory-only Auth session. Real user signup and password email delivery remain separate verification gates.

Validation: TypeScript/production build, 31 automated tests, component server-render smoke check, transactional hosted tests of global/per-product history, pagination and owner/staff/customer/anonymous denial. Fixtures rolled back. Browser interaction/visual QA remains unverified because the supported browser-control skill is unavailable. The supplied photos establish the visual direction; no pixel-perfect claim is made.

Publishing uses GitHub main -> existing AWS Amplify app `d1406asizz97c4` in eu-west-1. Do not publish this change to ChatGPT Sites or create another hosting app. Custom-domain cutover remains separate.
