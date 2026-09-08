import { readBlockConfig } from '../../scripts/aem.js';

// Hard Rock reservation engine. Chain is constant across all Hard Rock hotels;
// the author supplies the hotel id. Other params are fixed defaults.
const BOOKING_BASE = 'https://hotel.reservations.hardrock.com/';
const CHAIN = '13924';

/** Zero-padded YYYY-MM-DD for today (native date input value format). */
function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Build a <select> of numeric options. */
function numberSelect(className, min, max, selected) {
  const select = document.createElement('select');
  select.className = className;
  for (let i = min; i <= max; i += 1) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = String(i);
    if (String(i) === selected) option.selected = true;
    select.append(option);
  }
  return select;
}

/** A labelled field (uppercase label above the control). */
function field(labelText, control) {
  const label = document.createElement('label');
  label.className = 'booking-field';
  const span = document.createElement('span');
  span.className = 'booking-label';
  span.textContent = labelText;
  label.append(span, control);
  return label;
}

/**
 * loads and decorates the booking-bar block
 * @param {Element} block The booking-bar block element
 */
export default function decorate(block) {
  const config = readBlockConfig(block);
  const hotel = config.hotel || '';
  const chain = config.chain || CHAIN;
  block.textContent = '';

  const form = document.createElement('form');
  form.className = 'booking-bar-form';

  const arrival = document.createElement('input');
  arrival.type = 'date';
  arrival.className = 'booking-arrival';
  arrival.required = true;
  arrival.min = todayISO();

  const departure = document.createElement('input');
  departure.type = 'date';
  departure.className = 'booking-departure';
  departure.required = true;
  departure.min = todayISO();

  // Keep departure on/after arrival.
  arrival.addEventListener('change', () => {
    departure.min = arrival.value || todayISO();
    if (departure.value && departure.value <= arrival.value) departure.value = '';
  });

  const rooms = numberSelect('booking-rooms', 1, 4, '1');
  const adults = numberSelect('booking-adults', 1, 6, '1');
  const kids = numberSelect('booking-kids', 0, 4, '0');

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'booking-submit';
  submit.textContent = 'Check Rates';

  form.append(
    field('Arrival', arrival),
    field('Departure', departure),
    field('Rooms', rooms),
    field('Adults', adults),
    field('Kids', kids),
    submit,
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const params = new URLSearchParams({
      hotel,
      chain,
      arrive: arrival.value,
      depart: departure.value,
      adult: adults.value,
      child: kids.value,
      rooms: rooms.value,
      currency: 'USD',
      productcurrency: 'USD',
      level: 'hotel',
      locale: 'en-US',
      segment: 'noMealPlanAssigned',
    });
    window.open(`${BOOKING_BASE}?${params.toString()}`, '_blank', 'noopener');
  });

  block.append(form);

  // Straddle the hero: pull the bar up by half its height so it overlaps the
  // content above it (the carousel shares this section), layered on top. Height is
  // dynamic and the section is display:none at decorate time, so a ResizeObserver
  // recomputes once it's visible and whenever it reflows. Desktop only; on narrow
  // screens the bar stacks normally.
  const wrapper = block.closest('.booking-bar-wrapper') || block.parentElement;
  const overlapMQ = window.matchMedia('(min-width: 700px)');
  const applyOverlap = () => {
    const h = block.getBoundingClientRect().height;
    if (overlapMQ.matches && h > 0) {
      wrapper.style.position = 'relative';
      wrapper.style.zIndex = '3';
      wrapper.style.marginTop = `${-Math.round(h / 2)}px`;
    } else {
      wrapper.style.position = '';
      wrapper.style.zIndex = '';
      wrapper.style.marginTop = '';
    }
  };
  new ResizeObserver(applyOverlap).observe(block);
  overlapMQ.addEventListener('change', applyOverlap);
}
