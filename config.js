/**
 * ============================================================
 *  CONFIG.JS — Configuration centrale du système multi-version
 * ============================================================
 */

var SITE_CONFIG = {
  // ── Mode multi-version ──────────────────────────────────────
  // true  → plusieurs versions actives, bouton switcher visible
  // false → une seule version (defaultVersion), switcher masqué
  multiVersion: true,

  defaultVersion: "institutionnel",

  versions: {
    institutionnel: {
      folder:   "institutionnel",
      label:    "Version institutionnelle",
      iconHTML: '<i class="fa-solid fa-building-columns fa-xl" style="color: rgb(255, 138, 61);"></i>',
      order:    2
    },
    dynamique: {
      folder:   "dynamique",
      label:    "Version dynamique",
      iconHTML: '<i class="fa-solid fa-hat-wizard fa-xl" style="color: rgb(31, 175, 140);"></i>',
      order:    1
    }
  },

  storageKey: "site_atelier_khem_version_preference",

  switchButton: {
    position: "bottom-right",
    zIndex:   9999,
    tooltip:  "Changer de version"
  }
};