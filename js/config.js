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
    email: null,
    address: null
  },

  legalEntity: "ФОП Невідома А.С.",

  cartStorageKey: "vahome_cart_v1"
};

window.SITE_CONFIG = SITE_CONFIG;
