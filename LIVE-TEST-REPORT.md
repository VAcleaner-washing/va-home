# VA HOME v14.0.0 RC6 — live та transactional test report

## Repeat Purchase

- Живе замовлення `VA-260727-541F0C` зі згодою на маркетинг дійшло до `completed`.
- Кампанія була створена, примусово переведена у тестовий due-state і успішно оброблена.
- Resend повернув provider message ID.
- Створено email-bound одноразовий код на 100 грн із терміном 7 днів.

## Discovery Credit

Тест виконано всередині SQL-транзакції з `ROLLBACK`, тому тестові замовлення та коди не залишилися в production.

Результат:

- набір 6 ароматів — 150 грн;
- набір 18 ароматів — 450 грн;
- статус — `active`;
- термін — 60 днів;
- `usage_limit = 1`;
- email-binding активний;
- `campaign_type = discovery_credit`.

Під час першого тесту виявлено несумісний виклик `gen_random_bytes`; функцію виправлено на `gen_random_uuid`, після чого повторний тест пройшов.

Після виправлення tier-логіки окремо підтверджено: `discovery-6` створює 150 грн, а `discovery-18` і legacy `discovery-17` — 450 грн.

## Atomic Promo Guard

Тест виконано транзакційно з `ROLLBACK`:

- перше замовлення з одноразовим кодом створено;
- друга спроба використати той самий код заблокована;
- `usage_count = 1`;
- створено рівно одне замовлення;
- створено рівно один запис redemption.

## Production deployment

- міграції Atmosphere OS застосовані до `yweluzclearwrazdkahu`;
- `send-status-email` розгорнуто як version 11 і має статус ACTIVE;
- вигаданий Private Preview release не додавався.
