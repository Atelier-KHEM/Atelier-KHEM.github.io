(function () {
  "use strict";

  const cfg      = SITE_CONFIG;
  const versions = cfg.versions;
  const key      = cfg.storageKey;

  function getActiveVersion() {
    const path = window.location.pathname;
    for (const [k, v] of Object.entries(versions)) {
      if (path.startsWith("/" + v.folder + "/")) return k;
    }
    return localStorage.getItem(key) || cfg.defaultVersion;
  }

  function switchToVersion(targetKey) {
    if (!versions[targetKey]) return;
    localStorage.setItem(key, targetKey);
    window.location.href = "/" + versions[targetKey].folder + "/";
  }

  function buildSwitcher() {
    const current  = getActiveVersion();
    const btnCfg   = cfg.switchButton || {};
    const activeV  = versions[current];

    const sortedOthers = Object.entries(versions)
      .sort(([, a], [, b]) => a.order - b.order)
      .filter(([k]) => k !== current);

    const wrapper = document.createElement("div");
    wrapper.id = "version-switcher";
    const posStyles = {
      "bottom-right": "bottom:24px;right:24px;",
      "bottom-left":  "bottom:24px;left:24px;",
      "top-right":    "top:24px;right:24px;",
      "top-left":     "top:24px;left:24px;"
    };
    wrapper.style.cssText = `
      position:fixed;
      ${posStyles[btnCfg.position] || posStyles["bottom-right"]}
      z-index:${btnCfg.zIndex || 9999};
      display:flex;
      flex-direction:column;
      align-items:flex-end;
      gap:8px;
      font-family:system-ui,sans-serif;
    `;

    // Menu
    const menu = document.createElement("div");
    menu.style.cssText = `
      display:flex;
      flex-direction:column;
      gap:6px;
      opacity:0;
      transform:translateY(8px) scale(.97);
      pointer-events:none;
      transition:opacity .2s ease, transform .2s ease;
    `;

    for (const [vKey, v] of sortedOthers) {
      const item = document.createElement("button");
      item.style.cssText = `
        display:flex;
        align-items:center;
        gap:10px;
        padding:9px 14px;
        background:rgba(20,20,20,.92);
        border:1px solid rgba(255,255,255,.1);
        border-radius:40px;
        color:#fff;
        font-size:13px;
        cursor:pointer;
        white-space:nowrap;
        backdrop-filter:blur(12px);
        box-shadow:0 4px 16px rgba(0,0,0,.35);
        transition:background .15s, transform .15s;
      `;
      item.innerHTML = v.iconHTML + v.label;
      item.addEventListener("mouseenter", () => {
        item.style.background = "rgba(40,40,40,.95)";
        item.style.transform  = "translateX(-3px)";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "rgba(20,20,20,.92)";
        item.style.transform  = "";
      });
      item.addEventListener("click", () => switchToVersion(vKey));
      menu.appendChild(item);
    }

    // Bouton principal
    const mainBtn = document.createElement("button");
    mainBtn.title = btnCfg.tooltip || "Changer de version";
    mainBtn.style.cssText = `
      width:52px;
      height:52px;
      border-radius:50%;
      border:none;
      background:rgba(20,20,20,.92);
      backdrop-filter:blur(12px);
      box-shadow:0 4px 20px rgba(0,0,0,.4);
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      transition:transform .2s ease, box-shadow .2s ease;
      outline:none;
    `;
    mainBtn.innerHTML = activeV.iconHTML;

    let menuOpen = false;
    function toggleMenu(force) {
      menuOpen = force !== undefined ? force : !menuOpen;
      menu.style.opacity      = menuOpen ? "1" : "0";
      menu.style.transform    = menuOpen ? "translateY(0) scale(1)" : "translateY(8px) scale(.97)";
      menu.style.pointerEvents = menuOpen ? "auto" : "none";
      mainBtn.style.transform  = menuOpen ? "rotate(90deg)" : "";
    }

    mainBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });
    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) toggleMenu(false);
    });

    wrapper.appendChild(menu);
    wrapper.appendChild(mainBtn);
    document.body.appendChild(wrapper);
  }

  if (cfg.multiVersion === false) return;  // mode mono-version : rien à afficher

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildSwitcher);
  } else {
    buildSwitcher();
  }

})();