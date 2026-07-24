/* ==========================================================================
   VA HOME — Product & Collection data
   Single source of truth. Do not duplicate names/prices/notes in HTML.

   Unknown fields are explicitly `null` — templates hide those sections
   instead of guessing or showing placeholder text.
   ========================================================================== */

const COLLECTIONS = [
  {
    id: "entry",
    name: "Entry Collection",
    price: 799,
    volume: "100 мл",
    tagline: "Світлий камінь, груша, м'яке ранкове світло.",
    description:
      "Перше знайомство з VA HOME: чисті, доступні композиції для щоденного простору.",
    heroImage: "images/collections/entry.webp",
    productIds: [
      "signature-relax",
      "forbidden-fruit",
      "doux-moment",
      "wild-berry-way",
      "hotel-spring"
    ]
  },
  {
    id: "signature",
    name: "Signature Collection",
    price: 899,
    volume: "100 мл",
    tagline: "Тепле дерево, ivory, домашній вечірній ритуал.",
    description:
      "Композиції для дому, де важливий вечірній ритуал і відчуття теплого затишку.",
    heroImage: "images/collections/signature.webp",
    productIds: ["evening-ritual", "velvet-spa", "pure-zen", "hotel-luxe"]
  },
  {
    id: "premium",
    name: "Premium Collection",
    price: 999,
    volume: "100 мл",
    tagline: "Темний камінь, травертин, спрямоване світло.",
    description:
      "Архітектурні, впевненіші композиції для простору з характером.",
    heroImage: "images/collections/premium.webp",
    productIds: ["old-money", "linstinct", "mineral-salt"]
  },
  {
    id: "noir",
    name: "Noir Collection",
    price: 1199,
    volume: "100 мл",
    tagline: "Майже чорний фон, димчасті тіні, арт-об'єктний характер.",
    description:
      "Найбільш молекулярні та стримані композиції лінійки VA HOME.",
    heroImage: "images/collections/noir.webp",
    productIds: [
      "pure-imagination",
      "silk-molecule",
      "the-archive",
      "silent-temple",
      "moss-and-shadow",
      "dark-bloom"
    ]
  }
];

// Helper: look up a collection's shared fields (price/volume) by id
function getCollection(collectionId) {
  return COLLECTIONS.find((c) => c.id === collectionId) || null;
}

