/* ==========================================================================
   VA HOME — Site configuration
   Single place to update once real business data is available.
   ========================================================================== */

const SITE_CONFIG = {
  // Production domain — used for canonical URLs, Open Graph tags, sitemap.xml.
  siteUrl: "https://vahome.com.ua",

  siteName: "VA HOME",

  instagram: {
    handle: "@va_home.aroma",
    url: "https://instagram.com/va_home.aroma"
  },

  // Orders are sent as a prefilled Telegram deep link:
  // https://t.me/<username>?text=<encoded order text>
  telegram: {
    username: "vahome_aroma",
    url: "https://t.me/vahome_aroma"
  },

  contacts: {
    phone: "+38 (095) 391-9569",
    email: "vahome.aroma@gmail.com",
    address: "м. Полтава, вул. Європейська, 146"
  },

  legalEntity: "ФОП Невідома Анна Сергіївна",

  payment: {
    iban: "UA523220010000026006370119233",
    recipient: "ФОП Невідома Анна Сергіївна",
    taxId: "3314215243"
  },

  analytics: {
    // Add the GA4 Measurement ID, for example: G-H4F0WWB8R9.
    // Analytics stays fully disabled while this value is empty.
    ga4MeasurementId: "G-H4F0WWB8R9"
  },

  cartStorageKey: "vahome_cart_v1",

  supabase: {
    url: "https://yweluzclearwrazdkahu.supabase.co",
    publishableKey: "sb_publishable_-UdAKDf5jzIP6N9rBp927g_VhyJKeog"
  }
};

window.SITE_CONFIG = SITE_CONFIG;
