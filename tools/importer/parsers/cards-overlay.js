/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the Biloxi "Feature List H Overlay" promo tiles.
 * Source: https://www.hrhcbiloxi.com/ (#hardrockFeatureListHOverlayWidget1475405)
 * Generated: 2026-09-08
 *
 * Emits a `cards (overlay)` block following the standard cards convention:
 * a 2-column table where row 1 is the block name, then one ROW per card with
 * cell 1 = image (mandatory) and cell 2 = text (heading, description, CTA).
 * The `.cards.overlay` CSS modifier (blocks/cards/cards.css) positions the body
 * over the photo.
 *
 * Each source tile (.CTA) is:
 *   .feature-img            -> tile photo (lazy background/img)
 *   .featureListItemHeading -> <span>eyebrow</span> + heading text
 *   p                       -> description
 *   a.CTAButton*            -> CTA link
 *
 * Image note: like daytona's cards-explore, the source lazy-loads tile photos
 * (CSS background / data-URI placeholders). resolveCardImage() recovers a real
 * hosted URL when present; text content is always captured regardless.
 */

const isRealUrl = (u) => u && !u.startsWith('data:') && !u.startsWith('blob:');

/**
 * Build a map of tile CSS class (e.g. "CTA1") -> background-image URL by scanning
 * the widget's embedded <style>. The source lazy-loads each tile photo via a
 * per-tile rule like `.CTA.CTA1 .feature-img.loaded{background-image:url('...')}`,
 * with responsive overrides in media queries — we keep the LAST (largest / most
 * specific) URL seen per tile class so full-width renditions win.
 */
function collectTileBackgrounds(element, document) {
  const map = {};
  // The per-tile photos live in CSS `background-image` rules keyed by tile class
  // (`.CTA<n> .feature-img{...url()}`). Those rules are emitted in a <style> that
  // may sit outside the widget subtree (section- or page-level), so gather style
  // text from the widget AND from every document <style> whose rules reference
  // this widget. Scope by the widget id/class to avoid cross-widget bleed.
  const widgetId = element.getAttribute && element.getAttribute('id');
  const styleNodes = new Set(Array.from(element.querySelectorAll('style')));
  if (document) {
    Array.from(document.querySelectorAll('style')).forEach((s) => {
      const t = s.textContent || '';
      if (widgetId && t.indexOf(widgetId) !== -1) styleNodes.add(s);
    });
  }
  let styleText = Array.from(styleNodes).map((s) => s.textContent || '').join('\n');
  if (styleText.indexOf('background-image') === -1) {
    // Last resort: the element's own serialized markup.
    const html = (element.innerHTML || '') + (element.outerHTML || '');
    if (html.indexOf('background-image') !== -1) styleText += `\n${html}`;
  }
  if (!styleText) return map;
  // Match `.CTA<n> ... background-image:url(<url>)` occurrences.
  const re = /\.CTA(\d+)[^{}]*\{[^}]*background-image\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(styleText)) !== null) {
    const idx = m[1];
    const url = m[2];
    if (isRealUrl(url)) map[`CTA${idx}`] = url; // later (larger) rules overwrite
  }
  return map;
}

/**
 * Resolve the real hosted image URL for a tile. Prefer <img data-src>, an inline
 * background-image url() / data-bg, then the per-tile background from the widget
 * <style> (bgMap keyed by CTA class). Returns a fresh <img> or null.
 */
