// Single-offer preview. Renders one card exactly like an offers-block card, from
// the offer page's own authored rows (title, summary, details, image, promo) — so
// authors can preview how their offer will look once added to the offers block.

// Synxis booking engine the CTA points at (card appends &promo=<code>).
const BOOK_BASE = 'https://be.synxis.com/?Hotel=78302&Chain=13924';

/** Synxis booking URL for a promo code. */
function bookHref(promo) {
  return promo ? `${BOOK_BASE}&promo=${encodeURIComponent(promo)}` : BOOK_BASE;
}

/** Read the block's key/value rows into { title, summary, details, image, promo }. */
function readOffer(block) {
  const offer = {};
  [...block.children].forEach((row) => {
    const cells = row.children;
    if (cells.length < 2) return;
    const [keyCell, value] = cells;
    const key = keyCell.textContent.trim().toLowerCase();
    offer[key] = value;
  });
  return offer;
}

/** Build the "More Info" modal: image, title, full details and a Book Now CTA. */
function buildModal(picture, title, detailsCell, promo) {
  const dialog = document.createElement('dialog');
  dialog.className = 'offer-modal';

  const inner = document.createElement('div');
  inner.className = 'offer-modal-inner';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'offer-modal-close';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '&times;';
  close.addEventListener('click', () => dialog.close());
  inner.append(close);

  if (picture) {
    const media = document.createElement('div');
    media.className = 'offer-modal-media';
    media.append(picture);
    inner.append(media);
  }

  const body = document.createElement('div');
  body.className = 'offer-modal-body';

  if (title) {
    const heading = document.createElement('h3');
    heading.className = 'offer-modal-title';
    heading.textContent = title;
    body.append(heading);
  }

  if (detailsCell) {
    const details = document.createElement('div');
    details.className = 'offer-modal-details';
    // Details is authored rich content (paragraphs, lists, bolded promo) — keep it.
    while (detailsCell.firstChild) details.append(detailsCell.firstChild);
    body.append(details);
  }

  const actions = document.createElement('p');
  actions.className = 'offer-modal-actions';
  const book = document.createElement('a');
  book.className = 'button primary';
  book.href = bookHref(promo);
  book.textContent = 'Book Now';
  actions.append(book);
  body.append(actions);

  inner.append(body);
  dialog.append(inner);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  return dialog;
}

/**
 * loads and decorates the offer block
 * @param {Element} block The offer block element
 */
export default function decorate(block) {
  const offer = readOffer(block);
  const title = offer.title ? offer.title.textContent.trim() : '';
  const summary = offer.summary ? offer.summary.textContent.trim() : '';
  const promo = offer.promo ? offer.promo.textContent.trim() : '';
  const picture = offer.image ? offer.image.querySelector('picture, img') : null;
  const hasDetails = offer.details && offer.details.textContent.trim();

  block.textContent = '';

  const card = document.createElement('div');
  card.className = 'offer-card';

  if (picture) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'offer-card-image';
    imageWrap.append(picture);
    card.append(imageWrap);
  }

  const body = document.createElement('div');
  body.className = 'offer-card-body';

  if (title) {
    const heading = document.createElement('h3');
    heading.className = 'offer-card-title';
    heading.textContent = title;
    body.append(heading);
  }

  if (summary) {
    const summaryEl = document.createElement('p');
    summaryEl.className = 'offer-card-summary';
    summaryEl.textContent = summary;
    body.append(summaryEl);
  }

  const actions = document.createElement('p');
  actions.className = 'offer-card-actions';

  const book = document.createElement('a');
  book.className = 'button primary';
  book.href = bookHref(promo);
  book.textContent = 'Book Now';
  actions.append(book);

  if (hasDetails) {
    // Card image is reused in the modal via a clone so both show the picture.
    const modal = buildModal(picture ? picture.cloneNode(true) : null, title, offer.details, promo);
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'button secondary offer-more';
    more.textContent = 'More Info';
    more.addEventListener('click', () => modal.showModal());
    actions.append(more);
    card.append(modal);
  }

  body.append(actions);
  card.append(body);
  block.append(card);
}
