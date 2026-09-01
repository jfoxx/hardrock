/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-event. Base block: cards.
 * Source: https://hotel.hardrock.com/daytona-beach/ (#hardRockCalendarEmbedWidget968462)
 * Generated: 2026-08-31
 *
 * Cards block: 2 columns. Row 1 = block name. Each subsequent row = one card:
 *   cell 1 = image (mandatory), cell 2 = text content (title heading, date/time, description, CTA).
 */
export default function parse(element, { document }) {
  const cells = [];

  // Each event is a card. Validated against source: div.calListDayEvent.
  const events = Array.from(element.querySelectorAll('.calListDayEvent'));

  events.forEach((event) => {
    // Cell 1: image
    const img = event.querySelector('.image img, img');

    // Cell 2: text content assembled from title, date/time, description, CTAs
    const textCell = [];

    const title = event.querySelector('.calListDayEventTitle, .calEventTitle');
    if (title) {
      const h = document.createElement('h3');
      h.textContent = title.textContent.trim();
      textCell.push(h);
    }

    // Date (h3 in source) rendered as a paragraph to keep card heading singular
    const date = event.querySelector('.eventDayTime .h3');
    if (date) {
      const p = document.createElement('p');
      p.textContent = date.textContent.trim();
      textCell.push(p);
    }

    // Time
    const time = event.querySelector('.calListDayEventTime');
    if (time) {
      const p = document.createElement('p');
      p.textContent = time.textContent.replace(/\s+/g, ' ').trim();
      textCell.push(p);
    }

    // Description
    const desc = event.querySelector('.calListDayEventDescription');
    if (desc) {
      const p = document.createElement('p');
      p.textContent = desc.textContent.replace(/\s+/g, ' ').trim();
      textCell.push(p);
    }

    // Location
    const loc = event.querySelector('.calListDayEventLocationName');
    if (loc && loc.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = loc.textContent.trim();
      textCell.push(p);
    }

    // CTA links (Details, Buy Tickets, etc.)
    const ctas = Array.from(event.querySelectorAll('.eventButtons a, a.calListDayEventLink, a.calListDayEventBookingLink'));
    // De-duplicate in case selectors overlap
    const seen = new Set();
    ctas.forEach((a) => {
      if (seen.has(a)) return;
      seen.add(a);
      const p = document.createElement('p');
      p.appendChild(a);
      textCell.push(p);
    });

    // Only add a card if it has an image or any text content
    if (img || textCell.length) {
      cells.push([img || '', textCell.length ? textCell : '']);
    }
  });

  // Empty-block guard
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-event', cells });
  element.replaceWith(block);
}