function resolveCardImage(tile, document, bgMap) {
  const img = tile.querySelector('.feature-img img, .image img, img');
  let url = '';
  let alt = '';
  if (img) {
    alt = img.getAttribute('alt') || '';
    const cand = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src') || '';
    if (isRealUrl(cand)) url = cand;
  }
  if (!url) {
    const all = [tile].concat(Array.from(tile.querySelectorAll('*')));
    for (let i = 0; i < all.length; i += 1) {
      const el = all[i];
      const style = (el.getAttribute && el.getAttribute('style')) || '';
      const dataBg = (el.getAttribute && (el.getAttribute('data-bg') || el.getAttribute('data-background'))) || '';
      const m = style.match(/url\(["']?(.*?)["']?\)/);
      if (m && isRealUrl(m[1])) { url = m[1]; break; }
      if (isRealUrl(dataBg)) { url = dataBg; break; }
    }
  }
  if (!url && bgMap) {
    // Fall back to the per-tile background-image rule from the widget <style>.
    const ctaClass = Array.from(tile.classList).find((c) => /^CTA\d+$/.test(c));
    if (ctaClass && bgMap[ctaClass]) url = bgMap[ctaClass];
  }
  if (!url) return null;
  const out = document.createElement('img');
  out.setAttribute('src', url);
  if (alt) out.setAttribute('alt', alt);
  return out;
}

export default function parse(element, { document }) {
  const cells = [];

  // Collect per-tile background-image URLs from the widget <style> BEFORE removing
  // it — the tile photos live only in CSS rules (`.CTA<n> .feature-img{...url()}`).
  const bgMap = collectTileBackgrounds(element, document);

  // Drop embedded non-content nodes (widget stylesheet/script) so their text
  // isn't captured.
  element.querySelectorAll('style, script, link, noscript').forEach((n) => n.remove());

  // Each promo tile is a .CTA column. De-dupe defensively by heading text in
  // case the widget clones tiles.
  const tiles = Array.from(element.querySelectorAll('.CTA'));
  const seenHeading = new Set();

  tiles.forEach((tile) => {
    // Cell 1: tile image (resolved to a real hosted rendition when available)
    const img = resolveCardImage(tile, document, bgMap);

    // Cell 2: text content
    const textCell = [];

    const headingEl = tile.querySelector('.featureListItemHeading');
    let headingKey = '';
    if (headingEl) {
      // Heading is <span>eyebrow</span> + trailing title text. Preserve the
      // eyebrow as its own line above the heading.
      const eyebrowEl = headingEl.querySelector('span');
      const eyebrow = eyebrowEl ? eyebrowEl.textContent.trim() : '';
      const full = headingEl.textContent.replace(/\s+/g, ' ').trim();
      const title = eyebrow && full.startsWith(eyebrow)
        ? full.slice(eyebrow.length).trim()
        : full;
      headingKey = full;
      if (eyebrow) {
        const p = document.createElement('p');
        const em = document.createElement('em');
        em.textContent = eyebrow;
        p.appendChild(em);
        textCell.push(p);
      }
      if (title) {
        const h = document.createElement('h3');
        h.textContent = title;
        textCell.push(h);
      }
    }

    if (headingKey && seenHeading.has(headingKey)) return;
    if (headingKey) seenHeading.add(headingKey);

    // Description paragraph(s)
    const paras = Array.from(tile.querySelectorAll('.overlayContent > p, .overlayContent p, .ctaContainer p'));
    const seenP = new Set();
    paras.forEach((p) => {
      const t = p.textContent.replace(/\s+/g, ' ').trim();
      if (!t || seenP.has(t)) return;
      seenP.add(t);
      const np = document.createElement('p');
      np.textContent = t;
      textCell.push(np);
    });

    // CTA link
    const cta = tile.querySelector('a.CTAButton1, a.btn, .overlayContent a, a');
    if (cta && cta.getAttribute('href')) {
      const a = document.createElement('a');
      a.href = cta.getAttribute('href');
      a.textContent = cta.textContent.replace(/\s+/g, ' ').trim();
      const p = document.createElement('p');
      p.appendChild(a);
      textCell.push(p);
    }

    if (img || textCell.length) {
      cells.push([img || '', textCell.length ? textCell : '']);
    }
  });

  // Empty-block guard
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards (overlay)', cells });
  element.replaceWith(block);
}
