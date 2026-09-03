import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

// Default feed for the Daytona Beach calendar. Authors can override per-block
// with a `source` (or `feed`) row in the block.
const DEFAULT_FEED = '/daytona-beach/calendar-of-events/events-index.json';

/** Same-origin path for a (possibly absolute) feed image, so it loads via the current host. */
function samePath(src) {
  try {
    return new URL(src, window.location.href).pathname;
  } catch (e) {
    return src;
  }
}

/** The slug is the last path segment of an event, e.g. …/events/rob-hazen → "rob-hazen". */
function slugOf(event) {
  return event.path ? event.path.split('/').filter(Boolean).pop() : '';
}

/**
 * Format an event's date/time as e.g. "September 3, Thursday | 7:00 PM - 10:00 PM".
 * Feed timestamps have no zone (e.g. "2026-09-03T19:00") so they parse as local.
 */
function formatWhen(startStr, endStr) {
  const start = new Date(startStr);
  if (Number.isNaN(start.getTime())) return '';
  const month = start.toLocaleDateString('en-US', { month: 'long' });
  const weekday = start.toLocaleDateString('en-US', { weekday: 'long' });
  const datePart = `${month} ${start.getDate()}, ${weekday}`;

  const timeOpts = { hour: 'numeric', minute: '2-digit' };
  const startTime = start.toLocaleTimeString('en-US', timeOpts);
  const end = endStr ? new Date(endStr) : null;
  const timePart = end && !Number.isNaN(end.getTime())
    ? `${startTime} - ${end.toLocaleTimeString('en-US', timeOpts)}`
    : startTime;

  return `${datePart} | ${timePart}`;
}

/** Add the Buy Tickets button to a container if the event carries a ticket link. */
function appendTickets(container, event) {
  const tickets = event.tickets || event['buy-tickets'];
  if (!tickets) return;
  const buy = document.createElement('a');
  buy.className = 'button secondary';
  buy.href = tickets;
  buy.textContent = 'Buy Tickets';
  container.append(buy);
}

/** One event card for the list view. Details opens this same page filtered to the event. */
function buildCard(event, page) {
  const li = document.createElement('li');

  if (event.image) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'calendar-of-events-card-image';
    imageWrap.append(createOptimizedPicture(samePath(event.image), event.title || '', false, [{ width: '750' }]));
    li.append(imageWrap);
  }

  const body = document.createElement('div');
  body.className = 'calendar-of-events-card-body';

  if (event.title) {
    const title = document.createElement('h3');
    title.className = 'calendar-of-events-card-title';
    title.textContent = event.title;
    body.append(title);
  }

  const when = formatWhen(event['start-date-time'], event['end-date-time']);
  if (when) {
    const meta = document.createElement('p');
    meta.className = 'calendar-of-events-card-when';
    meta.textContent = when;
    body.append(meta);
  }

  const actions = document.createElement('p');
  actions.className = 'calendar-of-events-card-actions';
  const slug = slugOf(event);
  const details = document.createElement('a');
  details.className = 'button primary';
  details.href = slug ? `${page}?event=${encodeURIComponent(slug)}` : page;
  details.textContent = 'Details';
  actions.append(details);
  appendTickets(actions, event);
  body.append(actions);

  li.append(body);
  return li;
}

/** The full-width single-event detail view. */
function buildDetail(event, page) {
  const section = document.createElement('div');
  section.className = 'calendar-of-events-detail';

  const back = document.createElement('a');
  back.className = 'calendar-of-events-back';
  back.href = page;
  back.textContent = 'All Events';
  section.append(back);

  const layout = document.createElement('div');
  layout.className = 'calendar-of-events-detail-layout';

  if (event.image) {
    const media = document.createElement('div');
    media.className = 'calendar-of-events-detail-media';
    media.append(createOptimizedPicture(samePath(event.image), event.title || '', true, [{ width: '1200' }]));
    layout.append(media);
  }

  const body = document.createElement('div');
  body.className = 'calendar-of-events-detail-body';

  const title = document.createElement('h1');
  title.textContent = event.title || 'Event';
  body.append(title);

  const when = formatWhen(event['start-date-time'], event['end-date-time']);
  if (when) {
    const meta = document.createElement('p');
    meta.className = 'calendar-of-events-detail-when';
    meta.textContent = when;
    body.append(meta);
  }

  if (event.description) {
    const desc = document.createElement('p');
    desc.className = 'calendar-of-events-detail-desc';
    desc.textContent = event.description;
    body.append(desc);
  }

  const actions = document.createElement('p');
  actions.className = 'calendar-of-events-detail-actions';
  appendTickets(actions, event);
  if (actions.childElementCount) body.append(actions);

  layout.append(body);
  section.append(layout);
  return section;
}

/** Parse a "M/D/YYYY" param into {y, m, d}, or null if unparseable. */
function parseDateParam(value) {
  const parts = (value || '').split('/').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [m, d, y] = parts;
  return { y, m, d };
}

/** Categories on an event: supports a single `category` or comma-separated `categories`. */
function categoriesOf(event) {
  const raw = event.category || event.categories || '';
  return raw.split(',').map((c) => c.trim()).filter(Boolean);
}

