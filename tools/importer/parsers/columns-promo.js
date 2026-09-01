/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the promotional splits -> columns block.
 * Source: https://hotel.hardrock.com/daytona-beach/ (#hardrockSplitWidget968226)
 * Generated: 2026-08-31
 *
 * Alternating full-width image + text promotional splits (Deals, Amenities,
 * Unleashed). Authored as a single `columns` block: row 1 = block name, then one
 * ROW per split with two cells (image | text). Same column count on every row.
 * The columns block renders each row as its own two-column band; the block CSS
 * alternates the image side per row. Embedded <style>/<script> are removed.
 */

/**
 * Source headings put a decorative (different-font) leading word/phrase in a
 * <span>, e.g. <h2><span>Deals in Daytona </span>Get the VIP Treatment</h2>.
 * In EDS content that emphasis maps to <em>. Convert the leading <span> to an
 * <em> and insert a space before the remaining text so the two parts don't run
 * together (spans are otherwise flattened away by the html→md conversion).
 */
function emphasizeHeading(h, document) {
  if (!h) return;
  const span = h.querySelector(':scope > span');
  if (!span || h.firstElementChild !== span) return;
  const em = document.createElement('em');
  em.textContent = span.textContent.replace(/\s+/g, ' ').trim();
  span.replaceWith(em);
  const next = em.nextSibling;
  if (next && next.nodeType === 3) {
    next.textContent = ` ${next.textContent.replace(/^\s+/, '')}`;
  } else if (next) {
    em.after(document.createTextNode(' '));
  }
}

/**
 * Resolve the real hosted image URL for a promo split. The source lazy-loads
 * photos (CSS background-image and/or data-URI <img> placeholders), so prefer
 * an explicit rendition from <img data-src>, an inline background-image url(),
 * or a plain non-data <img src>. Returns a fresh <img> or null.
 */
function resolvePromoImage(split, document) {
  const isReal = (u) => u && !u.startsWith('data:') && !u.startsWith('blob:');
  const img = split.querySelector('.image img, .feature-img img, img');
  let url = '';
  let alt = '';
  if (img) {
    alt = img.getAttribute('alt') || '';
    const cand = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src') || '';
    if (isReal(cand)) url = cand;
  }
  if (!url) {
    const all = [split].concat(Array.from(split.querySelectorAll('*')));
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
  const cells = [];

  element.querySelectorAll('style, script, link, noscript').forEach((n) => n.remove());

  // Each promo split becomes one row. Validated against source: div.row-eq-height.
  let splits = Array.from(element.querySelectorAll('.row-eq-height'));
  if (!splits.length) splits = [element];

  splits.forEach((split) => {
    // Cell 1: image (resolved to a real hosted rendition)
    const img = resolvePromoImage(split, document);

    // Cell 2: text content
    const textCell = [];

    const heading = split.querySelector('.splitItemHeading, h2, h3');
    if (heading) {
      emphasizeHeading(heading, document);
      textCell.push(heading);
    }

    const paras = Array.from(split.querySelectorAll('.textContainer > p, .text p'));
    const seenP = new Set();
    paras.forEach((p) => {
      if (seenP.has(p)) return;
      seenP.add(p);
      textCell.push(p);
    });

    // CTA link(s)
    const ctas = Array.from(split.querySelectorAll('.btnContainer a, .text a'));
    const seenA = new Set();
    ctas.forEach((cta) => {
      if (seenA.has(cta)) return;
      seenA.add(cta);
      const a = document.createElement('a');
      a.href = cta.href;
      a.textContent = cta.textContent.replace(/\s+/g, ' ').trim();
      const p = document.createElement('p');
      p.appendChild(a);
      textCell.push(p);
    });

    if (img || textCell.length) {
      cells.push([img || '', textCell.length ? textCell : '']);
    }
  });

  // Empty-block guard
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
