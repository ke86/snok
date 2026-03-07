/**
 * OneVR Utils Module
 * Helper functions and utilities
 */
(function() {
  'use strict';

  // Default config if not loaded
  var defaultConfig = {
    patterns: {
      tilShift: '^(PL|IL|SL|DK)\\d$',
      tdsShift: '^TDS\\d$',
      tpSuffix: 'TP$',
      flShift: '^FL\\d*$',
      turnNumber: '^\\d{5,6}[A-Z]{0,2}$',
      reserve: '^RESERV?\\d*$',
      changedReserve: '^\\d{6}-\\d{6}$'
    },
    tilTimes: {},
    tilLabels: {}
  };

  var CFG = window.OneVR.config || defaultConfig;

  // Build regex patterns from config
  var patterns = {
    tilShift: new RegExp(CFG.patterns.tilShift, 'i'),
    tdsShift: new RegExp(CFG.patterns.tdsShift, 'i'),
    tpSuffix: new RegExp(CFG.patterns.tpSuffix),
    flShift: new RegExp(CFG.patterns.flShift),
    turnNumber: new RegExp(CFG.patterns.turnNumber),
    reserve: new RegExp(CFG.patterns.reserve, 'i'),
    changedReserve: new RegExp(CFG.patterns.changedReserve)
  };

  /**
   * Get TIL data (times or labels) for a shift
   */
  function getTil(turnr, obj) {
    if (!turnr) return null;
    var c = turnr.replace(/^ÖVN/i, '').trim();
    if (obj[c]) return obj[c];
    var m = turnr.match(/^(PL|FL|IL|SL|DK|TDS)(\d)$/i);
    return m && obj[m[1].toUpperCase() + m[2]] ? obj[m[1].toUpperCase() + m[2]] : null;
  }

  /**
   * Check if a string is a valid turn number
   */
  function chkTurn(t) {
    if (!t) return false;
    return t.match(patterns.flShift) ||
           t === 'ADM' ||
           t.match(patterns.turnNumber) ||
           t.match(patterns.reserve) ||
           t.match(patterns.changedReserve) ||
           t.match(patterns.tilShift) ||
           t.match(patterns.tdsShift) ||
           t.match(patterns.tpSuffix);
  }

  /**
   * Check if turn number is a changed reserve (format: 123456-123456)
   */
  function isChangedReserve(turnr) {
    if (!turnr) return false;
    return patterns.changedReserve.test(turnr);
  }

  /**
   * Get current date text from the page
   */
  function getCurrentDateText() {
    var el = document.querySelector('.date-label');
    return el ? el.innerText.trim() : new Date().toLocaleDateString('sv-SE');
  }

  /**
   * Parse Swedish date string to ISO format
   */
  function parseSwedishDate(str) {
    var months = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'maj': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'okt': '10', 'nov': '11', 'dec': '12'
    };
    var m = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
    if (m) {
      return m[3] + '-' + (months[m[2].toLowerCase().substring(0, 3)] || '01') + '-' + m[1].padStart(2, '0');
    }
    var n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
  }

  /**
   * Parse turn number to extract location, country, etc.
   */
  function parseTurnr(turnr) {
    var info = {
      loc: '',
      locName: '',
      country: '',
      isRes: false,
      overnight: '',
      isChanged: false
    };

    if (!turnr || turnr === '-') return info;

    if (turnr.toLowerCase().startsWith('reserv')) {
      info.isRes = true;
      return info;
    }

    // Check for changed reserve format: 123456-123456
    if (isChangedReserve(turnr)) {
      info.isRes = true;
      info.isChanged = true;
      // Cannot determine location from this format - must use cache
      return info;
    }

    if (turnr.toUpperCase().endsWith('TP')) info.isChanged = true;

    var match = turnr.match(/^(\d)(\d)(\d)(\d)(\d)([A-Z]{1,2})?$/);
    if (match) {
      info.loc = match[1];
      info.locName = CFG.locations[match[1]] || '';
      info.country = (parseInt(match[3]) % 2 === 0) ? 'DK' : 'SE';
      if (match[4] === '8' || match[4] === '9') info.isRes = true;
      if (match[6] === 'A' || (match[6] && match[6][0] === 'A')) info.overnight = 'ÖL1';
      if (match[6] === 'B' || (match[6] && match[6][0] === 'B')) info.overnight = 'ÖL2';
    }

    return info;
  }

  /**
   * Format date for navigation
   */
  function formatDate(date) {
    return date.getFullYear() + '-' +
           String(date.getMonth() + 1).padStart(2, '0') + '-' +
           String(date.getDate()).padStart(2, '0');
  }

  /**
   * Add days to a date string
   */
  function addDays(isoDate, days) {
    var p = isoDate.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + days);
    return formatDate(d);
  }

  /**
   * Calculate difference in days between two date strings
   */
  function diffDays(date1, date2) {
    var p1 = date1.split('-');
    var p2 = date2.split('-');
    var d1 = new Date(+p1[0], +p1[1] - 1, +p1[2]);
    var d2 = new Date(+p2[0], +p2[1] - 1, +p2[2]);
    return Math.round((d2 - d1) / 864e5);
  }

  /**
   * Create a loading overlay
   */
  function createLoader(text) {
    var loader = document.createElement('div');
    loader.className = 'onevr-loading-overlay';
    loader.innerHTML = '<div class="onevr-spinner"></div>' +
                       '<div class="onevr-loading-text">' + (text || 'Laddar...') + '</div>';
    document.body.appendChild(loader);
    return loader;
  }

  /**
   * Update loader text
   */
  function updateLoader(loader, text) {
    var el = loader.querySelector('.onevr-loading-text');
    if (el) el.textContent = text;
  }

  // Export to global namespace
  window.OneVR.utils = {
    patterns: patterns,
    getTil: getTil,
    chkTurn: chkTurn,
    isChangedReserve: isChangedReserve,
    getCurrentDateText: getCurrentDateText,
    parseSwedishDate: parseSwedishDate,
    parseTurnr: parseTurnr,
    formatDate: formatDate,
    addDays: addDays,
    diffDays: diffDays,
    createLoader: createLoader,
    updateLoader: updateLoader
  };

  console.log('[OneVR] Utils loaded');
})();
