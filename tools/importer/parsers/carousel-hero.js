/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the carousel (hero) variant. Base block: carousel, modifier: hero.
 * Source: https://hotel.hardrock.com/daytona-beach/ (#vizADAHeroCarousel2Widget1442910)
 * Generated: 2026-08-31
 *
 * Carousel block: 2 columns. Row 1 = block name ("carousel (hero)"). Each
 * subsequent row = one slide:
 *   cell 1 = image (mandatory), cell 2 = text content (heading, description, CTA).
 *
 * Source uses slick: it duplicates slides as .slick-cloned and also renders a separate
 * .slickCaptionsDetached caption-only carousel. We select only real image slides from the
 * main hero carousel (excluding clones and the detached caption track) and de-duplicate by
 * heading text so each unique slide appears once.
 */
export default function parse(element, { document }) {
  element.querySelectorAll('style, script, link, noscript, button').forEach((n) => n.remove());

  // Real slides: within the main image carousel, non-cloned, and containing an image.
  const heroCarousel = element.querySelector('.slickHeroCarousel') || element;
  let slides = Array.from(heroCarousel.querySelectorAll('.slickSlide'))
    .filter((s) => !s.closest('.slick-cloned'))
    .filter((s) => !s.closest('.slickCaptionsDetached'))
    .filter((s) => s.querySelector('picture img, img'));

  // Fallback: if nothing matched, take any slide with an image.
  if (!slides.length) {
    slides = Array.from(element.querySelectorAll('.slickSlide')).filter((s) => s.querySelector('img'));
  }

  const cells = [];
  const seenHeadings = new Set();

  slides.forEach((slide) => {
    const heading = slide.querySelector('.heroHeading, h2, h3');
    const key = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : `__idx${cells.length}`;
    if (seenHeadings.has(key)) return;
    seenHeadings.add(key);

    // Cell 1: image. The source lazy-loads slides, so the <img> src is a data-URI
    // placeholder (or a runtime blob:) until scrolled into view. Resolve the real
    // hosted URL from the <picture> <source srcset> (prefer the large jpeg/jpg
    // rendition), falling back to the img's own real src or data-src.
    const img = slide.querySelector('picture img, img');
    if (img) {
      const picture = slide.querySelector('picture');
      const isReal = (u) => u && !u.startsWith('data:') && !u.startsWith('blob:');
      let resolved = '';
      if (picture) {
        const sources = Array.from(picture.querySelectorAll('source'))
          .map((s) => (s.getAttribute('srcset') || s.getAttribute('data-srcset') || '').split(',')[0].trim().split(/\s+/)[0])
          .filter(isReal);
        resolved = sources.find((u) => /large/i.test(u) && /\.jpe?g$/i.test(u))
          || sources.find((u) => /\.jpe?g$/i.test(u))
          || sources.find((u) => /large/i.test(u))
          || sources[0]
          || '';
      }
      if (!resolved) {
        const candidate = img.getAttribute('data-src') || img.currentSrc || img.getAttribute('src') || '';
        if (isReal(candidate)) resolved = candidate;
      }
      if (resolved) img.setAttribute('src', resolved);
    }

    // Cell 2: text content
    const textCell = [];
    const caption = slide.querySelector('.slideCaption') || slide;

    if (heading) {
      const h = document.createElement('h2');
      // Source headings put a decorative (different-font) leading word/phrase in
      // a <span>, e.g. <h2 class="heroHeading"><span>Amplify</span>Your Stay</h2>.
      // In EDS content that emphasis maps to <em>, with a space before the rest.
      const span = heading.querySelector(':scope > span');
      if (span && heading.firstElementChild === span) {
        const em = document.createElement('em');
        em.textContent = span.textContent.replace(/\s+/g, ' ').trim();
        const rest = heading.textContent.replace(span.textContent, '').replace(/\s+/g, ' ').trim();
        h.appendChild(em);
        if (rest) h.appendChild(document.createTextNode(` ${rest}`));
      } else {
        h.textContent = heading.textContent.replace(/\s+/g, ' ').trim();
      }
      textCell.push(h);
    }

    // Description paragraph(s) — inside caption, may be wrapped in a link
    const paras = Array.from(caption.querySelectorAll('p'));
    const seenP = new Set();
    paras.forEach((p) => {
      if (seenP.has(p)) return;
      seenP.add(p);
      const np = document.createElement('p');
      np.textContent = p.textContent.replace(/\s+/g, ' ').trim();
      if (np.textContent) textCell.push(np);
    });

    // CTA button (btnContainer). Avoid the sr-only slideImageLink.
    const cta = caption.querySelector('.btnContainer a, a.btn');
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

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel (hero)', cells });
  element.replaceWith(block);
}
