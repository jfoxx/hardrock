/* eslint-disable */
/* global WebImporter */
/* Mapping selector widened to the full #fullWidthCTAGrid2Widget so the parser
 * can reach both the caption content and the document-level background CSS. */
/**
 * Parser for the Biloxi full-bleed "Endless Excitement" casino band.
 * Source: https://www.hrhcbiloxi.com/ (#fullWidthCTAGrid2Widget1475406)
 * Generated: 2026-09-08
 *
 * Emits a `hero (band)` block following the hero convention: a 1-column table
 * where row 1 = block name, row 2 = background image, row 3 = text (title,
 * subheading, CTA). hero is a styling-only block (no decoration JS); the
 * `.hero.band` CSS modifier (blocks/hero/hero.css) lays the caption over the
 * image.
 *
 * The band photo is in `.fullWidthSlide img`; the heading
 * ("<span>Endless </span>Excitement"), paragraph, and CTA live in the widget's
 * `.fwContentHeader` / content area.
 */

const isRealUrl = (u) => u && !u.startsWith('data:') && !u.startsWith('blob:');

/**
 * Find the band background from the widget's CSS. The photo is lazy-loaded via a
 * `.fullWidthSlide.loaded{background-image:url(...)}` rule (with responsive
 * overrides), emitted in a <style> that may live outside the element subtree.
 * Keep the LAST (largest) URL so the full-width rendition wins.
 */
function backgroundFromStyle(root, document) {
  // Gather CSS from <style> nodes (in the element and document), then fall back
  // to serialized markup — the background rule may arrive via any of these
  // depending on how the importer materializes the page.
  const styleNodes = new Set(Array.from(root.querySelectorAll('style')));
  if (document) {
    Array.from(document.querySelectorAll('style')).forEach((s) => styleNodes.add(s));
  }
  let styleText = Array.from(styleNodes).map((s) => s.textContent || '').join('\n');
  if (styleText.indexOf('background-image') === -1) {
    const parts = [root.innerHTML || '', root.outerHTML || ''];
    if (document && document.documentElement) parts.push(document.documentElement.innerHTML || '');
    const html = parts.join('\n');
    if (html.indexOf('background-image') !== -1) styleText += `\n${html}`;
  }
  let url = '';
  const re = /\.fullWidthSlide[^{}]*\{[^}]*background-image\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(styleText)) !== null) {
    if (isRealUrl(m[1])) url = m[1];
  }
  return url;
}

/** Resolve the band background image to a real hosted <img>. */
function resolveBandImage(root, document) {
  const img = root.querySelector('.fullWidthSlide img, .fullWidthSlide picture img, img');
  let url = '';
  let alt = '';
  if (img) {
    alt = img.getAttribute('alt') || '';
    const cand = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src') || '';
    if (isRealUrl(cand)) url = cand;
  }
  if (!url) {
    const all = Array.from(root.querySelectorAll('*'));
    for (let i = 0; i < all.length; i += 1) {
      const style = (all[i].getAttribute && all[i].getAttribute('style')) || '';
      const mm = style.match(/url\(["']?(.*?)["']?\)/);
      if (mm && isRealUrl(mm[1])) { url = mm[1]; break; }
    }
  }
  if (!url) url = backgroundFromStyle(root, document);
  if (!url) return null;
  const out = document.createElement('img');
  out.setAttribute('src', url);
  if (alt) out.setAttribute('alt', alt);
  return out;
}

export default function parse(element, { document }) {
  // Resolve the band background BEFORE stripping <style> — the photo lives only
  // in a CSS `background-image` rule inside the widget's embedded stylesheet.
  const img = resolveBandImage(element, document);

  // Drop embedded non-content nodes so their text/CSS isn't captured.
  element.querySelectorAll('style, script, link, noscript').forEach((n) => n.remove());

  const textCell = [];

  // Heading: `.fwContentHeader` is "<span>Endless </span>Excitement".
  // Preserve the leading span as an eyebrow line above the heading.
  const headingEl = element.querySelector('.fwContentHeader, .fullWidthHeading, h1, h2');
  if (headingEl) {
    const eyebrowEl = headingEl.querySelector('span');
    const eyebrow = eyebrowEl ? eyebrowEl.textContent.trim() : '';
    const full = headingEl.textContent.replace(/\s+/g, ' ').trim();
    const title = eyebrow && full.startsWith(eyebrow)
      ? full.slice(eyebrow.length).trim()
      : full;
    if (eyebrow) {
      const p = document.createElement('p');
      const em = document.createElement('em');
      em.textContent = eyebrow;
      p.appendChild(em);
      textCell.push(p);
    }
    if (title) {
      const h = document.createElement('h2');
      h.textContent = title;
      textCell.push(h);
    }
  }

  // Paragraph(s): body copy (exclude the CTA-only paragraph).
  const seenP = new Set();
  Array.from(element.querySelectorAll('p')).forEach((p) => {
    const t = p.textContent.replace(/\s+/g, ' ').trim();
    if (!t || seenP.has(t)) return;
    const onlyLink = p.querySelector('a') && p.textContent.trim() === p.querySelector('a').textContent.trim();
    if (onlyLink) return;
    seenP.add(t);
    const np = document.createElement('p');
    np.textContent = t;
    textCell.push(np);
  });

  // CTA link.
  const cta = element.querySelector('a.btn, .fwContentHeader a, a');
  if (cta && cta.getAttribute('href')) {
    const a = document.createElement('a');
    a.href = cta.getAttribute('href');
    a.textContent = cta.textContent.replace(/\s+/g, ' ').trim();
    const p = document.createElement('p');
    p.appendChild(a);
    textCell.push(p);
  }

  // Empty-block guard
  if (!img && !textCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Hero convention: 1 column. Row 2 = background image, row 3 = content.
  const cells = [];
  cells.push([img || '']);
  cells.push([textCell.length ? textCell : '']);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero (band)', cells });
  element.replaceWith(block);
}
