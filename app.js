(function () {
  "use strict";
  var DATA = window.STUDY_DATA || { questions: [], glossary: [], abbrevs: [] };
  var Q = DATA.questions;
  var GLOSS = {};
  DATA.glossary.forEach(function (g) { GLOSS[g.id] = g; });

  var current = 0;

  // ---------- elements ----------
  var card = document.getElementById("card");
  var main = document.getElementById("main");
  var pagerNow = document.getElementById("pagerNow");
  var pagerTotal = document.getElementById("pagerTotal");
  var progressBar = document.getElementById("progressBar");
  var jumpSelect = document.getElementById("jumpSelect");
  var btnPrev = document.getElementById("btnPrev");
  var btnNext = document.getElementById("btnNext");

  // ---------- helpers ----------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function imgIsPng(f){ return /\.png$/i.test(f); }

  // ---------- build jump menu ----------
  Q.forEach(function (q, i) {
    var o = document.createElement("option");
    o.value = i;
    o.textContent = q.num + ". " + q.title;
    jumpSelect.appendChild(o);
  });
  pagerTotal.textContent = Q.length;

  // ---------- render a thesis/question ----------
  function render(idx) {
    current = Math.max(0, Math.min(Q.length - 1, idx));
    var q = Q[current];
    card.innerHTML = "";

    card.appendChild(el("span", "q-kicker", "Teza " + q.num + " z " + Q.length));
    card.appendChild(el("h1", "q-title", escapeHtml(q.title)));

    if (q.thesis) {
      var th = el("div", "thesis");
      th.appendChild(el("span", "lab", "Teza"));
      th.appendChild(el("p", null, q.thesis));
      card.appendChild(th);
    }

    if (q.points && q.points.length) {
      var ul = el("ul", "points");
      q.points.forEach(function (p) {
        var li = el("li", p.bullet ? "" : "plain", p.html);
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }

    if (q.source) {
      card.appendChild(el("div", "source", escapeHtml(q.source)));
    }

    // images as labeled spoilers
    if (q.images && q.images.length) {
      var media = el("div", "media");
      media.appendChild(el("p", "media-head", "Materiały wizualne (" + q.images.length + ") — kliknij, aby rozwinąć"));
      q.images.forEach(function (im, k) {
        var typ = im.type || "inny";
        var label = im.caption ? im.caption : ("Ilustracja " + (k + 1));
        var tagText = typ === "schemat" ? "Schemat" : (typ === "slajd" ? "Slajd" : "Rysunek");
        var d = el("details", "spoiler");
        var sum = el("summary");
        sum.innerHTML = '<span class="chev">▸</span><span class="tag ' + typ + '">' + tagText + '</span><span class="sp-label">' + escapeHtml(label) + '</span>';
        d.appendChild(sum);
        var body = el("div", "spoiler-body");
        var img = el("img");
        img.loading = "lazy";
        img.alt = label;
        img.dataset.src = "img/" + im.file;
        body.appendChild(img);
        if (im.caption) body.appendChild(el("div", "spoiler-cap", escapeHtml(im.caption)));
        d.appendChild(body);
        // lazy load on first open
        d.addEventListener("toggle", function () {
          if (d.open && img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
        });
        media.appendChild(d);
      });
      card.appendChild(media);
    }

    // Pawel supplement
    if (q.pawel && q.pawel.length) {
      var supp = el("details", "supp");
      var ssum = el("summary");
      ssum.innerHTML = '<span class="chev">▸</span>Uzupełnienie — opracowanie tekstowe (plik „Egzamin_pytania_Paweł”)';
      supp.appendChild(ssum);
      var sbody = el("div", "supp-body");
      q.pawel.forEach(function (b) {
        if (b.type === "table") {
          sbody.appendChild(buildTable(b.rows));
        } else {
          sbody.appendChild(el("p", null, b.html));
        }
      });
      supp.appendChild(sbody);
      card.appendChild(supp);
    }

    // wire glossary terms
    Array.prototype.forEach.call(card.querySelectorAll(".term"), function (t) {
      t.setAttribute("tabindex", "0");
      t.setAttribute("role", "button");
      t.addEventListener("click", function (e) { e.stopPropagation(); openPopover(t); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPopover(t); }
      });
    });

    // state
    pagerNow.textContent = q.num;
    jumpSelect.value = current;
    btnPrev.disabled = current === 0;
    btnNext.disabled = current === Q.length - 1;
    progressBar.style.width = ((current + 1) / Q.length * 100).toFixed(2) + "%";
    closePopover();
    if (history.replaceState) history.replaceState(null, "", "#q=" + q.num);
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildTable(rows) {
    var t = el("table");
    if (!rows || !rows.length) return t;
    var thead = el("thead");
    var trh = el("tr");
    rows[0].forEach(function (c) { trh.appendChild(el("th", null, escapeHtml(c))); });
    thead.appendChild(trh);
    t.appendChild(thead);
    var tb = el("tbody");
    for (var i = 1; i < rows.length; i++) {
      var tr = el("tr");
      rows[i].forEach(function (c) { tr.appendChild(el("td", null, escapeHtml(c))); });
      tb.appendChild(tr);
    }
    t.appendChild(tb);
    return t;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ---------- popover ----------
  var pop = document.getElementById("popover");
  var popTerm = document.getElementById("popoverTerm");
  var popDef = document.getElementById("popoverDef");
  var popLink = document.getElementById("popoverLink");
  var activeTerm = null;

  function openPopover(termEl) {
    var gid = termEl.dataset.gid;
    var g = GLOSS[gid];
    if (!g) return;
    if (activeTerm) activeTerm.classList.remove("active");
    activeTerm = termEl;
    termEl.classList.add("active");
    popTerm.textContent = g.term;
    popDef.textContent = g.definition;
    if (g.url) {
      popLink.href = g.url;
      popLink.style.display = "";
      popLink.textContent = (g.url.indexOf("wikipedia.org") > -1 ? "Czytaj więcej w Wikipedii →" : "Czytaj więcej →");
    } else {
      popLink.style.display = "none";
    }
    pop.hidden = false;
    positionPopover(termEl);
  }

  function positionPopover(termEl) {
    var r = termEl.getBoundingClientRect();
    var pw = Math.min(340, window.innerWidth - 24);
    pop.style.maxWidth = pw + "px";
    // measure
    pop.style.left = "0px"; pop.style.top = "0px";
    var ph = pop.offsetHeight;
    var scrollY = window.pageYOffset, scrollX = window.pageXOffset;
    var left = r.left + scrollX;
    if (left + pw > scrollX + window.innerWidth - 12) left = scrollX + window.innerWidth - pw - 12;
    if (left < scrollX + 12) left = scrollX + 12;
    var top = r.bottom + scrollY + 8;
    // if not enough room below, place above
    if (r.bottom + ph + 16 > window.innerHeight && r.top - ph - 8 > 0) {
      top = r.top + scrollY - ph - 8;
    }
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }

  function closePopover() {
    pop.hidden = true;
    if (activeTerm) { activeTerm.classList.remove("active"); activeTerm = null; }
  }
  document.getElementById("popoverClose").addEventListener("click", closePopover);
  document.addEventListener("click", function (e) {
    if (!pop.hidden && !pop.contains(e.target) && !(e.target.classList && e.target.classList.contains("term"))) {
      closePopover();
    }
  });
  window.addEventListener("resize", function () { if (!pop.hidden && activeTerm) positionPopover(activeTerm); });

  // ---------- overlay (glossary / abbreviations) ----------
  var overlay = document.getElementById("overlay");
  var overlayTitle = document.getElementById("overlayTitle");
  var overlayBody = document.getElementById("overlayBody");
  var overlaySearch = document.getElementById("overlaySearch");
  var overlayMode = null;

  function openOverlay(mode) {
    overlayMode = mode;
    overlaySearch.value = "";
    if (mode === "gloss") {
      overlayTitle.textContent = "Słownik pojęć (" + DATA.glossary.length + ")";
      overlaySearch.placeholder = "Szukaj pojęcia…";
    } else {
      overlayTitle.textContent = "Wykaz skrótów (" + DATA.abbrevs.length + ")";
      overlaySearch.placeholder = "Szukaj skrótu…";
    }
    renderOverlay("");
    overlay.hidden = false;
    overlaySearch.focus();
  }
  function renderOverlay(filter) {
    filter = (filter || "").toLowerCase();
    overlayBody.innerHTML = "";
    if (overlayMode === "gloss") {
      DATA.glossary.forEach(function (g) {
        if (filter && (g.term + " " + g.definition).toLowerCase().indexOf(filter) < 0) return;
        var it = el("div", "gloss-item");
        it.appendChild(el("h3", null, escapeHtml(g.term)));
        it.appendChild(el("p", null, escapeHtml(g.definition)));
        if (g.url) {
          var a = el("a", null, (g.url.indexOf("wikipedia.org") > -1 ? "Wikipedia →" : "Źródło →"));
          a.href = g.url; a.target = "_blank"; a.rel = "noopener";
          it.appendChild(a);
        }
        overlayBody.appendChild(it);
      });
    } else {
      DATA.abbrevs.forEach(function (a) {
        if (filter && (a.abbr + " " + a.meaning).toLowerCase().indexOf(filter) < 0) return;
        var it = el("div", "abbr-item");
        it.appendChild(el("b", null, escapeHtml(a.abbr)));
        it.appendChild(el("span", null, escapeHtml(a.meaning)));
        overlayBody.appendChild(it);
      });
    }
    if (!overlayBody.children.length) {
      overlayBody.appendChild(el("p", null, "Brak wyników."));
    }
  }
  function closeOverlay() { overlay.hidden = true; }
  document.getElementById("btnGlossary").addEventListener("click", function () { openOverlay("gloss"); });
  document.getElementById("btnAbbr").addEventListener("click", function () { openOverlay("abbr"); });
  document.getElementById("overlayClose").addEventListener("click", closeOverlay);
  overlaySearch.addEventListener("input", function () { renderOverlay(overlaySearch.value); });
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeOverlay(); });

  // ---------- navigation ----------
  btnPrev.addEventListener("click", function () { render(current - 1); });
  btnNext.addEventListener("click", function () { render(current + 1); });
  jumpSelect.addEventListener("change", function () { render(parseInt(jumpSelect.value, 10)); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (!overlay.hidden) closeOverlay(); else closePopover(); return; }
    if (!overlay.hidden) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;
    if (e.key === "ArrowRight") { render(current + 1); }
    else if (e.key === "ArrowLeft") { render(current - 1); }
  });

  // ---------- init (deep link via #q=N) ----------
  function initIndex() {
    var m = /q=(\d+)/.exec(location.hash || "");
    if (m) {
      var num = parseInt(m[1], 10);
      for (var i = 0; i < Q.length; i++) { if (Q[i].num === num) return i; }
    }
    return 0;
  }
  render(initIndex());
})();
