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
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // tools/importer/import-biloxi.js
  var import_biloxi_exports = {};
  __export(import_biloxi_exports, {
    default: () => import_biloxi_default
  });

  // tools/importer/parsers/carousel-hero.js
  function parse(element, { document: document2 }) {
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
  function parse2(element, { document: document2 }) {
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

  // tools/importer/parsers/cards-overlay.js
  var isRealUrl = (u) => u && !u.startsWith("data:") && !u.startsWith("blob:");
  function collectTileBackgrounds(element, document2) {
    const map = {};
    const widgetId = element.getAttribute && element.getAttribute("id");
    const styleNodes = new Set(Array.from(element.querySelectorAll("style")));
    if (document2) {
      Array.from(document2.querySelectorAll("style")).forEach((s) => {
        const t = s.textContent || "";
        if (widgetId && t.indexOf(widgetId) !== -1) styleNodes.add(s);
      });
    }
    let styleText = Array.from(styleNodes).map((s) => s.textContent || "").join("\n");
    if (styleText.indexOf("background-image") === -1) {
      const html = (element.innerHTML || "") + (element.outerHTML || "");
      if (html.indexOf("background-image") !== -1) styleText += `
${html}`;
    }
    if (!styleText) return map;
    const re = /\.CTA(\d+)[^{}]*\{[^}]*background-image\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
    let m;
    while ((m = re.exec(styleText)) !== null) {
      const idx = m[1];
      const url = m[2];
      if (isRealUrl(url)) map[`CTA${idx}`] = url;
    }
    return map;
  }
  function resolveCardImage(tile, document2, bgMap) {
    const img = tile.querySelector(".feature-img img, .image img, img");
    let url = "";
    let alt = "";
    if (img) {
      alt = img.getAttribute("alt") || "";
      const cand = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("src") || "";
      if (isRealUrl(cand)) url = cand;
    }
    if (!url) {
      const all = [tile].concat(Array.from(tile.querySelectorAll("*")));
      for (let i = 0; i < all.length; i += 1) {
        const el = all[i];
        const style = el.getAttribute && el.getAttribute("style") || "";
        const dataBg = el.getAttribute && (el.getAttribute("data-bg") || el.getAttribute("data-background")) || "";
        const m = style.match(/url\(["']?(.*?)["']?\)/);
        if (m && isRealUrl(m[1])) {
          url = m[1];
          break;
        }
        if (isRealUrl(dataBg)) {
          url = dataBg;
          break;
        }
      }
    }
    if (!url && bgMap) {
      const ctaClass = Array.from(tile.classList).find((c) => /^CTA\d+$/.test(c));
      if (ctaClass && bgMap[ctaClass]) url = bgMap[ctaClass];
    }
    if (!url) return null;
    const out = document2.createElement("img");
    out.setAttribute("src", url);
    if (alt) out.setAttribute("alt", alt);
    return out;
  }
  function parse3(element, { document: document2 }) {
    const cells = [];
    const bgMap = collectTileBackgrounds(element, document2);
    element.querySelectorAll("style, script, link, noscript").forEach((n) => n.remove());
    const tiles = Array.from(element.querySelectorAll(".CTA"));
    const seenHeading = /* @__PURE__ */ new Set();
    tiles.forEach((tile) => {
      const img = resolveCardImage(tile, document2, bgMap);
      const textCell = [];
      const headingEl = tile.querySelector(".featureListItemHeading");
      let headingKey = "";
      if (headingEl) {
        const eyebrowEl = headingEl.querySelector("span");
        const eyebrow = eyebrowEl ? eyebrowEl.textContent.trim() : "";
        const full = headingEl.textContent.replace(/\s+/g, " ").trim();
        const title = eyebrow && full.startsWith(eyebrow) ? full.slice(eyebrow.length).trim() : full;
        headingKey = full;
        if (eyebrow) {
          const p = document2.createElement("p");
          const em = document2.createElement("em");
          em.textContent = eyebrow;
          p.appendChild(em);
          textCell.push(p);
        }
        if (title) {
          const h = document2.createElement("h3");
          h.textContent = title;
          textCell.push(h);
        }
      }
      if (headingKey && seenHeading.has(headingKey)) return;
      if (headingKey) seenHeading.add(headingKey);
      const paras = Array.from(tile.querySelectorAll(".overlayContent > p, .overlayContent p, .ctaContainer p"));
      const seenP = /* @__PURE__ */ new Set();
      paras.forEach((p) => {
        const t = p.textContent.replace(/\s+/g, " ").trim();
        if (!t || seenP.has(t)) return;
        seenP.add(t);
        const np = document2.createElement("p");
        np.textContent = t;
        textCell.push(np);
      });
      const cta = tile.querySelector("a.CTAButton1, a.btn, .overlayContent a, a");
      if (cta && cta.getAttribute("href")) {
        const a = document2.createElement("a");
        a.href = cta.getAttribute("href");
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
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards (overlay)", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/hero-band.js
  var isRealUrl2 = (u) => u && !u.startsWith("data:") && !u.startsWith("blob:");
  function backgroundFromStyle(root, document2) {
    const styleNodes = new Set(Array.from(root.querySelectorAll("style")));
    if (document2) {
      Array.from(document2.querySelectorAll("style")).forEach((s) => styleNodes.add(s));
    }
    let styleText = Array.from(styleNodes).map((s) => s.textContent || "").join("\n");
    if (styleText.indexOf("background-image") === -1) {
      const parts = [root.innerHTML || "", root.outerHTML || ""];
      if (document2 && document2.documentElement) parts.push(document2.documentElement.innerHTML || "");
      const html = parts.join("\n");
      if (html.indexOf("background-image") !== -1) styleText += `
${html}`;
    }
    let url = "";
    const re = /\.fullWidthSlide[^{}]*\{[^}]*background-image\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
    let m;
    while ((m = re.exec(styleText)) !== null) {
      if (isRealUrl2(m[1])) url = m[1];
    }
    return url;
  }
  function resolveBandImage(root, document2) {
    const img = root.querySelector(".fullWidthSlide img, .fullWidthSlide picture img, img");
    let url = "";
    let alt = "";
    if (img) {
      alt = img.getAttribute("alt") || "";
      const cand = img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("src") || "";
      if (isRealUrl2(cand)) url = cand;
    }
    if (!url) {
      const all = Array.from(root.querySelectorAll("*"));
      for (let i = 0; i < all.length; i += 1) {
        const style = all[i].getAttribute && all[i].getAttribute("style") || "";
        const mm = style.match(/url\(["']?(.*?)["']?\)/);
        if (mm && isRealUrl2(mm[1])) {
          url = mm[1];
          break;
        }
      }
    }
    if (!url) url = backgroundFromStyle(root, document2);
    if (!url) return null;
    const out = document2.createElement("img");
    out.setAttribute("src", url);
    if (alt) out.setAttribute("alt", alt);
    return out;
  }
  function parse4(element, { document: document2 }) {
    const img = resolveBandImage(element, document2);
    element.querySelectorAll("style, script, link, noscript").forEach((n) => n.remove());
    const textCell = [];
    const headingEl = element.querySelector(".fwContentHeader, .fullWidthHeading, h1, h2");
    if (headingEl) {
      const eyebrowEl = headingEl.querySelector("span");
      const eyebrow = eyebrowEl ? eyebrowEl.textContent.trim() : "";
      const full = headingEl.textContent.replace(/\s+/g, " ").trim();
      const title = eyebrow && full.startsWith(eyebrow) ? full.slice(eyebrow.length).trim() : full;
      if (eyebrow) {
        const p = document2.createElement("p");
        const em = document2.createElement("em");
        em.textContent = eyebrow;
        p.appendChild(em);
        textCell.push(p);
      }
      if (title) {
        const h = document2.createElement("h2");
        h.textContent = title;
        textCell.push(h);
      }
    }
    const seenP = /* @__PURE__ */ new Set();
    Array.from(element.querySelectorAll("p")).forEach((p) => {
      const t = p.textContent.replace(/\s+/g, " ").trim();
      if (!t || seenP.has(t)) return;
      const onlyLink = p.querySelector("a") && p.textContent.trim() === p.querySelector("a").textContent.trim();
      if (onlyLink) return;
      seenP.add(t);
      const np = document2.createElement("p");
      np.textContent = t;
      textCell.push(np);
    });
    const cta = element.querySelector("a.btn, .fwContentHeader a, a");
    if (cta && cta.getAttribute("href")) {
      const a = document2.createElement("a");
      a.href = cta.getAttribute("href");
      a.textContent = cta.textContent.replace(/\s+/g, " ").trim();
      const p = document2.createElement("p");
      p.appendChild(a);
      textCell.push(p);
    }
    if (!img && !textCell.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    cells.push([img || ""]);
    cells.push([textCell.length ? textCell : ""]);
    const block = WebImporter.Blocks.createBlock(document2, { name: "hero (band)", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-explore.js
  function resolveCardImage2(slide, document2) {
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
  function parse5(element, { document: document2 }) {
    const cells = [];
    element.querySelectorAll("style, script, link, noscript").forEach((n) => n.remove());
    const slides = Array.from(element.querySelectorAll(".slickSlide:not(.slick-cloned)"));
    slides.forEach((slide) => {
      const img = resolveCardImage2(slide, document2);
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

  // tools/importer/parsers/embed-video.js
  var isRealUrl3 = (u) => u && !u.startsWith("data:") && !u.startsWith("blob:");
  function youtubeId(url) {
    try {
      const u = new URL(url, "https://www.youtube.com");
      if (u.hostname === "youtu.be") return u.pathname.slice(1);
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2];
      return u.searchParams.get("v") || "";
    } catch (e) {
      return "";
    }
  }
  function findYoutubeUrl(text) {
    if (!text) return "";
    const m = text.match(/https?:\/\/[^"'\s\\]*(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)[A-Za-z0-9_-]+/);
    return m ? m[0] : "";
  }
  function parse6(element, { document: document2 }) {
    let src = "";
    src = element.getAttribute("data-embed-src") || "";
    const iframe = element.querySelector("iframe");
    if (!src && iframe) src = iframe.getAttribute("src") || iframe.getAttribute("data-src") || "";
    if (!src) {
      const a = element.querySelector('a[href*="youtu"], a[href*="/embed/"]');
      if (a) src = a.getAttribute("href") || "";
    }
    if (!src) src = findYoutubeUrl(element.outerHTML || "");
    if (!src && document2) {
      const widgetId = element.getAttribute && element.getAttribute("id");
      const scripts = Array.from(document2.querySelectorAll("script"));
      const scoped = widgetId ? scripts.find((s) => (s.textContent || "").indexOf(widgetId) !== -1 && findYoutubeUrl(s.textContent)) : null;
      if (scoped) src = findYoutubeUrl(scoped.textContent);
      if (!src) src = findYoutubeUrl(document2.documentElement ? document2.documentElement.innerHTML : "");
    }
    if (!isRealUrl3(src)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const id = youtubeId(src);
    const embedUrl = id ? `https://www.youtube.com/embed/${id}` : src;
    const p = document2.createElement("p");
    p.textContent = embedUrl;
    const block = WebImporter.Blocks.createBlock(document2, {
      name: "embed-video",
      cells: [[p]]
    });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-event.js
  function parse7(element, { document: document2 }) {
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

  // tools/importer/import-biloxi.js
  var parsers = {
    "carousel-hero": parse,
    // -> carousel (hero)
    "columns-intro": parse2,
    // -> columns
    "cards-overlay": parse3,
    // -> cards (overlay)
    "hero-band": parse4,
    // -> hero (band)
    "cards-explore": parse5,
    // -> cards
    "embed-video": parse6,
    // -> embed-video
    "cards-event": parse7
    // -> cards-event
  };
  var PAGE_TEMPLATE = {
    name: "biloxi",
    description: "Hard Rock Hotel & Casino Biloxi homepage: hero carousel + booking bar, two-column intro, overlay feature tiles + full-bleed casino band + explore cards, embedded video, and events cards. Same Vizergy CMS as daytona-beach.",
    urls: [
      "https://www.hrhcbiloxi.com/"
    ],
    blocks: [
      { name: "carousel-hero", instances: ["#vizADAHeroCarousel2Widget1475425"] },
      { name: "columns-intro", instances: ["#hardrockADAIntroWidget1465938 .introText"] },
      { name: "cards-overlay", instances: ["#hardrockFeatureListHOverlayWidget1475405"] },
      { name: "hero-band", instances: ["#fullWidthCTAGrid2Widget1475406"] },
      { name: "cards-explore", instances: ["#hardrockCtaCarouselWidget1475409"] },
      { name: "embed-video", instances: ["#hrhEmbedVideoWidget1475408"] },
      { name: "cards-event", instances: ["#hardRockCalendarEmbedWidget1466030"] }
    ],
    sections: [
      { id: "rc1", name: "Hero carousel + booking bar", selector: "#pageid171423 > header.container-fluid", style: null, blocks: ["carousel-hero", "widget"], defaultContent: [] },
      { id: "rc2", name: "Page intro (two columns)", selector: "#pageIntro", style: null, blocks: ["columns-intro"], defaultContent: [] },
      { id: "rc3", name: "Feature tiles + casino band + explore cards", selector: "#custom1", style: "shaded", blocks: ["cards-overlay", "hero-band", "cards-explore"], defaultContent: ["#fullWidthCTAGrid2Widget1475406 .h2", "#custom1 .ctaCarouselHeading"] },
      { id: "rc4", name: "Step Inside (video)", selector: "#custom2", style: null, blocks: ["embed-video"], defaultContent: ["#custom2 h2"] },
      { id: "rc6", name: "Events that rock + email signup", selector: "#custom4", style: null, blocks: ["cards-event", "widget"], defaultContent: ["#custom4 .calEmbedHeading"] }
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
  var import_biloxi_default = {
    /**
     * Runs on the LIVE page before html2md sanitizes the DOM (which strips
     * <script>/<iframe>). The Biloxi video embed's YouTube URL only exists inside
     * an inline injection <script> in the widget, so hoist it onto a
     * data-embed-src attribute now — the attribute survives sanitization and the
     * embed-video parser reads it. Pure DOM read/write, no side effects.
     */
    onLoad: (_0) => __async(void 0, [_0], function* ({ document: document2 }) {
      document2.querySelectorAll('[id*="EmbedVideo" i], [class*="EmbedVideo" i]').forEach((widget) => {
        if (widget.getAttribute("data-embed-src")) return;
        let url = "";
        const iframe = widget.querySelector("iframe");
        if (iframe) url = iframe.getAttribute("src") || iframe.getAttribute("data-src") || "";
        if (!url) {
          const m = (widget.outerHTML || "").match(/https?:\/\/[^"'\s\\]*(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)[A-Za-z0-9_-]+/);
          if (m) [url] = m;
        }
        if (url) widget.setAttribute("data-embed-src", url);
      });
    }),
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
      const localized = rawPath === "" ? "/biloxi/index" : `/biloxi${rawPath}`;
      const path = WebImporter.FileUtils.sanitizePath(localized);
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
  return __toCommonJS(import_biloxi_exports);
})();
