/**
 * OneVR Scraper Module
 * Scrapes personnel data from the page
 */
(function() {
  'use strict';

  var CFG = window.OneVR.config;
  var utils = window.OneVR.utils;

  // Initialize caches
  window.OneVR.cache.locations = window.OneVR.cache.locations || {};
  window.OneVR.cache.times = window.OneVR.cache.times || {};
  window.OneVR.cache.built = window.OneVR.cache.built || false;

  /**
   * Scrape location data from visible elements
   */
  function scrapeLocations() {
    var els = document.querySelectorAll('.item-wrapper, app-duty-positions-list-element');

    els.forEach(function(item) {
      var lines = (item.innerText || '').split('\n').map(function(l) {
        return l.trim();
      }).filter(Boolean);

      var name = lines[0] || '';
      var turnr = '';

      // Find turn number after 'C'
      for (var i = 0; i < lines.length; i++) {
        if (lines[i] === 'C' && lines[i + 1]) {
          turnr = lines[i + 1];
          break;
        }
      }

      // Fallback: look for 5-6 digit number
      if (!turnr) {
        for (var j = 0; j < lines.length; j++) {
          if (lines[j].match(/^\d{5,6}[A-Z]?$/)) {
            turnr = lines[j];
            break;
          }
        }
      }

      // Cache location if valid
      if (name && name.length > 3 && name.match(/^[A-ZÅÄÖÉÈÜ]/) && turnr) {
        var m = turnr.match(/^(\d)/);
        if (m && CFG.locations[m[1]]) {
          window.OneVR.cache.locations[name] = {
            loc: m[1],
            locName: CFG.locations[m[1]]
          };
        }
      }
    });
  }

  /**
   * Build location cache by navigating through dates
   */
  function buildCache(callback) {
    var prevBtn = document.querySelector('.icon-prev');
    var nextBtn = document.querySelector('.icon-next');

    if (!prevBtn || !nextBtn) {
      callback();
      return;
    }

    var startDate = utils.parseSwedishDate(utils.getCurrentDateText());
    window.OneVR.state.navDate = startDate;

    var loader = utils.createLoader('Bygger cache...');

    var steps = [
      { btn: prevBtn }, { btn: prevBtn },
      { btn: nextBtn }, { btn: nextBtn }, { btn: nextBtn }, { btn: nextBtn },
      { btn: prevBtn }, { btn: prevBtn }
    ];
    var step = 0;

    function doStep() {
      if (step < steps.length) {
        utils.updateLoader(loader, 'Bygger cache... ' + Math.round(((step + 1) / steps.length) * 100) + '%');
        steps[step].btn.click();
        step++;
        setTimeout(function() {
          scrapeLocations();
          doStep();
        }, 2000);
      } else {
        window.OneVR.cache.built = true;
        window.OneVR.state.navDate = startDate;
        utils.updateLoader(loader, 'Klar!');
        setTimeout(function() {
          loader.remove();
          callback();
        }, 400);
      }
    }

    scrapeLocations();
    doStep();
  }

  /**
   * Scrape all personnel from current page
   */
  function scrapePersonnel() {
    var currentDateText = utils.getCurrentDateText();
    var people = [];
    var elements = [];
    var timeRegex = /(\d{1,2}:\d{2})\s[-–]\s(\d{1,2}:\d{2})/;
    var seen = {};

    document.querySelectorAll('.item-wrapper, app-duty-positions-list-element').forEach(function(item) {
      var text = item.innerText || '';
      var timeMatch = text.match(timeRegex);
      var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
      var name = lines[0] || '';
      var role = 'Övrig';
      var turnr = '';

      // Find role
      for (var ri = 0; ri < lines.length; ri++) {
        for (var r = 0; r < CFG.roles.length; r++) {
          if (lines[ri].includes(CFG.roles[r])) {
            role = CFG.roles[r];
            break;
          }
        }
        if (role !== 'Övrig') break;
      }

      // Find turn number
      for (var i = 0; i < lines.length; i++) {
        if (lines[i] === 'C' && lines[i + 1]) {
          turnr = lines[i + 1];
          break;
        }
      }

      if (!turnr) {
        for (var j = 0; j < lines.length; j++) {
          var ln = lines[j];
          if (ln.match(/^[A-Z]{2,}[A-Z0-9]+$/) || utils.chkTurn(ln) || ln.toLowerCase().startsWith('reserv')) {
            turnr = ln;
            break;
          }
        }
      }

      // Get times
      var startTime = timeMatch ? timeMatch[1] : '-';
      var endTime = timeMatch ? timeMatch[2] : '-';

      // Try TIL times
      if (startTime === '-' && turnr) {
        var tt = utils.getTil(turnr, CFG.tilTimes);
        if (tt) {
          startTime = tt[0];
          endTime = tt[1];
        }
      }

      // Try cached times
      if (startTime === '-' && name) {
        var ct = window.OneVR.cache.times[name + '_' + currentDateText];
        if (ct) {
          startTime = ct.start;
          endTime = ct.end;
        }
      }

      // Parse turn info
      var turnInfo = utils.parseTurnr(turnr);

      // Add to list if valid
      if (name && name.length > 3 && name.match(/^[A-ZÅÄÖÉÈÜ]/) && !seen[name + startTime]) {
        seen[name + startTime] = true;

        var badge = CFG.roleBadges[role] || 'ÖVR';
        if (utils.getTil(turnr, CFG.tilLabels)) badge = 'TIL';

        var bc = CFG.badgeColors[badge] || 'ovr';

        elements.push(item);

        // Get location from turn or cache
        var fL = turnInfo.loc;
        var fN = turnInfo.locName;

        // För changedReserve (123456-123456) - använd ENDAST cache
        if (utils.isChangedReserve(turnr)) {
          var cached = window.OneVR.cache.locations[name];
          fL = cached ? cached.loc : '';
          fN = cached ? cached.locName : '';
        } else if (fN) {
          window.OneVR.cache.locations[name] = { loc: fL, locName: fN };
        } else if (window.OneVR.cache.locations[name]) {
          fL = window.OneVR.cache.locations[name].loc;
          fN = window.OneVR.cache.locations[name].locName;
        }

        people.push({
          name: name,
          role: role,
          badge: badge,
          badgeColor: bc,
          turnr: turnr,
          start: startTime,
          end: endTime,
          loc: fL,
          locName: fN,
          country: turnInfo.country,
          isRes: turnInfo.isRes,
          overnight: turnInfo.overnight,
          isChanged: turnInfo.isChanged,
          elIdx: elements.length - 1
        });
      }
    });

    // Sort by start time
    people.sort(function(a, b) {
      if (a.start === '-' && b.start !== '-') return 1;
      if (a.start !== '-' && b.start === '-') return -1;
      return a.start.localeCompare(b.start);
    });

    return {
      people: people,
      elements: elements,
      dateText: currentDateText
    };
  }

  /**
   * Calculate statistics from people array
   */
  function calculateStats(people) {
    return {
      res: people.filter(function(p) { return p.isRes || p.role === 'Reserv'; }).length,
      changed: people.filter(function(p) { return p.isChanged; }).length,
      noTime: people.filter(function(p) { return p.start === '-'; }).length,
      se: people.filter(function(p) { return p.country === 'SE'; }).length,
      dk: people.filter(function(p) { return p.country === 'DK'; }).length,
      utb: people.filter(function(p) { return p.turnr && /UTB/i.test(p.turnr) && !/INSUTB/i.test(p.turnr); }).length,
      insutb: people.filter(function(p) { return p.turnr && /INSUTB/i.test(p.turnr); }).length,
      adm: people.filter(function(p) { return p.badge === 'ADM'; }).length
    };
  }

  // Export to global namespace
  window.OneVR.scraper = {
    scrapeLocations: scrapeLocations,
    buildCache: buildCache,
    scrapePersonnel: scrapePersonnel,
    calculateStats: calculateStats
  };

  console.log('[OneVR] Scraper loaded');
})();
