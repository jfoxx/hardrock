import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      // Image cell = a cell holding only a picture (or an empty placeholder);
      // any cell with heading/paragraph text is the card body.
      const hasText = div.querySelector('h1, h2, h3, h4, h5, h6, p');
      if (!hasText) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });

  // Style a standalone CTA link (its own paragraph) as a button so it picks up
  // the global solid-purple button treatment.
  ul.querySelectorAll('.cards-card-body p > a').forEach((a) => {
    const p = a.parentElement;
    if (p.tagName === 'P' && p.childNodes.length === 1) {
      a.className = 'button';
      p.classList.add('button-container');
    }
  });

  // Optimize only same-origin images. External/absolute image URLs (e.g. the
  // source CMS host) may not support the ?width/format/optimize query params
  // createOptimizedPicture appends, so leave those as plain <img>.
  ul.querySelectorAll('picture > img').forEach((img) => {
    let sameOrigin = false;
    try {
      sameOrigin = new URL(img.src, window.location.href).origin === window.location.origin;
    } catch (e) {
      sameOrigin = false;
    }
    if (sameOrigin) {
      img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
    }
  });
  block.replaceChildren(ul);
}
