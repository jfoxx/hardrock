/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the "Explore The Resort" cards (default cards block).
 * Source: https://hotel.hardrock.com/daytona-beach/ (#hardrockCtaCarouselWidget969132)
 * Generated: 2026-08-31
 *
 * Default `cards` block: row 1 = block name, then one ROW per card:
 *   cell 1 = image, cell 2 = text (title heading, description, CTA).
 * Cards render stacked (photo on top, then body) in a responsive grid.
 *
 * Note: the source widget embeds <style>/<script> whose text inflates the source
 * element's text content; those are intentionally NOT captured. The section heading
 * "Explore The Resort" is defaultContent (handled by the transformer), so excluded here.
 */

/**
 * Resolve the real hosted image URL for a card. Source lazy-loads photos as CSS
 * background-images / data-URI placeholders; prefer <img data-src>, an inline
 * background-image url(), or a plain non-data <img src>. Returns a fresh <img>.
 */
function resolveCardImage(slide, document) {
  const isReal = (u) => u && !u.startsWith('data:') && !u.startsWith('blob:');
  const img = slide.querySelector('.feature-img img, .image img, img');
  let url = '';
  let alt = '';
  if (img) {
    alt = img.getAttribute('alt') || '';
    const cand = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src') || '';
    if (isReal(cand)) url = cand;
  }
  if (!url) {
    const all = [slide].concat(Array.from(slide.querySelectorAll('*')));
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

  // Remove non-content nodes (embedded stylesheet/script/noscript) so they are not
  // captured. This widget embeds a large <style> and <script> block whose text would
  // otherwise dominate the source; only the card content below is real content.
  element.querySelectorAll('style, script, link, noscript').forEach((n) => n.remove());

  // Each card is a carousel slide. Validated against source: div.slickSlide.
  // The carousel may duplicate slides (slick clones); de-duplicate by heading text.
  const slides = Array.from(element.querySelectorAll('.slickSlide:not(.slick-cloned)'));

  slides.forEach((slide) => {
    // Cell 1: image (resolved to a real hosted rendition)
    const img = resolveCardImage(slide, document);

    // Cell 2: text content
    const textCell = [];

    const heading = slide.querySelector('.itemHeading');
    if (heading) {
      const h = document.createElement('h3');
      h.textContent = heading.textContent.trim();
      textCell.push(h);
    }

    // Description paragraphs
    const paras = Array.from(slide.querySelectorAll('.feature-content > p, .feature-content p'));
    const seenP = new Set();
    paras.forEach((p) => {
      if (seenP.has(p)) return;
      seenP.add(p);
      textCell.push(p);
    });

    // CTA link
    const cta = slide.querySelector('.itemBtn, .feature-content a');
    if (cta) {
      const a = document.createElement('a');
      a.href = cta.href;
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

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });
  element.replaceWith(block);
}
