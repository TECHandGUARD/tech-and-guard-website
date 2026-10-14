# Supplied corporate product CSV review

File: `techguard-products.csv`, received 15 October 2026 (South Africa). Original unchanged; product rows are not committed to this public source repository.

Local validation after importer repair: 16 valid rows, no blocking errors, prices R149–R14,999. `stock_count` and `image_url` are now recognised; previously all 16 stock quantities and images would have been silently dropped. Validation verifies CSV structure, limits and HTTPS URL syntax, not inventory ownership, product specifications or image availability/accuracy.

The file contains 19 fields. Supported: SKU, title, description, price, stock_count and primary image_url. Source publication flags are ignored: database imports remain drafts. Extra fields are explicitly listed in the preview instead of disappearing without notice.

11 rows have multiple colour/size choices. These are not separate sellable variants with individual SKUs, prices and stock quantities. The source's 16 ratings/review counts are not treated as verified customer feedback. Categories, alternate image gallery, materials, badges, compare-at prices and featured/deal flags remain in the unchanged source file for later review; this schema does not persist them.

Primary image hosts: five Unsplash URLs and eleven Base44-hosted URLs. Check that each depicts the actual supplied product, is usable with permission and resolves reliably before public release. No invented photos, reviews, variant inventories or discount claims are added.

No hosted product import/publication or corporate administrator promotion occurred. Import through the protected UI once the owner account is explicitly verified/authorised. Retain this source CSV for fields not yet supported. No product/pricing changes are applied to SmartBridge.

Verification: production/type build, all ten import/API tests, local validation of this exact attachment, whitespace check. Browser QA remains outstanding.
