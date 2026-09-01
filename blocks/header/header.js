// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Fetch the nav fragment. Metadata-independent dual-fetch:
 * /content/nav.plain.html (localhost / aem up) then /nav.plain.html (DA/EDS prod).
 * Resolves relative image srcs against the base the fragment was served from,
 * so they don't resolve against the current page URL.
 */
async function fetchNav() {
  let base = '/content/';
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) {
    base = '/';
    resp = await fetch('/nav.plain.html');
  }
  if (!resp.ok) return null;
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

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNav();
  block.textContent = '';

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');
  if (fragment) {
    while (fragment.firstElementChild) nav.append(fragment.firstElementChild);
  }

  // label the three sections: brand, sections (links), tools (CTA)
  ['brand', 'sections', 'tools'].forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // mark dropdown parents and wire behavior
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll('li').forEach((li) => {
      if (li.querySelector(':scope > ul')) {
        li.classList.add('nav-drop');
        li.setAttribute('aria-expanded', 'false');
        wireDropdown(li, nav);
      }
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));
  nav.prepend(hamburger);

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
}
