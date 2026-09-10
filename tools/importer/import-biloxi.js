/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import columnsIntroParser from './parsers/columns.js';
import cardsOverlayParser from './parsers/cards-overlay.js';
import heroBandParser from './parsers/hero-band.js';
import cardsExploreParser from './parsers/cards-explore.js';
import embedVideoParser from './parsers/embed-video.js';
import cardsEventParser from './parsers/cards-event.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/hardrock-cleanup.js';
import sectionsTransformer from './transformers/hardrock-sections.js';

// PARSER REGISTRY — keys are per-instance routing ids (block.name below), each
// mapping to the parser that emits the correct EDS block. Several instances
// resolve to the same base block (cards / columns / hero) with different
// variants. Note: 'widget' has no parser — the booking bar, email-signup, and
// social-feed are dynamic third-party widgets with no static authorable content,
// so they are skipped.
const parsers = {
  'carousel-hero': carouselHeroParser,   // -> carousel (hero)
  'columns-intro': columnsIntroParser,   // -> columns
  'cards-overlay': cardsOverlayParser,   // -> cards (overlay)
  'hero-band': heroBandParser,           // -> hero (band)
  'cards-explore': cardsExploreParser,   // -> cards
  'embed-video': embedVideoParser,       // -> embed-video
  'cards-event': cardsEventParser,       // -> cards-event
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json.
// block.name is the routing id into the parser registry above (NOT the final
// EDS block name, which each parser sets via createBlock).
const PAGE_TEMPLATE = {
  name: 'biloxi',
  description: 'Hard Rock Hotel & Casino Biloxi homepage: hero carousel + booking bar, two-column intro, overlay feature tiles + full-bleed casino band + explore cards, embedded video, and events cards. Same Vizergy CMS as daytona-beach.',
  urls: [
    'https://www.hrhcbiloxi.com/',
  ],
  blocks: [
    { name: 'carousel-hero', instances: ['#vizADAHeroCarousel2Widget1475425'] },
    { name: 'columns-intro', instances: ['#hardrockADAIntroWidget1465938 .introText'] },
    { name: 'cards-overlay', instances: ['#hardrockFeatureListHOverlayWidget1475405'] },
    { name: 'hero-band', instances: ['#fullWidthCTAGrid2Widget1475406'] },
    { name: 'cards-explore', instances: ['#hardrockCtaCarouselWidget1475409'] },
    { name: 'embed-video', instances: ['#hrhEmbedVideoWidget1475408'] },
    { name: 'cards-event', instances: ['#hardRockCalendarEmbedWidget1466030'] },
  ],
  sections: [
    { id: 'rc1', name: 'Hero carousel + booking bar', selector: '#pageid171423 > header.container-fluid', style: null, blocks: ['carousel-hero', 'widget'], defaultContent: [] },
    { id: 'rc2', name: 'Page intro (two columns)', selector: '#pageIntro', style: null, blocks: ['columns-intro'], defaultContent: [] },
    { id: 'rc3', name: 'Feature tiles + casino band + explore cards', selector: '#custom1', style: 'shaded', blocks: ['cards-overlay', 'hero-band', 'cards-explore'], defaultContent: ['#fullWidthCTAGrid2Widget1475406 .h2', '#custom1 .ctaCarouselHeading'] },
    { id: 'rc4', name: 'Step Inside (video)', selector: '#custom2', style: null, blocks: ['embed-video'], defaultContent: ['#custom2 h2'] },
    { id: 'rc6', name: 'Events that rock + email signup', selector: '#custom4', style: null, blocks: ['cards-event', 'widget'], defaultContent: ['#custom4 .calEmbedHeading'] },
  ],
};

// TRANSFORMER REGISTRY — cleanup always runs; section-break transformer runs
// only when the template defines multiple sections (it inserts <hr> markers).
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook.
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - DOM element to transform (typically document.body)
 * @param {Object} payload - { document, url, html, params }
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
 * Find all block instances on the page based on the embedded template.
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Block instances found on the page
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
  /**
   * Runs on the LIVE page before html2md sanitizes the DOM (which strips
   * <script>/<iframe>). The Biloxi video embed's YouTube URL only exists inside
   * an inline injection <script> in the widget, so hoist it onto a
   * data-embed-src attribute now — the attribute survives sanitization and the
   * embed-video parser reads it. Pure DOM read/write, no side effects.
   */
  onLoad: async ({ document }) => {
    document.querySelectorAll('[id*="EmbedVideo" i], [class*="EmbedVideo" i]').forEach((widget) => {
      if (widget.getAttribute('data-embed-src')) return;
      let url = '';
      const iframe = widget.querySelector('iframe');
      if (iframe) url = iframe.getAttribute('src') || iframe.getAttribute('data-src') || '';
      if (!url) {
        const m = (widget.outerHTML || '').match(/https?:\/\/[^"'\s\\]*(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)[A-Za-z0-9_-]+/);
        if (m) [url] = m;
      }
      if (url) widget.setAttribute('data-embed-src', url);
    });
  },
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

    // 6. Generate sanitized path. This template migrates the Biloxi homepage into
    //    its own folder: the root URL ('/') maps to '/biloxi/index' (NOT '/index'),
    //    keeping Biloxi a sibling of daytona-beach. Any deeper Biloxi path is
    //    preserved under /biloxi. An empty raw path would also crash the bundled
    //    importer's path polyfill (`.cwd is not a function`), so the guard is
    //    required regardless.
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const localized = rawPath === '' ? '/biloxi/index' : `/biloxi${rawPath}`;
    const path = WebImporter.FileUtils.sanitizePath(localized);

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
