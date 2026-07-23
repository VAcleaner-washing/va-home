# Налаштування входу через Google — один раз

Код сайту вже готовий. Залишилося один раз виконати зовнішні налаштування.

## 1. Supabase

Відкрийте **Authentication → Providers → Google** та увімкніть Google. Скопіюйте адресу зворотного виклику, яку показує Supabase. Для цього проєкту вона зазвичай має такий вигляд:

`https://yweluzclearwrazdkahu.supabase.co/auth/v1/callback`

Використовуйте саме ту адресу, яка відображається у вашій панелі Supabase.

Далі відкрийте **Authentication → URL Configuration**:

- Site URL: `https://vahome.com.ua`
- Redirect URL: `https://vahome.com.ua/account.html`
- Для локального тестування за потреби додайте локальну адресу сторінки `account.html`.

## 2. Google Cloud Console

Створіть або виберіть проєкт, налаштуйте екран згоди OAuth, а потім створіть **OAuth 2.0 Client ID → Web application**.

У полі **Authorized redirect URIs** додайте callback-адресу із Supabase:

`https://yweluzclearwrazdkahu.supabase.co/auth/v1/callback`

Після створення скопіюйте **Client ID** та **Client Secret**.

## 3. Завершення налаштування у Supabase

Поверніться до **Authentication → Providers → Google**, вставте Client ID та Client Secret і збережіть зміни.

Після цього кнопка **«Продовжити з Google»** на сторінці кабінету працюватиме на опублікованому сайті.

## Важливо

- Google OAuth не працює при відкритті `account.html` безпосередньо як локального файла через `file://`.
- Для перевірки використовуйте локальний сервер або опублікований домен.
- Адреси redirect у Google Cloud і Supabase мають збігатися точно.
