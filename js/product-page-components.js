/**
 * VA HOME — deprecated compatibility file.
 *
 * Product pages are now generated from data/product-content.json via:
 *   node scripts/build-product-content.mjs
 *   node scripts/sync-product-pages.mjs
 *
 * This file intentionally does not mount a hard-coded template, because that
 * would reintroduce duplicated product copy and generic reed instructions.
 */
(() => {
  'use strict';
  window.VAHomeProductPageComponents = Object.freeze({
    deprecated: true,
    source: 'data/product-content.json'
  });
})();
