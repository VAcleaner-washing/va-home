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
      "main": "images/products/signature-relax.webp",
      "gallery": []
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
      "main": "images/products/forbidden-fruit.webp",
      "gallery": []
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
      "main": "images/products/doux-moment.webp",
      "gallery": []
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
      "main": "images/products/wild-berry-way.webp",
      "gallery": []
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
      "main": "images/products/hotel-spring.webp",
      "gallery": []
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
      "main": "images/products/evening-ritual.webp",
      "gallery": []
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
      "main": "images/products/velvet-spa.webp",
      "gallery": []
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
      "main": "images/products/pure-zen.webp",
      "gallery": []
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
      "main": "images/products/hotel-luxe.webp",
      "gallery": []
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
      "main": "images/products/old-money.webp",
      "gallery": []
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
      "main": "images/products/linstinct.webp",
      "gallery": []
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
      "main": "images/products/mineral-salt.webp",
      "gallery": []
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
      "main": "images/products/pure-imagination.webp",
      "gallery": []
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
      "main": "images/products/silk-molecule.webp",
      "gallery": []
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
      "main": "images/products/the-archive.webp",
      "gallery": []
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
      "main": "images/products/silent-temple.webp",
      "gallery": []
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
      "main": "images/products/moss-and-shadow.webp",
      "gallery": []
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
      "main": "images/products/dark-bloom.webp",
      "gallery": []
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
