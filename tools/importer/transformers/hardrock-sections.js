/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Hard Rock (hotel.hardrock.com) section breaks + section metadata.
 *
 * The daytona-beach template has 8 sections (see page-templates.json). This
 * inserts an <hr> before each non-first section and a Section Metadata block
 * after each section that carries a style (rc3 grey, rc4 light, rc5 grey,
 * rc7 accent).
 *
 * Breaks are inserted in beforeTransform (while every section element still
 * exists, before block parsers replace them) using a temporary marker; the
 * metadata blocks are inserted in afterTransform anchored to that marker.
 * Section selectors come directly from page-templates.json (DOM-verified
 * boundaries from page analysis).
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

export default function transform(hookName, element, payload) {
  const sections = (payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    // Insert breaks now, before parsers can replace any section element.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue; // first section: no leading break, no metadata
      const sectionEl = element.querySelector(section.selector);
      if (!sectionEl) continue; // selector didn't match on this page — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Parsers have now run and may have replaced section elements. Anchor each
    // styled section's Section Metadata block to the marker <hr> placed above,
    // or (first section, no marker inserted) the original element itself.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || element.querySelector(section.selector);
      if (!anchor) continue; // neither survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break
      }
    }
  }
}
