/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the "Rooms & Suites" feature split -> cards (feature) variant.
 * Source: https://hotel.hardrock.com/daytona-beach/ (#custom1 .row-eq-height)
 * Generated: 2026-08-31
 *
 * A single feature card with image + text SIDE BY SIDE. Authored as a `cards`
 * block with the `feature` modifier: row 1 = block name ("cards (feature)"),
 * row 2 = one card with two cells (image | content = heading, description, CTA).
 */

/**
 * Resolve the real hosted image URL for the feature split. Source lazy-loads
 * the photo as a CSS background-image / data-URI placeholder; prefer
 * <img data-src>, an inline background-image url(), or a plain non-data src.
 */
function resolveFeatureImage(root, document) {
  const isReal = (u) => u && !u.startsWith('data:') && !u.startsWith('blob:');
  const img = root.querySelector('.feature-img img, .image img, img');
  let url = '';
  let alt = '';
  if (img) {
    alt = img.getAttribute('alt') || '';
    const cand = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src') || '';
    if (isReal(cand)) url = cand;
  }
  if (!url) {
    const all = [root].concat(Array.from(root.querySelectorAll('*')));
    for (let i = 0; i < all.length; i += 1) {
      const style = (all[i].getAttribute && all[i].getAttribute('style')) || '';
      const m = style.match(/url\(["']?(.*?)["']?\)/);
      if (m && isReal(m[1])) { url = m[1]; break; }
    }
  }
  if (!url) return null;
  const out = document.createElement('img');
  out.setAttribute('src', url);
  if (alt) out.setAttribute('alt', alt);
  return out;
}

export default function parse(element, { document }) {
  element.querySelectorAll('style, script, link, noscript').forEach((n) => n.remove());

  // element is the .row-eq-height split (per instances[] selector).
  // Image column (resolved to a real hosted rendition)
  const img = resolveFeatureImage(element, document);

  // Content column
  const contentCol = element.querySelector('.feature-content, .featureContentContainer');
  const contentCell = [];
  if (contentCol) {
    contentCol.querySelectorAll('.sr-only').forEach((n) => n.remove());
    const heading = contentCol.querySelector('.h2, h2, h3');
    if (heading) {
      const h = document.createElement('h3');
      h.textContent = heading.textContent.trim();
      contentCell.push(h);
    }
    const paras = Array.from(contentCol.querySelectorAll('p'));
    const seenP = new Set();
    paras.forEach((p) => {
      if (seenP.has(p)) return;
      seenP.add(p);
      contentCell.push(p);
    });
    const cta = contentCol.querySelector('a.btn, a');
    if (cta) {
      const a = document.createElement('a');
      a.href = cta.href;
      a.textContent = cta.textContent.replace(/\s+/g, ' ').trim();
      const p = document.createElement('p');
      p.appendChild(a);
      contentCell.push(p);
    }
  }

  // Empty-block guard
  if (!img && !contentCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Two columns in one row: image | content
  const cells = [[img || '', contentCell.length ? contentCell : '']];

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards (feature)', cells });
  element.replaceWith(block);
}
