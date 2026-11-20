# PayFast shop activation

The online shop supports server-priced orders, time-limited stock reservations, PayFast hosted checkout, verified ITNs, an order-status page and an administrator fulfilment queue. Payment checkout is intentionally **off by default**. The store remains usable for product enquiries until the merchant account and customer policies are ready.

## Merchant information required

Before activating payment checkout, the business owner must confirm:

- The PayFast merchant ID, merchant key, and passphrase from the Tech & GUARD merchant account.
- Whether the store is ready to accept real orders, including prices and stock counts.
- Whether customers can collect, receive courier delivery, or both; collection instructions and delivery fees.
- Published terms, returns/refund, and delivery policy pages on `https://www.techandguard.co.za`.
- The policy revision label to record at checkout.
- A staffed process for reviewing paid orders, stock exceptions, dispatch, and refunds.

Do not create policy language or delivery promises from this setup guide. The owner must supply and approve the real business terms. The contact details on the site are `info@techandguard.co.za`, `073 112 7124`, and the Tech & GUARD WhatsApp short link.

## Supabase Edge Function secrets

Set secrets in the Tech & GUARD Supabase project using the Dashboard or Supabase CLI. Never place the merchant key, passphrase, Resend key, or service-role key in frontend variables, source control, or public build logs. The enquiry alert uses a separate verified Resend sending domain and can be enabled without turning on checkout.

Set `RESEND_API_KEY` as a Supabase Edge Function secret to enable automated staff notifications for saved enquiries. The function sends from `enquiries@auth.techandguard.co.za` to `info@techandguard.co.za`, with the customer's email as Reply-To. If no key is configured, the enquiry is still saved and the receipt page offers direct email and WhatsApp follow-up. See [store policy and launch review](store-policy-review.md) for the customer-data flow and verification boundaries.

```sh
PAYFAST_MODE=sandbox
PAYFAST_MERCHANT_ID=<8-digit sandbox merchant id>
PAYFAST_MERCHANT_KEY=<sandbox merchant key>
PAYFAST_PASSPHRASE=<sandbox passphrase>
SHOP_ABUSE_SECRET=<random secret of at least 32 characters>
STORE_CHECKOUT_ENABLED=false
STORE_ALLOW_LIVE_PAYMENTS=false
STORE_TERMS_VERSION=<owner-approved policy revision>
STORE_TERMS_URL=https://www.techandguard.co.za/terms/
STORE_RETURNS_URL=https://www.techandguard.co.za/returns/
STORE_DELIVERY_POLICY_URL=https://www.techandguard.co.za/delivery/
STORE_COLLECTION_ENABLED=false
STORE_COLLECTION_LABEL=Collection
STORE_COLLECTION_DETAILS=<owner-approved collection instructions>
STORE_DELIVERY_ENABLED=false
STORE_DELIVERY_FEE_CENTS=<owner-approved integer cents>
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not create alternate values for these. Leave delivery or collection disabled if its details are not ready. The checkout API only returns enabled when the selected fulfilment method and all required configuration are valid.

## Safe activation sequence

1. Configure PayFast sandbox credentials and policies/fulfilment details after the owner provides them.
2. Set `STORE_CHECKOUT_ENABLED=true` while `PAYFAST_MODE=sandbox` and test successful, cancelled, repeated, expired, mismatched-amount, and stock-conflict flows.
3. Check the PayFast ITN event history and the Tech & GUARD `/admin/` online orders queue. The ITN endpoint verifies the signature, merchant, server-side PayFast validation result, order ID, and exact ZAR amount before it records payment.
4. Reconcile the test order and stock effects. Confirm that a verified payment is recorded once and that late or exceptional payments go to `payment_review`.
5. Switch to the live merchant credentials only after confirming the store policies, stock, delivery/collection process, customer support, and refund process. Set `PAYFAST_MODE=live` and `STORE_ALLOW_LIVE_PAYMENTS=true` together; keep the checkout flag false until the live credentials are installed and reviewed.

The PayFast page is hosted by PayFast; the Tech & GUARD site does not receive or store card numbers. PayFast's custom checkout signature uses the documented form-field order, and ITN validation is confirmed server-to-server. See the [PayFast developer documentation](https://developers.payfast.co.za/documentation/).

## Checks

The production build and Node regression tests run with:

```sh
npm run build
node --experimental-strip-types --test tests/*.test.mjs
```

The deployment browser smoke test checks the store at 375px and 1440px, including horizontal overflow, product images, basket interaction and the fail-closed checkout state.
