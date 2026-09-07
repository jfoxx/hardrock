import { getMetadata } from '../../scripts/aem.js';

// Synxis booking base, shared with the offers block.
const BOOK_BASE = 'https://be.synxis.com/?Hotel=78302&Chain=13924';

// Add ?tdebug to any URL to log the offer-slide pipeline to the console.
const TDEBUG = new URLSearchParams(window.location.search).has('tdebug');

/** Resolve a relative asset URL against the fragment's folder, kept same-origin. */
function rebaseUrl(u, folder) {
  if (!u || /^(https?:)?\/\//.test(u) || u.startsWith('/')) return u;
  const abs = new URL(u, `${window.location.origin}${folder}`);
  return abs.pathname + abs.search;
}

/** Rebase every source/img in a picture that came from a fetched fragment. */
function rebasePicture(picture, folder) {
  picture.querySelectorAll('source[srcset]').forEach((s) => {
    s.setAttribute('srcset', rebaseUrl(s.getAttribute('srcset'), folder));
  });
  const img = picture.querySelector('img');
  if (img) img.setAttribute('src', rebaseUrl(img.getAttribute('src'), folder));
}

/** Decode HTML entities the feed carries (e.g. &#x26;) into plain text. */
function decodeEntities(str) {
  const t = document.createElement('textarea');
  t.innerHTML = str || '';
  return t.value;
}

/** Synxis booking URL for a promo code. */
function bookHref(promo) {
  return promo ? `${BOOK_BASE}&promo=${encodeURIComponent(promo)}` : BOOK_BASE;
}

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    if (idx !== slideIndex) {
      button.removeAttribute('disabled');
      button.removeAttribute('aria-current');
    } else {
      button.setAttribute('disabled', true);
      button.setAttribute('aria-current', true);
    }
  });
}

export function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (!slideIndicators) return null;

  // Auto-advance (hero only): step slides every 5s. Pauses on hover, and stops
  // permanently once the user takes control via the arrows or indicators.
  const autoplay = block.classList.contains('hero')
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let autoplayTimer = null;
  let autoplayStopped = false;

  const startAutoplay = () => {
    if (autoplay && !autoplayStopped && !autoplayTimer) {
      autoplayTimer = setInterval(() => {
        showSlide(block, (parseInt(block.dataset.activeSlide, 10) || 0) + 1);
      }, 5000);
    }
  };
  const pauseAutoplay = () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  };
  const stopAutoplay = () => {
    autoplayStopped = true;
    pauseAutoplay();
  };

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      stopAutoplay();
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    stopAutoplay();
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    stopAutoplay();
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(entry.target);
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });

  if (autoplay) {
    block.addEventListener('mouseenter', pauseAutoplay);
    block.addEventListener('mouseleave', startAutoplay);
    startAutoplay();
  }

  // Expose hooks so a later-added (e.g. Target-personalized) slide can be wired.
  return { observer: slideObserver, stop: stopAutoplay };
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

/** Parse a raw `.offer` block (as authored / as Target injects it) into slide fields. */
function offerFromBlock(offerEl) {
  const fields = {};
  [...offerEl.children].forEach((row) => {
    const cells = row.children;
    if (cells.length < 2) return;
    const [keyCell, value] = cells;
    fields[keyCell.textContent.trim().toLowerCase()] = value;
  });
  return {
    title: fields.title ? fields.title.textContent.trim() : '',
    // keep the authored title markup (e.g. <em>) so the slide can render the
    // accent word in the decorative script font like the other hero slides
    titleEl: fields.title || null,
    summary: fields.summary ? fields.summary.textContent.trim() : '',
    promo: fields.promo ? fields.promo.textContent.trim() : '',
    picture: fields.image ? fields.image.querySelector('picture, img') : null,
  };
}

/**
 * Fashion an offer into the first hero slide and wire it into the running carousel
 * (indicator, active-slide observer, autoplay). Runs at most once per carousel.
 */
