/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the Biloxi "Step Inside" video section.
 * Source: https://www.hrhcbiloxi.com/ (#hrhEmbedVideoWidget1475408)
 * Generated: 2026-09-08
 *
 * Emits an `embed-video` block following the embed convention: a 1-column table
 * where row 1 = block name and row 2 = a single cell containing the video URL
 * (as a link). blocks/embed-video/embed-video.js reads that link and lazily
 * builds a responsive 16:9 iframe on scroll.
 *
 * The source embeds a YouTube iframe; its src carries player query params
 * (enablejsapi/controls/autoplay/…). We normalize to the canonical
 * https://www.youtube.com/embed/<id> so the block builds a clean player.
 */

const isRealUrl = (u) => u && !u.startsWith('data:') && !u.startsWith('blob:');

/** Extract a YouTube video id from any watch/embed/youtu.be URL. */
function youtubeId(url) {
  try {
    const u = new URL(url, 'https://www.youtube.com');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2];
    return u.searchParams.get('v') || '';
  } catch (e) {
    return '';
  }
}

/** Search text for the first YouTube embed/watch/youtu.be URL. */
function findYoutubeUrl(text) {
  if (!text) return '';
  const m = text.match(/https?:\/\/[^"'\s\\]*(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)[A-Za-z0-9_-]+/);
  return m ? m[0] : '';
}

export default function parse(element, { document }) {
  // Find the embedded video URL. The source lazy-injects the <iframe> via a
  // <script>, so at import time the iframe may be absent while the URL lives in
  // that script's text. Try, in order: a rendered iframe/link, the widget's own
  // markup (incl. inline scripts), then the whole document (the injection
  // script may be a sibling, and site-wide cleanup can strip scripts late).
  let src = '';
  // The import script's onLoad hook hoists the URL here (before html2md strips
  // the injection <script>/<iframe>), so prefer it.
  src = element.getAttribute('data-embed-src') || '';
  const iframe = element.querySelector('iframe');
  if (!src && iframe) src = iframe.getAttribute('src') || iframe.getAttribute('data-src') || '';
  if (!src) {
    const a = element.querySelector('a[href*="youtu"], a[href*="/embed/"]');
    if (a) src = a.getAttribute('href') || '';
  }
  if (!src) src = findYoutubeUrl(element.outerHTML || '');
  if (!src && document) {
    // Prefer a script that references this widget id, else any YouTube URL.
    const widgetId = element.getAttribute && element.getAttribute('id');
    const scripts = Array.from(document.querySelectorAll('script'));
    const scoped = widgetId
      ? scripts.find((s) => (s.textContent || '').indexOf(widgetId) !== -1 && findYoutubeUrl(s.textContent))
      : null;
    if (scoped) src = findYoutubeUrl(scoped.textContent);
    if (!src) src = findYoutubeUrl(document.documentElement ? document.documentElement.innerHTML : '');
  }

  if (!isRealUrl(src)) {
    // No resolvable video — drop the block wrapper, keep any inner content.
    element.replaceWith(...element.childNodes);
    return;
  }

  // Normalize to a canonical embed URL when it's YouTube.
  const id = youtubeId(src);
  const embedUrl = id ? `https://www.youtube.com/embed/${id}` : src;

  // Embed convention: 1 column, row 2 = single cell with the URL. Emit the URL
  // as plain paragraph text (not an autolink) — a bare autolink alone in a table
  // cell fails to round-trip through html2md/md2da and drops the whole block.
  // blocks/embed-video reads block.textContent (and any anchor) to build the
  // player, so plain text is sufficient and robust.
  const p = document.createElement('p');
  p.textContent = embedUrl;

  const block = WebImporter.Blocks.createBlock(document, {
    name: 'embed-video',
    cells: [[p]],
  });
  element.replaceWith(block);
}