/** True when an event falls in the given month/year. */
function isSameMonth(startStr, { y, m }) {
  const dt = new Date(startStr);
  return !Number.isNaN(dt.getTime()) && dt.getFullYear() === y && dt.getMonth() === m - 1;
}

/** Build a <select> with a leading "all" option plus [value, label] pairs; disabled if empty. */
function buildSelect(className, allLabel, options, selected) {
  const select = document.createElement('select');
  select.className = className;
  const all = document.createElement('option');
  all.value = '';
  all.textContent = allLabel;
  select.append(all);
  options.forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    if (value === selected) opt.selected = true;
    select.append(opt);
  });
  if (!options.length) select.disabled = true;
  return select;
}

/** Render the grid of cards (or an empty-state message) into `container`. */
function renderCards(container, events, page) {
  container.textContent = '';
  if (!events.length) {
    const empty = document.createElement('p');
    empty.className = 'calendar-of-events-empty';
    empty.textContent = 'No events match your filters.';
    container.append(empty);
    return;
  }
  const ul = document.createElement('ul');
  events.forEach((event) => ul.append(buildCard(event, page)));
  container.append(ul);
}

/** Reflect active filters in the URL without reloading (keeps deep links shareable). */
function syncUrl(date, category) {
  const params = new URLSearchParams(window.location.search);
  params.delete('event');
  if (date) params.set('date', date); else params.delete('date');
  if (category) params.set('category', category); else params.delete('category');
  const qs = params.toString();
  window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
}

/** List view with Date + Category filters sourced from the events themselves. */
function renderListView(block, events, page, initial) {
  // Distinct months, in chronological order, present in the feed (value = first of month).
  const seen = new Set();
  const dateOptions = [];
  events.forEach((e) => {
    const dt = new Date(e['start-date-time']);
    if (Number.isNaN(dt.getTime())) return;
    const key = `${dt.getMonth() + 1}/1/${dt.getFullYear()}`;
    if (!seen.has(key)) {
      seen.add(key);
      dateOptions.push([key, dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })]);
    }
  });

  // Distinct categories (empty until events carry a `category` field).
  const catSet = new Set();
  events.forEach((e) => categoriesOf(e).forEach((c) => catSet.add(c)));
  const catOptions = [...catSet].sort().map((c) => [c, c]);

  const filters = document.createElement('div');
  filters.className = 'calendar-of-events-filters';

  // Self-labeling dropdowns (no separate text label), category first like the source.
  const catSelect = buildSelect('calendar-of-events-filter-category', 'All Categories', catOptions, initial.category);
  catSelect.setAttribute('aria-label', 'Filter by category');
  const dateSelect = buildSelect('calendar-of-events-filter-date', 'All Dates', dateOptions, initial.date);
  dateSelect.setAttribute('aria-label', 'Filter by date');

  filters.append(catSelect, dateSelect);
  block.append(filters);

  const grid = document.createElement('div');
  grid.className = 'calendar-of-events-grid';
  block.append(grid);

  const apply = () => {
    const date = dateSelect.value;
    const category = catSelect.value;
    const month = date ? parseDateParam(date) : null;
    const filtered = events.filter((e) => {
      if (month && !isSameMonth(e['start-date-time'], month)) return false;
      if (category && !categoriesOf(e).includes(category)) return false;
      return true;
    });
    renderCards(grid, filtered, page);
    syncUrl(date, category);
  };

  dateSelect.addEventListener('change', apply);
  catSelect.addEventListener('change', apply);
  apply();
}

/**
 * loads and decorates the calendar-of-events block
 * @param {Element} block The calendar-of-events block element
 */
export default async function decorate(block) {
  const config = readBlockConfig(block);
  const feed = config.source || config.feed || DEFAULT_FEED;
  const limit = parseInt(config.limit, 10) || 0; // 0 = no cap
  block.textContent = '';

  const page = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const eventParam = params.get('event');
  const dateDay = parseDateParam(params.get('date'));
  const initialDate = dateDay ? `${dateDay.m}/1/${dateDay.y}` : '';
  const categoryParam = params.get('category') || '';

  let events = [];
  try {
    const resp = await fetch(feed);
    if (resp.ok) ({ data: events = [] } = await resp.json());
  } catch (e) {
    // leave events empty on failure
  }

  // Single-event detail view.
  if (eventParam) {
    const match = events.find((e) => slugOf(e) === eventParam);
    if (match) {
      block.append(buildDetail(match, page));
      return;
    }
    // fall through to the list if the slug doesn't match anything
  }

  // List view with Date + Category filters. Base set is upcoming events, soonest first.
  const now = Date.now();
  let upcoming = events
    .filter((e) => {
      const ref = new Date(e['end-date-time'] || e['start-date-time']).getTime();
      return Number.isNaN(ref) || ref >= now;
    })
    .sort((a, b) => new Date(a['start-date-time']) - new Date(b['start-date-time']));
  if (limit) upcoming = upcoming.slice(0, limit);

  renderListView(block, upcoming, page, { date: initialDate, category: categoryParam });
}
