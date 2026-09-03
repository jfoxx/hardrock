import { getMetadata } from '../../scripts/aem.js';

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 1100px)');

/**
 * Build the ordered list of header paths to try.
 * The `nav` metadata points at the section's nav folder (e.g. /daytona-beach/nav);
 * the header doc lives inside it at <folder>/header. Falls back to the site-root
 * /nav when the metadata is absent. Each candidate carries the base its relative
 * image srcs should resolve against, and every candidate is tried under /content
 * first (localhost / aem up) then at the real path (DA/EDS prod).
 */
function headerCandidates() {
  const navMeta = getMetadata('nav');
  let path = '/nav';
  if (navMeta) {
    const folder = new URL(navMeta, window.location).pathname.replace(/\/+$/, '');
    path = `${folder}/header`;
  }
  return [
    { url: `/content${path}.plain.html`, base: `/content${path.replace(/[^/]+$/, '')}` },
    { url: `${path}.plain.html`, base: path.replace(/[^/]+$/, '') },
  ];
}

/**
 * Fetch the header fragment for the current section.
 * Resolves relative image srcs against the base the fragment was served from,
 * so they don't resolve against the current page URL.
 */
async function fetchNav() {
  let base = '/';
  let resp;
  const candidates = headerCandidates();
  for (let i = 0; i < candidates.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    resp = await fetch(candidates[i].url);
    if (resp.ok) {
      base = candidates[i].base;
      break;
    }
  }
  if (!resp || !resp.ok) return null;
  const html = await resp.text();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith('/')) {
      img.setAttribute('src', `${base}${src}`);
    }
  });
  return tmp;
}

/** Close every open desktop dropdown. */
function closeAllDropdowns(nav) {
  nav.querySelectorAll('.nav-drop[aria-expanded="true"]').forEach((li) => {
    li.setAttribute('aria-expanded', 'false');
  });
}

/** Toggle the mobile menu open/closed. */
function toggleMenu(nav, forceClosed = null) {
  const expanded = forceClosed !== null ? !forceClosed : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  document.body.style.overflowY = expanded || isDesktop.matches ? '' : 'hidden';
  if (button) button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  if (expanded) closeAllDropdowns(nav);
}

/** Reset nav state when crossing the desktop/mobile breakpoint. */
function handleBreakpointChange(nav) {
  closeAllDropdowns(nav);
  nav.setAttribute('aria-expanded', 'false');
  document.body.style.overflowY = '';
  const button = nav.querySelector('.nav-hamburger button');
  if (button) button.setAttribute('aria-label', 'Open navigation');
}

/** Wire a dropdown parent: hover on desktop, click-to-expand on mobile. */
function wireDropdown(li, nav) {
  const link = li.querySelector(':scope > a');
  // A separate toggle button lets the link keep navigating while the
  // caret toggles the submenu (mobile split-link pattern).
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-drop-toggle';
  toggle.setAttribute('aria-label', `Toggle ${link ? link.textContent.trim() : 'submenu'}`);
  li.insertBefore(toggle, li.querySelector(':scope > ul'));

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const open = li.getAttribute('aria-expanded') === 'true';
    if (!isDesktop.matches) {
      const parentList = li.parentElement;
      parentList.querySelectorAll(':scope > .nav-drop[aria-expanded="true"]').forEach((sib) => {
        if (sib !== li) sib.setAttribute('aria-expanded', 'false');
      });
    }
    li.setAttribute('aria-expanded', open ? 'false' : 'true');
  });

  // Desktop: hover opens/closes the top-level dropdowns.
  li.addEventListener('mouseenter', () => {
    if (isDesktop.matches && li.parentElement.closest('.nav-drop') === null) {
      closeAllDropdowns(nav);
      li.setAttribute('aria-expanded', 'true');
    }
  });
  li.addEventListener('mouseleave', () => {
    if (isDesktop.matches) li.setAttribute('aria-expanded', 'false');
  });
}

/** Last path segment, without a trailing slash or .aspx/.html extension, lowercased. */
function slugFromPath(pathname) {
  const last = pathname.replace(/\/+$/, '').split('/').pop() || '';
  return last.replace(/\.(aspx|html)$/i, '').toLowerCase();
}

/**
 * Mark the nav link matching the current page as active (mirrors the hover state).
 * Nav hrefs are the source .aspx URLs, so match on the page slug, not the full path.
 */
function markActiveNav(nav) {
  const currentSlug = slugFromPath(window.location.pathname);
  if (!currentSlug) return;
  nav.querySelectorAll('.nav-sections a[href]').forEach((a) => {
    let linkSlug = '';
    try {
      linkSlug = slugFromPath(new URL(a.href, window.location.href).pathname);
    } catch (e) {
      return;
    }
    if (linkSlug && linkSlug === currentSlug) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
      // if a submenu item matches, light up its top-level parent too
      const topLink = a.closest('.nav-sections > ul > li')?.querySelector(':scope > a');
      if (topLink && topLink !== a) topLink.classList.add('active');
    }
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNav();
  block.textContent = '';

  // The fragment yields three blocks in order:
  //   brand, sections (links), utility (corporate links + Sign In + badge + Book Now).
  const parts = fragment ? [...fragment.children] : [];
  const brand = parts[0];
  const sections = parts[1];
  const utilityContent = parts[2];
  if (brand) brand.classList.add('nav-brand');
  if (sections) sections.classList.add('nav-sections');
  if (utilityContent) utilityContent.classList.add('nav-utility-content');

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');

  // ── Pre-header (utility) bar, pinned to the very top ──
  const utility = document.createElement('div');
  utility.className = 'nav-utility';
  const utilityInner = document.createElement('div');
  utilityInner.className = 'nav-utility-inner';
  // A compact copy of the brand that surfaces in the utility bar once the page
  // scrolls (the tall stacked logo in the main row hides at the same time).
  if (brand) {
    const compactBrand = brand.cloneNode(true);
    compactBrand.classList.remove('nav-brand');
    compactBrand.classList.add('nav-brand-compact');
    compactBrand.removeAttribute('id');
    utilityInner.append(compactBrand);
  }
  if (utilityContent) utilityInner.append(utilityContent);
  utility.append(utilityInner);

  // ── Main row: hamburger + brand + section links, floats over the hero ──
  const main = document.createElement('div');
  main.className = 'nav-main';
  const mainInner = document.createElement('div');
  mainInner.className = 'nav-main-inner';

  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));
  mainInner.append(hamburger);
  if (brand) mainInner.append(brand);
  if (sections) mainInner.append(sections);
  main.append(mainInner);

  nav.append(utility, main);

  // mark dropdown parents and wire behavior
  if (sections) {
    sections.querySelectorAll('li').forEach((li) => {
      if (li.querySelector(':scope > ul')) {
        li.classList.add('nav-drop');
        li.setAttribute('aria-expanded', 'false');
        wireDropdown(li, nav);
      }
    });
    markActiveNav(nav);
  }

  // close open dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (isDesktop.matches && !nav.contains(e.target)) closeAllDropdowns(nav);
  });

  // reset state on breakpoint change
  isDesktop.addEventListener('change', () => handleBreakpointChange(nav));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  // At the top of the page the header is transparent over the hero (gradient
  // fade); once scrolled it gains a translucent dark-gray bar with a hard edge.
  const onScroll = () => {
    navWrapper.classList.toggle('is-scrolled', window.scrollY > 10);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}
