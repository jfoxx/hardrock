import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
  decorateBlock,
  loadBlock,
  getMetadata,
} from './aem.js';

// ===== Adobe Target =====
// Opt a page in with a `target` metadata (<meta name="target" content="on">).
// Requires Adobe Target's at.js saved to /scripts/at.js (Target → Setup →
// Implementation → Edit at.js settings → Download). Blocks can await
// `window.atjsPromise` then call `window.adobe.target.getOffers(...)`.
const AT_PROPERTY = ''; // optional at_property token; leave '' to skip property scoping

function setTargetPageParams() {
  if (!AT_PROPERTY) return;
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.text = `function targetPageParams() { return { "at_property": "${AT_PROPERTY}" }; }`;
  document.head.appendChild(script);
}

function initATJS(path, config) {
  window.targetGlobalSettings = config;
  return new Promise((resolve, reject) => {
    import(path).then(resolve).catch(reject);
  });
}

// Run `fn` now (if content is already decorated) and again as sections/blocks
// finish decorating, so Target offers apply to async-rendered EDS content.
function onDecoratedElement(fn) {
  if (document.querySelector('[data-block-status="loaded"],[data-section-status="loaded"]')) {
    fn();
  }
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.target.tagName === 'BODY'
      || m.target.dataset.sectionStatus === 'loaded'
      || m.target.dataset.blockStatus === 'loaded')) {
      fn();
    }
  });
  observer.observe(document.querySelector('main'), {
    subtree: true, attributes: true, attributeFilter: ['data-block-status', 'data-section-status'],
  });
  observer.observe(document.querySelector('body'), { childList: true });
}

function toCssSelector(selector) {
  return selector.replace(/(\.\S+)?:eq\((\d+)\)/g, (_, clss, i) => `:nth-child(${Number(i) + 1}${clss ? ` of ${clss})` : ''}`);
}

async function getElementForOffer(offer) {
  const selector = offer.cssSelector || toCssSelector(offer.selector);
  return document.querySelector(selector);
}

// Target may deliver a fragment reference (<div data-fragment="/path">); turn it
// into an EDS fragment block so its content (e.g. an offer XF) loads and decorates.
function autoDecorateFragment(el) {
  const a = document.createElement('a');
  a.href = el.getAttribute('data-fragment');
  a.className = 'at-element-marker';
  const fragmentBlock = buildBlock('fragment', a);
  el.replaceWith(fragmentBlock);
  decorateBlock(fragmentBlock);
  return loadBlock(fragmentBlock);
}

function observeAndDecorateFragments() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-fragment')) {
          autoDecorateFragment(node);
        }
      });
    });
  });
  observer.observe(document.querySelector('main'), { childList: true, subtree: true });
}

async function getAndApplyOffers() {
  const response = await window.adobe.target.getOffers({ request: { execute: { pageLoad: {} } } });
  const { options = [] } = response?.execute?.pageLoad || {};
  onDecoratedElement(() => {
    window.adobe.target.applyOffers({ response });
    // drop offers that have already been applied so re-runs don't duplicate them
    options.forEach((o) => {
      // eslint-disable-next-line no-param-reassign
      if (Array.isArray(o.content)) o.content = o.content.filter((c) => !getElementForOffer(c));
    });
  });
}

window.atjsPromise = Promise.resolve();
if (getMetadata('target')) {
  setTargetPageParams();
  window.atjsPromise = initATJS('/scripts/at.js', {
    clientCode: 'foxx',
    serverDomain: 'foxx.tt.omtrdc.net',
    imsOrgId: '4009236F6182AB170A495EC3@AdobeOrg',
    bodyHidingEnabled: false,
    cookieDomain: window.location.hostname,
    pageLoadEnabled: false,
    secureOnly: true,
    viewsEnabled: false,
    withWebGLRenderer: false,
  }).catch(() => { /* at.js missing/blocked — blocks fall back to no personalization */ });
  document.addEventListener('at-library-loaded', () => {
    observeAndDecorateFragments();
    getAndApplyOffers();
  });

  // Send mbox parameters to Target on a stable page load (e.g. an event detail view),
  // e.g. { eventMonth: 'october' }. A Target Profile Script reads these with
  // mbox.param(...) and persists them as a profile attribute you can build audiences on.
  window.setTargetProfile = async (parameters) => {
    try {
      await window.atjsPromise;
      if (!window.adobe?.target?.getOffers) return;
      await window.adobe.target.getOffers({
        request: { execute: { mboxes: [{ index: 0, name: 'profile-update', parameters }] } },
      });
    } catch (e) { /* ignore — profiling is best-effort */ }
  };
}

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    createHTML: (input, type, sink) => {
      let processedInput = input;
      if (/srcdoc\s*=/i.test(processedInput)) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
        processedInput = doc.body.innerHTML;
      }
      if (sink.includes('createContextualFragment') || sink.includes('Document write')) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('script').forEach((el) => el.remove());
        processedInput = doc.body.innerHTML;
      }
      return processedInput;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Reveal-on-scroll for sections authored with the `animate` section-metadata
 * (data-animate="slide-up" | "slide-down" | "drop-in"). Arms each section with
 * the `animate` class (initial hidden state lives in CSS) and adds `animate-in`
 * when it scrolls into view. Skipped entirely under prefers-reduced-motion so
 * content stays visible.
 * @param {Element} main The main element
 */
function decorateAnimations(main) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sections = main.querySelectorAll('.section[data-animate]');
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  sections.forEach((section) => {
    section.classList.add('animate');
    // drop-in staggers the section's top-level content elements.
    if (section.dataset.animate === 'drop-in') {
      section.querySelectorAll(':scope > div > *').forEach((el, i) => {
        el.style.setProperty('--animate-index', i);
      });
    }
    observer.observe(section);
  });
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    decorateAnimations(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('body > header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('body > footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  import('./consent-check.js');
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
