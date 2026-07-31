(function () {
  "use strict";

  const MAX_HOME_REVIEWS = 5;

  const esc = (value) => String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);

  const trimReview = (value, max) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= max) return text;
    const cut = text.slice(0, max - 1).replace(/\s+\S*$/u, "").trim();
    return `${cut || text.slice(0, max - 1).trim()}…`;
  };

  const pluralUk = (number, one, few, many) => {
    const value = Math.abs(Number(number) || 0);
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  };

  const newestFirst = (a, b) => {
    const aTime = Date.parse(a?.created_at || "") || 0;
    const bTime = Date.parse(b?.created_at || "") || 0;
    return bTime - aTime;
  };

  const selectShowcase = (rows) => {
    const candidates = rows
      .filter((row) => row && row.photo_url && row.review_text)
      .sort(newestFirst);

    const selected = [];
    const selectedRows = new Set();
    const usedProducts = new Set();

    const add = (row) => {
      if (!row || selectedRows.has(row) || selected.length >= MAX_HOME_REVIEWS) return;
      selected.push(row);
      selectedRows.add(row);
      if (row.product_slug) usedProducts.add(row.product_slug);
    };

    // First: recent verified purchases from different fragrances.
    candidates.forEach((row) => {
      if (row.verified_purchase && !usedProducts.has(row.product_slug)) add(row);
    });

    // Second: keep the selection varied even when a review is not verified yet.
    candidates.forEach((row) => {
      if (!usedProducts.has(row.product_slug)) add(row);
    });

    // Last: fill remaining places with the newest photo reviews.
    candidates.forEach(add);

    return selected.slice(0, MAX_HOME_REVIEWS);
  };

  const reviewLimitForIndex = (index) => {
    if (index < 2) return 112;
    if (index === 4) return 86;
    return 66;
  };

  const verifiedIcon = `<svg aria-hidden="true" viewBox="0 0 20 20"><path d="m6.6 10.2 2.1 2.1 4.8-5"/><path d="M10 2.4 12 3.7l2.4-.1.8 2.3 2 1.4-.8 2.2.8 2.2-2 1.4-.8 2.3-2.4-.1-2 1.3-2-1.3-2.4.1-.8-2.3-2-1.4.8-2.2-.8-2.2 2-1.4.8-2.3 2.4.1L10 2.4Z"/></svg>`;

  const preloadPhoto = (src) => new Promise((resolve) => {
    if (!src) return resolve(false);
    const image = new Image();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), 12000);
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.decoding = "async";
    image.src = src;
  });

  const rowSignature = (row) => [
    row?.product_slug || "",
    row?.photo_url || "",
    row?.customer_name || "",
    String(row?.review_text || "").replace(/\s+/g, " ").trim(),
    row?.verified_purchase ? "1" : "0"
  ].join("|");

  const gridSignature = (grid) => Array.from(grid.querySelectorAll(".home-review-card")).map((card) => [
    card.getAttribute("href") || "",
    card.querySelector("img")?.getAttribute("src") || "",
    card.querySelector(".home-review-card__product")?.textContent?.trim() || "",
    card.querySelector(".home-review-card__overlay p")?.textContent?.replace(/\s+/g, " ").trim() || "",
    card.querySelector("footer strong")?.textContent?.trim() || ""
  ].join("|")).join("||");

  document.addEventListener("DOMContentLoaded", async () => {
    const section = document.getElementById("homeReviewsSection");
    const grid = document.getElementById("homeReviewsGrid");
    const prev = document.getElementById("homeReviewsPrev");
    const next = document.getElementById("homeReviewsNext");
    const dots = document.getElementById("homeReviewsDots");
    const proof = document.getElementById("homeReviewsProof");
    const api = window.VAHomeSupabase;

    if (!section || !grid || !prev || !next || !dots || !proof) return;

    try {
      let allRows = [];
      if (api && typeof api.getApprovedReviews === "function") {
        allRows = await api.getApprovedReviews();
      } else if (api && typeof api.getRecentApprovedReviews === "function") {
        allRows = await api.getRecentApprovedReviews(12);
      }

      allRows = Array.isArray(allRows) ? allRows.filter(Boolean) : [];
      const selectedRows = selectShowcase(allRows);
      if (!selectedRows.length) return;

      // Keep the server-rendered cards visible while remote photos are warming the browser cache.
      // This prevents a loaded review card from turning into a black placeholder after API refresh.
      const readiness = await Promise.all(selectedRows.map(async (row) => ({ row, ready: await preloadPhoto(row.photo_url) })));
      const rows = readiness.filter((item) => item.ready).map((item) => item.row);
      if (!rows.length) return;

      const renderedRows = rows.map((row, index) => {
        const product = typeof window.getProduct === "function" ? window.getProduct(row.product_slug) : null;
        const productName = esc(product?.name || row.product_slug || "VA HOME");
        const href = product ? `products/${esc(product.id)}.html#reviews` : "catalog.html";
        const name = esc(row.customer_name || "Клієнт VA HOME");
        const review = esc(trimReview(row.review_text, reviewLimitForIndex(index)));
        const verified = Boolean(row.verified_purchase);
        const eager = index < 2;

        return `<a class="home-review-card home-review-card--${index + 1}" href="${href}" aria-label="Відгук ${name} про ${productName}" data-review-signature="${esc(rowSignature(row))}">
          <img class="home-review-card__photo" src="${esc(row.photo_url)}" alt="Фото клієнта до відгуку про ${productName}" width="800" height="1000" loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ' fetchpriority="high"' : ""}>
          <span class="home-review-card__product">${productName}</span>
          <div class="home-review-card__overlay">
            <p>${review}</p>
            <footer>
              <strong>${name}</strong>
              ${verified ? `<span class="home-review-card__verified">${verifiedIcon}<span>Підтверджена покупка</span></span>` : ""}
            </footer>
          </div>
        </a>`;
      }).join("");

      const staging = document.createElement("div");
      staging.innerHTML = renderedRows;
      const desiredSignature = gridSignature(staging);
      if (desiredSignature !== gridSignature(grid)) {
        grid.className = `home-reviews__grid home-reviews__grid--${rows.length}`;
        grid.innerHTML = renderedRows;
      }

      let cards = Array.from(grid.querySelectorAll(".home-review-card"));
      cards.forEach((card) => {
        const image = card.querySelector("img");
        image?.addEventListener("error", () => {
          card.remove();
          cards = Array.from(grid.querySelectorAll(".home-review-card"));
          grid.className = `home-reviews__grid home-reviews__grid--${cards.length}`;
          buildDots();
          if (!cards.length) section.hidden = true;
        }, { once: true });
      });

      const ratings = allRows.map((row) => Number(row.rating)).filter((rating) => rating >= 1 && rating <= 5);
      const average = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
      const verifiedCount = allRows.filter((row) => row.verified_purchase).length;
      const photoCount = allRows.filter((row) => row.photo_url).length;

      const metrics = [
        {
          value: allRows.length,
          label: pluralUk(allRows.length, "опублікований відгук", "опубліковані відгуки", "опублікованих відгуків")
        },
        ...(average ? [{ value: average.toLocaleString("uk-UA", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), suffix: "/5", label: "середня оцінка" }] : []),
        verifiedCount ? {
          value: verifiedCount,
          label: pluralUk(verifiedCount, "підтверджена покупка", "підтверджені покупки", "підтверджених покупок")
        } : {
          value: photoCount,
          label: pluralUk(photoCount, "відгук із фото", "відгуки із фото", "відгуків із фото")
        }
      ];

      proof.innerHTML = metrics.map((metric) => `<div class="home-reviews__proof-item">
        <strong>${esc(metric.value)}${metric.suffix || ""}</strong>
        <span>${esc(metric.label)}</span>
      </div>`).join("");

      const isScrollable = () => grid.scrollWidth > grid.clientWidth + 4;
      const getStep = () => {
        const firstCard = grid.querySelector(".home-review-card");
        if (!firstCard) return 1;
        const style = getComputedStyle(grid);
        const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
        return firstCard.getBoundingClientRect().width + gap;
      };

      const updateNav = () => {
        const max = Math.max(0, grid.scrollWidth - grid.clientWidth);
        const scrollable = isScrollable();
        prev.disabled = !scrollable || grid.scrollLeft < 8;
        next.disabled = !scrollable || grid.scrollLeft > max - 8;
        const index = Math.max(0, Math.min(cards.length - 1, Math.round(grid.scrollLeft / getStep())));
        Array.from(dots.children).forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === index));
      };

      function buildDots() {
        cards = Array.from(grid.querySelectorAll(".home-review-card"));
        const scrollable = isScrollable();
        dots.innerHTML = scrollable
          ? cards.map((_, index) => `<button type="button" class="${index === 0 ? "is-active" : ""}" data-index="${index}" aria-label="Показати відгук ${index + 1}"></button>`).join("")
          : "";
        dots.querySelectorAll("button").forEach((dot) => dot.addEventListener("click", () => {
          grid.scrollTo({ left: Number(dot.dataset.index) * getStep(), behavior: "smooth" });
        }));
        updateNav();
      }

      const move = (direction) => grid.scrollBy({ left: direction * getStep(), behavior: "smooth" });
      prev.addEventListener("click", () => move(-1));
      next.addEventListener("click", () => move(1));
      grid.addEventListener("scroll", () => requestAnimationFrame(updateNav), { passive: true });
      window.addEventListener("resize", () => requestAnimationFrame(buildDots), { passive: true });

      section.hidden = false;
      requestAnimationFrame(buildDots);
    } catch (error) {
      section.hidden = !grid.querySelector(".home-review-card");
    }
  });
})();
