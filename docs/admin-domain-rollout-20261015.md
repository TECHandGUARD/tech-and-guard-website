# Corporate rollout — 15 October 2026

Supersedes earlier private-review/www-only notes. Corporate Supabase: `vthjdkwfvbfryofsmtdb`; SmartBridge is separate and unchanged.

The site is public. `techandguard.co.za` and its HTTPS are active according to the hosting provider. The current host is ChatGPT Sites. The React/Vite code does not use ChatGPT visitor authentication or an OpenAI inference API and can be deployed as `dist/` to another static host.

All 16 supplied CSV products are published for enquiries. Stored order requests now support verified customers and staff review. Prices and descriptions are supplied data, not independently verified manufacturer claims. Generated product images and unverified review counts are not displayed. Confirm model, stock and delivery before payment. No payment checkout exists. An unpaid order request is now stored by the database with server-priced product snapshots.

## Required Supabase Auth settings

- Site URL: `https://techandguard.co.za`.
- Redirects: `https://techandguard.co.za/admin/`, `https://techandguard.co.za/account/`, `https://www.techandguard.co.za/account/`, `https://www.techandguard.co.za/admin/`, `https://tech-guard-corporate-review.asandaapril0642.chatgpt.site/admin/` while current hosting remains.
- Keep email confirmation enabled.
- SMTP host `smtp.resend.com`, port `465`, username `resend`.
- From `no-reply@auth.techandguard.co.za`, sender name `Tech & Guard`.
- SMTP password: server-side Resend sending API key, entered securely in the dashboard. Never put it in frontend code, Git or chat.
- Verify actual confirmation/recovery delivery and owner/staff workflows. No emails sent by the agent.

The dashboard requires user sign-in. The connector cannot read/change these Auth settings. Public settings show signup enabled and confirmation required. A recent signup request logged HTTP 200, but no second owner account exists; the exact failed user attempt is not identified.

## Resend DNS

Dedicated sending-only domain `auth.techandguard.co.za` was created. Four records were saved in GoDaddy, leaving existing corporate mail records unchanged. All four records and the sending domain were verified by Resend on 15 October 2026:

| Type | Name | Value |
|---|---|---|
| TXT | resend._domainkey.auth | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCeyaOI/ByT90UApvDRC6fA2K2lVnDa4T17typ2L7yY5nNws7JGgEAeJoDoK4MHzcYc36pU6cmMWPgAs3CJos0Mb0eQYusmc8CJf/CYK9vp2vEdWtpKjKg/LbBpFJmjnUdme1tsx26E0VC5DtBQzgarzW5J/eN8zTuGfmZvzspPfwIDAQAB |
| MX | send.auth | feedback-smtp.eu-west-1.amazonses.com, priority 10 |
| TXT | send.auth | v=spf1 include:amazonses.com ~all |
| CNAME | rsend.auth | send.forge.rmta.net |

Verified DNS alone does not configure Supabase SMTP.

## Hosting portability

`amplify.yml` selects Node 24, runs tests and builds `dist/`. `customHttp.yml` specifies HTTP security headers using documented Amplify syntax. These headers only become effective on an actual Amplify deployment and need response verification. HTML metadata includes restrictive CSP/no-referrer; frame denial requires a response header.

No corporate Amplify app was found in enabled regions where listing succeeded; af-south-1 endpoint was unavailable. Existing SmartBridge apps were unchanged. Confirm hosting costs before creating a separate corporate app, connect the exact GitHub repository, verify deployment/Auth/headers, then change domain DNS. No AWS migration or cutover happened.
