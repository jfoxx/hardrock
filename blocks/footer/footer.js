import { getMetadata } from '../../scripts/aem.js';

/**
 * Footer block — content-first.
 * Reads the semantic footer fragment from the DOM and arranges it into the
 * source layout: an upper band with three columns (brand logo | primary nav |
 * address, phone + social icons) and a lower band with the copyright line and
 * legal links. All copy, links, and images live in the footer fragment;
 * this module only reads and rearranges that DOM.
 */

/**
 * Rebase relative image srcs against the folder the fragment was served from,
 * so they don't resolve against the current page URL.
 */
function rebaseImages(doc, base) {
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith('/')) {
      img.setAttribute('src', new URL(src, `${window.location.origin}${base}`).pathname);
    }
  });
}

/**
 * Build the ordered list of footer fragment paths to try. Mirrors the header:
 * the `nav` metadata points at the section's nav folder (e.g. /daytona-beach/nav)
 * and the footer doc lives beside the header at <folder>/footer. Each candidate
 * is tried under /content first (localhost / aem up) then at the real path
 * (DA/EDS prod). The site-root footer fragment is the final fallback.
 */
function footerCandidates() {
  const navMeta = getMetadata('nav');
  const list = [];
  if (navMeta) {
    const folder = new URL(navMeta, window.location).pathname.replace(/\/+$/, '');
    const scoped = `${folder}/footer`;
    list.push({ url: `/content${scoped}.plain.html`, base: `/content${scoped.replace(/[^/]+$/, '')}` });
    list.push({ url: `${scoped}.plain.html`, base: scoped.replace(/[^/]+$/, '') });
  }
  return list;
}

async function fetchFooter() {
  // Section-scoped footer first (mirrors the header's nav-folder pattern)...
  const candidates = footerCandidates();
  for (let i = 0; i < candidates.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const scopedResp = await fetch(candidates[i].url);
    if (scopedResp.ok) {
      // eslint-disable-next-line no-await-in-loop
      const scopedHtml = await scopedResp.text();
      const scopedDoc = new DOMParser().parseFromString(scopedHtml, 'text/html');
      rebaseImages(scopedDoc, candidates[i].base);
      return scopedDoc;
    }
  }
  // ...then the site-root fragment: /content first (localhost), then root (prod).
  let resp = await fetch('/content/footer.plain.html');
  let base = '/content/';
  if (!resp.ok) {
    resp = await fetch('/footer.plain.html');
    base = '/';
  }
  if (!resp.ok) return null;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  rebaseImages(doc, base);
  return doc;
}

/**
 * Wrap each social link's image + text so the label can be hidden visually
 * while the circular icon button shows through, matching the source.
 * @param {HTMLUListElement} list the social links list
 */
function decorateSocial(list) {
  list.classList.add('footer-social');
  list.querySelectorAll('a').forEach((a) => {
    a.classList.add('footer-social-link');
    const label = a.textContent.trim();
    if (label) a.setAttribute('aria-label', label);
    // The source renders social icons as CSS glyphs (no <img>). The fragment
    // carries the icon file for portability/content parity; convert it to a
    // masked CSS glyph here so the rendered DOM matches the source (a gray
    // circle with a dark glyph, not an image element).
    const img = a.querySelector('img');
    if (img) {
      const icon = document.createElement('span');
      icon.className = 'footer-social-icon';
      icon.style.setProperty('--footer-social-icon', `url("${img.getAttribute('src')}")`);
      img.replaceWith(icon);
    }
    const text = [...a.childNodes]
      .find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (text) {
      const span = document.createElement('span');
      span.className = 'footer-social-label';
      span.textContent = text.textContent.trim();
      text.replaceWith(span);
    }
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await fetchFooter();
  block.textContent = '';
  if (!fragment) return;

  const sections = [...fragment.body.querySelectorAll(':scope > div')];
  const main = sections[0];
  if (!main) return;

  const nodes = [...main.children];
  const uls = nodes.filter((n) => n.tagName === 'UL');
  const navList = uls[0];
  const socialList = uls[1];
  const legalList = uls[2];

  // Logo (first paragraph containing the image link)
  const logoP = nodes.find((n) => n.tagName === 'P' && n.querySelector('img'));
  if (logoP) logoP.classList.add('footer-brand');

  // Address block: the paragraphs between the nav list and the social list
  const address = document.createElement('div');
  address.className = 'footer-contact';
  const navIdx = nodes.indexOf(navList);
  const socialIdx = nodes.indexOf(socialList);
  nodes.slice(navIdx + 1, socialIdx).forEach((n) => address.append(n));

  // Build the upper band: brand | nav | contact(+social)
  const upper = document.createElement('div');
  upper.className = 'footer-top';

  const colBrand = document.createElement('div');
  colBrand.className = 'footer-col footer-col-brand';
  if (logoP) colBrand.append(logoP);

  const colNav = document.createElement('div');
  colNav.className = 'footer-col footer-col-nav';
  if (navList) {
    navList.classList.add('footer-nav');
    colNav.append(navList);
  }

  const colContact = document.createElement('div');
  colContact.className = 'footer-col footer-col-contact';
  colContact.append(address);
  if (socialList) {
    decorateSocial(socialList);
    colContact.append(socialList);
  }

  upper.append(colBrand, colNav, colContact);

  // Lower band: copyright + legal links
  const lower = document.createElement('div');
  lower.className = 'footer-bottom';
  const copyright = nodes.find((n) => n.tagName === 'P' && /copyright/i.test(n.textContent));
  if (copyright) {
    copyright.classList.add('footer-copyright');
    lower.append(copyright);
  }
  if (legalList) {
    legalList.classList.add('footer-legal');
    // "Cookies settings" is a consent-preferences trigger on the source (opens a
    // panel rather than navigating). Neutralize navigation so it behaves as a
    // settings trigger.
    const cookies = [...legalList.querySelectorAll('a')]
      .find((a) => /cookies?\s*settings/i.test(a.textContent));
    if (cookies) {
      cookies.classList.add('footer-cookies-settings');
      cookies.removeAttribute('href');
      cookies.setAttribute('role', 'button');
      cookies.setAttribute('tabindex', '0');
    }
    lower.append(legalList);
  }

  const footer = document.createElement('div');
  footer.className = 'footer-inner';
  footer.append(upper, lower);
  block.append(footer);

  // Preserve any trailing sections from the fragment (e.g. the source's empty
  // secondary container) so the footer's section structure mirrors the source.
  sections.slice(1).forEach((section) => {
    section.classList.add('footer-secondary');
    block.append(section);
  });
}
