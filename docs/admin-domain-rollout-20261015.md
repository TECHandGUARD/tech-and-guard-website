# Corporate administrator and domain rollout

The two user-approved owner email grants are in the private database, not in public source or browser configuration. One verified account is active; the second is reserved pending account registration and email verification. Owners assign/revoke staff through database-guarded RPCs. Staff can use existing product/theme management permissions, but cannot assign roles, view the staff roster or modify owners. No arbitrary account passwords can be read/set by another staff user.

Account controls use pinned Supabase JS 2.117.3 with memory-only sessions. Account holders register, verify email, request recovery links and set/change their own password. Recovery clears URL token material; password completion signs out. The administration bundle is lazy-loaded to keep public pages light. Existing DB grants are checked on operations so staff revocation applies to subsequent requests.

Sixteen supplied CSV products are now saved as unpublished drafts through the existing atomic importer under the user-approved owner account, as a service-assisted import. Prices, stock and primary image URLs retained; omitted columns remain in original CSV. Products are not public, and ratings/variant lists are not invented.

## Hosted Auth settings still required

Corporate project: `vthjdkwfvbfryofsmtdb` → Authentication → URL Configuration.

- Site URL for public launch: `https://www.techandguard.co.za`.
- Additional redirect URLs: `https://www.techandguard.co.za/admin/` and `https://tech-guard-corporate-review.asandaapril0642.chatgpt.site/admin/`.
- Verify email confirmation enabled and actual signup/reset email delivery. Configure a verified custom SMTP sender if the default sender does not deliver to both owner accounts.
- Test recovery and registration in the browser before claiming working email delivery. No recovery email was sent by the agent.

Current review sharing remains owner-private. Connecting a domain does not make the review publicly accessible. Public audience must be explicitly selected for the customer launch.

## GoDaddy DNS records for www

Registered custom hostname: `www.techandguard.co.za`; host reports pending DNS verification/SSL.

| Type | GoDaddy Name | Value |
|---|---|---|
| CNAME | www | custom-domains.chatgpt.site |
| TXT | _openai-site-verification.www | openai-site-verification=ZrX3L09_XYJt5qnuNqAe3WI74lOnrOhY61xAXZVx5Qg |
| TXT | _cf-custom-hostname.www | 178920af-7bd1-4abb-8780-1495bcb2ed54 |

Replace conflicting `www` Shopify CNAME/forwarding only when entering the approved new records. Preserve MX, SPF, DKIM and other email/DNS records. Apex `techandguard.co.za` is not connected in this change; plan its HTTPS redirect to www separately. Recheck host DNS and SSL status after saving, then verify live URLs.

## Verification and limits

Production/type build; ten existing import/API tests; transactional hosted owner/staff tests including verified access, unverified assignment denial, owner-removal denial, staff escalation/list denial and revocation. Fixture rows rolled back. Advisors run: new private membership table has RLS and no direct browser policies intentionally; legacy unrelated tables were not altered. Browser, DNS and outbound Auth delivery are not yet verified. No paid services, live payments or SmartBridge changes.
