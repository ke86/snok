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
   * Build filter data for dropdowns
   */
  function buildFilterData(people, stats) {
    // Collect role badges
    var seenBadges = {};
    people.forEach(function(p) { seenBadges[p.badge] = (seenBadges[p.badge] || 0) + 1; });

    // Collect locations
    var locCounts = {};
    people.forEach(function(p) {
      if (p.locName) locCounts[p.locName] = (locCounts[p.locName] || 0) + 1;
    });

    return {
      roles: seenBadges,
      locations: locCounts,
      stats: stats
    };
  }

  /**
   * Build dropdown menu items HTML
   */
  function buildDropdownItems(type, data) {
    var items = '<button class="onevr-dropdown-item active" data-type="' + type + '" data-val="all">Alla</button>';

    if (type === 'role') {
      Object.keys(data.roles).forEach(function(role) {
        items += '<button class="onevr-dropdown-item" data-type="role" data-val="' + role + '">' + role + '</button>';
      });
    } else if (type === 'loc') {
      Object.keys(data.locations).sort().forEach(function(loc) {
        items += '<button class="onevr-dropdown-item" data-type="loc" data-val="' + loc + '">' + loc + '</button>';
      });
    }

    return items;
  }

  /**
   * Build quick filters HTML
   */
  function buildQuickFilters() {
    return '<button class="onevr-dropdown-item" data-type="quick" data-val="jobbar">Jobbar nu</button>' +
      '<button class="onevr-dropdown-item" data-type="quick" data-val="changed">Ändrade turer</button>' +
      '<button class="onevr-dropdown-item" data-type="quick" data-val="se">Sverige</button>' +
      '<button class="onevr-dropdown-item" data-type="quick" data-val="dk">Danmark</button>' +
      '<button class="onevr-dropdown-item" data-type="quick" data-val="res">Reserver</button>' +
      '<button class="onevr-dropdown-item" data-type="quick" data-val="utb">Utb</button>' +
      '<button class="onevr-dropdown-item" data-type="quick" data-val="insutb">INSUTB</button>' +
      '<button class="onevr-dropdown-item" data-type="quick" data-val="adm">ADM</button>';
  }

  /**
   * Build the complete overlay HTML
   */
  function buildOverlayHTML(data) {
    var people = data.people;
    var stats = data.stats;
    var isoDate = data.isoDate;
    var filterData = buildFilterData(people, stats);

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

    return '<div class="onevr-modal">' +
      '<div class="onevr-header">' +
        '<div class="onevr-date-nav">' +
          '<button class="onevr-date-btn" id="onevr-prev">‹</button>' +
          '<input type="date" class="onevr-date-picker" id="onevr-date-picker" value="' + isoDate + '">' +
          '<button class="onevr-date-btn" id="onevr-next">›</button>' +
        '</div>' +
        '<div class="onevr-search-wrap">' +
          '<input type="text" class="onevr-search" id="onevr-search" placeholder="Sök personal...">' +
          '<button class="onevr-search-clear" id="onevr-search-clear">✕</button>' +
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
              loadTimesBtn +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="onevr-filter-bar">' +
          '<div class="onevr-filter-dropdown" id="onevr-role-dropdown">' +
            '<button class="onevr-filter-trigger" data-dropdown="role">Roll <span class="onevr-filter-arrow">▾</span></button>' +
            '<div class="onevr-dropdown-menu" id="onevr-role-menu">' + buildDropdownItems('role', filterData) + '</div>' +
          '</div>' +
          '<div class="onevr-filter-dropdown" id="onevr-loc-dropdown">' +
            '<button class="onevr-filter-trigger" data-dropdown="loc">Ort <span class="onevr-filter-arrow">▾</span></button>' +
            '<div class="onevr-dropdown-menu" id="onevr-loc-menu">' + buildDropdownItems('loc', filterData) + '</div>' +
          '</div>' +
          '<div class="onevr-filter-dropdown" id="onevr-quick-dropdown">' +
            '<button class="onevr-filter-trigger" data-dropdown="quick">Filter <span class="onevr-filter-arrow">▾</span></button>' +
            '<div class="onevr-dropdown-menu" id="onevr-quick-menu">' + buildQuickFilters() + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="onevr-active-filters" id="onevr-active-filters"></div>' +
        '<div class="onevr-status-bar" id="onevr-status-bar">' +
          '<span class="onevr-status-working">🟢 Jobbar nu: <strong id="onevr-working-now">0</strong></span>' +
          '<span class="onevr-status-total">Totalt: <strong id="onevr-total-count">' + people.length + '</strong></span>' +
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
    buildFilterData: buildFilterData,
    buildOverlayHTML: buildOverlayHTML,
    showOverlay: showOverlay,
    hideOverlay: hideOverlay,
    overlay: null
  };

  console.log('[OneVR] UI loaded');
})();
