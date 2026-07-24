(() => {
  'use strict';

  const KEY = 'vahome_compare_v1';
  const MAX = 3;
  const root = location.pathname.includes('/products/') ? '../' : '';

  const chars = {
    clean: 'Чистий', fresh: 'Свіжий', warm: 'Теплий', fruity: 'Фруктовий',
    woody: 'Деревний', floral: 'Квітковий', mineral: 'Мінеральний',
    molecular: 'Молекулярний', spicy: 'Пряний', sweet: 'Солодкий', smoky: 'Димний'
  };
  const rooms = {
    'living-room': 'Вітальня', bedroom: 'Спальня', office: 'Кабінет',
    hallway: 'Передпокій', bathroom: 'Ванна'
  };
  const moods = {
    calm: 'Спокій', 'warm-evening': 'Теплий вечір', 'warm-sweet': 'Затишок',
    spa: 'SPA', hotel: 'Luxury hotel', modern: 'Сучасний простір', focus: 'Фокус'
  };

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
  const products = () => Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
  const byId = (id) => products().find((product) => product.id === id);
  const collection = (product) => typeof window.getCollection === 'function'
    ? window.getCollection(product.collection)
    : null;

  let selected = read();
  let currentTab = 'character';

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]').filter(Boolean).slice(0, MAX);
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(selected));
    renderDock();
    syncButtons();
  }

  function toggle(id) {
    if (selected.includes(id)) {
      selected = selected.filter((item) => item !== id);
    } else {
      if (selected.length >= MAX) {
        openModal();
        return;
      }
      selected.push(id);
    }
    save();
  }

  function productIdFromPage() {
    const match = location.pathname.match(/\/products\/([^/.]+)\.html/);
    return match ? match[1] : null;
  }

  function addButton(host, id, extraClass = '') {
    if (!host || host.querySelector(`.va-compare-add[data-compare-id="${id}"]`)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `va-compare-add ${extraClass}`.trim();
    button.dataset.compareId = id;
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M8 6h12M4 6h.01M8 12h12M4 12h.01M8 18h12M4 18h.01"/>
      </svg>
      <span>Порівняти</span>`;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle(id);
    });
    host.appendChild(button);
  }

  function enhance() {
    document.querySelectorAll('.product-card').forEach((card) => {
      let id = card.dataset.productId;
      if (!id) {
        const link = card.querySelector('a[href*="products/"], a[href$=".html"]');
        const match = link?.getAttribute('href')?.match(/(?:products\/)?([^/]+)\.html/);
        id = match?.[1];
      }
      if (id && byId(id)) addButton(card.querySelector('.product-card__body') || card, id);
    });

    const id = productIdFromPage();
    if (id && byId(id)) {
      const host = document.querySelector('.product-hero__actions,.product-actions,.product-buy,.product-info');
      addButton(host, id, 'va-compare-product-btn');
    }
  }

  function syncButtons() {
    document.querySelectorAll('[data-compare-id]').forEach((button) => {
      const active = selected.includes(button.dataset.compareId);
      button.classList.toggle('is-active', active);
      const label = button.querySelector('span');
      if (label) label.textContent = active ? 'У порівнянні' : 'Порівняти';
    });
  }

  function ensureDock() {
    if (document.querySelector('.va-compare-dock')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="va-compare-dock" aria-live="polite">
        <span class="va-compare-dock__label">Порівняння</span>
        <div class="va-compare-dock__thumbs"></div>
        <button class="va-compare-dock__open" type="button">Відкрити</button>
        <button class="va-compare-dock__clear" type="button" aria-label="Очистити порівняння">×</button>
      </div>`);
    const dock = document.querySelector('.va-compare-dock');
    dock.querySelector('.va-compare-dock__open').addEventListener('click', openModal);
    dock.querySelector('.va-compare-dock__clear').addEventListener('click', () => {
      selected = [];
      save();
    });
  }

  function renderDock() {
    ensureDock();
    const dock = document.querySelector('.va-compare-dock');
    dock.classList.toggle('is-visible', selected.length > 0);
    dock.querySelector('.va-compare-dock__thumbs').innerHTML = selected.map((id) => {
      const product = byId(id);
      return product ? `<img class="va-compare-dock__thumb" src="${root}${esc(compareImage(product))}" alt="">` : '';
    }).join('');
    dock.querySelector('.va-compare-dock__open').textContent = selected.length < 2
      ? `Обрано ${selected.length} · додайте ще`
      : `Порівняти ${selected.length}`;
  }

  function ensureModal() {
    if (document.querySelector('.va-compare-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <section class="va-compare-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Порівняння ароматів">
        <div class="va-compare-modal__inner">
          <header class="va-compare-modal__top">
            <div>
              <p class="va-compare-modal__eyebrow">VA HOME · SCENT COMPARISON</p>
              <h2 class="va-compare-modal__title">Відчуйте різницю.</h2>
            </div>
            <button class="va-compare-modal__close" type="button" aria-label="Закрити">×</button>
          </header>
          <nav class="va-compare-tabs" aria-label="Розділи порівняння">
            <button class="va-compare-tab is-active" data-tab="character" type="button">Характер</button>
            <button class="va-compare-tab" data-tab="performance" type="button">Звучання</button>
            <button class="va-compare-tab" data-tab="notes" type="button">Ноти</button>
          </nav>
          <div class="va-compare-content"></div>
        </div>
      </section>`);

    const modal = document.querySelector('.va-compare-modal');
    modal.querySelector('.va-compare-modal__close').addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
    modal.querySelectorAll('.va-compare-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        modal.querySelectorAll('.va-compare-tab').forEach((item) => {
          item.classList.toggle('is-active', item === tab);
        });
        modal.querySelectorAll('.va-compare-panel').forEach((panel) => {
          panel.classList.toggle('is-active', panel.dataset.panel === currentTab);
        });
      });
    });
  }

  function openModal() {
    if (selected.length >= 2) {
      window.location.href = `${root}compare.html`;
      return;
    }
    ensureModal();
    renderModal();
    const modal = document.querySelector('.va-compare-modal');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('va-compare-lock');
  }

  function closeModal() {
    const modal = document.querySelector('.va-compare-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('va-compare-lock');
  }

  function tags(items, dictionary, limit = 3) {
    const values = (items || []).slice(0, limit);
    if (!values.length) return '<span class="va-compare-tag">Стриманий</span>';
    return values.map((item) => `<span class="va-compare-tag">${esc(dictionary[item] || item)}</span>`).join('');
  }

  function scale(product, key) {
    const value = Math.max(0, Math.min(10, Number(product.scales?.[key]) || 0));
    return `<div class="va-compare-scale" aria-label="${value} з 10">
      ${Array.from({ length: 10 }, (_, index) => `<i class="${index < value ? 'is-filled' : ''}"></i>`).join('')}
    </div>`;
  }


  function compareImage(product) {
    return `images/product-story/${product.id}/macro.webp`;
  }

  function compareImageAlt(product) {
    return product?.images?.main || `images/product-gallery/${product.id}/hero.webp`;
  }

  function compareImageFallback(product) {
    return `images/product-gallery/${product.id}/hero.webp`;
  }

  function compactRooms(product) {
    return (product.room || []).slice(0, 3).map((item) => rooms[item] || item).join(' · ') || 'Універсальний простір';
  }

  function card(product) {
    const group = collection(product) || {};
    const notes = product.notes || {};
    const atmosphere = product.insights?.aura
      || product.mood?.slice(0, 2).map((item) => moods[item] || item).join(' · ')
      || 'Авторська атмосфера';

    return `
      <article class="va-compare-card va-compare-card--dossier">
        <div class="va-compare-card__identity va-compare-card__identity--portrait">
          <div class="va-compare-card__copy">
            <div class="va-compare-card__heading">
              <p class="va-compare-card__collection">${esc(group.name || product.collection)}</p>
              <button class="va-compare-card__remove" data-remove="${product.id}" type="button" aria-label="Прибрати ${esc(product.name)}">×</button>
            </div>
            <span class="va-compare-card__number">SCENT ${String(selected.indexOf(product.id) + 1).padStart(2, '0')}</span>
            <h3 class="va-compare-card__name">${esc(product.name)}</h3>
            <div class="va-compare-card__meta">
              <span>${esc(group.volume || '100 мл')}</span>
              <strong>${esc(group.price || '—')} грн</strong>
            </div>
          </div>
          <figure class="va-compare-card__portrait">
            <img class="va-compare-card__portrait-image" src="${root}${esc(compareImage(product))}" data-alt-src="${root}${esc(compareImageAlt(product))}" data-fallback-src="${root}${esc(compareImageFallback(product))}" alt="Макродеталь ${esc(product.name)}" loading="eager" decoding="auto" fetchpriority="low">
            <figcaption>OLFACTIVE PORTRAIT</figcaption>
          </figure>
        </div>

        <div class="va-compare-panel ${currentTab === 'character' ? 'is-active' : ''}" data-panel="character">
          <section class="va-compare-block">
            <p class="va-compare-label">Характер</p>
            <div class="va-compare-tags">${tags(product.character, chars)}</div>
          </section>
          <section class="va-compare-block va-compare-block--statement">
            <p class="va-compare-label">Атмосфера</p>
            <p class="va-compare-statement">${esc(atmosphere)}</p>
          </section>
          <section class="va-compare-block">
            <p class="va-compare-label">Найкраще звучить</p>
            <p class="va-compare-value">${esc(compactRooms(product))}</p>
          </section>
        </div>

        <div class="va-compare-panel ${currentTab === 'performance' ? 'is-active' : ''}" data-panel="performance">
          <section class="va-compare-meter"><div><span>Свіжість</span>${scale(product, 'freshness')}</div></section>
          <section class="va-compare-meter"><div><span>Теплота</span>${scale(product, 'warmth')}</div></section>
          <section class="va-compare-meter"><div><span>Деревність</span>${scale(product, 'woodiness')}</div></section>
          <section class="va-compare-meter"><div><span>Інтенсивність</span>${scale(product, 'intensity')}</div></section>
          <section class="va-compare-block va-compare-block--compact">
            <p class="va-compare-label">Рекомендований старт</p>
            <p class="va-compare-value">${esc(product.quickFacts || '3–4 палички')}</p>
          </section>
        </div>

        <div class="va-compare-panel ${currentTab === 'notes' ? 'is-active' : ''}" data-panel="notes">
          <div class="va-compare-note"><small>Верх</small><span>${esc((notes.top || []).join(' · ') || '—')}</span></div>
          <div class="va-compare-note"><small>Серце</small><span>${esc((notes.heart || []).join(' · ') || '—')}</span></div>
          <div class="va-compare-note"><small>База</small><span>${esc((notes.base || []).join(' · ') || '—')}</span></div>
        </div>

        <div class="va-compare-card__actions">
          <a class="va-compare-link" href="${root}products/${product.id}.html">Детальніше</a>
          <button class="va-compare-buy" type="button" data-compare-cart="${product.id}">Обрати аромат</button>
        </div>
      </article>`;
  }

  function renderModal() {
    const box = document.querySelector('.va-compare-content');
    const chosen = selected.map(byId).filter(Boolean);

    if (chosen.length < 2) {
      box.innerHTML = `<div class="va-compare-empty">
        <p class="va-compare-modal__eyebrow">SCENT COMPARISON</p>
        <h3>Додайте ще один аромат.</h3>
        <p>Порівняння розкривається, коли обрано щонайменше дві композиції.</p>
      </div>`;
      return;
    }

    box.innerHTML = `<div class="va-compare-grid" style="--compare-count:${chosen.length}">${chosen.map(card).join('')}</div>`;

    box.querySelectorAll('.va-compare-card__portrait-image').forEach((image) => {
      image.addEventListener('error', () => {
        const alt = image.dataset.altSrc;
        const fallback = image.dataset.fallbackSrc;
        if (!image.dataset.triedAlt && alt && image.src !== alt) {
          image.dataset.triedAlt = '1';
          image.src = alt;
          return;
        }
        if (!image.dataset.triedFallback && fallback && image.src !== fallback) {
          image.dataset.triedFallback = '1';
          image.src = fallback;
        }
      });
    });

    box.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        selected = selected.filter((item) => item !== button.dataset.remove);
        save();
        renderModal();
      });
    });

    box.querySelectorAll('[data-compare-cart]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.compareCart;
        const existing = document.querySelector(`[data-add-to-cart="${id}"]`);
        if (existing) existing.click();
        else if (window.VACart?.addItem) window.VACart.addItem(id, 1);
        button.textContent = 'Додано до кошика';
        button.classList.add('is-added');
        setTimeout(() => {
          button.textContent = 'Обрати аромат';
          button.classList.remove('is-added');
        }, 1400);
      });
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  document.addEventListener('DOMContentLoaded', () => {
    enhance();
    ensureDock();
    renderDock();
    syncButtons();
    setTimeout(enhance, 500);
    document.addEventListener('vahome:products-rendered', () => {
      requestAnimationFrame(() => { enhance(); syncButtons(); renderDock(); });
    });
  });
})();
