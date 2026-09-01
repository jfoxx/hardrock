/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsEventParser from './parsers/cards-event.js';
import cardsExploreParser from './parsers/cards-explore.js';
import cardsRoomsParser from './parsers/cards-rooms.js';
import carouselHeroParser from './parsers/carousel-hero.js';
import columnsPromoParser from './parsers/columns-promo.js';
import columnsIntroParser from './parsers/columns.js';
import columnsNavbarParser from './parsers/columns-navbar.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/hardrock-cleanup.js';
import sectionsTransformer from './transformers/hardrock-sections.js';

// PARSER REGISTRY — keys are per-instance routing ids (block.name below), each
// mapping to the parser that emits the correct EDS block. Several instances
// resolve to the same base block (columns / cards) with different variants.
// Note: 'widget' has no parser — the booking bar and email-signup are dynamic
// third-party widgets with no static authorable content, so they are skipped.
const parsers = {
  'carousel-hero': carouselHeroParser,       // -> carousel (hero)
  'columns-intro': columnsIntroParser,       // -> columns
  'cards-rooms': cardsRoomsParser,           // -> cards (feature)
  'columns-promo': columnsPromoParser,       // -> columns (promo splits)
  'cards-explore': cardsExploreParser,       // -> cards
  'cards-event': cardsEventParser,           // -> cards-event
  'columns-navbar': columnsNavbarParser,     // -> columns (navbar)
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json.
// block.name is the routing id into the parser registry above (NOT the final
// EDS block name, which each parser sets via createBlock).
const PAGE_TEMPLATE = {
  name: 'daytona-beach',
  description: 'Hard Rock Hotel Daytona Beach homepage: hero carousel + booking bar, two-column intro, rooms feature card, alternating promo columns, resort cards, events cards, email signup band, and utility nav strip.',
  urls: [
    'https://hotel.hardrock.com/daytona-beach/',
  ],
  blocks: [
    { name: 'carousel-hero', instances: ['#vizADAHeroCarousel2Widget1442910'] },
    { name: 'columns-intro', instances: ['#pageIntro .container > .row'] },
    { name: 'cards-rooms', instances: ['#custom1 .row-eq-height'] },
    { name: 'columns-promo', instances: ['#hardrockSplitWidget968226'] },
    { name: 'cards-explore', instances: ['#hardrockCtaCarouselWidget969132'] },
    { name: 'cards-event', instances: ['#hardRockCalendarEmbedWidget968462'] },
    { name: 'columns-navbar', instances: ['#custom7 .footerRow1'] },
  ],
  sections: [
    { id: 'rc1', name: 'Hero carousel + booking bar', selector: '#pageid123997 > header.container-fluid', style: null, blocks: ['carousel-hero', 'widget'], defaultContent: [] },
    { id: 'rc2', name: 'Page intro (two columns)', selector: '#pageIntro', style: null, blocks: ['columns-intro'], defaultContent: [] },
    { id: 'rc3', name: 'Rooms & Suites feature', selector: '#custom1', style: 'shaded', blocks: ['cards-rooms'], defaultContent: ['#custom1 .ctaCarouselHeading'] },
    { id: 'rc4', name: 'Promotional splits', selector: '#custom2', style: 'light', blocks: ['columns-promo'], defaultContent: [] },
    { id: 'rc5', name: 'Explore the resort', selector: '#custom3', style: 'shaded', blocks: ['cards-explore'], defaultContent: ['#custom3 .ctaCarouselHeading'] },
    { id: 'rc6', name: 'Events that rock', selector: '#custom4', style: null, blocks: ['cards-event'], defaultContent: ['#custom4 .calEmbedHeading'] },
    { id: 'rc7', name: 'Email signup band', selector: '#custom5', style: 'accent', blocks: ['widget'], defaultContent: [] },
    { id: 'rc8', name: 'Utility nav strip', selector: '#custom7', style: null, blocks: ['columns-navbar'], defaultContent: [] },
  ],
};

// TRANSFORMER REGISTRY - cleanup first, sections after
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup + section break markers)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // Already replaced by earlier parser
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path (map homepage root to /index)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
