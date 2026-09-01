/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the two-column page intro. Base block: columns (no variant modifier).
 * Source: https://hotel.hardrock.com/daytona-beach/ (#pageIntro .container > .row)
 * Generated: 2026-08-31
 *
 * Columns block: content presented side by side. First row = block name.
 * Second row = the columns (one cell per visual column).
 * Source has a two-column intro: left = heading, right = subheading + description.
 */
/**
 * Source headings put a decorative (different-font) leading word/phrase in a
 * <span>, e.g. <h1><span>Beach Paradise</span>Hard Rock Hotel Daytona Beach</h1>.
 * In EDS content that emphasis maps to <em>. Convert the leading <span> to an
 * <em> and insert a space before the remaining text so the two parts don't run
 * together (spans are otherwise flattened away by the html→md conversion).
 */
function emphasizeHeadings(root, document) {
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    const span = h.querySelector(':scope > span');
    if (!span || h.firstElementChild !== span) return;
    const em = document.createElement('em');
    em.textContent = span.textContent.replace(/\s+/g, ' ').trim();
    span.replaceWith(em);
    // Ensure a single space separates the em from the following text.
    const next = em.nextSibling;
    if (next && next.nodeType === 3) {
      next.textContent = ` ${next.textContent.replace(/^\s+/, '')}`;
    } else if (next) {
      em.after(document.createTextNode(' '));
    }
  });
}

export default function parse(element, { document }) {
  element.querySelectorAll('style, script, link, noscript').forEach((n) => n.remove());
  emphasizeHeadings(element, document);

  // The intro row uses Bootstrap grid columns (col-sm-*). Each becomes a column cell.
  // Validated against source: div.introText.row > div.col-*.
  let cols = Array.from(element.querySelectorAll('.introText > [class*="col-"]'));
  // Fallback: any direct grid columns under the widget
  if (!cols.length) {
    cols = Array.from(element.querySelectorAll('[class*="col-xs-"], [class*="col-sm-"]'))
      .filter((c) => c.querySelector('h1, h2, h3, h4, p, span'));
  }

  const rowCells = [];
  cols.forEach((col) => {
    const cellContent = [];
    // Drop screen-reader-only headings that duplicate the visible heading
    col.querySelectorAll('.sr-only').forEach((n) => n.remove());
    Array.from(col.children).forEach((child) => {
      if (child.textContent && child.textContent.trim()) cellContent.push(child);
    });
    // If no element children, fall back to the column itself
    rowCells.push(cellContent.length ? cellContent : col);
  });

  // Empty-block guard: bail if no columns, or none of the columns have real text.
  // The instances[] selector can match more than one .row; only the row that
  // actually contains intro content should become a columns block.
  const hasText = rowCells.some((cell) => {
    const nodes = Array.isArray(cell) ? cell : [cell];
    return nodes.some((n) => n && n.textContent && n.textContent.trim());
  });
  if (!rowCells.length || !hasText) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [rowCells];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
