/* ==========================================================================
   VA HOME — Deterministic product story gallery
   Product pages use only images/product-story/<id>/. No image fallbacks.
   ========================================================================== */
(function () {
  "use strict";

  const TYPE_LABELS = {
    hero: "Головне фото",
    interior: "Фото в інтер’єрі",
    macro: "Макрофото",
    detail: "Деталь"
  };

  const AUTO_GROUPS = [
    { type: "hero", files: ["hero.webp"] },
    { type: "interior", prefix: "interior-", max: 12 },
    { type: "macro", prefix: "macro-", max: 12 },
    { type: "detail", prefix: "detail-", max: 12 }
  ];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
  }

  function normalizePath(root, src) {
    if (!src) return "";
    if (/^(?:https?:)?\/\//i.test(src) || src.startsWith("data:") || src.startsWith("blob:")) return src;
    return `${root}${src}`;
  }

  function canLoad(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = src;
    });
  }

  function makeAutomaticCandidates(product, root) {
    const productId = product?.id;
    if (!productId) return [];
    const candidates = [];

    // New unified nine-image product story. These four files also power the hero gallery.
    const storyBase = `${root}images/product-story/${productId}/`;
    [
      ["hero", ["hero.webp"]],
      ["interior", ["interior.webp"]],
      ["macro", ["macro.webp"]],
      ["detail", ["detail.webp"]]
    ].forEach(([type, filenames], index) => {
      filenames.forEach((filename) => {
        candidates.push({
          type,
          label: TYPE_LABELS[type] || `Фото ${index + 1}`,
          src: `${storyBase}${filename}`,
          automatic: true,
          source: "product-story"
        });
      });
    });

    return candidates;
  }

  function normalizeProvidedItems(items, root) {
    return (Array.isArray(items) ? items : [])
      .filter((item) => item && item.src)
      .map((item, index) => ({
        type: item.type || (index === 0 ? "hero" : "detail"),
        label: item.label || TYPE_LABELS[item.type] || `Фото ${index + 1}`,
        src: normalizePath(root, item.src),
        automatic: false
      }));
  }

  async function resolveGallery(product, items, root) {
    // The declared product-story files are authoritative. Missing files remain visible content errors.
    return normalizeProvidedItems(items, root);
  }

  async function mount({ product, items, root = "" }) {
    const media = document.getElementById("productMedia");
    let mainImage = document.getElementById("productMainImage");
    const strip = document.getElementById("productGalleryThumbs");
    if (!media || !strip) return;

    if (!mainImage || !media.contains(mainImage)) {
      mainImage = document.createElement("img");
      mainImage.id = "productMainImage";
      mainImage.loading = "eager";
      mainImage.decoding = "async";
      mainImage.fetchPriority = "high";
      mainImage.width = 600;
      mainImage.height = 750;
      media.appendChild(mainImage);
    }

    const gallery = await resolveGallery(product, items, root);
    if (!gallery.length) {
      mainImage.removeAttribute("src");
      mainImage.style.visibility = "hidden";
      media.dataset.storyEmpty = "true";
      strip.replaceChildren();
      return;
    }

    mainImage.style.removeProperty("visibility");
    mainImage.removeAttribute("data-product-story-empty");
    media.removeAttribute("data-story-empty");

    let current = 0;
    let autoplayTimer = null;
    let startX = null;
    let transitionToken = 0;

    let transitionImage = media.querySelector(".product-main-image-transition");
    if (!transitionImage) {
      transitionImage = document.createElement("img");
      transitionImage.className = "product-main-image-transition";
      transitionImage.alt = "";
      transitionImage.decoding = "async";
      transitionImage.setAttribute("aria-hidden", "true");
      media.appendChild(transitionImage);
    }

    // Ambient background: a blurred copy of the active gallery image sits
    // beneath the sharp image and crossfades in sync with every 6-second slide.
    let ambientStage = media.querySelector(".product-gallery-ambient");
    if (!ambientStage) {
      ambientStage = document.createElement("div");
      ambientStage.className = "product-gallery-ambient";
      ambientStage.setAttribute("aria-hidden", "true");
      ambientStage.innerHTML = '<span class="product-gallery-ambient__layer is-active"></span><span class="product-gallery-ambient__layer"></span>';
      media.prepend(ambientStage);
    }
    const ambientLayers = Array.from(ambientStage.querySelectorAll(".product-gallery-ambient__layer"));
    let activeAmbientLayer = Math.max(0, ambientLayers.findIndex((layer) => layer.classList.contains("is-active")));

    function setAmbient(src, animate = true) {
      if (!src || ambientLayers.length < 2) return;
      const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const nextIndex = animate && !reducedMotion ? 1 - activeAmbientLayer : activeAmbientLayer;
      const nextLayer = ambientLayers[nextIndex];
      const currentLayer = ambientLayers[activeAmbientLayer];
      nextLayer.style.backgroundImage = `url("${String(src).replace(/"/g, '\"')}")`;

      if (!animate || reducedMotion) {
        ambientLayers.forEach((layer, index) => layer.classList.toggle("is-active", index === nextIndex));
        activeAmbientLayer = nextIndex;
        return;
      }

      requestAnimationFrame(() => requestAnimationFrame(() => {
        nextLayer.classList.add("is-active");
        currentLayer.classList.remove("is-active");
        activeAmbientLayer = nextIndex;
      }));
    }

    media.classList.add("product-image-switcher", "product-image-switcher--ambient");
    media.removeAttribute("role");
    media.removeAttribute("tabindex");
    media.removeAttribute("aria-label");

    strip.innerHTML = gallery.map((item, index) => `
      <button type="button" class="product-gallery-thumb${index === 0 ? " is-active" : ""}"
        data-gallery-index="${index}"
        aria-label="${escapeHtml(item.label)}: фото ${index + 1} з ${gallery.length}"
        aria-current="${index === 0 ? "true" : "false"}">
        <img src="${escapeHtml(item.src)}" alt="" loading="eager" decoding="auto">
      </button>`).join("");
    strip.classList.toggle("has-multiple", gallery.length > 1);

    function updateThumbs() {
      strip.querySelectorAll(".product-gallery-thumb").forEach((thumb) => {
        const index = Number(thumb.dataset.galleryIndex);
        const active = index === current;
        thumb.classList.toggle("is-active", active);
        thumb.setAttribute("aria-current", active ? "true" : "false");
      });
    }

    function show(index, animate = true) {
      current = (index + gallery.length) % gallery.length;
      const item = gallery[current];
      const token = ++transitionToken;
      updateThumbs();
      setAmbient(item.src, animate);

      const applyDirectly = () => {
        mainImage.src = item.src;
        mainImage.alt = `${product.name} — ${item.label}`;
        mainImage.dataset.galleryIndex = String(current);
        transitionImage.classList.remove("is-visible");
        transitionImage.removeAttribute("src");
      };

      if (!animate || !mainImage.src || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        applyDirectly();
        return;
      }

      const preload = new Image();
      preload.onload = () => {
        if (token !== transitionToken) return;
        transitionImage.src = item.src;
        transitionImage.alt = `${product.name} — ${item.label}`;
        requestAnimationFrame(() => requestAnimationFrame(() => transitionImage.classList.add("is-visible")));
        window.setTimeout(() => {
          if (token !== transitionToken) return;
          mainImage.src = item.src;
          mainImage.alt = `${product.name} — ${item.label}`;
          mainImage.dataset.galleryIndex = String(current);
          transitionImage.classList.remove("is-visible");
          window.setTimeout(() => {
            if (token === transitionToken) transitionImage.removeAttribute("src");
          }, 980);
        }, 900);
      };
      preload.onerror = () => {
        const failedIndex = gallery.findIndex((entry) => entry === item);
        if (failedIndex !== -1) gallery.splice(failedIndex, 1);

        if (gallery.length) {
          current = Math.min(current, gallery.length - 1);
          mount({
            product,
            items: gallery.map((entry) => ({
              ...entry,
              src: entry.src.startsWith(root) ? entry.src.slice(root.length) : entry.src
            })),
            root
          });
          return;
        }

        mainImage.removeAttribute("src");
        mainImage.alt = `${product.name} — фото тимчасово відсутнє`;
        mainImage.closest(".product-gallery")?.classList.add("product-gallery--missing");
        strip.replaceChildren();
      };
      preload.src = item.src;
    }

    const AUTOPLAY_DELAY = 6000;

    function stopAutoplay() {
      if (autoplayTimer) window.clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }

    function scheduleAutoplay() {
      stopAutoplay();
      if (gallery.length < 2 || document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      autoplayTimer = window.setTimeout(() => {
        show(current + 1);
        scheduleAutoplay();
      }, AUTOPLAY_DELAY);
    }

    function restartAutoplay() {
      stopAutoplay();
      scheduleAutoplay();
    }

    strip.onclick = (event) => {
      const thumb = event.target.closest("[data-gallery-index]");
      if (!thumb) return;
      show(Number(thumb.dataset.galleryIndex));
      restartAutoplay();
    };

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAutoplay();
      else scheduleAutoplay();
    });

    media.onpointerdown = (event) => {
      startX = event.clientX ?? event.touches?.[0]?.clientX ?? null;
    };
    media.onpointerup = (event) => {
      if (startX == null || gallery.length < 2) return;
      const endX = event.clientX ?? event.changedTouches?.[0]?.clientX ?? startX;
      const delta = endX - startX;
      startX = null;
      if (Math.abs(delta) > 45) {
        show(current + (delta > 0 ? -1 : 1));
        restartAutoplay();
      }
    };

    mainImage.loading = "eager";
    mainImage.fetchPriority = "high";
    show(0, false);
    scheduleAutoplay();
  }

  window.VAHomeGallery = { mount };
})();