const PRODUCTS = [
  {
    "id": "signature-relax",
    "name": "Signature Relax",
    "collection": "entry",
    "shortDescription": "М’який білий чай із цитрусовою свіжістю для спокійного простору.",
    "character": [
      "clean",
      "fresh"
    ],
    "room": [
      "living-room",
      "bedroom",
      "office",
      "hallway"
    ],
    "mood": [
          "calm"
    ],
    "scales": {
      "freshness": 8,
      "warmth": 3,
      "sweetness": 3,
      "woodiness": 2,
      "cleanliness": 9,
      "intensity": 6
    },
    "notes": {
      "top": [
        "Мандарин",
        "Лимон"
      ],
      "heart": [
        "Бергамот",
        "Імбир"
      ],
      "base": [
        "Жасмин",
        "Білий чай"
      ]
    },
    "howToUse": null,
    "badges": [
      "bestseller"
    ],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/signature-relax/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/signature-relax/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/signature-relax/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/signature-relax/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/signature-relax/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо любите чисті свіжі аромати для спокою — універсальний вибір для вітальні, спальні чи кабінету.",
    "formulaIntent": "Цитрусова ясність тут не домінує: вона відкриває простір для білого чаю, імбиру та м’якого жасминового сліду.",
    "insights": {
          "aura": "М’яка чайна атмосфера",
          "season": "Універсальний",
          "zones": "Спальня · зона відпочинку · кабінет",
          "comfort": "Дуже комфортний для щоденного використання",
          "evolution": "Спочатку — мандарин і лимон. За кілька днів аромат стає теплішим, а білий чай формує спокійну шовкову ауру."
    },
    "similar": [
      "hotel-spring",
      "pure-zen"
    ]
  },
  {
    "id": "forbidden-fruit",
    "name": "Forbidden Fruit",
    "collection": "entry",
    "shortDescription": "Темна вишня з лікерним акцентом і теплою пряною базою.",
    "character": [
      "fruity",
      "warm"
    ],
    "room": [
      "living-room",
      "bedroom"
    ],
    "mood": [
          "warm-evening",
          "warm-sweet"
    ],
    "scales": {
      "freshness": 3,
      "warmth": 8,
      "sweetness": 8,
      "woodiness": 3,
      "cleanliness": 3,
      "intensity": 7
    },
    "notes": {
      "top": [
        "Мигдаль",
        "Лікер",
        "Чорна вишня"
      ],
      "heart": [
        "Вишня",
        "Слива",
        "Троянда"
      ],
      "base": [
        "Боби тонка",
        "Ваніль",
        "Кориця",
        "Бензоїн"
      ]
    },
    "howToUse": null,
    "badges": [],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/forbidden-fruit/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/forbidden-fruit/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/forbidden-fruit/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/forbidden-fruit/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/forbidden-fruit/hero.webp" }
      ]
    },
    "quickFacts": "2–3 палички для старту",
    "suitFor": "Підійде, якщо тягне до фруктово-теплих композицій для затишного вечора у вітальні чи спальні.",
    "formulaIntent": "Вишневий акцент урівноважений пряністю й теплою базою, щоб композиція залишалась глибокою, а не кондитерською.",
    "insights": {
          "aura": "Темна соковита вишня",
          "season": "Осінь · зима",
          "zones": "Спальня · lounge · beauty-zone",
          "comfort": "Виразний вечірній характер",
          "evolution": "Стартує соковитою вишнею з лікерним акцентом, а з часом стає глибшим, теплішим і менш солодким."
    },
    "similar": [
      "doux-moment",
      "dark-bloom"
    ]
  },
  {
    "id": "doux-moment",
    "name": "DOUX Moment",
    "collection": "entry",
    "shortDescription": "Стигла груша, вершки й праліне для теплого домашнього затишку.",
    "character": [
      "fruity",
      "warm"
    ],
    "room": [
      "living-room",
      "bedroom"
    ],
    "mood": [
          "warm-evening",
          "warm-sweet"
    ],
    "scales": {
      "freshness": 3,
      "warmth": 9,
      "sweetness": 9,
      "woodiness": 2,
      "cleanliness": 3,
      "intensity": 6
    },
    "notes": {
      "top": [
        "Груша",
        "Яблуко"
      ],
      "heart": [
        "Фіалка",
        "Жимолость",
        "Цукор"
      ],
      "base": [
        "Вершки",
        "Карамель",
        "Праліне"
      ]
    },
    "howToUse": null,
    "badges": [],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/doux-moment/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/doux-moment/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/doux-moment/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/doux-moment/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/doux-moment/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо любите фруктово-теплі аромати для вечірньої атмосфери у вітальні чи спальні.",
    "formulaIntent": "Фруктовий початок переходить у вершково-праліневе серце — тепле, округле й придатне для щоденного простору.",
    "insights": {
          "aura": "Тепла вершкова атмосфера",
          "season": "Осінь · зима",
          "zones": "Вітальня · їдальня · затишна зона",
          "comfort": "М’який домашній gourmand",
          "evolution": "Груша й яблуко відкривають аромат, після чого вершки, карамель і праліне створюють відчуття дорогого домашнього спокою."
    },
    "similar": [
      "forbidden-fruit",
      "signature-relax"
    ]
  },
  {
    "id": "wild-berry-way",
    "name": "Wild Berry Way",
    "collection": "entry",
    "shortDescription": "Свіжа ожина, лавр і грейпфрут без зайвої солодкості.",
    "character": [
      "fruity",
      "fresh",
      "woody"
    ],
    "room": [
      "living-room",
      "bathroom",
      "hallway"
    ],
    "mood": [
          "warm-sweet"
    ],
    "scales": {
      "freshness": 8,
      "warmth": 4,
      "sweetness": 5,
      "woodiness": 5,
      "cleanliness": 7,
      "intensity": 6
    },
    "notes": {
      "top": [
        "Ожина",
        "Лист лавра"
      ],
      "heart": [
        "Грейпфрут",
        "Кедр"
      ],
      "base": [
        "Ветивер",
        "Квіткові ноти"
      ]
    },
    "howToUse": null,
    "badges": [],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/wild-berry-way/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/wild-berry-way/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/wild-berry-way/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/wild-berry-way/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/wild-berry-way/hero.webp" }
      ]
    },
    "quickFacts": "2–3 палички для старту",
    "suitFor": "Підійде, якщо шукаєте фруктово-свіжий аромат з деревним акцентом для вітальні, ванної кімнати чи передпокою.",
    "formulaIntent": "Ягоди підтримані лавром, грейпфрутом і сухою деревиною, тому аромат зберігає повітряність і свіжий контур.",
    "insights": {
          "aura": "Свіже ягідне повітря",
          "season": "Весна · літо",
          "zones": "Тераса · балкон · ванна кімната",
          "comfort": "Легкий і ненав’язливий",
          "evolution": "Ожина й лавр звучать свіжо на старті; за кілька днів проявляються грейпфрут, кедр і чиста деревна повітряність."
    },
    "similar": [
      "hotel-spring",
      "forbidden-fruit"
    ]
  },
  {
    "id": "hotel-spring",
    "name": "Hotel Spring",
    "collection": "entry",
    "shortDescription": "Юзу й тюльпан з атмосферою світлого весняного boutique hotel.",
    "character": [
      "clean",
      "fresh",
      "hotel"
    ],
    "room": [
      "living-room",
      "hallway"
    ],
    "mood": [
          "calm"
    ],
    "scales": {
      "freshness": 9,
      "warmth": 3,
      "sweetness": 3,
      "woodiness": 3,
      "cleanliness": 9,
      "intensity": 6
    },
    "notes": {
      "top": [
        "Екзотичні квіти",
        "Юзу"
      ],
      "heart": [
        "Тюльпан"
      ],
      "base": [
        "Чорний перець",
        "Сандал"
      ]
    },
    "howToUse": null,
    "badges": [],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/hotel-spring/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/hotel-spring/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/hotel-spring/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/hotel-spring/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/hotel-spring/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо цінуєте чисту, готельну свіжість для вітальні чи передпокою.",
    "formulaIntent": "Юзу й світлі квіти побудовані навколо чистого повітряного ефекту — без важкої солодкості.",
    "insights": {
          "aura": "Світла весняна clean-атмосфера",
          "season": "Березень · червень",
          "zones": "Світлі кімнати · хол · вітальня",
          "comfort": "Легкий сезонний характер",
          "evolution": "Дзвінкий юзу та світлі квіти поступово стають м’якшими й формують атмосферу весняного boutique hotel."
    },
    "similar": [
      "signature-relax",
      "hotel-luxe"
    ]
  },
  {
    "id": "evening-ritual",
    "name": "Evening Ritual",
    "collection": "signature",
    "shortDescription": "Темні квіти й кашемірова глибина для вечірньої атмосфери.",
    "character": [
      "warm"
    ],
    "room": [
      "living-room",
      "bedroom"
    ],
    "mood": [
          "warm-evening"
    ],
    "scales": {
      "freshness": 5,
      "warmth": 8,
      "sweetness": 6,
      "woodiness": 4,
      "cleanliness": 5,
      "intensity": 7
    },
    "notes": {
      "top": [
        "Апельсиновий цвіт",
        "Озон"
      ],
      "heart": [
        "Тубероза",
        "Далія",
        "Конвалія"
      ],
      "base": [
        "Пачулі",
        "Мускус",
        "Амбра"
      ]
    },
    "howToUse": null,
    "badges": [],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/evening-ritual/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/evening-ritual/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/evening-ritual/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/evening-ritual/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/evening-ritual/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо шукаєте теплий аромат для вечірнього ритуалу у вітальні чи спальні.",
    "formulaIntent": "Повітряний квітковий старт поступово переходить у кашемірово-амброву глибину для вечірнього простору.",
    "insights": {
          "aura": "Темна квіткова атмосфера",
          "season": "Осінь · вечір цілий рік",
          "zones": "Спальня · lounge · зона відпочинку",
          "comfort": "Найкраще розкривається ввечері",
          "evolution": "Повітряні квіти й озон на старті переходять у темнішу кашемірову композицію з пачулі, мускусом та амброю."
    },
    "similar": [
      "dark-bloom",
      "velvet-spa"
    ]
  },
  {
    "id": "velvet-spa",
    "name": "Velvet Spa",
    "collection": "signature",
    "shortDescription": "Кокосове молоко й сандал в атмосфері приватного SPA.",
    "character": [
      "spa",
      "warm",
      "woody"
    ],
    "room": [
      "bathroom",
      "bedroom"
    ],
    "mood": [
          "calm"
    ],
    "scales": {
      "freshness": 3,
      "warmth": 8,
      "sweetness": 7,
      "woodiness": 6,
      "cleanliness": 6,
      "intensity": 7
    },
    "notes": {
      "top": [
        "Бензоїн",
        "Кокосове молоко"
      ],
      "heart": [
        "Кокос",
        "Сандал"
      ],
      "base": [
        "Кедр",
        "Боби тонка",
        "Аміріс"
      ]
    },
    "howToUse": null,
    "badges": [],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/velvet-spa/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/velvet-spa/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/velvet-spa/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/velvet-spa/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/velvet-spa/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо любите спа-атмосферу з теплим деревним акцентом для ванної кімнати чи спальні.",
    "formulaIntent": "Кокосове молоко, сандал і бензоїн зібрані у м’яку текстуру, а не у виразно солодкий тропічний акорд.",
    "insights": {
          "aura": "Оксамитова SPA-хмара",
          "season": "Осінь · зима",
          "zones": "Ванна кімната · SPA · спальня",
          "comfort": "Теплий огортальний профіль",
          "evolution": "Кокосове молоко й бензоїн поступово зливаються із сандалом та кедром у м’яку атмосферу домашнього SPA."
    },
    "similar": [
      "pure-zen",
      "evening-ritual"
    ]
  },
  {
    "id": "pure-zen",
    "name": "Pure Zen",
    "collection": "signature",
    "shortDescription": "Білий чай, лотос і сандал для тихої wellness-атмосфери.",
    "character": [
      "clean",
      "spa",
      "fresh"
    ],
    "room": [
      "bedroom",
      "bathroom",
      "office"
    ],
    "mood": [
          "calm"
    ],
    "scales": {
      "freshness": 8,
      "warmth": 4,
      "sweetness": 3,
      "woodiness": 4,
      "cleanliness": 9,
      "intensity": 5
    },
    "notes": {
      "top": [
        "Бергамот",
        "Лимон",
        "Кардамон"
      ],
      "heart": [
        "Лотос",
        "Коріандр",
        "Білий чай"
      ],
      "base": [
        "Сандал",
        "Ветивер",
        "Мигдальне молоко"
      ]
    },
    "howToUse": null,
    "badges": [],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/pure-zen/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/pure-zen/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/pure-zen/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/pure-zen/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/pure-zen/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо шукаєте чисту спа-свіжість для спокою в спальні, ванній кімнаті чи кабінеті.",
    "formulaIntent": "Білий чай, лотос і сухий сандал формують тишу композиції; цитрус і кардамон залишають її живою.",
    "insights": {
          "aura": "Тиха медитативна атмосфера",
          "season": "Весна · універсальний",
          "zones": "Спальня · SPA · зона медитації",
          "comfort": "Один із найтихіших ароматів лінійки",
          "evolution": "Білий чай, цитрус і кардамон стають спокійнішими, відкриваючи лотос, сандал і м’яку мигдальну глибину."
    },
    "similar": [
      "mineral-salt",
      "velvet-spa"
    ]
  },
  {
    "id": "hotel-luxe",
    "name": "Hotel Luxe",
    "collection": "signature",
    "shortDescription": "Чистий льон і морські мінерали з атмосферою дорогого готелю.",
    "character": [
      "hotel",
      "clean",
      "fresh"
    ],
    "room": [
      "living-room",
      "hallway"
    ],
    "mood": [
          "hotel"
    ],
    "scales": {
      "freshness": 9,
      "warmth": 3,
      "sweetness": 2,
      "woodiness": 3,
      "cleanliness": 10,
      "intensity": 7
    },
    "notes": {
      "top": [
        "Лимон",
        "Бавовна",
        "Озон"
      ],
      "heart": [
        "Льон",
        "Евкаліпт",
        "Морська сіль",
        "Фрезія"
      ],
      "base": [
        "Сандал",
        "Мох",
        "Пудрові ноти"
      ]
    },
    "howToUse": null,
    "badges": [
      "bestseller"
    ],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/hotel-luxe/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/hotel-luxe/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/hotel-luxe/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/hotel-luxe/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/hotel-luxe/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо любите готельну чистоту й свіжість для вітальні чи передпокою.",
    "formulaIntent": "Льон, озонічне повітря та мінеральна чистота поєднані з теплою базою, щоб уникнути стерильного звучання.",
    "insights": {
          "aura": "Об’ємна готельна чистота",
          "season": "Універсальний",
          "zones": "Хол · великі простори · гардероб",
          "comfort": "Чистий профіль без відчуття стерильності",
          "evolution": "Озон, льон і свіже повітря поступово набувають теплої текстури — так формується ефект дорогого готелю."
    },
    "similar": [
      "mineral-salt",
      "hotel-spring"
    ]
  },
  {
    "id": "old-money",
    "name": "Old Money",
    "collection": "premium",
    "shortDescription": "Суха шкіра, тютюн і амбра з характером дорогого кабінету.",
    "character": [
      "woody",
      "warm"
    ],
    "room": [
      "living-room",
      "office",
      "hallway"
    ],
    "mood": [
          "hotel"
    ],
    "scales": {
      "freshness": 3,
      "warmth": 8,
      "sweetness": 2,
      "woodiness": 9,
      "cleanliness": 4,
      "intensity": 7
    },
    "notes": {
      "top": [
        "Гвоздика",
        "Бергамот"
      ],
      "heart": [
        "Троянда",
        "Лаванда",
        "Лабданум"
      ],
      "base": [
        "Шкіра",
        "Тютюн",
        "Амбра"
      ]
    },
    "howToUse": null,
    "badges": [],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/old-money/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/old-money/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/old-money/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/old-money/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/old-money/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо шукаєте теплий деревний аромат з готельним характером для вітальні, кабінету чи передпокою.",
    "formulaIntent": "Шкіра, тютюн і лабданум пом’якшені бергамотом, лавандою та амбровим теплом — для камерної, зібраної атмосфери.",
    "insights": {
          "aura": "Глибока dark luxury-атмосфера",
          "season": "Осінь · зима",
          "zones": "Кабінет · темний інтер’єр · представницький простір",
          "comfort": "Камерний, стриманий характер",
          "evolution": "Суха шкіра й бергамот відкривають композицію; пізніше тютюн, лабданум та амбра створюють теплу кашемірову глибину."
    },
    "similar": [
      "the-archive",
      "linstinct"
    ]
  },
  {
    "id": "linstinct",
    "name": "L’INSTINCT",
    "collection": "premium",
    "shortDescription": "Бергамот, перець і суха деревина для впевненого простору.",
    "character": [
      "woody",
      "fresh"
    ],
    "room": [
      "office",
      "hallway",
      "living-room"
    ],
    "mood": [
          "hotel"
    ],
    "scales": {
      "freshness": 7,
      "warmth": 6,
      "sweetness": 1,
      "woodiness": 8,
      "cleanliness": 6,
      "intensity": 8
    },
    "notes": {
      "top": [
        "Бергамот",
        "Перець"
      ],
      "heart": [
        "Сичуанський перець",
        "Лаванда",
        "Ветивер"
      ],
      "base": [
        "Амброксан",
        "Кедр",
        "Лабданум"
      ]
    },
    "howToUse": null,
    "badges": [],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/linstinct/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/linstinct/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/linstinct/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/linstinct/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/linstinct/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо любите свіжо-деревні композиції з готельним характером для кабінету, передпокою чи вітальні.",
    "formulaIntent": "Перець і бергамот задають напрям, а кедр, ветивер і лабданум утримують сухий деревний характер.",
    "insights": {
          "aura": "Впевнена деревно-пряна атмосфера",
          "season": "Універсальний · холодний сезон",
          "zones": "Кабінет · showroom · передпокій",
          "comfort": "Виразний характер для просторих зон",
          "evolution": "Бергамот і перець звучать енергійно, а з часом кедр, ветивер і лабданум формують суху деревну основу."
    },
    "similar": [
      "old-money",
      "moss-and-shadow"
    ]
  },
  {
    "id": "mineral-salt",
    "name": "Mineral Salt",
    "collection": "premium",
    "shortDescription": "Морська сіль і шавлія з чистою атмосферою luxury SPA.",
    "character": [
      "clean",
      "fresh",
      "spa"
    ],
    "room": [
      "bathroom",
      "bedroom"
    ],
    "mood": [
          "calm"
    ],
    "scales": {
      "freshness": 10,
      "warmth": 2,
      "sweetness": 1,
      "woodiness": 3,
      "cleanliness": 10,
      "intensity": 7
    },
    "notes": {
      "top": [
        "Морська сіль",
        "Шавлія"
      ],
      "heart": [
        "Грейпфрут",
        "Амбретта"
      ],
      "base": [
        "Морські водорості"
      ]
    },
    "howToUse": null,
    "badges": [
      "bestseller"
    ],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/mineral-salt/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/mineral-salt/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/mineral-salt/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/mineral-salt/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/mineral-salt/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо шукаєте чисту спа-свіжість для спокою у ванній кімнаті чи спальні.",
    "formulaIntent": "Морська сіль і шавлія підтримані грейпфрутом та м’якою мінеральною базою — свіжість без різкості.",
    "insights": {
          "aura": "Повітряна мінеральна SPA-атмосфера",
          "season": "Весна · літо · універсальний",
          "zones": "Ванна · спальня · SPA · гардероб",
          "comfort": "Свіжий профіль для тривалого використання",
          "evolution": "Морська сіль, шавлія та грейпфрут створюють свіжий старт; пізніше аромат стає глибшим і шовковистішим."
    },
    "similar": [
      "pure-zen",
      "hotel-luxe"
    ]
  },
  {
    "id": "pure-imagination",
    "name": "Pure Imagination",
    "collection": "noir",
    "shortDescription": "Повітряні цитруси й молекулярна глибина для великого простору.",
    "character": [
      "molecular",
      "fresh",
      "clean"
    ],
    "room": [
      "living-room",
      "office"
    ],
    "mood": [
          "hotel"
    ],
    "scales": {
      "freshness": 9,
      "warmth": 3,
      "sweetness": 3,
      "woodiness": 5,
      "cleanliness": 9,
      "intensity": 9
    },
    "notes": {
      "top": [
        "Цитруси",
        "Бергамот"
      ],
      "heart": [
        "Троянда",
        "Жасмин"
      ],
      "base": [
        "Сандал",
        "Пачулі"
      ]
    },
    "howToUse": null,
    "badges": [
      "new"
    ],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/pure-imagination/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/pure-imagination/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/pure-imagination/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/pure-imagination/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/pure-imagination/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо цікавлять молекулярні, чисто-свіжі композиції з готельним характером для вітальні чи кабінету.",
    "formulaIntent": "Цитрусова прозорість швидко наповнює простір, а квітково-деревна база додає композиції об’єму.",
    "insights": {
          "aura": "Об’ємний кришталевий luxury-шлейф",
          "season": "Універсальний",
          "zones": "Вітальня · open-space · lobby · кабінет",
          "comfort": "Найкраще для великого простору",
          "evolution": "Повітряний цитрус дає швидкий room bloom, а троянда, жасмин, сандал і пачулі поступово додають теплу глибину."
    },
    "similar": [
      "silk-molecule",
      "mineral-salt"
    ]
  },
  {
    "id": "silk-molecule",
    "name": "Silk Molecule",
    "collection": "noir",
    "shortDescription": "Шовковистий мускус і шафран з ефектом кашемірового повітря.",
    "character": [
      "molecular",
      "clean",
      "warm"
    ],
    "room": [
      "bedroom",
      "living-room"
    ],
    "mood": [
          "warm-evening"
    ],
    "scales": {
      "freshness": 4,
      "warmth": 7,
      "sweetness": 6,
      "woodiness": 5,
      "cleanliness": 7,
      "intensity": 6
    },
    "notes": {
      "top": [
        "Бергамот",
        "Шафран",
        "Клен",
        "Кориця"
      ],
      "heart": [
        "Фіалка",
        "Конвалія",
        "Молоко",
        "Сандал"
      ],
      "base": [
        "Темний мускус",
        "Пудра",
        "Ветивер",
        "Ваніль",
        "Геліотроп"
      ]
    },
    "howToUse": null,
    "badges": [],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/silk-molecule/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/silk-molecule/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/silk-molecule/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/silk-molecule/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/silk-molecule/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо любите молекулярні, теплі аромати для вечірньої атмосфери у спальні чи вітальні.",
    "formulaIntent": "Шафран, фіалка й темний мускус працюють як єдина текстура — тиха, шовкова та близька до простору.",
    "insights": {
          "aura": "М’яка шовкова аура",
          "season": "Осінь · зима",
          "zones": "Спальня · гардероб · особистий простір",
          "comfort": "Камерна texture-атмосфера",
          "evolution": "Шафран і легкі спеції переходять у кашемірово-мускусну хмару з фіалкою, сандалом та м’якою ваніллю."
    },
    "similar": [
      "pure-imagination",
      "evening-ritual"
    ]
  },
  {
    "id": "the-archive",
    "name": "The Archive",
    "collection": "noir",
    "shortDescription": "Сухий копал і кедр з атмосферою приватної бібліотеки.",
    "character": [
      "woody",
      "molecular"
    ],
    "room": [
      "office",
      "living-room"
    ],
    "mood": [
          "hotel"
    ],
    "scales": {
      "freshness": 4,
      "warmth": 7,
      "sweetness": 2,
      "woodiness": 10,
      "cleanliness": 4,
      "intensity": 7
    },
    "notes": {
      "top": [
        "Бергамот",
        "Лимон"
      ],
      "heart": [
        "Копал",
        "Геліотроп",
        "Дубовий мох",
        "Камфора"
      ],
      "base": [
        "Пачулі",
        "Боби тонка",
        "Амбра",
        "Бензоїн",
        "Кедр"
      ]
    },
    "howToUse": null,
    "badges": [],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/the-archive/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/the-archive/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/the-archive/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/the-archive/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/the-archive/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо шукаєте молекулярно-деревну композицію з готельним характером для кабінету чи вітальні.",
    "formulaIntent": "Копал і кедр з’єднані з прохолодною камфорою та теплою смолистою базою — сухо й інтелектуально.",
    "insights": {
          "aura": "Суха інтелектуальна атмосфера",
          "season": "Осінь · зима",
          "zones": "Бібліотека · кабінет · приватний lounge",
          "comfort": "Нішевий камерний профіль",
          "evolution": "Копал, кедр і прохолодна камфора поступово теплішають, створюючи атмосферу тихої приватної бібліотеки."
    },
    "similar": [
      "old-money",
      "moss-and-shadow"
    ]
  },
  {
    "id": "silent-temple",
    "name": "Silent Temple",
    "collection": "noir",
    "shortDescription": "Хінокі, білий чай і евкаліпт у медитативній тиші.",
    "character": [
      "molecular",
      "clean",
      "woody",
      "fresh"
    ],
    "room": [
      "office",
      "bedroom",
      "bathroom"
    ],
    "mood": [
          "calm"
    ],
    "scales": {
      "freshness": 8,
      "warmth": 4,
      "sweetness": 1,
      "woodiness": 8,
      "cleanliness": 9,
      "intensity": 6
    },
    "notes": {
      "top": [
        "Евкаліпт",
        "Озон",
        "Білий чай"
      ],
      "heart": [
        "Кипарис",
        "Сосна"
      ],
      "base": [
        "Кедр",
        "Амбра",
        "Ялівець"
      ]
    },
    "howToUse": null,
    "badges": [
      "new"
    ],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/silent-temple/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/silent-temple/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/silent-temple/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/silent-temple/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/silent-temple/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо любите молекулярно-деревну свіжість для спокою в кабінеті, спальні чи ванній кімнаті.",
    "formulaIntent": "Білий чай та евкаліпт відкривають композицію, а кипарис, сосна й кедр залишають чисту деревну тишу.",
    "insights": {
          "aura": "Тиха японська temple-атмосфера",
          "season": "Весна · осінь · універсальний",
          "zones": "Кабінет · SPA · спальня · медитація",
          "comfort": "Найспокійніший характер NOIR",
          "evolution": "Евкаліпт, озон і білий чай відкривають композицію; кипарис, сосна й кедр залишають чисту деревну тишу."
    },
    "similar": [
      "moss-and-shadow",
      "pure-zen"
    ]
  },
  {
    "id": "moss-and-shadow",
    "name": "Moss & Shadow",
    "collection": "noir",
    "shortDescription": "Дубовий мох, шавлія й амбра після дощу в лісі.",
    "character": [
      "woody",
      "molecular",
      "fresh"
    ],
    "room": [
      "living-room",
      "office"
    ],
    "mood": [
          "warm-evening"
    ],
    "scales": {
      "freshness": 5,
      "warmth": 6,
      "sweetness": 2,
      "woodiness": 10,
      "cleanliness": 4,
      "intensity": 7
    },
    "notes": {
      "top": [
        "Шавлія",
        "Апельсин",
        "Грейпфрут"
      ],
      "heart": [
        "Лаванда"
      ],
      "base": [
        "Амбра",
        "Боби тонка",
        "Дубовий мох"
      ]
    },
    "howToUse": null,
    "badges": [
      "new"
    ],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/moss-and-shadow/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/moss-and-shadow/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/moss-and-shadow/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/moss-and-shadow/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/moss-and-shadow/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо шукаєте молекулярно-деревну свіжість для вечірньої атмосфери у вітальні чи кабінеті.",
    "formulaIntent": "Дубовий мох, шавлія й амбра формують вологу лісову глибину, яку освітлює стриманий цитрусовий початок.",
    "insights": {
          "aura": "Темна мохова luxury-атмосфера",
          "season": "Осінь · зима",
          "zones": "Кабінет · бібліотека · темний lounge",
          "comfort": "Нішевий природний профіль",
          "evolution": "Шавлія та цитруси поступаються лаванді, дубовому моху й амбрі — ніби повітря після дощу в старому лісі."
    },
    "similar": [
      "silent-temple",
      "the-archive"
    ]
  },
  {
    "id": "dark-bloom",
    "name": "Dark Bloom",
    "collection": "noir",
    "shortDescription": "Темна троянда, слива й лабданум для чуттєвого вечора.",
    "character": [
      "molecular",
      "warm"
    ],
    "room": [
      "bedroom",
      "living-room"
    ],
    "mood": [
          "warm-evening",
          "warm-sweet"
    ],
    "scales": {
      "freshness": 3,
      "warmth": 9,
      "sweetness": 7,
      "woodiness": 5,
      "cleanliness": 3,
      "intensity": 8
    },
    "notes": {
      "top": [
        "Рожевий перець",
        "Грейпфрут",
        "Слива"
      ],
      "heart": [
        "Чорна троянда",
        "Кмин"
      ],
      "base": [
        "Ваніль",
        "Пачулі",
        "Лабданум"
      ]
    },
    "howToUse": null,
    "badges": [
      "new"
    ],
    "popularity": null,
    "images": {
      "main": "images/product-gallery/dark-bloom/hero.webp",
      "gallery": [
        { "type": "hero", "label": "Hero", "src": "images/product-gallery/dark-bloom/hero.webp" },
        { "type": "macro", "label": "Macro", "src": "images/product-gallery/dark-bloom/hero.webp" },
        { "type": "interior", "label": "Interior", "src": "images/product-gallery/dark-bloom/hero.webp" },
        { "type": "detail", "label": "Detail", "src": "images/product-gallery/dark-bloom/hero.webp" }
      ]
    },
    "quickFacts": "3–4 палички для старту",
    "suitFor": "Підійде, якщо любите теплі молекулярні композиції для вечора у спальні чи вітальні.",
    "formulaIntent": "Слива й чорна троянда побудовані на пачулі та лабданумі — темно, оксамитово й без прямої солодкості.",
    "insights": {
          "aura": "Темна квітково-смоляна атмосфера",
          "season": "Осінь · зима · вечір",
          "zones": "Спальня · lounge · темний інтер’єр",
          "comfort": "Виразний вечірній профіль",
          "evolution": "Рожевий перець і слива відкривають композицію; чорна троянда, пачулі та лабданум поступово створюють темну оксамитову ауру."
    },
    "similar": [
      "evening-ritual",
      "forbidden-fruit"
    ]
  }
];

