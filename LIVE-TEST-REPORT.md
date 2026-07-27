# VA HOME v13.8.36 — Automation Hardening & Live Test

## Live repeat-purchase test
- Order: VA-260727-541F0C
- Product: Pure Zen
- Marketing consent: true
- Order status: completed
- Campaign processed: sent
- Resend provider message ID received
- Personal promo generated and bound to the customer email
- Discount: 100 UAH
- Validity: 7 days
- Usage count after send: 0

## Checkout city autofill hardening
- Browser address autofill is discouraged for the custom Nova Poshta combobox.
- Chrome/LastPass ignore hints added.
- Autofill/change reconciliation clears stale Nova Poshta refs and reruns authoritative city lookup.
- Warehouse remains disabled until the city is explicitly resolved.
