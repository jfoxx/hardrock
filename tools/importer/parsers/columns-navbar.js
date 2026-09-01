/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the columns (navbar) variant. Base block: columns, modifier: navbar.
 * Source: https://hotel.hardrock.com/daytona-beach/ (#custom7 .footerRow1)
 * Generated: 2026-08-31
 *
 * Columns block: content side by side. First row = block name.
 * Second row = the columns. Source footerRow1 has three Bootstrap columns:
 *   col 1 = logo + location, col 2 = nav link list, col 3 = address + social icons.
 *
 * Note: on the live page the footer is injected by JS and #custom7 .footerRow1 is empty
 * at load time (so the automatic validator reports "no results"). The import runs against
 * the scraped/cleaned DOM where footerRow1 is fully populated with the three columns below.
 */
export default function parse(element, { document }) {
  element.querySelectorAll('style, script, link, noscript').forEach((n) => n.remove());

  // element is the .footerRow1 (per instances[] selector). Its columns are col-sm-4 footerColN.
  // Prefer the explicit footer columns; fall back to any Bootstrap grid columns, then
  // to the row's direct children.
  let cols = Array.from(element.querySelectorAll('[class*="footerCol"]'));
  if (!cols.length) {
    cols = Array.from(element.querySelectorAll('[class*="col-sm-"], [class*="col-md-"], [class*="col-xs-"]'));
  }
  if (!cols.length) {
    cols = Array.from(element.children);
  }

  // Keep only columns that carry real content (text, image, or link).
  const rowCells = cols
    .filter((col) => (col.textContent && col.textContent.trim()) || col.querySelector('img, a'))
    .map((col) => col);

  // Empty-block guard
  if (!rowCells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [rowCells];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns (navbar)', cells });
  element.replaceWith(block);
}