// ---- Lookup helpers ----
function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

function getProductsByCollection(collectionId) {
  return PRODUCTS.filter((p) => p.collection === collectionId);
}

function getProductPrice(product) {
  const collection = getCollection(product.collection);
  return collection ? collection.price : null;
}

function getProductVolume(product) {
  const collection = getCollection(product.collection);
  return collection ? collection.volume : null;
}

function getProductUrl(product) {
  return `products/${product.id}.html`;
}

function getSimilarProducts(product) {
  return (product.similar || []).map(getProduct).filter(Boolean);
}


/* ==========================================================================
   VA HOME — products.js
   Shared rendering helpers for product cards. Reused on the homepage,
   catalog, scent-guide results, and "similar aromas" blocks.
   Contains the single source of truth plus shared product-card rendering helpers.
   ========================================================================== */

(function () {
  "use strict";

  function formatPrice(product) {
    const price = getProductPrice(product);
    return price
      ? `${price}\u00A0грн`
      : null;
  }

  function badgeLabel(badge) {
    switch (badge) {
      case "new":
        return "Новинка";
      case "bestseller":
        return "Bestseller";
      case "limited":
        return "Limited";
      default:
        return null;
    }
  }

  /**
   * @param {object} product - entry from PRODUCTS
   * @param {string} root - "" on top-level pages, "" also works from index
   *                         since product cards on the homepage link INTO
   *                         /products/, while pages inside /products/ that
   *                         show "similar" cards must link to siblings.
   * @param {object} opts - { context: "home" | "catalog" | "product" }
   */
  function renderProductCard(product, root, opts) {
    opts = opts || {};
    const context = opts.context || "home";
    const price = formatPrice(product);
    const volume = getProductVolume(product);
    const collection = getCollection(product.collection);

    // Link target depends on where the card is rendered from.
    const href =
      context === "product"
        ? `${product.id}.html`
        : `products/${product.id}.html`;

    // Images always live at /images/ from the site root. On product pages
    // (context "product"), the page itself is one folder deep in /products/,
    // so image paths need an extra "../" regardless of the href root.
    const imgRoot = context === "product" ? "../" : root;
    const hasImage = product.images && product.images.main;
    const mediaMarkup = hasImage
      ? `<img src="${imgRoot}${product.images.main}" alt="${product.name} — аромадифузор VA HOME" loading="lazy" decoding="async" fetchpriority="low" width="480" height="600" onerror="this.closest('.product-card__media').classList.add('placeholder-media');this.remove();">`
      : `<div class="placeholder-media">${product.name}</div>`;

    const badges = (product.badges || [])
      .map(badgeLabel)
      .filter(Boolean)
      .map((label) => `<span class="badge badge--${label === "Новинка" ? "new" : label === "Bestseller" ? "bestseller" : "limited"}">${label}</span>`)
      .join("");

    return `
      <article class="product-card" data-product-id="${product.id}">
        <a href="${root}${href}" class="product-card__media media-zoom" aria-label="${product.name}">
          ${badges ? `<div class="product-card__badges">${badges}</div>` : ""}
          ${mediaMarkup}
        </a>
        <div class="product-card__body">
          <span class="product-card__collection">${collection ? collection.name : ""}</span>
          <a href="${root}${href}"><h3 class="product-card__name">${product.name}</h3></a>
          <p class="product-card__desc">${product.shortDescription}</p>
          <div class="product-card__rating" data-product-rating aria-label="Рейтинг товару">Без відгуків</div>
          <div class="product-card__meta">
            <span>${volume || ""}</span>
            ${
              price
                ? `<span class="product-card__price">${price}</span>`
                : `<span class="product-card__price product-card__price--tbd">Ціну уточнюємо</span>`
            }
          </div>
        </div>
        <div class="product-card__actions">
          <a href="${root}${href}" class="btn btn-secondary btn-block">Детальніше</a>
          ${
            price
              ? `<button type="button" class="btn btn-primary product-card__cart-btn${context === "home" ? " product-card__quick-add" : ""}" data-add-to-cart="${product.id}" aria-label="Додати ${product.name} у кошик">${context === "home" ? '<span>До кошика</span>' : ''}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 8.5h11l-.9 10.2a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3L6.5 8.5z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/></svg></button>`
              : ""
          }
        </div>
      </article>
    `;
  }

  function renderProductGrid(containerSelector, products, root, opts) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    container.innerHTML = products
      .map((p) => renderProductCard(p, root, opts))
      .join("");
    document.dispatchEvent(new CustomEvent("vahome:products-rendered"));
  }

  window.VAHomeProducts = {
    renderProductCard,
    renderProductGrid,
    formatPrice
  };
})();

// Public read-only access for shared storefront modules.
window.PRODUCTS = PRODUCTS;
window.COLLECTIONS = COLLECTIONS;
window.getCollection = getCollection;
