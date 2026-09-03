import { createOptimizedPicture } from '../../scripts/aem.js';

// Offers feed keyed by promo code, and the Synxis booking engine the CTA points at
// (each card appends its own &promo=<code>).
const FEED = '/daytona-beach/offers/offers.json';
const BOOK_BASE = 'https://be.synxis.com/?Hotel=78302&Chain=13924';

/** Same-origin path for a (possibly absolute) feed image, so it loads via the current host. */
function samePath(src) {
  try {
    return new URL(src, window.location.href).pathname;
  } catch (e) {
    return src;
  }
}

/** Decode HTML entities the feed carries (e.g. &#x26;) into plain text. */
function decodeEntities(str) {
  if (!str) return '';
  const t = document.createElement('textarea');
  t.innerHTML = str;
  return t.value;
}

/** Synxis booking URL for an offer, with its promo code appended. */
function bookHref(offer) {
  return offer.promo ? `${BOOK_BASE}&promo=${encodeURIComponent(offer.promo)}` : BOOK_BASE;
}

/** Build the "More Info" modal: image, title, full details and a Book Now CTA. */
function buildModal(offer) {
  const dialog = document.createElement('dialog');
  dialog.className = 'offers-modal';
  const titleId = `offer-${(offer.promo || '').toLowerCase()}`;
  dialog.setAttribute('aria-labelledby', titleId);

  const inner = document.createElement('div');
  inner.className = 'offers-modal-inner';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'offers-modal-close';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '&times;';
  close.addEventListener('click', () => dialog.close());
  inner.append(close);

  if (offer.image) {
    const media = document.createElement('div');
    media.className = 'offers-modal-media';
    media.append(createOptimizedPicture(samePath(offer.image), decodeEntities(offer.title), false, [{ width: '1200' }]));
    inner.append(media);
  }

  const mBody = document.createElement('div');
  mBody.className = 'offers-modal-body';

  const title = document.createElement('h3');
  title.className = 'offers-modal-title';
  title.id = titleId;
  title.textContent = decodeEntities(offer.title);
  mBody.append(title);

  if (offer.details) {
    const details = document.createElement('p');
    details.className = 'offers-modal-details';
    details.textContent = decodeEntities(offer.details);
    mBody.append(details);
  }

  const actions = document.createElement('p');
  actions.className = 'offers-modal-actions';
  const book = document.createElement('a');
  book.className = 'button primary';
  book.href = bookHref(offer);
  book.textContent = 'Book Now';
  actions.append(book);
  mBody.append(actions);

  inner.append(mBody);
  dialog.append(inner);
  // click on the backdrop (outside the inner content) closes the modal
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  return dialog;
}

/** Build one offer card <li>. `featured` badges the highlighted offer. */
function buildCard(offer, featured) {
  const li = document.createElement('li');

  const imageWrap = document.createElement('div');
  imageWrap.className = 'offers-card-image';
  if (featured) {
    const badge = document.createElement('span');
    badge.className = 'offers-card-badge';
    badge.textContent = 'Featured Offer';
    imageWrap.append(badge);
  }
  if (offer.image) {
    imageWrap.append(createOptimizedPicture(samePath(offer.image), decodeEntities(offer.title), false, [{ width: '750' }]));
  }
  li.append(imageWrap);

  const body = document.createElement('div');
  body.className = 'offers-card-body';

  const title = document.createElement('h3');
  title.className = 'offers-card-title';
  title.textContent = decodeEntities(offer.title);
  body.append(title);

  if (offer.summary) {
    const summary = document.createElement('p');
    summary.className = 'offers-card-summary';
    summary.textContent = decodeEntities(offer.summary);
    body.append(summary);
  }

  const actions = document.createElement('p');
  actions.className = 'offers-card-actions';

  const book = document.createElement('a');
  book.className = 'button primary';
  book.href = bookHref(offer);
  book.textContent = 'Book Now';
  actions.append(book);

  let modal;
  if (offer.details) {
    modal = buildModal(offer);
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'button secondary offers-more';
    more.textContent = 'More Info';
    more.addEventListener('click', () => modal.showModal());
    actions.append(more);
  }

  body.append(actions);
  li.append(body);
  if (modal) li.append(modal);
  return li;
}

/**
 * loads and decorates the offers block
 * @param {Element} block The offers block element
 */
export default async function decorate(block) {
  // Each authored row holds a promo code (e.g. FLGAR); order is preserved.
  // A bolded code (<strong>) marks that offer as featured.
  const entries = [...block.children]
    .map((row) => ({
      code: row.textContent.trim().toUpperCase(),
      featured: !!row.querySelector('strong, b'),
    }))
    .filter((entry) => entry.code);
  block.textContent = '';

  let data = [];
  try {
    const resp = await fetch(FEED);
    if (resp.ok) ({ data = [] } = await resp.json());
  } catch (e) {
    // leave empty on failure
  }

  const byPromo = new Map(data.map((o) => [(o.promo || '').toUpperCase(), o]));
  const offers = entries
    .map((entry) => {
      const offer = byPromo.get(entry.code);
      return offer ? { offer, featured: entry.featured } : null;
    })
    .filter(Boolean);
  if (!offers.length) return;

  const ul = document.createElement('ul');
  offers.forEach(({ offer, featured }) => ul.append(buildCard(offer, featured)));
  block.append(ul);
}
