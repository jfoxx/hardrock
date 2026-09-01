/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Hard Rock (hotel.hardrock.com) site-wide cleanup.
 *
 * Removes non-authorable site chrome and third-party widgets so the import
 * contains only page-level authorable content.
 *
 * All selectors are taken from migration-work/cleaned.html of the
 * daytona-beach page. The authorable sections live under #contentShell
 * (#pageIntro, #custom1..#custom5, #custom7) plus the hero header
 * (header.container-fluid, section rc1) and the footer's .footerRow1
 * (mapped as columns-navbar, section rc8) — these are intentionally NOT
 * removed here.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Overlays / widgets that can interfere with parsing or are pure chrome.
    // MUST run before the carousel-hero parser sweeps the hero region, or the
    // interactive booking bar's date-picker calendars leak into the hero output
    // as week-grid divs (rows of day numbers like 26 27 28 29 30 31 1).
    // Verified in cleaned.html:
    //   #onetrust-consent-sdk   (line 1719) - OneTrust cookie banner + pref center
    //   #myModal.bookingModal   (line 1529) - booking modal shell
    //   ft-booking-bar          (line 956)  - Freetobook interactive booking bar
    //                                          (arrival/departure date pickers, rooms/
    //                                          occupancy selects) inside
    //                                          #pageid123997 > header.container-fluid
    //   ft-root                 (line 1544) - Freetobook booking widget root
    //   [class*="flatpickr"]    (lines 1547+) - flatpickr date-picker overlays and
    //                                          their leaked week-grid day cells
    //                                          (.flatpickr-calendar / .flatpickr-days /
    //                                          .flatpickr-day / .flatpickr-input)
    //   #ibe.container          (line 50705) - legacy date-range-selector booking
    //                                          container (its CSS references #drsb),
    //                                          a sibling of the carousel inside
    //                                          header.container-fluid. At import time
    //                                          it renders month calendars as day-number
    //                                          week grids (divs with class "sun") that
    //                                          leak into the hero output. Not authorable.
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#myModal',
      '#ibe',
      'ft-booking-bar',
      'ft-root',
      '[class*="flatpickr"]',
      '[class*="sun"]',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable global chrome and tracking/analytics artifacts.
    // Verified in cleaned.html:
    //   #mainNavigation          (line 2)    - top utility bar + main site nav + logo + Book Now
    //   #ttdUniversalPixelTag    (line 1997) - The Trade Desk pixel container
    //   #batBeacon751805678884   (line 2001) - Bing UET beacon
    //   iframe                   (many, e.g. lines 1717, 1995-2019) - tracking / booking / storage iframes
    //   link                     (line 1227) - stray stylesheet link
    //   noscript / script / style / source - non-authorable/technical elements
    // Raw site footer: #pageid123997 > footer (line 1411) is the full source
    // footer (logo, nav link lists, address, social links, "Book NowBook Now",
    // copyright, tracking-pixel imgs). In EDS the footer is auto-populated by the
    // footer block, so the raw source footer must not leak into the output.
    // NOTE: page-templates.json maps columns-navbar to #custom7 .footerRow1, but
    // at LIVE import time #custom7/.footerRow1 is JS-injected and NOT present
    // (empty in cleaned.html, lines 1404-1409), so removing <footer> loses
    // nothing authorable.
    WebImporter.DOMUtils.remove(element, [
      '#mainNavigation',
      '#pageid123997 > footer',
      '#ttdUniversalPixelTag',
      '#batBeacon751805678884',
      'iframe',
      'link',
      'noscript',
      'script',
      'style',
      'source',
    ]);

    // Tracking / analytics pixel <img> elements (verified in cleaned.html, e.g.
    // bat.bing beacon at line 2002). Remove any img whose src matches a known
    // ad/analytics tracking host.
    const TRACKING_PIXEL_SRC = [
      'bing.com/action',
      'bat.bing',
      'doubleclick.net',
      'g.doubleclick',
      'cm.g.doubleclick',
      'adnxs.com',
      'adform.net',
      'adsrvr.org',
      'sojern',
    ];
    element.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (TRACKING_PIXEL_SRC.some((needle) => src.includes(needle))) {
        img.remove();
      }
    });

    // Strip inline event / tracking attributes left on any remaining elements.
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('onload');
      el.removeAttribute('data-track');
    });
  }
}
