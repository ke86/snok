/**
 * OneVR UI Module
 * Builds and renders the overlay UI
 */
(function() {
  'use strict';

  var CFG = window.OneVR.config;
  var utils = window.OneVR.utils;

  /**
   * Build person card HTML
   */
  function buildPersonHTML(person, idx) {
    var timeStr = person.start === '-' ? '—' : person.start + ' – ' + person.end;
    var tags = '';

    if (person.country) {
      tags += '<span class="onevr-tag onevr-tag-' + person.country.toLowerCase() + '">' + person.country + '</span>';
    }
    if (person.overnight) {
      tags += '<span class="onevr-tag onevr-tag-ol">' + person.overnight + '</span>';
    }
    if (person.isRes) {
      tags += '<span class="onevr-tag onevr-tag-res">RES</span>';
    }
    if (person.isChanged) {
      tags += '<span class="onevr-tag onevr-tag-tp">TP</span>';
    }

    var locB = person.locName ? '<span class="onevr-loc-badge">' + person.locName + '</span>' : '';
    var tilL = utils.getTil(person.turnr, CFG.tilLabels);
    var tilH = tilL ? '<span class="onevr-til-label">(' + tilL + ')</span>' : '';

    return '<div class="onevr-person" data-role="' + person.role + '" data-loc="' + person.loc + '" data-idx="' + idx + '">' +
      '<span class="onevr-badge onevr-badge-' + person.badgeColor + '">' + person.badge + '</span>' +
      '<div class="onevr-main">' +
        '<div class="onevr-name-row">' +
          '<span class="onevr-name">' + person.name + '</span>' + locB +
        '</div>' +
        '<div class="onevr-sub">' +
          '<span class="onevr-time' + (person.start === '-' ? ' onevr-time-none' : '') + '">' + timeStr + '</span>' +
          '<span class="onevr-turnr" data-elidx="' + person.elIdx + '">' + person.turnr + tilH + ' ›</span>' +
        '</div>' +
      '</div>' +
      '<div class="onevr-tags">' + tags + '</div>' +
    '</div>';
  }

  /**
   * Build filter buttons HTML
   */
  function buildFilters(people, stats) {
    // Role filters
    var roleFilters = '<button class="onevr-filter active" data-filter="role" data-val="all">Alla</button>';
    var seenBadges = {};
    people.forEach(function(p) { seenBadges[p.badge] = 1; });
    Object.keys(seenBadges).forEach(function(b) {
      roleFilters += '<button class="onevr-filter" data-filter="role" data-val="' + b + '">' + b + '</button>';
    });

    // Location filters
    var locCounts = {};
    people.forEach(function(p) {
      if (p.locName) locCounts[p.locName] = (locCounts[p.locName] || 0) + 1;
    });

    var locFilters = '<button class="onevr-filter active" data-filter="loc" data-val="all">Alla</button>';
    Object.keys(locCounts).sort().forEach(function(loc) {
      locFilters += '<button class="onevr-filter" data-filter="loc" data-val="' + loc + '">' + loc + ' (' + locCounts[loc] + ')</button>';
    });

    return {
      roles: roleFilters,
      locations: locFilters
    };
  }

  /**
   * Build the complete overlay HTML
   */
  function buildOverlayHTML(data) {
    var people = data.people;
    var stats = data.stats;
    var isoDate = data.isoDate;
    var filters = buildFilters(people, stats);

    // Build person list
    var listHTML = '<div class="onevr-card">';
    people.forEach(function(p, idx) {
      listHTML += buildPersonHTML(p, idx);
    });
    listHTML += '</div>';

    // Settings buttons
    var loadTimesBtn = stats.noTime > 0
      ? '<button class="onevr-btn" id="onevr-load-times">⏱ Ladda tider (' + stats.noTime + ' utan tid)</button>'
      : '';
    var changedBtn = stats.changed > 0
      ? '<button class="onevr-btn" id="onevr-changed-btn">📝 Ändrade turer (' + stats.changed + ')</button>'
      : '';

    return '<div class="onevr-modal">' +
      '<div class="onevr-header">' +
        '<div class="onevr-search-wrap">' +
          '<input type="text" class="onevr-search" id="onevr-search" placeholder="Sök personal...">' +
          '<button class="onevr-search-clear" id="onevr-search-clear">✕</button>' +
        '</div>' +
        '<div class="onevr-date-nav">' +
          '<button class="onevr-date-btn" id="onevr-prev">‹</button>' +
          '<input type="date" class="onevr-date-picker" id="onevr-date-picker" value="' + isoDate + '">' +
          '<button class="onevr-date-btn" id="onevr-next">›</button>' +
        '</div>' +
      '</div>' +
      '<div class="onevr-content">' +
        '<div class="onevr-section" id="onevr-settings-section">' +
          '<div class="onevr-section-header">' +
            '<span class="onevr-section-title">Inställningar</span>' +
            '<span class="onevr-section-arrow">▾</span>' +
          '</div>' +
          '<div class="onevr-section-content">' +
            '<div class="onevr-settings-grid">' +
              changedBtn +
              loadTimesBtn +
              '<button class="onevr-btn onevr-btn-close" id="onevr-close-btn">✕ Stäng appen</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="onevr-section" id="onevr-sort-section">' +
          '<div class="onevr-section-header">' +
            '<span class="onevr-section-title">Filtrera</span>' +
            '<span class="onevr-section-arrow">▾</span>' +
          '</div>' +
          '<div class="onevr-section-content">' +
            '<div class="onevr-filter-label">Roll</div>' +
            '<div class="onevr-filters" id="onevr-role-filters">' + filters.roles + '</div>' +
            '<div class="onevr-filter-label">Ort</div>' +
            '<div class="onevr-filters" id="onevr-loc-filters">' + filters.locations + '</div>' +
            '<div class="onevr-filter-label">Snabbfilter</div>' +
            '<div class="onevr-filters">' +
              '<button class="onevr-filter" id="onevr-se-btn">🇸🇪 Sverige (' + stats.se + ')</button>' +
              '<button class="onevr-filter" id="onevr-dk-btn">🇩🇰 Danmark (' + stats.dk + ')</button>' +
              '<button class="onevr-filter" id="onevr-res-btn">🔄 Reserver (' + stats.res + ')</button>' +
              '<button class="onevr-filter" id="onevr-utb-btn">📚 Utb (' + stats.utb + ')</button>' +
              '<button class="onevr-filter" id="onevr-insutb-btn">👨‍🏫 INSUTB (' + stats.insutb + ')</button>' +
              '<button class="onevr-filter" id="onevr-adm-btn">🏢 ADM (' + stats.adm + ')</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="onevr-list" id="onevr-list">' +
          (people.length ? listHTML : '<div class="onevr-empty">Ingen personal hittades</div>') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /**
   * Create and show the overlay
   */
  function showOverlay(data) {
    // Remove existing overlay if any
    var existing = document.querySelector('.onevr-overlay');
    if (existing) existing.remove();

    // Create overlay
    var overlay = document.createElement('div');
    overlay.className = 'onevr-overlay';
    overlay.innerHTML = buildOverlayHTML(data);
    document.body.appendChild(overlay);

    // Store reference
    window.OneVR.ui.overlay = overlay;

    return overlay;
  }

  /**
   * Remove the overlay
   */
  function hideOverlay() {
    var overlay = document.querySelector('.onevr-overlay');
    if (overlay) overlay.remove();
    window.OneVR.ui.overlay = null;
  }

  // Export to global namespace
  window.OneVR.ui = {
    buildPersonHTML: buildPersonHTML,
    buildFilters: buildFilters,
    buildOverlayHTML: buildOverlayHTML,
    showOverlay: showOverlay,
    hideOverlay: hideOverlay,
    overlay: null
  };

  console.log('[OneVR] UI loaded');
})();
