/* eslint-disable import/no-unresolved */

import DA_SDK from 'https://da.live/nx/utils/sdk.js';

// Offers index (same feed the offers block reads), keyed by promo code.
// Relative so it resolves same-origin — via the aem host in DA and the proxy in dev.
const FEED = '/daytona-beach/offers/offers.json';

/** Detects standalone mode (opened directly, not inside the DA iframe). */
function isStandalone() {
  return window.self === window.top;
}

/** Mock actions so the picker can be opened directly for testing. */
const mockActions = {
  sendText: (text) => {
    // eslint-disable-next-line no-console
    console.log('sendText called with:', text);
    // eslint-disable-next-line no-alert
    alert(`Inserted: ${text}`);
  },
  closeLibrary: () => {
    // eslint-disable-next-line no-console
    console.log('closeLibrary called');
  },
};

/** Decode HTML entities the feed carries (e.g. &#x26;) into plain text. */
function decodeEntities(str) {
  const t = document.createElement('textarea');
  t.innerHTML = str || '';
  return t.value;
}

/** Smaller thumbnail variant of a feed image URL. */
function thumb(url) {
  return url ? url.replace(/width=\d+/, 'width=400') : '';
}

/** Fetch the offers from the index feed. */
async function loadOffers() {
  const resp = await fetch(FEED);
  if (!resp.ok) throw new Error(`Feed responded ${resp.status}`);
  const { data = [] } = await resp.json();
  return data;
}

/** Insert a promo code into the document and close the library. */
function insertPromo(actions, promo, feedback) {
  if (!actions?.sendText) {
    feedback.textContent = 'Cannot insert: editor not available';
    feedback.className = 'feedback error';
    return;
  }
  actions.sendText(promo);
  feedback.textContent = `Inserted ${promo}`;
  feedback.className = 'feedback success';
  setTimeout(() => actions.closeLibrary(), 400);
}

/** Build one clickable promo card. */
function buildCard(offer, actions, feedback) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'promo-card';
  card.title = `Insert ${offer.promo}`;

  const media = document.createElement('span');
  media.className = 'promo-card-media';
  if (offer.image) {
    const img = document.createElement('img');
    img.src = thumb(offer.image);
    img.alt = '';
    img.loading = 'lazy';
    media.append(img);
  }

  const body = document.createElement('span');
  body.className = 'promo-card-body';

  const title = document.createElement('span');
  title.className = 'promo-card-title';
  title.textContent = decodeEntities(offer.title);

  const code = document.createElement('span');
  code.className = 'promo-card-code';
  code.textContent = offer.promo;

  body.append(title, code);
  card.append(media, body);
  card.addEventListener('click', () => insertPromo(actions, offer.promo, feedback));
  return card;
}

/** Render the grid, optionally filtered by a search term. */
function render(grid, offers, actions, feedback, term = '') {
  const q = term.trim().toLowerCase();
  const filtered = q
    ? offers.filter((o) => `${o.title} ${o.promo}`.toLowerCase().includes(q))
    : offers;
  grid.textContent = '';
  if (!filtered.length) {
    feedback.textContent = 'No matching promos';
    feedback.className = 'feedback';
    return;
  }
  feedback.textContent = '';
  feedback.className = 'feedback';
  filtered.forEach((offer) => grid.append(buildCard(offer, actions, feedback)));
}

(async function init() {
  let actions;
  if (isStandalone()) {
    // eslint-disable-next-line no-console
    console.log('Promo Picker running in standalone mode (testing)');
    actions = mockActions;
  } else {
    const sdk = await DA_SDK;
    actions = sdk.actions;
  }

  const grid = document.getElementById('promo-grid');
  const search = document.getElementById('promo-search');
  const feedback = document.getElementById('feedback');

  let offers = [];
  try {
    offers = await loadOffers();
  } catch (e) {
    feedback.textContent = 'Could not load offers index';
    feedback.className = 'feedback error';
    return;
  }

  render(grid, offers, actions, feedback);
  search.addEventListener('input', () => render(grid, offers, actions, feedback, search.value));
}());
