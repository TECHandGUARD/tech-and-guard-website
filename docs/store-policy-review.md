# Store policy and launch review

The public policy routes (`/terms/`, `/returns/`, `/delivery/`, `/privacy/`) explain the current enquiry-only state and preserve customer rights. They are clearly marked as pre-launch information prepared for owner review. Online checkout remains disabled. These pages are not a substitute for owner approval or legal advice.

## Verified implementation and catalogue state

- The public catalogue contains 16 published rows with unique SKUs. Each has a positive price, a nonnegative stock count, an image URL and product copy.
- This confirms database completeness only. It does not verify supplier pricing, physical stock, image accuracy, warranty, model/variant selection, tax treatment or availability for sale. The owner should reconcile each SKU against current supplier invoices and physical stock before enabling checkout.
- Enquiries are saved in the staff queue. When configured, a rate-limited Supabase Edge Function uses Resend to send a team alert to `info@techandguard.co.za`. The notification status is visible to the customer and in the staff queue. A missing or failed alert does not discard the saved enquiry.
- The website does not currently calculate tax or delivery, accept online payment, offer a published delivery zone/fee or promise collection.

## Owner decisions required before checkout

1. **Catalogue:** confirm every SKU, supplier cost and sale price, available count, model/variant, image/copy, warranty and any included/excluded tax. Provide the approved list and an update cadence.
2. **Fulfilment:** define delivery regions, carrier, fee calculation, dispatch and delivery estimates, lost/damaged parcel handling, and collection availability, location, hours and handover instructions.
3. **Policies:** review the terms, return/cancellation/refund process, delivery information and privacy notice, then provide a dated revision identifier for checkout records. Confirm handling outside statutory rights.
4. **Company details:** provide the approved office-bearer information required for online seller disclosure and the responsible Information Officer/Deputy Information Officer contact details. Confirm registered/trading names and address.
5. **Privacy operations:** approve access controls, enquiry/order retention schedule and deletion process; confirm processors, hosting locations, cross-border safeguards, breach handling and data-subject request workflow. The current system has no automatic enquiry deletion schedule.
6. **Support:** ensure the Outlook inbox is monitored, establish an owner/staff queue review cadence, and document who handles customer questions, refunds and delivery exceptions.

The checkout gate remains off until owner-approved policy URLs/version, fulfilment configuration and PayFast secrets are present. Do not add real PayFast credentials to source control or frontend configuration.

## Enquiry email alert setup

The sending domain `auth.techandguard.co.za` is verified in Resend. Configure the API key as a Supabase Edge Function secret named `RESEND_API_KEY` for project `vthjdkwfvbfryofsmtdb`. Do not put it in `VITE_*` variables, repository files, browser storage, or chat. The function sends from `enquiries@auth.techandguard.co.za`, replies to the customer, and delivers to `info@techandguard.co.za`.

After setting the secret, submit one controlled enquiry using a company-controlled address. Confirm the receipt page status, email delivery and Reply-To behaviour, then confirm the notification status in `/admin/`. If unconfigured or unavailable, use the prefilled email or WhatsApp action shown on the receipt.

## Legal research references

- [Electronic Communications and Transactions Act 25 of 2002](https://www.gov.za/sites/default/files/gcis_document/201409/a25-02.pdf): section 43 covers online supplier, product, price, payment, delivery, return and privacy disclosures; section 44 sets a cooling-off period for qualifying transactions; section 46 addresses performance/delivery.
- [Consumer Protection Act 68 of 2008](https://www.gov.za/sites/default/files/32186_467.pdf): section 56 describes consumer remedies for qualifying failures to meet the applicable quality requirements.
- [Information Regulator privacy notice](https://inforegulator.org.za/privacy-notice/) and [Protection of Personal Information Act](https://www.gov.za/documents/protection-personal-information-act): review against the actual data flows and operating practices before launch.
- [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys): the notification uses a stable per-enquiry idempotency key so retries cannot accidentally send a duplicate during the provider's key-retention window.
