/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-daytona-beach.js
  var import_daytona_beach_exports = {};
  __export(import_daytona_beach_exports, {
    default: () => import_daytona_beach_default
  });

  // tools/importer/parsers/cards-event.js
  function parse(element, { document: document2 }) {
    const cells = [];
    const events = Array.from(element.querySelectorAll(".calListDayEvent"));
    events.forEach((event) => {
      const img = event.querySelector(".image img, img");
      const textCell = [];
      const title = event.querySelector(".calListDayEventTitle, .calEventTitle");
      if (title) {
        const h = document2.createElement("h3");
        h.textContent = title.textContent.trim();
        textCell.push(h);
      }
      const date = event.querySelector(".eventDayTime .h3");
      if (date) {
        const p = document2.createElement("p");
        p.textContent = date.textContent.trim();
        textCell.push(p);
      }
      const time = event.querySelector(".calListDayEventTime");
      if (time) {
        const p = document2.createElement("p");
        p.textContent = time.textContent.replace(/\s+/g, " ").trim();
        textCell.push(p);
      }
      const desc = event.querySelector(".calListDayEventDescription");
      if (desc) {
        const p = document2.createElement("p");
        p.textContent = desc.textContent.replace(/\s+/g, " ").trim();
        textCell.push(p);
      }
      const loc = event.querySelector(".calListDayEventLocationName");
      if (loc && loc.textContent.trim()) {
        const p = document2.createElement("p");
        p.textContent = loc.textContent.trim();
        textCell.push(p);
      }
      const ctas = Array.from(event.querySelectorAll(".eventButtons a, a.calListDayEventLink, a.calListDayEventBookingLink"));
      const seen = /* @__PURE__ */ new Set();
      ctas.forEach((a) => {
        if (seen.has(a)) return;
        seen.add(a);
        const p = document2.createElement("p");
        p.appendChild(a);
        textCell.push(p);
      });
      if (img || textCell.length) {
        cells.push([img || "", textCell.length ? textCell : ""]);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-event", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-explore.js
  function resolveCardImage(slide, document2) {
    const isReal = (u) => u && !u.startsWith("data:") && !u.startsWith("blob:");
    const img = slide.querySelector(".feature-img img, .image img, img");
    let url = "";
    let alt = "";
    if (img) {
      alt = img.getAttribute("alt") || "";
      const cand = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("src") || "";
      if (isReal(cand)) url = cand;
    }
    if (!url) {
      const all = [slide].concat(Array.from(slide.querySelectorAll("*")));
      for (let i = 0; i < all.length; i += 1) {
        const style = all[i].getAttribute && all[i].getAttribute("style") || "";
        const m = style.match(/url\(["']?(.*?)["']?\)/);
        if (m && isReal(m[1])) {
          url = m[1];
          break;
        }
      }
    }
    if (!url) return null;
    const out = document2.createElement("img");
    out.setAttribute("src", url);
    if (alt) out.setAttribute("alt", alt);
    return out;
  }
  function parse2(element, { document: document2 }) {
    const cells = [];
    element.querySelectorAll("style, script, link, noscript").forEach((n) => n.remove());
    const slides = Array.from(element.querySelectorAll(".slickSlide:not(.slick-cloned)"));
    slides.forEach((slide) => {
      const img = resolveCardImage(slide, document2);
      const textCell = [];
      const heading = slide.querySelector(".itemHeading");
      if (heading) {
        const h = document2.createElement("h3");
        h.textContent = heading.textContent.trim();
        textCell.push(h);
      }
      const paras = Array.from(slide.querySelectorAll(".feature-content > p, .feature-content p"));
      const seenP = /* @__PURE__ */ new Set();
      paras.forEach((p) => {
        if (seenP.has(p)) return;
        seenP.add(p);
        textCell.push(p);
      });
      const cta = slide.querySelector(".itemBtn, .feature-content a");
      if (cta) {
        const a = document2.createElement("a");
        a.href = cta.href;
        a.textContent = cta.textContent.replace(/\s+/g, " ").trim();
        const p = document2.createElement("p");
        p.appendChild(a);
        textCell.push(p);
      }
      if (img || textCell.length) {
        cells.push([img || "", textCell.length ? textCell : ""]);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-rooms.js
  function resolveFeatureImage(root, document2) {
    const isReal = (u) => u && !u.startsWith("data:") && !u.startsWith("blob:");
    const img = root.querySelector(".feature-img img, .image img, img");
    let url = "";
    let alt = "";
    if (img) {
      alt = img.getAttribute("alt") || "";
      const cand = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("src") || "";
      if (isReal(cand)) url = cand;
    }
    if (!url) {
      const all = [root].concat(Array.from(root.querySelectorAll("*")));
      for (let i = 0; i < all.length; i += 1) {
        const style = all[i].getAttribute && all[i].getAttribute("style") || "";
        const m = style.match(/url\(["']?(.*?)["']?\)/);
        if (m && isReal(m[1])) {
          url = m[1];
          break;
        }
      }
    }
    if (!url) return null;
    const out = document2.createElement("img");
    out.setAttribute("src", url);
    if (alt) out.setAttribute("alt", alt);
    return out;
  }
  function parse3(element, { document: document2 }) {
    element.querySelectorAll("style, script, link, noscript").forEach((n) => n.remove());
    const img = resolveFeatureImage(element, document2);
    const contentCol = element.querySelector(".feature-content, .featureContentContainer");
    const contentCell = [];
    if (contentCol) {
      contentCol.querySelectorAll(".sr-only").forEach((n) => n.remove());
      const heading = contentCol.querySelector(".h2, h2, h3");
      if (heading) {
        const h = document2.createElement("h3");
        h.textContent = heading.textContent.trim();
        contentCell.push(h);
      }
      const paras = Array.from(contentCol.querySelectorAll("p"));
      const seenP = /* @__PURE__ */ new Set();
      paras.forEach((p) => {
        if (seenP.has(p)) return;
        seenP.add(p);
        contentCell.push(p);
      });
      const cta = contentCol.querySelector("a.btn, a");
      if (cta) {
        const a = document2.createElement("a");
        a.href = cta.href;
        a.textContent = cta.textContent.replace(/\s+/g, " ").trim();
        const p = document2.createElement("p");
        p.appendChild(a);
        contentCell.push(p);
      }
    }
    if (!img && !contentCell.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [[img || "", contentCell.length ? contentCell : ""]];
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards (feature)", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-hero.js
  function parse4(element, { document: document2 }) {
    element.querySelectorAll("style, script, link, noscript, button").forEach((n) => n.remove());
    const heroCarousel = element.querySelector(".slickHeroCarousel") || element;
    let slides = Array.from(heroCarousel.querySelectorAll(".slickSlide")).filter((s) => !s.closest(".slick-cloned")).filter((s) => !s.closest(".slickCaptionsDetached")).filter((s) => s.querySelector("picture img, img"));
    if (!slides.length) {
      slides = Array.from(element.querySelectorAll(".slickSlide")).filter((s) => s.querySelector("img"));
    }
    const cells = [];
    const seenHeadings = /* @__PURE__ */ new Set();
    slides.forEach((slide) => {
      const heading = slide.querySelector(".heroHeading, h2, h3");
      const key = heading ? heading.textContent.replace(/\s+/g, " ").trim() : `__idx${cells.length}`;
      if (seenHeadings.has(key)) return;
      seenHeadings.add(key);
      const img = slide.querySelector("picture img, img");
      if (img) {
        const picture = slide.querySelector("picture");
        const isReal = (u) => u && !u.startsWith("data:") && !u.startsWith("blob:");
        let resolved = "";
        if (picture) {
          const sources = Array.from(picture.querySelectorAll("source")).map((s) => (s.getAttribute("srcset") || s.getAttribute("data-srcset") || "").split(",")[0].trim().split(/\s+/)[0]).filter(isReal);
          resolved = sources.find((u) => /large/i.test(u) && /\.jpe?g$/i.test(u)) || sources.find((u) => /\.jpe?g$/i.test(u)) || sources.find((u) => /large/i.test(u)) || sources[0] || "";
        }
        if (!resolved) {
          const candidate = img.getAttribute("data-src") || img.currentSrc || img.getAttribute("src") || "";
          if (isReal(candidate)) resolved = candidate;
        }
        if (resolved) img.setAttribute("src", resolved);
      }
      const textCell = [];
      const caption = slide.querySelector(".slideCaption") || slide;
      if (heading) {
        const h = document2.createElement("h2");
        const span = heading.querySelector(":scope > span");
        if (span && heading.firstElementChild === span) {
          const em = document2.createElement("em");
          em.textContent = span.textContent.replace(/\s+/g, " ").trim();
          const rest = heading.textContent.replace(span.textContent, "").replace(/\s+/g, " ").trim();
          h.appendChild(em);
          if (rest) h.appendChild(document2.createTextNode(` ${rest}`));
        } else {
          h.textContent = heading.textContent.replace(/\s+/g, " ").trim();
        }
        textCell.push(h);
      }
      const paras = Array.from(caption.querySelectorAll("p"));
      const seenP = /* @__PURE__ */ new Set();
      paras.forEach((p) => {
        if (seenP.has(p)) return;
        seenP.add(p);
        const np = document2.createElement("p");
        np.textContent = p.textContent.replace(/\s+/g, " ").trim();
        if (np.textContent) textCell.push(np);
      });
      const cta = caption.querySelector(".btnContainer a, a.btn");
      if (cta) {
        const a = document2.createElement("a");
        a.href = cta.href;
        a.textContent = cta.textContent.replace(/\s+/g, " ").trim();
        const p = document2.createElement("p");
        p.appendChild(a);
        textCell.push(p);
      }
      if (img || textCell.length) {
        cells.push([img || "", textCell.length ? textCell : ""]);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "carousel (hero)", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-promo.js
  function emphasizeHeading(h, document2) {
    if (!h) return;
    const span = h.querySelector(":scope > span");
    if (!span || h.firstElementChild !== span) return;
    const em = document2.createElement("em");
    em.textContent = span.textContent.replace(/\s+/g, " ").trim();
    span.replaceWith(em);
    const next = em.nextSibling;
    if (next && next.nodeType === 3) {
      next.textContent = ` ${next.textContent.replace(/^\s+/, "")}`;
    } else if (next) {
      em.after(document2.createTextNode(" "));
    }
  }
  function resolvePromoImage(split, document2) {
    const isReal = (u) => u && !u.startsWith("data:") && !u.startsWith("blob:");
    const img = split.querySelector(".image img, .feature-img img, img");
    let url = "";
    let alt = "";
    if (img) {
      alt = img.getAttribute("alt") || "";
      const cand = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("src") || "";
      if (isReal(cand)) url = cand;
    }
    if (!url) {
      const all = [split].concat(Array.from(split.querySelectorAll("*")));
      for (let i = 0; i < all.length; i += 1) {
        const style = all[i].getAttribute && all[i].getAttribute("style") || "";
        const m = style.match(/url\(["']?(.*?)["']?\)/);
        if (m && isReal(m[1])) {
          url = m[1];
          break;
        }
      }
    }
    if (!url) return null;
    const out = document2.createElement("img");
    out.setAttribute("src", url);
    if (alt) out.setAttribute("alt", alt);
    return out;
  }
  function parse5(element, { document: document2 }) {
    const cells = [];
    element.querySelectorAll("style, script, link, noscript").forEach((n) => n.remove());
    let splits = Array.from(element.querySelectorAll(".row-eq-height"));
    if (!splits.length) splits = [element];
    splits.forEach((split) => {
      const img = resolvePromoImage(split, document2);
      const textCell = [];
      const heading = split.querySelector(".splitItemHeading, h2, h3");
      if (heading) {
        emphasizeHeading(heading, document2);
        textCell.push(heading);
      }
      const paras = Array.from(split.querySelectorAll(".textContainer > p, .text p"));
      const seenP = /* @__PURE__ */ new Set();
      paras.forEach((p) => {
        if (seenP.has(p)) return;
        seenP.add(p);
        textCell.push(p);
      });
      const ctas = Array.from(split.querySelectorAll(".btnContainer a, .text a"));
      const seenA = /* @__PURE__ */ new Set();
      ctas.forEach((cta) => {
        if (seenA.has(cta)) return;
        seenA.add(cta);
        const a = document2.createElement("a");
        a.href = cta.href;
        a.textContent = cta.textContent.replace(/\s+/g, " ").trim();
        const p = document2.createElement("p");
        p.appendChild(a);
        textCell.push(p);
      });
      if (img || textCell.length) {
        cells.push([img || "", textCell.length ? textCell : ""]);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns.js
  function emphasizeHeadings(root, document2) {
    root.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
      const span = h.querySelector(":scope > span");
      if (!span || h.firstElementChild !== span) return;
      const em = document2.createElement("em");
      em.textContent = span.textContent.replace(/\s+/g, " ").trim();
      span.replaceWith(em);
      const next = em.nextSibling;
      if (next && next.nodeType === 3) {
        next.textContent = ` ${next.textContent.replace(/^\s+/, "")}`;
      } else if (next) {
        em.after(document2.createTextNode(" "));
      }
    });
  }
  function parse6(element, { document: document2 }) {
    element.querySelectorAll("style, script, link, noscript").forEach((n) => n.remove());
    emphasizeHeadings(element, document2);
    let cols = Array.from(element.querySelectorAll('.introText > [class*="col-"]'));
    if (!cols.length) {
      cols = Array.from(element.querySelectorAll('[class*="col-xs-"], [class*="col-sm-"]')).filter((c) => c.querySelector("h1, h2, h3, h4, p, span"));
    }
    const rowCells = [];
    cols.forEach((col) => {
      const cellContent = [];
      col.querySelectorAll(".sr-only").forEach((n) => n.remove());
      Array.from(col.children).forEach((child) => {
        if (child.textContent && child.textContent.trim()) cellContent.push(child);
      });
      rowCells.push(cellContent.length ? cellContent : col);
    });
    const hasText = rowCells.some((cell) => {
      const nodes = Array.isArray(cell) ? cell : [cell];
      return nodes.some((n) => n && n.textContent && n.textContent.trim());
    });
    if (!rowCells.length || !hasText) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [rowCells];
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-navbar.js
  function parse7(element, { document: document2 }) {
    element.querySelectorAll("style, script, link, noscript").forEach((n) => n.remove());
    let cols = Array.from(element.querySelectorAll('[class*="footerCol"]'));
    if (!cols.length) {
      cols = Array.from(element.querySelectorAll('[class*="col-sm-"], [class*="col-md-"], [class*="col-xs-"]'));
    }
    if (!cols.length) {
      cols = Array.from(element.children);
    }
    const rowCells = cols.filter((col) => col.textContent && col.textContent.trim() || col.querySelector("img, a")).map((col) => col);
    if (!rowCells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [rowCells];
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns (navbar)", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/hardrock-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#onetrust-consent-sdk",
        "#myModal",
        "#ibe",
        "ft-booking-bar",
        "ft-root",
        '[class*="flatpickr"]',
        '[class*="sun"]'
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#mainNavigation",
        "#pageid123997 > footer",
        "#ttdUniversalPixelTag",
        "#batBeacon751805678884",
        "iframe",
        "link",
        "noscript",
        "script",
        "style",
        "source"
      ]);
      const TRACKING_PIXEL_SRC = [
        "bing.com/action",
        "bat.bing",
        "doubleclick.net",
        "g.doubleclick",
        "cm.g.doubleclick",
        "adnxs.com",
        "adform.net",
        "adsrvr.org",
        "sojern"
      ];
      element.querySelectorAll("img[src]").forEach((img) => {
        const src = img.getAttribute("src") || "";
        if (TRACKING_PIXEL_SRC.some((needle) => src.includes(needle))) {
          img.remove();
        }
      });
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("onclick");
        el.removeAttribute("onload");
        el.removeAttribute("data-track");
      });
    }
  }

  // tools/importer/transformers/hardrock-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function transform2(hookName, element, payload) {
    const sections = payload.template && payload.template.sections || [];
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (i === 0 && !section.style) continue;
        const sectionEl = element.querySelector(section.selector);
        if (!sectionEl) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || element.querySelector(section.selector);
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // tools/importer/import-daytona-beach.js
  var parsers = {
    "carousel-hero": parse4,
    // -> carousel (hero)
    "columns-intro": parse6,
    // -> columns
    "cards-rooms": parse3,
    // -> cards (feature)
    "columns-promo": parse5,
    // -> columns (promo splits)
    "cards-explore": parse2,
    // -> cards
    "cards-event": parse,
    // -> cards-event
    "columns-navbar": parse7
    // -> columns (navbar)
  };
  var PAGE_TEMPLATE = {
    name: "daytona-beach",
    description: "Hard Rock Hotel Daytona Beach homepage: hero carousel + booking bar, two-column intro, rooms feature card, alternating promo columns, resort cards, events cards, email signup band, and utility nav strip.",
    urls: [
      "https://hotel.hardrock.com/daytona-beach/"
    ],
    blocks: [
      { name: "carousel-hero", instances: ["#vizADAHeroCarousel2Widget1442910"] },
      { name: "columns-intro", instances: ["#pageIntro .container > .row"] },
      { name: "cards-rooms", instances: ["#custom1 .row-eq-height"] },
      { name: "columns-promo", instances: ["#hardrockSplitWidget968226"] },
      { name: "cards-explore", instances: ["#hardrockCtaCarouselWidget969132"] },
      { name: "cards-event", instances: ["#hardRockCalendarEmbedWidget968462"] },
      { name: "columns-navbar", instances: ["#custom7 .footerRow1"] }
    ],
    sections: [
      { id: "rc1", name: "Hero carousel + booking bar", selector: "#pageid123997 > header.container-fluid", style: null, blocks: ["carousel-hero", "widget"], defaultContent: [] },
      { id: "rc2", name: "Page intro (two columns)", selector: "#pageIntro", style: null, blocks: ["columns-intro"], defaultContent: [] },
      { id: "rc3", name: "Rooms & Suites feature", selector: "#custom1", style: "shaded", blocks: ["cards-rooms"], defaultContent: ["#custom1 .ctaCarouselHeading"] },
      { id: "rc4", name: "Promotional splits", selector: "#custom2", style: "light", blocks: ["columns-promo"], defaultContent: [] },
      { id: "rc5", name: "Explore the resort", selector: "#custom3", style: "shaded", blocks: ["cards-explore"], defaultContent: ["#custom3 .ctaCarouselHeading"] },
      { id: "rc6", name: "Events that rock", selector: "#custom4", style: null, blocks: ["cards-event"], defaultContent: ["#custom4 .calEmbedHeading"] },
      { id: "rc7", name: "Email signup band", selector: "#custom5", style: "accent", blocks: ["widget"], defaultContent: [] },
      { id: "rc8", name: "Utility nav strip", selector: "#custom7", style: null, blocks: ["columns-navbar"], defaultContent: [] }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_daytona_beach_default = {
    transform: (payload) => {
      const { document: document2, url, params } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document2.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_daytona_beach_exports);
})();
