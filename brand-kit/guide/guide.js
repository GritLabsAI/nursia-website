/* Shared chrome for the Flowsheet guide.
   Injected by script so the eight pages stay identical and there is
   nothing to fetch — this works straight off the file system. */
(function () {
  var PAGES = [
    ["Start", [["index.html", "Overview"]]],
    [
      "Foundations",
      [
        ["foundations.html", "Colour, type, space"],
        ["logo.html", "Logo"],
        ["photography.html", "Photography"],
      ],
    ],
    [
      "Applying it",
      [
        ["components.html", "Components"],
        ["patterns.html", "Layout patterns"],
        ["voice.html", "Voice & copy"],
        ["ads.html", "Ad creative"],
      ],
    ],
    ["For engineers", [["code.html", "Tokens & code"]]],
  ];

  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  var nav = document.createElement("nav");
  nav.className = "nav";
  var html =
    '<a class="brand" href="index.html" aria-label="Nursia">' +
    '<img src="../logos/nursia-wordmark.svg" alt="Nursia"></a>' +
    '<p class="eyebrow" style="margin:-18px 0 0">Flowsheet — design language</p>';

  PAGES.forEach(function (group) {
    html += "<h5>" + group[0] + "</h5>";
    group[1].forEach(function (p) {
      var cur = p[0].toLowerCase() === here ? ' aria-current="page"' : "";
      html += '<a class="link" href="' + p[0] + '"' + cur + ">" + p[1] + "</a>";
    });
  });

  html +=
    '<h5>Raw files</h5>' +
    '<a class="link" href="../logos/">logos/</a>' +
    '<a class="link" href="../fonts/">fonts/</a>' +
    '<a class="link" href="../photos/">photos/</a>' +
    '<a class="link" href="../BRAND.md">BRAND.md</a>';

  nav.innerHTML = html;

  var shell = document.querySelector(".shell");
  if (shell) shell.insertBefore(nav, shell.firstChild);

  /* Footer: previous / next through the flat page order. */
  var flat = [];
  PAGES.forEach(function (g) {
    g[1].forEach(function (p) {
      flat.push(p);
    });
  });
  var i = flat.findIndex(function (p) {
    return p[0].toLowerCase() === here;
  });
  var foot = document.querySelector(".pagefoot");
  if (foot && i > -1) {
    var prev = flat[i - 1];
    var next = flat[i + 1];
    foot.innerHTML =
      (prev ? '<a href="' + prev[0] + '">&larr; ' + prev[1] + "</a>" : "<span></span>") +
      (next ? '<a href="' + next[0] + '">' + next[1] + " &rarr;</a>" : "<span></span>");
  }

  /* Click any hex value to copy it. */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var el = t.closest("[data-copy]");
    if (!el || !navigator.clipboard) return;
    navigator.clipboard.writeText(el.getAttribute("data-copy")).then(function () {
      var old = el.getAttribute("data-was") || el.textContent;
      el.setAttribute("data-was", old);
      el.textContent = "copied";
      setTimeout(function () {
        el.textContent = old;
      }, 900);
    });
  });
})();
