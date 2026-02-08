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

      // Cache location if valid - men INTE för changedReserve format
      if (name && name.length > 3 && name.match(/^[A-ZÅÄÖÉÈÜ]/) && turnr) {
        // Hoppa över changedReserve (123456-123456) - dessa har fel ort i turnr
        if (turnr.match(/^\d{6}-\d{6}$/)) {
          // Skriv inte över cache med fel ort
          return;
        }
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

      // Parse section-letter data (J, F, E, H)
      var personalNr = '';
      var phone = '';
      var email = '';
      var trains = [];

      for (var si = 0; si < lines.length; si++) {
        if (lines[si] === 'J' && lines[si + 1]) {
          personalNr = lines[si + 1];
        } else if (lines[si] === 'F' && lines[si + 1]) {
          phone = lines[si + 1];
        } else if (lines[si] === 'E' && lines[si + 1]) {
          email = lines[si + 1];
        } else if (lines[si] === 'H') {
          // H section: all following lines until next single-letter section are train numbers
          for (var hi = si + 1; hi < lines.length; hi++) {
            if (lines[hi].match(/^\d{3,5}$/)) {
              trains.push(lines[hi]);
            } else if (lines[hi].length === 1 && lines[hi].match(/^[A-Z]$/)) {
              break; // Next section
            }
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
          personalNr: personalNr,
          phone: phone,
          email: email,
          trains: trains,
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

  /**
   * List of colleagues whose dagvy can be scraped
   */
  var DAGVY_NAMES = [
    'Kenny Eriksson'
  ];

  /**
   * Check if a person name is in the dagvy tracking list
   */
  function isDagvyTracked(name) {
    for (var i = 0; i < DAGVY_NAMES.length; i++) {
      if (name === DAGVY_NAMES[i]) return true;
    }
    return false;
  }

  /**
   * Scrape dagvy (day view) from an open cdk-overlay-pane
   * Returns structured array of segments
   */
  function scrapeDagvy(overlayPane) {
    if (!overlayPane) return [];

    var pieces = overlayPane.querySelectorAll('.piece-container');
    var segments = [];

    pieces.forEach(function(piece) {
      var seg = {
        fromStation: '',
        toStation: '',
        timeStart: '',
        timeEnd: '',
        activity: '',
        trainNr: '',
        trainType: '',
        vehicles: []
      };

      // Parse time row: (Station) HH:MM - HH:MM (Station)
      var pieceTime = piece.querySelector('.piece-time');
      if (pieceTime) {
        var labels = pieceTime.querySelectorAll('.storybook-label');
        if (labels.length >= 3) {
          seg.fromStation = (labels[0].innerText || '').trim().replace(/[()]/g, '');
          var timeText = (labels[1].innerText || '').trim();
          var tm = timeText.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
          if (tm) {
            seg.timeStart = tm[1].length === 4 ? '0' + tm[1] : tm[1];
            seg.timeEnd = tm[2].length === 4 ? '0' + tm[2] : tm[2];
          }
          seg.toStation = (labels[2].innerText || '').trim().replace(/[()]/g, '');
        } else if (labels.length === 2) {
          seg.fromStation = (labels[0].innerText || '').trim().replace(/[()]/g, '');
          var timeText2 = (labels[1].innerText || '').trim();
          var tm2 = timeText2.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
          if (tm2) {
            seg.timeStart = tm2[1].length === 4 ? '0' + tm2[1] : tm2[1];
            seg.timeEnd = tm2[2].length === 4 ? '0' + tm2[2] : tm2[2];
          }
        }
      }

      // Parse trip details (train info)
      var tripMain = piece.querySelector('.trip-main');
      if (tripMain) {
        var tripNrEl = tripMain.querySelector('.trip-number .storybook-label');
        if (tripNrEl) seg.trainNr = (tripNrEl.innerText || '').trim();

        var tripDescEl = tripMain.querySelector('.trip-description .storybook-label');
        if (tripDescEl) seg.trainType = (tripDescEl.innerText || '').trim();
      }

      // Parse vehicles
      var vehicleEls = piece.querySelectorAll('.trip-vehicle .storybook-label');
      vehicleEls.forEach(function(v) {
        var vt = (v.innerText || '').trim();
        if (vt) seg.vehicles.push(vt);
      });

      // If no train info, check for activity description
      if (!seg.trainNr) {
        var actEl = piece.querySelector('.activity-desc-label .storybook-label');
        if (actEl) {
          seg.activity = (actEl.innerText || '').trim();
        } else {
          // Fallback: look for text after the time row
          var text = (piece.innerText || '').trim();
          var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
          // Activity is usually the last meaningful line that isn't a station/time
          for (var i = lines.length - 1; i >= 0; i--) {
            var ln = lines[i];
            if (ln && !ln.match(/^\(/) && !ln.match(/\d{1,2}:\d{2}/) && ln.length > 2) {
              seg.activity = ln;
              break;
            }
          }
        }
      }

      segments.push(seg);
    });

    return segments;
  }

  /**
   * Scrape train crew from an open staff-onboard dialog
   * Returns { trainNr, vehicles, date, crew[] }
   */
  function scrapeTrainCrew(overlayPane) {
    if (!overlayPane) return null;

    var text = (overlayPane.innerText || '').trim();
    var result = {
      trainNr: '',
      vehicles: [],
      date: '',
      crew: []
    };

    // Train number from header
    var headerEl = overlayPane.querySelector('.dialog__header h2.label, .dialog__header .label');
    if (headerEl) {
      var ht = (headerEl.innerText || '').trim();
      var tnMatch = ht.match(/\d{3,5}/);
      if (tnMatch) result.trainNr = tnMatch[0];
    }

    // Vehicles from chips
    overlayPane.querySelectorAll('.chip').forEach(function(chip) {
      var v = (chip.innerText || '').trim();
      if (v) result.vehicles.push(v);
    });

    // Date
    var labels = overlayPane.querySelectorAll('.label');
    labels.forEach(function(lbl) {
      var lt = (lbl.innerText || '').trim();
      var dm = lt.match(/\d{4}-\d{2}-\d{2}/);
      if (dm) result.date = dm[0];
    });

    // Crew from staff cards
    overlayPane.querySelectorAll('.staff__card').forEach(function(card) {
      var nameEl = card.querySelector('.staff__name');
      var roleEl = card.querySelector('.staff__role');
      var schedEl = card.querySelector('.staff__scedule');

      var member = {
        name: nameEl ? (nameEl.innerText || '').trim() : '',
        role: '',
        location: '',
        fromStation: '',
        toStation: '',
        timeStart: '',
        timeEnd: '',
        phone: ''
      };

      // Parse role + location (e.g. "Lokförare Malmö")
      if (roleEl) {
        var roleText = (roleEl.innerText || '').trim();
        var rp = roleText.match(/^(\S+)\s+(.+)$/);
        if (rp) {
          member.role = rp[1];
          member.location = rp[2];
        } else {
          member.role = roleText;
        }
      }

      // Parse schedule text for times and stations
      if (schedEl) {
        var st = (schedEl.innerText || '').trim();
        var stMatch = st.match(/\(([^)]+)\)\s*(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*\(([^)]+)\)/);
        if (stMatch) {
          member.fromStation = stMatch[1];
          member.timeStart = stMatch[2].length === 4 ? '0' + stMatch[2] : stMatch[2];
          member.timeEnd = stMatch[3].length === 4 ? '0' + stMatch[3] : stMatch[3];
          member.toStation = stMatch[4];
        }
      }

      // Phone - find in card text
      var cardText = (card.innerText || '');
      var phoneMatch = cardText.match(/(\+\d{10,15})/);
      if (phoneMatch) member.phone = phoneMatch[1];

      if (member.name) result.crew.push(member);
    });

    return result;
  }

  // Export to global namespace
  window.OneVR.scraper = {
    scrapeLocations: scrapeLocations,
    buildCache: buildCache,
    scrapePersonnel: scrapePersonnel,
    calculateStats: calculateStats,
    scrapeDagvy: scrapeDagvy,
    scrapeTrainCrew: scrapeTrainCrew,
    isDagvyTracked: isDagvyTracked,
    DAGVY_NAMES: DAGVY_NAMES
  };

  console.log('[OneVR] Scraper loaded');
})();
