/*
 * Embed Video — Hard Rock Biloxi
 * Renders an embedded video (YouTube) inside a responsive 16:9 frame.
 * Source: hrhEmbedVideoWidget (Biloxi "Step Inside" section).
 *
 * Content model: a single cell containing either
 *   - a link to a YouTube watch/embed URL, or
 *   - a plain text URL.
 * The iframe is built lazily on first intersection to keep it off the
 * critical path (no third-party frame until the block scrolls into view).
 */

function toEmbedUrl(url) {
  try {
    const u = new URL(url, window.location.href);
    // youtu.be/<id> or youtube.com/watch?v=<id> or /embed/<id>
    if (u.hostname.includes('youtu')) {
      let id = '';
      if (u.hostname === 'youtu.be') {
        id = u.pathname.slice(1);
      } else if (u.pathname.startsWith('/embed/')) {
        [, , id] = u.pathname.split('/');
      } else {
        id = u.searchParams.get('v') || '';
      }
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    return u.href;
  } catch (e) {
    return url;
  }
}

function buildFrame(block, src) {
  const wrapper = document.createElement('div');
  wrapper.className = 'embed-video-frame';
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', src);
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('title', block.dataset.title || 'Embedded video');
  iframe.setAttribute('allow', 'encrypted-media; picture-in-picture; fullscreen');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('frameborder', '0');
  wrapper.append(iframe);
  block.replaceChildren(wrapper);
}

export default function decorate(block) {
  const link = block.querySelector('a');
  const raw = (link && (link.getAttribute('href') || link.textContent))
    || block.textContent.trim();
  if (!raw) {
    block.replaceChildren();
    return;
  }
  const src = toEmbedUrl(raw.trim());

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      buildFrame(block, src);
    }
  });
  observer.observe(block);
}
