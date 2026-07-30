/* VA HOME — product reviews: approved list + pending submission. */
(function () {
  "use strict";
  const MIN_TEXT = 10;
  const MAX_TEXT = 1000;
  const COOLDOWN_MS = 60 * 1000;
  const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
  const MAX_SOURCE_PHOTO_BYTES = 25 * 1024 * 1024;
  const MAX_PHOTO_WIDTH = 1600;
  const WEBP_QUALITY = 0.82;
  const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const PHOTO_SOURCE_EXTENSIONS = /\.(?:jpe?g|png|webp)$/i;

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
    } catch (_) { return ""; }
  }

  function formatFileSize(bytes) {
    const megabytes = Number(bytes || 0) / (1024 * 1024);
    return `${megabytes < 10 ? megabytes.toFixed(1) : Math.round(megabytes)} МБ`;
  }

  function normalisePhotoType(file) {
    if (!file) return "";
    const declared = String(file.type || "").toLowerCase();
    if (PHOTO_TYPES.has(declared)) return declared;
    const name = String(file.name || "").toLowerCase();
    if (/\.jpe?g$/.test(name)) return "image/jpeg";
    if (/\.png$/.test(name)) return "image/png";
    if (/\.webp$/.test(name)) return "image/webp";
    return "";
  }

  function looksLikeImage(file) {
    return Boolean(normalisePhotoType(file)) && PHOTO_SOURCE_EXTENSIONS.test(String(file?.name || ""));
  }

  async function toWebP(file, maxWidth = MAX_PHOTO_WIDTH, quality = WEBP_QUALITY) {
    const bitmap = await createImageBitmap(file);

    try {
      const scale = Math.min(1, maxWidth / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);

      const ctx = canvas.getContext("2d", {
        alpha: true,
        colorSpace: "srgb"
      }) || canvas.getContext("2d");

      if (!ctx) throw new Error("PHOTO_CONVERSION_FAILED");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      return await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("PHOTO_CONVERSION_FAILED"));
            return;
          }
          resolve(blob);
        }, "image/webp", quality);
      });
    } finally {
      bitmap.close();
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || null);
      reader.onerror = () => reject(new Error("PHOTO_READ_FAILED"));
      reader.readAsDataURL(blob);
    });
  }

  function stars(rating) {
    const n = Math.max(1, Math.min(5, Number(rating) || 0));
    return `<span class="review-stars" aria-label="Оцінка ${n} із 5">${"★".repeat(n)}${"☆".repeat(5 - n)}</span>`;
  }

  function renderSummary(rows) {
    const averageEl = document.getElementById("reviewsAverage");
    const countEl = document.getElementById("reviewsCount");
    const bars = document.getElementById("reviewsBreakdown");
    if (!averageEl || !countEl || !bars) return;
    const count = rows.length;
    const average = count ? rows.reduce((sum, row) => sum + Number(row.rating), 0) / count : 0;
    averageEl.textContent = count ? average.toFixed(1) : "—";
    countEl.textContent = count ? `${count} ${count === 1 ? "відгук" : "відгуків"}` : "Ще немає відгуків";
    const counts = [5,4,3,2,1].map((rating) => ({ rating, count: rows.filter((r) => Number(r.rating) === rating).length }));
    bars.innerHTML = counts.map((item) => {
      const width = count ? Math.round(item.count / count * 100) : 0;
      return `<div class="reviews-breakdown__row"><span>${item.rating}</span><span aria-hidden="true">★</span><div class="reviews-breakdown__track"><span style="width:${width}%"></span></div><span>${item.count}</span></div>`;
    }).join("");
    if (count) updateProductStructuredData(average, count);
  }

  function updateProductStructuredData(average, count) {
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || "{}");
        if (data["@type"] !== "Product") return;
        data.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: Number(average.toFixed(2)),
          reviewCount: count,
          bestRating: 5,
          worstRating: 1
        };
        script.textContent = JSON.stringify(data);
      } catch (_) {}
    });
  }

  function renderList(rows) {
    const list = document.getElementById("reviewsList");
    const empty = document.getElementById("reviewsEmpty");
    if (!list || !empty) return;
    if (!rows.length) {
      list.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.innerHTML = rows.map((row) => `
      <article class="review-card">
        <div class="review-card__top">
          ${stars(row.rating)}
          <time datetime="${escapeHTML(row.created_at)}">${escapeHTML(formatDate(row.created_at))}</time>
        </div>
        <p class="review-card__text">${escapeHTML(row.review_text)}</p>
        ${row.photo_url ? `<img class="review-card__photo" src="${escapeHTML(row.photo_url)}" alt="Фото покупця до відгуку" loading="lazy" decoding="async">` : ""}
        <div class="review-card__author">
          <strong>${escapeHTML(row.customer_name)}</strong>
          ${row.verified_purchase ? '<span class="verified-badge">Перевірена покупка</span>' : ""}
        </div>
      </article>`).join("");
  }

  async function loadReviews() {
    if (typeof PRODUCT_ID === "undefined" || !window.VAHomeSupabase) return;
    const loading = document.getElementById("reviewsLoading");
    try {
      const rows = await window.VAHomeSupabase.getApprovedReviews(PRODUCT_ID);
      renderSummary(rows || []);
      renderList(rows || []);
    } catch (error) {
      const list = document.getElementById("reviewsList");
      const empty = document.getElementById("reviewsEmpty");
      const hasStaticFallback = Boolean(list && list.querySelector(".review-card"));
      if (!hasStaticFallback && empty) {
        empty.hidden = false;
        empty.textContent = "Не вдалося оновити відгуки. Спробуйте трохи пізніше.";
      }
    } finally {
      if (loading) loading.hidden = true;
    }
  }

  function selectedRating(form) {
    const checked = form.querySelector('input[name="rating"]:checked');
    return checked ? Number(checked.value) : 0;
  }

  function setMessage(text, type) {
    const el = document.getElementById("reviewFormMessage");
    if (!el) return;
    el.textContent = text;
    el.className = `review-form__message is-${type}`;
    el.hidden = false;
  }

  function initForm() {
    const formRoot = document.getElementById("reviewForm");
    const form = formRoot && formRoot.tagName === "FORM"
      ? formRoot
      : formRoot?.querySelector("form");
    if (!form || typeof PRODUCT_ID === "undefined") return;
    const submit = form.querySelector('button[type="submit"]');
    const textarea = form.elements.reviewText;
    const counter = document.getElementById("reviewCharCount");
    const photoInput = form.elements.reviewPhoto;
    const photoNameEl = document.getElementById("reviewPhotoName");
    const photoRemoveBtn = document.getElementById("reviewPhotoRemove");
    const photoSelectLabel = form.querySelector('.review-photo-picker__btn');

    const clearPhotoError = () => {
      const message = document.getElementById("reviewFormMessage");
      if (!message || !message.classList.contains("is-error")) return;
      if (!/(?:фото|зображенн|файл)/i.test(message.textContent || "")) return;
      message.hidden = true;
      message.textContent = "";
      message.className = "review-form__message";
    };

    const clearPhotoSelection = () => {
      if (photoInput) photoInput.value = "";
      if (photoNameEl) photoNameEl.textContent = "Файл не обрано";
      if (photoRemoveBtn) photoRemoveBtn.hidden = true;
      clearPhotoError();
    };

    const syncPhotoSelection = () => {
      const selected = photoInput?.files?.[0] || null;
      if (!selected) {
        clearPhotoSelection();
        return;
      }

      if (photoNameEl) photoNameEl.textContent = `${selected.name} · ${formatFileSize(selected.size)} · буде оптимізовано`;
      if (photoRemoveBtn) photoRemoveBtn.hidden = false;

      if (!looksLikeImage(selected)) {
        setMessage("Оберіть фотографію у форматі JPG, PNG або WebP — або видаліть файл і надішліть відгук без фото.", "error");
      } else if (selected.size > MAX_SOURCE_PHOTO_BYTES) {
        setMessage("Початкове фото має бути не більше 25 МБ. Видаліть його або оберіть інше.", "error");
      } else {
        clearPhotoError();
      }
    };

    if (photoInput) photoInput.addEventListener("change", syncPhotoSelection);
    if (photoRemoveBtn) {
      photoRemoveBtn.addEventListener("click", () => {
        clearPhotoSelection();
        if (photoSelectLabel) {
          photoSelectLabel.setAttribute("tabindex", "-1");
          photoSelectLabel.focus({ preventScroll: true });
        }
      });
    }
    if (textarea && counter) {
      const update = () => { counter.textContent = `${textarea.value.length}/${MAX_TEXT}`; };
      textarea.addEventListener("input", update); update();
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = form.elements.customerName.value.trim();
      const text = form.elements.reviewText.value.trim();
      const rating = selectedRating(form);
      const website = form.elements.website ? form.elements.website.value : "";
      if (website) return; // honeypot
      if (name.length < 2 || name.length > 50) return setMessage("Вкажіть ім’я від 2 до 50 символів.", "error");
      if (!rating) return setMessage("Оберіть оцінку від 1 до 5 зірок.", "error");
      if (text.length < MIN_TEXT || text.length > MAX_TEXT) return setMessage(`Напишіть від ${MIN_TEXT} до ${MAX_TEXT} символів.`, "error");
      const cooldownKey = `vahome_review_${PRODUCT_ID}`;
      const last = Number(localStorage.getItem(cooldownKey) || 0);
      if (Date.now() - last < COOLDOWN_MS) return setMessage("Відгук уже надіслано. Зачекайте хвилину перед повторною спробою.", "error");

      const photo = photoInput?.files?.[0] || null;
      if (photo && !looksLikeImage(photo)) return setMessage("Оберіть фотографію у форматі JPG, PNG або WebP.", "error");
      if (photo && photo.size > MAX_SOURCE_PHOTO_BYTES) return setMessage("Початкове фото має бути не більше 25 МБ. Видаліть його або оберіть інше.", "error");
      submit.disabled = true;
      submit.textContent = photo ? "Оптимізуємо фото…" : "Надсилаємо…";
      try {
        let photoData = null;
        let photoType = null;
        if (photo) {
          const webpBlob = await toWebP(photo);
          if (webpBlob.size > MAX_PHOTO_BYTES) throw new Error("PHOTO_TOO_LARGE");
          photoData = await blobToBase64(webpBlob);
          photoType = "image/webp";
          submit.textContent = "Надсилаємо…";
        }
        const result = await window.VAHomeSupabase.submitReview({ product_slug: PRODUCT_ID, customer_name: name, rating, review_text: text, photo_data: photoData, photo_type: photoType });
        localStorage.setItem(cooldownKey, String(Date.now()));
        form.reset();
        clearPhotoSelection();
        if (counter) counter.textContent = `0/${MAX_TEXT}`;
        setMessage(result?.verified_purchase ? "Дякуємо! Покупку підтверджено автоматично. Відгук з’явиться після модерації." : "Дякуємо! Відгук отримано й з’явиться на сайті після перевірки.", "success");
      } catch (error) {
        if (error?.message === "PHOTO_TOO_LARGE") {
          setMessage("Фото має бути не більше 10 МБ. Видаліть його або оберіть інше.", "error");
        } else if (error?.message === "PHOTO_CONVERSION_FAILED" || error?.message === "PHOTO_READ_FAILED") {
          setMessage("Не вдалося оптимізувати фото. Оберіть інше зображення або надішліть відгук без нього.", "error");
        } else if (error?.message === "INVALID_PHOTO") {
          setMessage("Не вдалося прочитати фото. Оберіть JPG, PNG або WebP.", "error");
        } else if (error?.message === "PHOTO_UPLOAD_FAILED") {
          setMessage("Не вдалося завантажити фото. Спробуйте ще раз або видаліть фото й надішліть відгук без нього.", "error");
        } else if (error?.status === 409) setMessage("Ви вже залишили відгук про цей аромат. Після модерації він з’явиться на сайті.", "error");
        else if (error?.status === 429) setMessage("Забагато спроб. Зачекайте кілька хвилин.", "error");
        else if (error?.status === 502 || error?.status === 503) setMessage("Сервіс відгуків тимчасово недоступний. Спробуйте ще раз за хвилину.", "error");
        else setMessage("Не вдалося надіслати відгук. Спробуйте ще раз.", "error");
      } finally {
        submit.disabled = false;
        submit.textContent = "Надіслати відгук";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => { loadReviews(); initForm(); });
})();
