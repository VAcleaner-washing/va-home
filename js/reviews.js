/* VA HOME — product reviews: approved list + pending submission. */
(function () {
  "use strict";
  const MIN_TEXT = 10;
  const MAX_TEXT = 1000;
  const COOLDOWN_MS = 60 * 1000;
  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
  const TARGET_PHOTO_BYTES = Math.floor(2.5 * 1024 * 1024);
  const MAX_SOURCE_PHOTO_BYTES = 35 * 1024 * 1024;
  const MAX_PHOTO_EDGE = 2200;
  const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const PHOTO_SOURCE_EXTENSIONS = /\.(?:jpe?g|png|webp|heic|heif)$/i;

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

  function looksLikeImage(file) {
    if (!file) return false;
    return String(file.type || "").startsWith("image/") || PHOTO_SOURCE_EXTENSIONS.test(String(file.name || ""));
  }

  function loadPhotoSource(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve({
        source: image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        cleanup: () => URL.revokeObjectURL(objectUrl)
      });
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("PHOTO_DECODE_FAILED"));
      };
      image.src = objectUrl;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      if (typeof canvas.toBlob === "function") {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PHOTO_ENCODE_FAILED")), type, quality);
        return;
      }
      try {
        const dataUrl = canvas.toDataURL(type, quality);
        const base64 = dataUrl.split(",")[1] || "";
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        resolve(new Blob([bytes], { type }));
      } catch (error) {
        reject(error);
      }
    });
  }

  async function optimiseReviewPhoto(file) {
    if (!looksLikeImage(file)) throw new Error("PHOTO_TYPE_UNSUPPORTED");
    if (file.size > MAX_SOURCE_PHOTO_BYTES) throw new Error("PHOTO_SOURCE_TOO_LARGE");

    if (PHOTO_TYPES.has(file.type) && file.size <= TARGET_PHOTO_BYTES) {
      return file;
    }

    const loaded = await loadPhotoSource(file);
    try {
      if (!loaded.width || !loaded.height) throw new Error("PHOTO_DECODE_FAILED");
      let scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(loaded.width, loaded.height));
      let width = Math.max(1, Math.round(loaded.width * scale));
      let height = Math.max(1, Math.round(loaded.height * scale));
      let bestBlob = null;

      for (let resizePass = 0; resizePass < 4; resizePass += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("PHOTO_CANVAS_FAILED");
        context.fillStyle = "#f5f2ec";
        context.fillRect(0, 0, width, height);
        context.drawImage(loaded.source, 0, 0, width, height);

        for (const quality of [0.88, 0.82, 0.76, 0.70, 0.64]) {
          const blob = await canvasToBlob(canvas, "image/jpeg", quality);
          bestBlob = blob;
          if (blob.size <= TARGET_PHOTO_BYTES) {
            return new File([blob], `${String(file.name || "review-photo").replace(/\.[^.]+$/, "")}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now()
            });
          }
        }

        width = Math.max(960, Math.round(width * 0.82));
        height = Math.max(960, Math.round(height * 0.82));
      }

      if (bestBlob && bestBlob.size <= MAX_PHOTO_BYTES) {
        return new File([bestBlob], `${String(file.name || "review-photo").replace(/\.[^.]+$/, "")}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now()
        });
      }
      throw new Error("PHOTO_STILL_TOO_LARGE");
    } finally {
      loaded.cleanup();
    }
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
      const empty = document.getElementById("reviewsEmpty");
      if (empty) { empty.hidden = false; empty.textContent = "Не вдалося завантажити відгуки. Спробуйте трохи пізніше."; }
      
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
    if (photoInput && photoNameEl) {
      photoInput.addEventListener("change", () => {
        const selected = photoInput.files && photoInput.files[0];
        if (!selected) {
          photoNameEl.textContent = "Файл не обрано";
          return;
        }
        const optimisationNote = selected.size > TARGET_PHOTO_BYTES || !PHOTO_TYPES.has(selected.type)
          ? " · оптимізуємо перед надсиланням"
          : "";
        photoNameEl.textContent = `${selected.name} · ${formatFileSize(selected.size)}${optimisationNote}`;
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
      if (photo && !looksLikeImage(photo)) return setMessage("Оберіть фотографію у форматі JPG, PNG, HEIC або WebP.", "error");
      if (photo && photo.size > MAX_SOURCE_PHOTO_BYTES) return setMessage("Початкове фото завелике. Оберіть файл до 35 МБ.", "error");
      submit.disabled = true;
      submit.textContent = photo ? "Оптимізуємо фото…" : "Надсилаємо…";
      try {
        let photoData = null;
        let preparedPhoto = null;
        if (photo) {
          preparedPhoto = await optimiseReviewPhoto(photo);
          if (preparedPhoto.size > MAX_PHOTO_BYTES) throw new Error("PHOTO_STILL_TOO_LARGE");
          submit.textContent = "Надсилаємо…";
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = reject; reader.readAsDataURL(preparedPhoto);
          });
          photoData = String(dataUrl).split(",")[1] || null;
        }
        const result = await window.VAHomeSupabase.submitReview({ product_slug: PRODUCT_ID, customer_name: name, rating, review_text: text, photo_data: photoData, photo_type: preparedPhoto?.type || null });
        localStorage.setItem(cooldownKey, String(Date.now()));
        form.reset();
        if (counter) counter.textContent = `0/${MAX_TEXT}`;
        setMessage(result?.verified_purchase ? "Дякуємо! Покупку підтверджено автоматично. Відгук з’явиться після модерації." : "Дякуємо! Відгук отримано й з’явиться на сайті після перевірки.", "success");
      } catch (error) {
        if (["PHOTO_DECODE_FAILED", "PHOTO_ENCODE_FAILED", "PHOTO_CANVAS_FAILED", "PHOTO_STILL_TOO_LARGE"].includes(error?.message)) {
          setMessage("Не вдалося оптимізувати це фото. Спробуйте інше зображення або зробіть його скриншот.", "error");
        } else if (error?.message === "PHOTO_SOURCE_TOO_LARGE") {
          setMessage("Початкове фото завелике. Оберіть файл до 35 МБ.", "error");
        } else if (error?.status === 409) setMessage("Ви вже залишили відгук про цей аромат. Після модерації він з’явиться на сайті.", "error");
        else if (error?.status === 429) setMessage("Забагато спроб. Зачекайте кілька хвилин.", "error");
        else setMessage("Не вдалося надіслати відгук. Перевірте інтернет і спробуйте ще раз.", "error");
      } finally {
        submit.disabled = false;
        submit.textContent = "Надіслати відгук";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => { loadReviews(); initForm(); });
})();