function buildSlideFromOffer(block, cid, controls, offer) {
  if (!controls || !offer.picture || block.dataset.targetedSlideAdded) return;
  block.setAttribute('data-targeted-slide-added', 'true');

  const title = decodeEntities(offer.title);
  const summary = decodeEntities(offer.summary) || title;

  const row = document.createElement('div');
  const imageCol = document.createElement('div');
  imageCol.append(offer.picture);
  const contentCol = document.createElement('div');
  const heading = document.createElement('h2');
  if (offer.titleEl) {
    // move the authored title nodes (text + <em>) in, preserving the markup
    while (offer.titleEl.firstChild) heading.append(offer.titleEl.firstChild);
  } else {
    heading.textContent = title;
  }
  const caption = document.createElement('p');
  const link = document.createElement('a');
  link.href = bookHref(offer.promo);
  link.textContent = summary;
  caption.append(link);
  contentCol.append(heading, caption);
  row.append(imageCol, contentCol);

  const slidesWrapper = block.querySelector('.carousel-slides');
  const slide = createSlide(row, 0, cid);
  slide.classList.add('carousel-slide-targeted');
  slidesWrapper.prepend(slide); // featured offer goes first

  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (slideIndicators) {
    const indicator = document.createElement('li');
    indicator.classList.add('carousel-slide-indicator');
    indicator.innerHTML = '<button type="button" aria-label="Featured offer"></button>';
    indicator.querySelector('button').addEventListener('click', (e) => {
      controls.stop();
      showSlide(block, parseInt(e.currentTarget.parentElement.dataset.targetSlide, 10));
    });
    slideIndicators.prepend(indicator);
  }

  // Renumber slides + indicators by DOM order so navigation stays in sync.
  block.querySelectorAll('.carousel-slide').forEach((s, i) => {
    s.setAttribute('data-slide-index', i);
    s.setAttribute('id', `carousel-${cid}-slide-${i}`);
    const h = s.querySelector('h1, h2, h3, h4, h5, h6');
    if (h) {
      if (!h.id) h.setAttribute('id', `carousel-${cid}-slide-${i}-title`);
      s.setAttribute('aria-labelledby', h.id);
    }
  });
  block.querySelectorAll('.carousel-slide-indicator').forEach((ind, i) => {
    ind.setAttribute('data-target-slide', i);
  });

  controls.observer.observe(slide);
  // Open on the featured slide.
  block.setAttribute('data-active-slide', '0');
  slidesWrapper.scrollTo({ left: 0, behavior: 'instant' });
}

/**
 * Fetch an offer XF and inject its raw `.offer` HTML into the slot — used only to
 * simulate a Target injection for local testing via ?offer-xf=<path>.
 */
async function injectTestOffer(path, slot) {
  try {
    const clean = path.replace(/\.plain\.html$/, '').replace(/\/+$/, '');
    const resp = await fetch(`${clean}.plain.html`);
    if (!resp.ok) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = await resp.text();
    const offerEl = tmp.querySelector('.offer');
    if (!offerEl) return;
    // The test XF has media relative to its own folder; rebase so it renders here.
    const folder = new URL(clean, window.location.origin).pathname.replace(/[^/]+$/, '');
    const picture = offerEl.querySelector('picture');
    if (picture) rebasePicture(picture, folder);
    slot.append(offerEl);
  } catch (e) {
    // ignore — nothing to preview
  }
}

/**
 * Watch for a Target-injected `.offer` block and turn it into the first hero slide.
 * Target injects the offer XF's HTML into the page (into `.carousel-offer-slot`, or
 * anywhere in <main>); we consume it, build the slide, and remove the raw markup.
 * A ?offer-xf=<path> param simulates the injection for local testing.
 */
function watchForInjectedOffer(block, cid, controls) {
  if (!controls) return;
  const param = new URLSearchParams(window.location.search).get('offer-xf');
  if (!param && !getMetadata('target')) return;

  const slot = document.createElement('div');
  slot.className = 'carousel-offer-slot';
  slot.hidden = true;
  block.append(slot);
  // eslint-disable-next-line no-console
  if (TDEBUG) console.log('[carousel] offer watcher armed (waiting for injected .offer)');

  const consume = () => {
    // Target may inject the offer anywhere (slot, main, or body) — find it wherever it lands.
    const offerEl = document.querySelector('.offer');
    if (!offerEl) return false;
    // eslint-disable-next-line no-console
    if (TDEBUG) console.log('[carousel] consuming injected .offer → building slide', offerEl);
    buildSlideFromOffer(block, cid, controls, offerFromBlock(offerEl));
    offerEl.remove(); // its picture was moved into the slide; drop the raw markup
    return true;
  };

  const observer = new MutationObserver(() => {
    if (consume()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (param) injectTestOffer(param, slot);
  else if (consume()) observer.disconnect();
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  const placeholders = {};

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', placeholders.carouselSlideControls || 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class= "slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
      <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
    `;

    container.append(slideNavButtons);
  }

  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${rows.length}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    const controls = bindEvents(block);
    // Hero carousel only: turn a Target-injected offer XF into the first slide.
    if (block.classList.contains('hero')) {
      watchForInjectedOffer(block, carouselId, controls);
    }
  }
}
