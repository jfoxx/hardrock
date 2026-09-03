import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

// Default feed for the Daytona Beach calendar. Authors can override per-block
// with a `source` (or `feed`) row in the block.
const DEFAULT_FEED = '/daytona-beach/calendar-of-events/events-index.json';

/**
 * Format an event's date/time as e.g. "September 3, Thursday | 7:00 PM - 10:00 PM".
 * The feed timestamps have no zone (e.g. "2026-09-03T19:00") so they parse as local.
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

/** Build one event card <li>. */
function buildCard(event, calendarBase) {
  const li = document.createElement('li');

  if (event.image) {
    // Use the image's path (not the feed's absolute host) so it loads same-origin
    // — via the local proxy in dev and the current host in production.
    let src = event.image;
    try {
      src = new URL(event.image, window.location.href).pathname;
    } catch (e) {
      // keep the raw value if it isn't a parseable URL
    }
    const imageWrap = document.createElement('div');
    imageWrap.className = 'events-card-image';
    imageWrap.append(createOptimizedPicture(src, event.title || '', false, [{ width: '750' }]));
    li.append(imageWrap);
  }

  const body = document.createElement('div');
  body.className = 'events-card-body';

  if (event.title) {
    const title = document.createElement('h3');
    title.className = 'events-card-title';
    title.textContent = event.title;
    body.append(title);
  }

  const when = formatWhen(event['start-date-time'], event['end-date-time']);
  if (when) {
    const meta = document.createElement('p');
    meta.className = 'events-card-when';
    meta.textContent = when;
    body.append(meta);
  }

  const actions = document.createElement('p');
  actions.className = 'events-card-actions';
  // Details opens the calendar page filtered to this event (?event=<slug>),
  // mirroring the source site rather than linking to the event page directly.
  const slug = event.path ? event.path.split('/').filter(Boolean).pop() : '';
  const details = document.createElement('a');
  details.className = 'button primary';
  details.href = slug ? `${calendarBase}?event=${encodeURIComponent(slug)}` : calendarBase;
  details.textContent = 'Details';
  actions.append(details);
  // The index feed carries no ticket link today; render Buy Tickets only if one appears.
  const tickets = event.tickets || event['buy-tickets'];
  if (tickets) {
    const buy = document.createElement('a');
    buy.className = 'button secondary';
    buy.href = tickets;
    buy.textContent = 'Buy Tickets';
    actions.append(buy);
  }
  if (actions.childElementCount) body.append(actions);

  li.append(body);
  return li;
}

/**
 * loads and decorates the events block
 * @param {Element} block The events block element
 */
export default async function decorate(block) {
  const config = readBlockConfig(block);
  const feed = config.source || config.feed || DEFAULT_FEED;
  const limit = parseInt(config.limit, 10) || 3;
  block.textContent = '';

  // The calendar page is the folder that holds the feed (…/calendar-of-events/).
  const calendarBase = new URL(feed, window.location.href).pathname.replace(/[^/]+$/, '');

  let events = [];
  try {
    const resp = await fetch(feed);
    if (resp.ok) ({ data: events = [] } = await resp.json());
  } catch (e) {
    // leave events empty on failure
  }

  const now = Date.now();
  events = events
    // keep events that haven't finished yet (fall back to start time)
    .filter((e) => {
      const ref = new Date(e['end-date-time'] || e['start-date-time']).getTime();
      return Number.isNaN(ref) || ref >= now;
    })
    .sort((a, b) => new Date(a['start-date-time']) - new Date(b['start-date-time']))
    .slice(0, limit);

  if (!events.length) return;

  const ul = document.createElement('ul');
  events.forEach((event) => ul.append(buildCard(event, calendarBase)));
  block.append(ul);
}
