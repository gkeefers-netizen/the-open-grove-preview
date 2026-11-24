/* The Open Grove — guide bot ("Ask Laura").
   Client-side only: no server, no API key, no cost, no external calls.
   It runs entirely in the visitor's browser. Nothing typed here leaves the page.
   It reads the events list from ONE file, events.json in the site root, so the
   weekly events check only ever has to update that file.
   Included on every page with: <script src="guide-bot.js"></script>
   (library/ and products/ pages use ../guide-bot.js). */
(function () {
  'use strict';
  if (window.__groveGuideLoaded) return;
  window.__groveGuideLoaded = true;

  /* ---------- links (paths are relative to the site root) ---------- */
  var FEEDBACK_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSfAkGmgrnLDdnW2NTMyFmON5D89OcG5p64wi_QUcRXA9pnpcg/viewform';
  var RECIPE_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSdHghwHvInRbtngmnQUnIUQFlt2JNddrDBhtaMVzFc5n2uZAA/viewform';
  var DESIGN_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSfkcZusBildUUK9sKD5UbVLhFVhSzV1yhZQkMwI6m29P_YgZg/viewform';
  var CONTACT_EMAIL = 'hello@the-open-grove.com';

  /* Page map: every page the bot can point to. */
  var PAGES = {
    home: 'index.html', shop: 'shop.html',
    library: 'library/index.html', paths: 'library/paths.html',
    heathenry: 'library/heathenry.html', wicca: 'library/wicca.html',
    druidry: 'library/druidry.html', hellenic: 'library/hellenic.html',
    egyptian: 'library/egyptian.html', celtic: 'library/celtic.html',
    recipes: 'library/recipes.html', reading: 'library/reading.html',
    glossary: 'library/glossary.html',
    wheel: 'index.html#wheel', wisdom: 'index.html#wisdom',
    keepsakes: 'index.html#keepsakes', about: 'index.html#about',
    join: 'index.html#join', share: 'index.html#share',
    designs: 'index.html#designs', community: 'index.html#community',
    thisweek: 'index.html#this-week', policies: 'index.html#policies',
    shipping: 'index.html#shipping', returns: 'index.html#returns',
    privacy: 'index.html#privacy', accessibility: 'index.html#accessibility'
  };

  /* ---------- where am I? (prefix from this script's own src) ---------- */
  var ROOT = ''; /* "" on root pages, "../" on library/ and products/ pages */
  var scriptEl = null;
  if (document.currentScript) { scriptEl = document.currentScript; }
  if (!scriptEl) {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i].getAttribute('src') || '';
      if (s.indexOf('guide-bot.js') !== -1) { scriptEl = scripts[i]; break; }
    }
  }
  if (scriptEl) {
    var src = scriptEl.getAttribute('src') || '';
    ROOT = src.replace(/guide-bot\.js.*$/, '');
    if (ROOT && ROOT.slice(-1) !== '/') { ROOT += '/'; }
  } else if (/^\/(library|products)\//.test(window.location.pathname) ||
             /\/(library|products)\//.test(window.location.pathname)) {
    ROOT = '../';
  }
  function rootLink(path) { return ROOT + path; }
  function eventsUrl() {
    if (scriptEl && scriptEl.src) {
      try { return new URL('events.json', scriptEl.src).href; } catch (e) {}
    }
    return ROOT + 'events.json';
  }

  /* ---------- styles (injected; follows the site's own variables) ---------- */
  var CSS = [
    '.grove-guide-launcher{position:fixed;right:14px;bottom:84px;z-index:95;display:flex;align-items:center;gap:8px;background:#1d3a28;color:#f5efdb;border:1px solid #1d3a28;border-radius:999px;padding:12px 18px;min-height:52px;font-family:"Alegreya Sans",system-ui,sans-serif;font-size:.98rem;font-weight:600;cursor:pointer;box-shadow:var(--shadow,0 6px 24px rgba(20,30,20,.28))}',
    '.grove-guide-launcher:hover{background:#24452f}',
    '.grove-guide-launcher .gg-moon{font-size:1.15rem;line-height:1}',
    '.grove-guide-panel{position:fixed;right:14px;bottom:148px;z-index:96;width:min(370px,calc(100vw - 28px));max-height:min(600px,calc(100vh - 170px));background:var(--card,#fdf9ec);color:var(--ink,#2b2620);border:1px solid var(--line,#d8cdb4);border-radius:16px;box-shadow:var(--shadow,0 10px 32px rgba(20,30,20,.3));display:flex;flex-direction:column;overflow:hidden}',
    '.grove-guide-panel[hidden]{display:none}',
    '.grove-guide-head{background:#1d3a28;color:#f5efdb;padding:12px 14px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px}',
    '.grove-guide-head h2{margin:0;font-size:1.05rem;line-height:1.25}',
    '.grove-guide-head p{margin:3px 0 0;font-size:.82rem;line-height:1.35;opacity:.88}',
    '.grove-guide-close{background:transparent;border:1px solid rgba(245,239,219,.55);color:#f5efdb;border-radius:999px;width:34px;height:34px;flex:0 0 auto;font-size:1rem;line-height:1;cursor:pointer}',
    '.grove-guide-log{flex:1 1 auto;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;font-size:.95rem;line-height:1.5}',
    '.gg-msg{max-width:92%;padding:9px 12px;border-radius:12px;overflow-wrap:break-word}',
    '.gg-bot{align-self:flex-start;background:#f0e9d6;border:1px solid var(--line,#d8cdb4);border-bottom-left-radius:4px}',
    '.gg-user{align-self:flex-end;background:#1d3a28;color:#f5efdb;border-bottom-right-radius:4px}',
    '.gg-msg a{color:var(--clay,#8a5a2b);text-decoration:underline}',
    '.gg-user a{color:#f5efdb}',
    '.gg-msg p{margin:0 0 6px}.gg-msg p:last-child{margin-bottom:0}',
    '.gg-ev{display:block;margin:8px 0;padding:8px 10px;border:1px solid var(--line,#d8cdb4);border-radius:10px;background:rgba(255,255,255,.55)}',
    '.gg-ev b{display:block;font-size:.98rem}',
    '.gg-ev .gg-when{font-size:.88rem;opacity:.9}',
    '.gg-ev .gg-where{font-size:.88rem}',
    '.gg-ev .gg-dist{font-weight:700}',
    '.gg-ev .gg-det{font-size:.88rem;margin-top:4px}',
    '.gg-note{font-size:.85rem;opacity:.85}',
    '.gg-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}',
    '.gg-action,.gg-chip{background:transparent;border:1px solid var(--clay,#8a5a2b);color:var(--clay,#8a5a2b);border-radius:999px;padding:7px 12px;font-family:"Alegreya Sans",system-ui,sans-serif;font-size:.86rem;font-weight:600;cursor:pointer;min-height:36px}',
    '.gg-action:hover,.gg-chip:hover{background:rgba(138,90,43,.08)}',
    '.gg-chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 14px 10px}',
    '.gg-form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line,#d8cdb4);background:var(--card,#fdf9ec)}',
    '.gg-input{flex:1 1 auto;min-width:0;border:1px solid var(--line,#d8cdb4);border-radius:999px;padding:10px 14px;font-family:inherit;font-size:.95rem;background:#fff;color:#2b2620}',
    '.gg-send{background:#1d3a28;color:#f5efdb;border:1px solid #1d3a28;border-radius:999px;padding:10px 16px;font-family:"Alegreya Sans",system-ui,sans-serif;font-size:.92rem;font-weight:600;cursor:pointer;min-height:44px}',
    '.grove-guide-launcher:focus-visible,.grove-guide-close:focus-visible,.gg-action:focus-visible,.gg-chip:focus-visible,.gg-input:focus-visible,.gg-send:focus-visible{outline:3px solid var(--clay,#8a5a2b);outline-offset:2px}',
    'html.hc .grove-guide-launcher,html.hc .grove-guide-panel,html.hc .gg-action,html.hc .gg-chip,html.hc .gg-input,html.hc .gg-send{border-width:2px}',
    '@media (prefers-reduced-motion: reduce){.grove-guide-launcher,.grove-guide-panel{transition:none !important;animation:none !important}}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ---------- ZIP lookup: 3-digit prefixes + exact town ZIPs ----------
     Distances from a ZIP are rough — a prefix covers a whole mail area, so the
     bot says "about" and offers the browser's location for an exact distance.
     Centres were geocoded (city level) when the bot was built. */
  var ZIP_PREFIX = {
    '228': [38.45163, -78.8697, 'Harrisonburg, VA'],
    '240': [37.27152, -79.94057, 'Roanoke, VA'],
    '241': [37.29372, -80.05282, 'Salem, VA'],
    '242': [36.59854, -82.18079, 'Bristol, VA'],
    '243': [37.04939, -80.77987, 'Pulaski, VA'],
    '244': [38.15026, -79.07275, 'Staunton, VA'],
    '245': [37.4144, -79.14318, 'Lynchburg, VA'],
    '246': [37.09435, -81.80302, 'Richlands, VA'],
    '247': [37.26798, -81.22262, 'Bluefield, WV'],
    '248': [37.42998, -81.58547, 'Welch, WV'],
    '249': [37.80212, -80.44614, 'Lewisburg, WV'],
    '270': [36.49908, -80.60689, 'Mount Airy, NC'],
    '271': [36.10001, -80.24116, 'Winston-Salem, NC'],
    '286': [36.22061, -81.68751, 'Boone, NC']
  };
  var ZIP_TOWN = { /* exact ZIPs for the towns where gatherings actually are */
    '24060': [37.22653, -80.4109, 'Blacksburg, VA'],
    '24061': [37.22653, -80.4109, 'Blacksburg, VA'],
    '24062': [37.22653, -80.4109, 'Blacksburg, VA'],
    '24063': [37.22653, -80.4109, 'Blacksburg, VA'],
    '24068': [37.13042, -80.4081, 'Christiansburg, VA'],
    '24073': [37.13042, -80.4081, 'Christiansburg, VA'],
    '24091': [36.91188, -80.32033, 'Floyd, VA'],
    '24141': [37.12069, -80.58996, 'Radford, VA'],
    '24142': [37.12069, -80.58996, 'Radford, VA'],
    '24143': [37.12069, -80.58996, 'Radford, VA']
  };
  var NEARBY_MILES = 50;

  function haversineMiles(lat1, lon1, lat2, lon2) {
    var R = 3958.8, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  function lookupZip(zip) {
    var z = (zip || '').replace(/[^0-9]/g, '').slice(0, 5);
    if (z.length !== 5) return null;
    if (ZIP_TOWN[z]) return { lat: ZIP_TOWN[z][0], lon: ZIP_TOWN[z][1], place: ZIP_TOWN[z][2], rough: false };
    var p = ZIP_PREFIX[z.slice(0, 3)];
    if (p) return { lat: p[0], lon: p[1], place: p[2], rough: true };
    return null;
  }

  /* ---------- events data (one file: events.json) ---------- */
  var eventsPromise = null;
  function loadEvents() {
    if (eventsPromise) return eventsPromise;
    eventsPromise = new Promise(function (resolve) {
      if (!window.fetch) { resolve(null); return; }
      fetch(eventsUrl()).then(function (r) {
        if (!r.ok) throw new Error('events fetch ' + r.status);
        return r.json();
      }).then(function (data) {
        resolve(data && data.events ? data.events : null);
      }).catch(function () { resolve(null); });
    });
    return eventsPromise;
  }
  function eventEndMs(ev) {
    var end = ev.end || ev.start || '23:59';
    var parts = (ev.date + 'T' + end + ':00').split(/[-T:]/);
    return new Date(+parts[0], +parts[1] - 1, +parts[2], +parts[3], +parts[4]).getTime();
  }
  function upcoming(events) {
    var now = Date.now();
    return (events || []).filter(function (ev) { return eventEndMs(ev) >= now - 3600000; });
  }
  function fmtDate(iso) {
    var p = iso.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function fmtTime(hhmm) {
    if (!hhmm) return '';
    var p = hhmm.split(':'), h = +p[0], m = +p[1];
    var ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + (m ? ':' + (m < 10 ? '0' + m : m) : '') + ' ' + ap;
  }
  function fmtWhen(ev) {
    var s = fmtDate(ev.date);
    if (ev.start && ev.end) {
      var st = fmtTime(ev.start), en = fmtTime(ev.end);
      /* "5–8 PM" when both ends share AM/PM; "10 AM–1 PM" when they differ. */
      if (st.slice(-2) === en.slice(-2)) st = st.slice(0, -3);
      return s + ', ' + st + '–' + en;
    }
    if (ev.start) return s + ', from ' + fmtTime(ev.start);
    return s;
  }
  function fmtDist(miles, rough) {
    if (miles < 1) return 'less than a mile away';
    var n = Math.round(miles);
    return 'about ' + n + ' mile' + (n === 1 ? '' : 's') + (rough ? ' (a rough guess from your ZIP area)' : ' from you');
  }

  /* ---------- build the widget ---------- */
  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'grove-guide-launcher';
  launcher.id = 'grove-guide-launcher';
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'grove-guide-panel');
  launcher.setAttribute('aria-label', 'Ask Laura — open the grove guide');
  var moonMark = document.createElement('span');
  moonMark.className = 'gg-moon';
  moonMark.setAttribute('aria-hidden', 'true');
  moonMark.textContent = '☾';
  launcher.appendChild(moonMark);
  launcher.appendChild(document.createTextNode('Ask Laura'));
  document.body.appendChild(launcher);

  var panel = document.createElement('div');
  panel.className = 'grove-guide-panel';
  panel.id = 'grove-guide-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Ask Laura — grove guide');
  panel.hidden = true;

  var head = document.createElement('div');
  head.className = 'grove-guide-head';
  var headText = document.createElement('div');
  var h2 = document.createElement('h2');
  h2.textContent = 'Ask Laura';
  var sub = document.createElement('p');
  sub.textContent = 'The grove guide — a helper, not a person. Nothing you type here leaves this page.';
  headText.appendChild(h2);
  headText.appendChild(sub);
  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'grove-guide-close';
  closeBtn.setAttribute('aria-label', 'Close the guide');
  closeBtn.textContent = '✕';
  head.appendChild(headText);
  head.appendChild(closeBtn);
  panel.appendChild(head);

  var log = document.createElement('div');
  log.className = 'grove-guide-log';
  log.id = 'grove-guide-log';
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  panel.appendChild(log);

  var chipsRow = document.createElement('div');
  chipsRow.className = 'gg-chips';
  chipsRow.setAttribute('role', 'group');
  chipsRow.setAttribute('aria-label', 'Quick questions');
  panel.appendChild(chipsRow);

  var form = document.createElement('form');
  form.className = 'gg-form';
  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'gg-input';
  input.setAttribute('aria-label', 'Type your question for the grove guide');
  input.setAttribute('placeholder', 'Ask about the grove…');
  input.setAttribute('autocomplete', 'off');
  var sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.className = 'gg-send';
  sendBtn.textContent = 'Send';
  form.appendChild(input);
  form.appendChild(sendBtn);
  panel.appendChild(form);
  document.body.appendChild(panel);

  /* ---------- state ---------- */
  var greeted = false;
  var awaitingZip = false;
  var visitorLoc = null; /* {lat, lon, place, rough} */

  /* ---------- message rendering (DOM only — no HTML from strings) ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function linkNode(text, href, external) {
    var a = document.createElement('a');
    a.textContent = text;
    a.href = href;
    if (external) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }
  /* A bot reply is a list of parts: {t:'text'|'link'|'note'|'event', ...}.
     Plain strings are also accepted (treated as one text part). */
  function addBot(parts, actions) {
    if (typeof parts === 'string') parts = [{ t: 'text', x: parts }];
    var wrap = el('div', 'gg-msg gg-bot');
    parts.forEach(function (p) {
      if (p.t === 'text') { wrap.appendChild(el('p', null, p.x)); }
      else if (p.t === 'note') { wrap.appendChild(el('p', 'gg-note', p.x)); }
      else if (p.t === 'link') {
        var para = el('p');
        if (p.before) para.appendChild(document.createTextNode(p.before + ' '));
        para.appendChild(linkNode(p.label, p.href, p.external));
        if (p.after) para.appendChild(document.createTextNode(' ' + p.after));
        wrap.appendChild(para);
      } else if (p.t === 'event') { wrap.appendChild(eventCard(p.ev, p.dist)); }
    });
    if (actions && actions.length) {
      var row = el('div', 'gg-actions');
      actions.forEach(function (a) {
        var b = el('button', 'gg-action', a.label);
        b.type = 'button';
        b.addEventListener('click', function () { a.run(); });
        row.appendChild(b);
      });
      wrap.appendChild(row);
    }
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
  }
  function addUser(text) {
    var wrap = el('div', 'gg-msg gg-user', text);
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
  }
  function setChips(list) {
    while (chipsRow.firstChild) chipsRow.removeChild(chipsRow.firstChild);
    list.forEach(function (c) {
      var b = el('button', 'gg-chip', c.label);
      b.type = 'button';
      b.addEventListener('click', function () { handleInput(c.send); });
      chipsRow.appendChild(b);
    });
  }
  function eventCard(ev, dist) {
    var card = el('span', 'gg-ev');
    var title = el('b');
    if (ev.url) { title.appendChild(linkNode(ev.title, ev.url, true)); }
    else { title.textContent = ev.title; }
    card.appendChild(title);
    card.appendChild(el('span', 'gg-when', fmtWhen(ev)));
    var where = ev.kind === 'online'
      ? (ev.venue || 'Online')
      : ev.venue + (ev.address ? ' — ' + ev.address : '');
    card.appendChild(el('span', 'gg-where', where));
    if (dist != null) card.appendChild(el('span', 'gg-dist', fmtDist(dist, visitorLoc && visitorLoc.rough)));
    if (ev.details) card.appendChild(el('span', 'gg-det', ev.details));
    if (!ev.url) card.appendChild(el('span', 'gg-det gg-note', 'No link listed for this one yet.'));
    return card;
  }

  /* ---------- answers ---------- */
  function greet() {
    addBot([
      { t: 'text', x: 'Hello, and welcome to the grove. I’m a small helper that lives right here in this page — not a person, and nothing you type here leaves your browser.' },
      { t: 'text', x: 'I can point you around the site, find Yule gatherings near you, or answer the usual questions. What would you like?' }
    ]);
    setChips([
      { label: 'Events near me', send: 'events near me' },
      { label: 'Where’s the shop?', send: 'where is the shop' },
      { label: 'Join the newsletter', send: 'how do I join the newsletter' },
      { label: 'Shipping & returns', send: 'shipping and returns' }
    ]);
  }
  function linkAnswer(text, label, pageKey, after) {
    addBot([
      { t: 'text', x: text },
      { t: 'link', label: label, href: rootLink(PAGES[pageKey]) }
    ].concat(after ? [{ t: 'text', x: after }] : []));
  }
  function fallback() {
    addBot([
      { t: 'text', x: 'I don’t know that one, I’m afraid — I only know what’s on this site and in the events list.' },
      { t: 'text', x: 'The Library is a good place to look, or write to Laura and she’ll answer you herself.' },
      { t: 'link', label: 'Visit the Library', href: rootLink(PAGES.library) },
      { t: 'link', label: 'hello@the-open-grove.com', href: 'mailto:' + CONTACT_EMAIL }
    ]);
  }

  /* ---------- events flow ---------- */
  function askLocation() {
    awaitingZip = true;
    addBot([
      { t: 'text', x: 'I’d love to point you to the ones nearest you. A ZIP code is enough — or use your location, if you’re comfortable. Either way, nothing leaves this page.' },
      { t: 'note', x: 'ZIP distances are rough: I can only place your ZIP to the nearest town without sending it anywhere. Your location gives an exact distance.' }
    ], [
      { label: 'Use my location', run: useGeolocation },
      { label: 'Show online events', run: function () { showOnline(); } }
    ]);
    setChips([{ label: 'Show online events', send: 'online events' }]);
  }
  function useGeolocation() {
    if (!navigator.geolocation) {
      addBot('This browser doesn’t offer location — a ZIP code works just as well. What’s yours?');
      awaitingZip = true;
      return;
    }
    addBot('Asking your browser for your location…');
    navigator.geolocation.getCurrentPosition(function (pos) {
      visitorLoc = { lat: pos.coords.latitude, lon: pos.coords.longitude, place: 'you', rough: false };
      awaitingZip = false;
      showNearby();
    }, function () {
      addBot('No trouble at all — a ZIP code works just as well. What’s yours?');
      awaitingZip = true;
    }, { timeout: 8000, maximumAge: 600000 });
  }
  function handleZip(zipText) {
    var loc = lookupZip(zipText);
    if (!loc) {
      addBot([
        { t: 'text', x: 'I don’t recognise that ZIP area — it’s outside the towns I know around the grove (southwest Virginia, southern West Virginia, and northwest North Carolina).' },
        { t: 'text', x: 'The online gatherings are open to everyone, though — here they are:' }
      ]);
      awaitingZip = false;
      showOnline(true);
      return;
    }
    visitorLoc = loc;
    awaitingZip = false;
    showNearby();
  }
  function showNearby() {
    loadEvents().then(function (events) {
      if (!events) {
        addBot('I can’t reach the events list right now. The gatherings are also in the newsletter, or write to hello@the-open-grove.com and Laura will point you to them.');
        return;
      }
      var list = upcoming(events).filter(function (ev) { return ev.kind === 'in-person'; });
      if (!list.length) { allPast(events); return; }
      var near = [];
      list.forEach(function (ev) {
        var d = haversineMiles(visitorLoc.lat, visitorLoc.lon, ev.lat, ev.lon);
        if (d <= NEARBY_MILES) near.push({ ev: ev, d: d });
      });
      near.sort(function (a, b) {
        var da = a.ev.date + (a.ev.start || ''), db = b.ev.date + (b.ev.start || '');
        if (da !== db) return da < db ? -1 : 1;
        return a.d - b.d;
      });
      if (!near.length) {
        var parts = [{ t: 'text', x: 'Nothing within ' + NEARBY_MILES + ' miles of ' + visitorLoc.place + ' in the list I have — the grove only lists gatherings near home, and online ones.' },
          { t: 'text', x: 'Here are the online gatherings, open to everyone:' }];
        upcoming(events).filter(function (ev) { return ev.kind === 'online'; }).forEach(function (ev) {
          parts.push({ t: 'event', ev: ev });
        });
        addBot(parts);
        setChips([
          { label: 'Join the newsletter', send: 'how do I join the newsletter' },
          { label: 'What is the grove?', send: 'what is the grove' }
        ]);
        return;
      }
      var intro = visitorLoc.rough
        ? 'Near ' + visitorLoc.place + ' (from your ZIP area — so these distances are rough guesses):'
        : 'Near you:';
      var parts2 = [{ t: 'text', x: intro }];
      near.forEach(function (n) { parts2.push({ t: 'event', ev: n.ev, dist: n.d }); });
      parts2.push({ t: 'note', x: 'Details can change — check the event page before you travel. And the online gatherings are open to everyone, too.' });
      addBot(parts2, [{ label: 'Show online events', run: function () { showOnline(); } }]);
      setChips([
        { label: 'Show online events', send: 'online events' },
        { label: 'Join the newsletter', send: 'how do I join the newsletter' }
      ]);
    });
  }
  function showOnline(alreadySaid) {
    loadEvents().then(function (events) {
      if (!events) {
        addBot('I can’t reach the events list right now. The gatherings are also in the newsletter, or write to hello@the-open-grove.com and Laura will point you to them.');
        return;
      }
      var list = upcoming(events).filter(function (ev) { return ev.kind === 'online'; });
      if (!list.length) { allPast(events); return; }
      var parts = alreadySaid ? [] : [{ t: 'text', x: 'Here are the online gatherings — join from anywhere:' }];
      list.forEach(function (ev) { parts.push({ t: 'event', ev: ev }); });
      addBot(parts);
      setChips([{ label: 'Events near me', send: 'events near me' }]);
    });
  }
  function allPast(events) {
    var any = (events || []).length > 0;
    addBot(any
      ? 'This season’s gatherings have passed — new ones will be listed here when they’re announced. The newsletter is the surest way to hear first.'
      : 'I don’t have any gatherings listed right now — new ones will appear here when they’re announced.');
    setChips([{ label: 'Join the newsletter', send: 'how do I join the newsletter' }]);
  }

  /* ---------- intent router ---------- */
  function handleInput(raw) {
    var text = (raw || '').trim();
    if (!text) return;
    addUser(text);
    input.value = '';
    var q = text.toLowerCase();
    var zipMatch = text.match(/\b(\d{5})(-\d{4})?\b/);

    if (awaitingZip && zipMatch) { handleZip(zipMatch[1]); return; }
    if (zipMatch && /zip|near|event|gather|close|around/.test(q)) { handleZip(zipMatch[1]); return; }
    if (zipMatch && !visitorLoc) { handleZip(zipMatch[1]); return; }

    if (/returning the light/.test(q)) { showOnline(); return; }
    if (/online event|online gathering|virtual|zoom/.test(q)) { showOnline(); return; }
    if (/event|gathering|yule ball|masquerade|candlelight|solstice|what'?s on|whats on|near me|nearby|close to|around (here|me)|december|christmas|retreat|conference/.test(q)) {
      if (visitorLoc) { showNearby(); } else { askLocation(); }
      return;
    }
    if (/share a recipe|submit.*recipe|send.*recipe|my recipe/.test(q)) {
      addBot([
        { t: 'text', x: 'We’d love it. The Share a Recipe form takes a minute, and Laura reads every submission herself.' },
        { t: 'link', label: 'Share a Recipe', href: RECIPE_FORM, external: true },
        { t: 'link', label: 'Prefer paper? Download the PDF', href: rootLink('share-recipe-form.pdf') }
      ]);
      return;
    }
    if (/suggest.*design|design idea|my design|new design/.test(q)) {
      addBot([
        { t: 'text', x: 'Tell us what you’d like to see in the shop — it takes a minute, and there’s no obligation.' },
        { t: 'link', label: 'Suggest a Design', href: DESIGN_FORM, external: true },
        { t: 'link', label: 'Prefer paper? Download the PDF', href: rootLink('suggest-design-form.pdf') }
      ]);
      return;
    }
    if (/feedback|tell us what you think|give feedback|what.*think of the site/.test(q)) {
      addBot([
        { t: 'text', x: 'Thank you — it takes a minute, and you can answer anonymously.' },
        { t: 'link', label: 'Tell us what you think', href: FEEDBACK_FORM, external: true },
        { t: 'link', label: 'Prefer paper? Download the PDF', href: rootLink('feedback-form.pdf') }
      ]);
      return;
    }
    if (/gift|shop|buy|etsy|order|price|cost|how much|hoodie|tee|t-shirt|mug|tote|ornament|product|design/.test(q)) {
      addBot([
        { t: 'text', x: 'Everything in the shop is made to order through our Etsy shop — you’ll find the pieces, and their prices, on each listing.' },
        { t: 'link', label: 'Visit the shop', href: rootLink(PAGES.shop) },
        { t: 'text', x: 'Shipping and returns follow the details on each Etsy listing.' }
      ]);
      return;
    }
    if (/rune/.test(q)) { linkAnswer('The rune draw lives on the homepage, under Wisdom & Runes — one draw a day, with a verse to carry.', 'Draw a rune', 'wisdom'); return; }
    if (/wheel|festival|season|sabbat|imbolc|samhain|beltane|lughnasadh|mabon|ostara|equinox/.test(q)) { linkAnswer('The Wheel of the Year on the homepage follows the seasons and their festivals, one spoke at a time.', 'See the Wheel of the Year', 'wheel'); return; }
    if (/heathen|asatru|norse|viking/.test(q)) {
      addBot([
        { t: 'text', x: 'Heathenry is home turf here. The Library has a full introduction — honest about what’s old, what’s new, and what’s not ours to claim.' },
        { t: 'link', label: 'Heathenry', href: rootLink(PAGES.heathenry) },
        { t: 'link', label: 'All the paths', href: rootLink(PAGES.paths) }
      ]);
      return;
    }
    if (/wicca|witch/.test(q)) { linkAnswer('Wicca has its own page in the Library — what it is, where it came from, and how it differs from Heathenry.', 'Wicca', 'wicca'); return; }
    if (/druid/.test(q)) { linkAnswer('Druidry has its own page in the Library.', 'Druidry', 'druidry'); return; }
    if (/hellenic|greek/.test(q)) { linkAnswer('The Hellenic path has its own page in the Library.', 'Hellenic Polytheism', 'hellenic'); return; }
    if (/egyptian|kemetic/.test(q)) { linkAnswer('The Egyptian path has its own page in the Library.', 'Egyptian (Kemetic) Polytheism', 'egyptian'); return; }
    if (/celtic|irish/.test(q)) { linkAnswer('The Celtic path has its own page in the Library.', 'Celtic Polytheism', 'celtic'); return; }
    if (/many paths|paths|tradition/.test(q)) { linkAnswer('Many paths run through the grove. Each one has its own page — start at the map and follow the trail that calls to you.', 'Many Paths', 'paths'); return; }
    if (/recipe|wassail|cook|food/.test(q)) { linkAnswer('The Library keeps the ritual recipes — fifteen of them, with a practice filter so you can find the ones that fit your path.', 'Ritual recipes', 'recipes'); return; }
    if (/glossar|pronounc|how do you (say|pronounce)|what does .* mean/.test(q)) { linkAnswer('Words you’ll hear in the grove, with pronunciations, live in the Library.', 'Glossary', 'glossary'); return; }
    if (/reading|book/.test(q)) { linkAnswer('What the grove is reading — the book lists live in the Library.', 'Reading lists', 'reading'); return; }
    if (/librar/.test(q)) { linkAnswer('The Library holds the paths, the reading lists, the glossary, and the recipes.', 'Visit the Library', 'library'); return; }
    if (/newsletter|join|letter|subscribe|email list|mailing/.test(q)) { linkAnswer('One short letter a week — what’s on, a recipe or two, one thing from the shop. No spam, and you can leave anytime.', 'Join the letter', 'join'); return; }
    if (/contact|write to|reach|email laura|email you/.test(q)) {
      addBot([
        { t: 'text', x: 'Write to Laura — she reads everything herself.' },
        { t: 'link', label: CONTACT_EMAIL, href: 'mailto:' + CONTACT_EMAIL }
      ]);
      return;
    }
    if (/shipping/.test(q)) { linkAnswer('Shipping follows the details on each Etsy listing — the shop’s own shipping notes are under Policies on the homepage.', 'Shipping', 'shipping'); return; }
    if (/return/.test(q)) { linkAnswer('Returns follow the details on each Etsy listing — the shop’s own returns notes are under Policies on the homepage.', 'Returns', 'returns'); return; }
    if (/polic|privacy|accessib/.test(q)) { linkAnswer('The shop policies, privacy, and accessibility notes are all on the homepage.', 'Policies', 'policies'); return; }
    if (/moon/.test(q)) { linkAnswer('Tonight’s moon — how lit it is, and when the next full moon falls — is in the Focus space on the homepage. Open it from the menu.', 'Homepage', 'home'); return; }
    if (/keepsake|save|bookmark/.test(q)) { linkAnswer('Keepsakes let you save a rune draw or a verse on this device, and come back to it later.', 'Keepsakes', 'keepsakes'); return; }
    if (/communit|facebook|instagram|tiktok|youtube|threads|follow|social/.test(q)) { linkAnswer('The grove is on TikTok, Instagram, YouTube, X, and Threads — the links are in the community section at the foot of the homepage.', 'Community', 'community'); return; }
    if (/about|who is laura|who are you|are you (a )?(human|real|person)|are you laura/.test(q)) { linkAnswer('Laura keeps the grove — she reads the recipes, tends the shop, and looks after this little corner of the web. I’m just her helper here on the page, not a person.', 'About the Grove', 'about'); return; }
    if (/what is (the grove|this)|what('| i)s this (place|site)/.test(q)) { linkAnswer('A little pagan corner of the web — a library, a shop, and daily tools like the rune draw. Come as you are; the fire is already lit.', 'About the Grove', 'about'); return; }
    if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(q)) { greet(); return; }
    if (/thank/.test(q)) { addBot('You’re welcome — the fire’s lit whenever you need it.'); return; }
    if (/^(yes|ok|okay|sure)\b/.test(q)) { addBot('Lovely. Was there something you wanted to find — a gathering, the shop, a recipe?'); return; }
    fallback();
  }

  /* ---------- open / close ---------- */
  function openPanel() {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    if (!greeted) { greeted = true; greet(); }
    panel.setAttribute('tabindex', '-1');
    panel.focus();
  }
  function closePanel() {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }
  launcher.addEventListener('click', function () {
    if (panel.hidden) { openPanel(); } else { closePanel(); }
  });
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !panel.hidden) { closePanel(); }
  });
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    handleInput(input.value);
  });

  /* Test handle for logic checks (harmless in production). */
  window.__groveGuideTest = {
    haversineMiles: haversineMiles,
    lookupZip: lookupZip,
    fmtDate: fmtDate, fmtTime: fmtTime, fmtWhen: fmtWhen,
    upcoming: upcoming, eventEndMs: eventEndMs,
    handleInput: handleInput,
    setVisitorLoc: function (loc) { visitorLoc = loc; },
    clearVisitorLoc: function () { visitorLoc = null; },
    lastBotText: function () {
      var out = [];
      (function walk(n) {
        if (!n) return;
        if (n.textContent) out.push(n.textContent);
        if (n.children) n.children.forEach(walk);
      })(log);
      return out.join(' ');
    }
  };
})();
