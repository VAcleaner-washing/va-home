# VA HOME v15.2.0 — production smoke tests

Дата: 2026-07-31

- `payment-config` → HTTP 200, `enabled=true`, `configured=true`;
- `mono-webhook` із неправильним підписом → HTTP 401;
- `create-order` із порожнім payload → HTTP 400 `INVALID_CONTACTS`;
- `card-payment` із порожнім payload → HTTP 400 `INVALID_REQUEST`;
- `apply_monobank_payment_status`: `anon=false`, `authenticated=false`, `service_role=true`;
- усі платіжні Edge Functions мають статус ACTIVE;
- повний статичний валідатор — PASS.

Реальну оплату не запускали, щоб не створювати платіж і не торкатися коштів без контрольного замовлення власника.
