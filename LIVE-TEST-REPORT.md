# VA HOME v14.0.0 RC6.3 — live та production test report

## Repeat Purchase

- Живе замовлення `VA-260727-541F0C` зі згодою на маркетинг дійшло до `completed`.
- Кампанія була створена, примусово переведена у тестовий due-state і успішно оброблена.
- Resend повернув provider message ID.
- Створено email-bound одноразовий код на 100 грн із терміном 7 днів.

## Discovery Credit

Тест виконано всередині SQL-транзакції з `ROLLBACK`, тому тестові замовлення та коди не залишилися в production.

Результат:

- набір 6 ароматів — 150 грн;
- набір 18 ароматів створює номінал 450 грн; під час покупки застосовується 250 грн на один флакон або 450 грн на два;
- статус — `active`;
- термін — 60 днів;
- `usage_limit = 1`;
- email-binding активний;
- `campaign_type = discovery_credit`.

Під час першого тесту виявлено несумісний виклик `gen_random_bytes`; функцію виправлено на `gen_random_uuid`, після чого повторний тест пройшов.

Після оновлення redemption-логіки окремо підтверджено: `discovery-6` застосовує 150 грн на один аромат; `discovery-18` / legacy `discovery-17` застосовує 250 грн на один або 450 грн на два аромати. Тестові записи після перевірки видалено.

## Atomic Promo Guard

Тест виконано транзакційно з `ROLLBACK`:

- перше замовлення з одноразовим кодом створено;
- друга спроба використати той самий код заблокована;
- `usage_count = 1`;
- створено рівно одне замовлення;
- створено рівно один запис redemption.

## Production deployment

- міграції Atmosphere OS застосовані до `yweluzclearwrazdkahu`;
- `create-order` розгорнуто як version 25;
- `validate-promo` розгорнуто як version 4;
- `send-status-email` розгорнуто як version 12;
- вигаданий Private Preview release не додавався.
