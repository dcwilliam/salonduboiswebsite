// Mobile menu, Services dropdown, and "today" highlight in the hours table.
(function () {
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  document.querySelectorAll(".has-sub > button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var li = btn.parentElement;
      var open = li.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("click", function (e) {
    document.querySelectorAll(".has-sub.open").forEach(function (li) {
      if (!li.contains(e.target) && window.matchMedia("(min-width: 761px)").matches) {
        li.classList.remove("open");
        li.querySelector("button").setAttribute("aria-expanded", "false");
      }
    });
  });

  // Highlight today's row using Connecticut time.
  try {
    var day = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })).getDay();
    document.querySelectorAll('.hours tr[data-day="' + day + '"]').forEach(function (tr) { tr.classList.add("today"); });
  } catch (e) {}
})();
