VA HOME v5 — ЕТАП 1

Що додано:
• Адмін-панель /admin/ зі списком, пошуком і фільтрами замовлень.
• Статуси: Нове → Очікує оплату → Оплачено → Відправлено → Виконано / Скасовано.
• Поля ТТН, статусу оплати та внутрішньої примітки.
• Модерація відгуків у тій самій адмін-панелі.
• Сторінка /order-status.html для перевірки статусу клієнтом.
• Edge Function send-status-email для автоматичного листа при зміні статусу.
• Посилання «Статус замовлення» у футері сайту.

ПОРЯДОК ЗАПУСКУ

1. Supabase → SQL Editor:
   запустіть SUPABASE_MIGRATION_V5_STAGE1.sql.

2. Supabase → Authentication → Users → Add user:
   Email: vahome.aroma@gmail.com
   Створіть надійний пароль і збережіть його.

3. Знову SQL Editor, запустіть:

insert into public.admin_users(user_id, email)
select id, email from auth.users where lower(email)=lower('vahome.aroma@gmail.com')
on conflict (user_id) do update set email=excluded.email;

4. Supabase → Edge Functions → Deploy a new function:
   Function name: send-status-email
   Вставте код із supabase/functions/send-status-email/index.ts
   Deploy.
   Секрет RESEND_API_KEY уже має бути створений для листів замовлення.

5. Завантажте в GitHub увесь вміст архіву із заміною файлів.

6. Перевірка:
   • https://vahome.com.ua/admin/
   • https://vahome.com.ua/order-status.html

Безпека:
• Адмін-панель не відкриває замовлення анонімним користувачам: доступ контролює Supabase Auth + таблиця admin_users + RLS.
• Сторінка статусу не показує ім’я, телефон, email або адресу. Для перевірки потрібні номер замовлення та останні 4 цифри телефону.
