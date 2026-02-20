/**
 * OneVR Events Module
 * Event handlers and interactions
 */
(function() {
  'use strict';

  var CFG = window.OneVR.config;
  var utils = window.OneVR.utils;
  var scraper = window.OneVR.scraper;
  var ui = window.OneVR.ui;

  // Filter state
  var filterState = {
    activeRole: 'all',
    activeLoc: 'all',
    searchQ: '',
    filters: {
      res: false,
      changed: false,
      se: false,
      dk: false,
      utb: false,
      insutb: false,
      adm: false,
      jobbar: false
    }
  };

  // Current data
  var currentData = null;

  // Local data store for scraped dagvy + crew
  // Structure: { [personName]: { days: [ { date, segments, turnr, start, end, notFound, crews: { [trainNr]: crewData } } ] } }
  window.OneVR.dagvyStore = window.OneVR.dagvyStore || {};

  // ─── Firestore helpers ───────────────────────

  /**
   * Convert JS value to Firestore REST API typed value
   */
  function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return { integerValue: String(val) };
      return { doubleValue: val };
    }
    if (typeof val === 'string') return { stringValue: val };
    if (Array.isArray(val)) {
      return { arrayValue: { values: val.map(toFirestoreValue) } };
    }
    if (typeof val === 'object') {
      var fields = {};
      Object.keys(val).forEach(function(k) {
        fields[k] = toFirestoreValue(val[k]);
      });
      return { mapValue: { fields: fields } };
    }
    return { stringValue: String(val) };
  }

  /**
   * Firebase Auth via Cloudflare Worker proxy
   * Worker holds credentials as secrets — nothing sensitive in this code
   * Caches token in window.OneVR.firebaseToken (~55 min)
   * cb(token) on success, cb(null, errorMsg) on failure
   */
  function firebaseAuth(cb) {
    // Check cached token (valid for ~55 min to be safe)
    var cached = window.OneVR.firebaseToken;
    if (cached && cached.idToken && (Date.now() - cached.obtainedAt) < 55 * 60 * 1000) {
      console.log('[OneVR] Using cached Firebase token');
      cb(cached.idToken);
      return;
    }

    var workerUrl = CFG.firebase && CFG.firebase.workerUrl;
    if (!workerUrl) { cb(null, 'Firebase Worker-URL saknas i config'); return; }

    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(e) {
        var msg = e.error || ('Worker HTTP ' + r.status);
        throw new Error(msg);
      });
      return r.json();
    })
    .then(function(data) {
      if (!data.idToken) throw new Error('Inget token mottaget');
      window.OneVR.firebaseToken = {
        idToken: data.idToken,
        obtainedAt: Date.now()
      };
      console.log('[OneVR] Firebase auth OK (via Worker)');
      cb(data.idToken);
    })
    .catch(function(err) {
      console.error('[OneVR] Firebase auth failed:', err);
      window.OneVR.firebaseToken = null;
      cb(null, err.message || 'Auth misslyckades');
    });
  }

  /**
   * Upload dagvy data to Firestore
   * Collection: dagvy, Document: personName
   * Authenticates first, then PATCHes with Bearer token
   */
  function uploadToFirebase(personName, storeData, cb) {
    var projectId = CFG.firebase && CFG.firebase.projectId;
    if (!projectId) { cb(false, 'Firebase ej konfigurerat'); return; }

    // Authenticate first, then upload
    firebaseAuth(function(token, authErr) {
      if (!token) { cb(false, authErr || 'Inloggning misslyckades'); return; }

      var docId = encodeURIComponent(personName);
      var url = 'https://firestore.googleapis.com/v1/projects/' + projectId +
                '/databases/(default)/documents/dagvy/' + docId;

      // Build clean data for Firestore
      var cleanDays = storeData.days.map(function(day) {
        var cleanSegs = day.segments.map(function(seg) {
          return {
            timeStart: seg.timeStart || '',
            timeEnd: seg.timeEnd || '',
            fromStation: seg.fromStation || '',
            toStation: seg.toStation || '',
            trainNr: seg.trainNr || '',
            trainType: seg.trainType || '',
            vehicles: seg.vehicles || [],
            activity: seg.activity || ''
          };
        });

        // Convert crews object to array for Firestore
        var crewsList = [];
        if (day.crews) {
          Object.keys(day.crews).forEach(function(trainNr) {
            var c = day.crews[trainNr];
            if (c) {
              crewsList.push({
                trainNr: c.trainNr || trainNr,
                vehicles: c.vehicles || [],
                date: day.date,  // Always use day.date (crew popup date can be off-by-one)
                crew: (c.crew || []).map(function(m) {
                  return {
                    name: m.name || '',
                    role: m.role || '',
                    location: m.location || '',
                    fromStation: m.fromStation || '',
                    toStation: m.toStation || '',
                    timeStart: m.timeStart || '',
                    timeEnd: m.timeEnd || '',
                    phone: m.phone || ''
                  };
                })
              });
            }
          });
        }

        return {
          date: day.date || '',
          turnr: day.turnr || '',
          start: day.start || '',
          end: day.end || '',
          notFound: !!day.notFound,
          segments: cleanSegs,
          crews: crewsList
        };
      });

      var docData = {
        fields: {
          personName: { stringValue: personName },
          scrapedAt: { stringValue: new Date().toISOString() },
          daysCount: { integerValue: String(cleanDays.length) },
          days: toFirestoreValue(cleanDays)
        }
      };

      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(docData)
      })
      .then(function(r) {
        if (!r.ok) return r.json().then(function(e) { throw new Error(e.error ? e.error.message : 'HTTP ' + r.status); });
        return r.json();
      })
      .then(function() {
        console.log('[OneVR] Firebase upload OK for ' + personName);
        cb(true);
      })
      .catch(function(err) {
        console.error('[OneVR] Firebase upload failed:', err);
        cb(false, err.message || 'Okänt fel');
      });
    });
  }

  /**
   * Check if viewing today's date
   */
  function isToday() {
    var navDate = window.OneVR.state.navDate;
    if (!navDate) return true;

    var today = new Date();
    var todayStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');

    return navDate === todayStr;
  }

  /**
   * Check if a person is currently working based on their shift times
   */
  function isWorkingNow(person) {
    // Only check if viewing today
    if (!isToday()) return false;

    if (person.start === '-' || person.end === '-') return false;

    var now = new Date();
    var currentTime = now.getHours() * 60 + now.getMinutes();

    var startParts = person.start.split(':');
    var endParts = person.end.split(':');
    var startMins = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
    var endMins = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);

    // Handle overnight shifts (end time is smaller than start time)
    if (endMins < startMins) {
      return currentTime >= startMins || currentTime < endMins;
    }

    return currentTime >= startMins && currentTime < endMins;
  }

  /**
   * Update the status bar with current counts
   */
  function updateStatusBar() {
    var workingNowEl = document.getElementById('onevr-working-now');
    var totalCountEl = document.getElementById('onevr-total-count');

    if (!workingNowEl || !totalCountEl || !currentData) return;

    var visiblePeople = [];
    document.querySelectorAll('.onevr-person').forEach(function(el) {
      if (el.style.display !== 'none') {
        var idx = +el.getAttribute('data-idx');
        visiblePeople.push(currentData.people[idx]);
      }
    });

    var workingCount = visiblePeople.filter(isWorkingNow).length;
    var totalVisible = visiblePeople.length;

    workingNowEl.textContent = workingCount;
    totalCountEl.textContent = totalVisible;
  }

  /**
   * Check if person is TIL (based on badge assigned by scraper)
   */
  function isTilPerson(person) {
    return person.badge === 'TIL';
  }

  /**
   * Update active filter chips display
   */
  function updateActiveFilters() {
    var container = document.getElementById('onevr-active-filters');
    if (!container) return;

    var chips = [];

    if (filterState.activeRole !== 'all') {
      chips.push({ type: 'role', val: filterState.activeRole, label: filterState.activeRole });
    }
    if (filterState.activeLoc !== 'all') {
      chips.push({ type: 'loc', val: filterState.activeLoc, label: filterState.activeLoc });
    }

    var quickLabels = {
      se: '🇸🇪',
      dk: '🇩🇰',
      res: 'Res',
      utb: 'Utb',
      insutb: 'INS',
      adm: 'ADM',
      jobbar: '🟢',
      changed: 'TP'
    };

    Object.keys(filterState.filters).forEach(function(key) {
      if (filterState.filters[key] && quickLabels[key]) {
        chips.push({ type: 'quick', val: key, label: quickLabels[key] });
      }
    });

    container.innerHTML = chips.map(function(chip) {
      return '<span class="onevr-chip" data-type="' + chip.type + '" data-val="' + chip.val + '">' +
        chip.label +
        '<button class="onevr-chip-remove">✕</button>' +
      '</span>';
    }).join('');

    // Update trigger button styles
    var roleTrigger = document.querySelector('[data-dropdown="role"]');
    var locTrigger = document.querySelector('[data-dropdown="loc"]');
    var quickTrigger = document.querySelector('[data-dropdown="quick"]');

    if (roleTrigger) {
      roleTrigger.classList.toggle('has-filter', filterState.activeRole !== 'all');
      roleTrigger.innerHTML = (filterState.activeRole !== 'all' ? filterState.activeRole : 'Roll') + ' <span class="onevr-filter-arrow">▾</span>';
    }
    if (locTrigger) {
      locTrigger.classList.toggle('has-filter', filterState.activeLoc !== 'all');
      locTrigger.innerHTML = (filterState.activeLoc !== 'all' ? filterState.activeLoc : 'Ort') + ' <span class="onevr-filter-arrow">▾</span>';
    }
    if (quickTrigger) {
      var activeQuickCount = Object.keys(filterState.filters).filter(function(k) { return filterState.filters[k]; }).length;
      quickTrigger.classList.toggle('has-filter', activeQuickCount > 0);
      quickTrigger.innerHTML = 'Filter' + (activeQuickCount > 0 ? ' (' + activeQuickCount + ')' : '') + ' <span class="onevr-filter-arrow">▾</span>';
    }
  }

  /**
   * Filter the person list based on current filter state
   */
  function filterList() {
    if (!currentData) return;

    document.querySelectorAll('.onevr-person').forEach(function(el) {
      var show = true;
      var p = currentData.people[+el.getAttribute('data-idx')];
      var f = filterState.filters;
      var working = isWorkingNow(p);

      // Update working-now indicator on badge
      var badge = el.querySelector('.onevr-badge');
      if (badge) {
        badge.classList.toggle('onevr-working-now', working);
      }

      if (f.res && !p.isRes && p.role !== 'Reserv') show = false;
      if (f.changed && !p.isChanged) show = false;
      if (f.se && p.country !== 'SE') show = false;
      if (f.dk && p.country !== 'DK') show = false;
      if (f.utb && !(p.turnr && /UTB/i.test(p.turnr) && !/INSUTB/i.test(p.turnr))) show = false;
      if (f.insutb && !(p.turnr && /INSUTB/i.test(p.turnr))) show = false;
      // ADM filter checks turnr, not badge
      if (f.adm && !(p.turnr && /ADM/i.test(p.turnr))) show = false;
      // Jobbar nu filter
      if (f.jobbar && !working) show = false;
      if (filterState.activeRole !== 'all' && p.badge !== filterState.activeRole) show = false;
      // Skip location filter for TIL persons - they should always show regardless of location
      if (filterState.activeLoc !== 'all' && p.locName !== filterState.activeLoc && !isTilPerson(p)) show = false;
      if (filterState.searchQ && !el.textContent.toLowerCase().includes(filterState.searchQ)) show = false;

      el.style.display = show ? 'flex' : 'none';
    });

    updateActiveFilters();
    updateStatusBar();
  }

  /**
   * Change date by offset
   */
  function changeDate(dir) {
    var prevBtn = document.querySelector('.icon-prev');
    var nextBtn = document.querySelector('.icon-next');
    var btn = dir < 0 ? prevBtn : nextBtn;

    if (!btn) return;

    var newDate = utils.addDays(window.OneVR.state.navDate, dir);
    window.OneVR.state.navDate = newDate;

    var loader = utils.createLoader('Laddar...');
    ui.hideOverlay();
    btn.click();

    setTimeout(function() {
      loader.remove();
      window.OneVR.init();
    }, CFG.ui.dateNavDelay);
  }

  /**
   * Navigate to specific date
   */
  function goToDate(targetDate) {
    var prevBtn = document.querySelector('.icon-prev');
    var nextBtn = document.querySelector('.icon-next');

    if (!prevBtn || !nextBtn) return;

    var diff = utils.diffDays(window.OneVR.state.navDate, targetDate);
    var clicks = Math.abs(diff);
    var btn = diff > 0 ? nextBtn : prevBtn;

    if (clicks === 0) {
      window.OneVR.init();
      return;
    }

    var loader = utils.createLoader('Navigerar...');
    ui.hideOverlay();

    var i = 0;
    function doClick() {
      if (i < clicks) {
        btn.click();
        i++;
        setTimeout(doClick, CFG.ui.loadTimeDelay);
      } else {
        window.OneVR.state.navDate = targetDate;
        setTimeout(function() {
          loader.remove();
          window.OneVR.init();
        }, 1500);
      }
    }

    doClick();
  }

  /**
   * Find turnable label in element
   */
  function findTurnLabel(el) {
    var labels = el.querySelectorAll(CFG.ui.labelSelector);
    for (var i = 0; i < labels.length; i++) {
      var t = (labels[i].innerText || '').trim();
      if (utils.chkTurn(t)) return labels[i];
    }
    return null;
  }

  /**
   * Handle loading times for people without times
   */
  function setupLoadTimes() {
    var loadTimesEl = document.getElementById('onevr-load-times');
    if (!loadTimesEl) return;

    var isLoading = false;
    var menu = null;

    loadTimesEl.onclick = function() {
      if (isLoading) return;

      if (loadTimesEl.classList.contains('done')) {
        ui.hideOverlay();
        window.OneVR.init();
        return;
      }

      if (menu) {
        menu.remove();
        menu = null;
        return;
      }

      var noTimePeople = currentData.people.filter(function(p) { return p.start === '-'; });
      if (!noTimePeople.length) return;

      // Build role counts
      var roleCounts = {};
      noTimePeople.forEach(function(p) {
        roleCounts[p.badge || 'ÖVR'] = (roleCounts[p.badge || 'ÖVR'] || 0) + 1;
      });

      var resNoTime = noTimePeople.filter(function(p) { return p.isRes || p.role === 'Reserv'; }).length;
      var tpNoTime = noTimePeople.filter(function(p) { return p.isChanged; }).length;

      // Create menu
      menu = document.createElement('div');
      menu.className = 'onevr-load-menu';
      menu.innerHTML = buildLoadTimesMenu(roleCounts, resNoTime, tpNoTime);

      loadTimesEl.parentNode.insertBefore(menu, loadTimesEl.nextSibling);

      // Cancel button
      menu.querySelector('#onevr-load-cancel').onclick = function(e) {
        e.stopPropagation();
        menu.remove();
        menu = null;
      };

      // Start button
      menu.querySelector('#onevr-load-start').onclick = function(e) {
        e.stopPropagation();
        startLoadingTimes(menu, noTimePeople, loadTimesEl);
        menu = null;
      };
    };
  }

  function buildLoadTimesMenu(roleCounts, resNoTime, tpNoTime) {
    var roleChecks = '';
    Object.keys(roleCounts).forEach(function(role) {
      var count = roleCounts[role];
      roleChecks += '<label class="onevr-load-check"><input type="checkbox" data-type="role" value="' + role + '">' + role + ' (' + count + ')</label>';
    });

    return '<div class="onevr-load-title">Ladda tider för</div>' +
      '<div class="onevr-load-row">' + roleChecks + '</div>' +
      '<div class="onevr-load-row">' +
        '<label class="onevr-load-check"><input type="checkbox" data-type="special" value="res">Reserv' + (resNoTime ? ' (' + resNoTime + ')' : '') + '</label>' +
        '<label class="onevr-load-check"><input type="checkbox" data-type="special" value="tp">TP' + (tpNoTime ? ' (' + tpNoTime + ')' : '') + '</label>' +
      '</div>' +
      '<div class="onevr-load-actions">' +
        '<button id="onevr-load-start" class="onevr-load-btn onevr-load-btn-start">▶ Starta</button>' +
        '<button id="onevr-load-cancel" class="onevr-load-btn onevr-load-btn-cancel">Avbryt</button>' +
      '</div>';
  }

  function startLoadingTimes(menu, noTimePeople, loadTimesEl) {
    var selectedRoles = [];
    var includeRes = false;
    var includeTp = false;

    menu.querySelectorAll('input[data-type="role"]:checked').forEach(function(cb) {
      selectedRoles.push(cb.value);
    });
    menu.querySelectorAll('input[data-type="special"]:checked').forEach(function(cb) {
      if (cb.value === 'res') includeRes = true;
      if (cb.value === 'tp') includeTp = true;
    });

    menu.remove();

    if (!selectedRoles.length && !includeRes && !includeTp) return;

    var hasR = selectedRoles.length > 0;
    var hasS = includeRes || includeTp;

    var filteredPeople = noTimePeople.filter(function(p) {
      var mR = selectedRoles.indexOf(p.badge) !== -1;
      var mS = (includeRes && (p.isRes || p.role === 'Reserv')) || (includeTp && p.isChanged);
      return hasR && hasS ? mR && mS : hasR ? mR : hasS ? mS : false;
    });

    if (!filteredPeople.length) return;

    // Start loading
    loadTimesEl.style.background = 'linear-gradient(135deg,#007aff,#0a84ff)';
    loadTimesEl.style.color = '#fff';

    var cdkC = document.querySelector('.cdk-overlay-container');
    if (cdkC) {
      cdkC.style.opacity = '0';
      cdkC.style.pointerEvents = 'none';
    }

    var idx = 0;
    var successCount = 0;

    function loadNext() {
      if (idx < filteredPeople.length) {
        var p = filteredPeople[idx];
        var el = currentData.elements[p.elIdx];
        var fn = p.name.split(' ')[0];

        loadTimesEl.textContent = '⏳ ' + idx + '/' + filteredPeople.length;

        if (el) {
          var tE = findTurnLabel(el) || el;
          el.scrollIntoView({ behavior: 'instant', block: 'center' });

          waitClose(function() {
            setTimeout(function() {
              tE.click();
              waitModal(fn, function(modal, mt) {
                if (modal && mt) {
                  var at = mt.match(/[0-9]{1,2}:[0-9]{2}/g);
                  if (at && at.length >= 2) {
                    var st = at[0];
                    var en = at[1];
                    if (st.length === 4) st = '0' + st;
                    if (en.length === 4) en = '0' + en;
                    window.OneVR.cache.times[p.name + '_' + currentData.dateText] = { start: st, end: en };
                    successCount++;
                  }
                }
                var bd = document.querySelector('.cdk-overlay-backdrop');
                if (bd) bd.click();
                var cb = document.querySelector('.icon-close');
                if (cb) cb.click();
                idx++;
                setTimeout(loadNext, 100);
              }, 4000);
            }, 150);
          });
        } else {
          idx++;
          setTimeout(loadNext, 50);
        }
      } else {
        if (cdkC) {
          cdkC.style.opacity = '';
          cdkC.style.pointerEvents = '';
        }
        loadTimesEl.style.background = '';
        loadTimesEl.textContent = '🔄 Tryck för att uppdatera listan (' + successCount + ' nya tider)';
        loadTimesEl.classList.add('done');
      }
    }

    loadNext();
  }

  function waitClose(cb) {
    var w = 0;
    (function ck() {
      var pn = document.querySelector('.cdk-overlay-pane');
      if (!pn) cb();
      else if (w < 2000) { w += 100; setTimeout(ck, 100); }
      else cb();
    })();
  }

  function waitModal(nm, cb, mx) {
    var w = 0;
    (function ck() {
      var pn = document.querySelector('.cdk-overlay-pane');
      if (pn) {
        var tx = pn.innerText || '';
        if (!tx.includes('Laddar') && tx.includes(nm)) {
          cb(pn, tx);
          return;
        }
      }
      w += 200;
      if (w < mx) setTimeout(ck, 200);
      else cb(null, '');
    })();
  }

  /**
   * Bind all event handlers
   */
  function bindEvents(data) {
    currentData = data;
    var overlay = ui.overlay;

    // Section accordions
    document.querySelectorAll('.onevr-section-header').forEach(function(h) {
      h.onclick = function() {
        this.parentElement.classList.toggle('open');
      };
    });

    // Click outside to close
    overlay.onclick = function(e) {
      if (e.target === overlay) ui.hideOverlay();
    };

    // Date navigation
    document.getElementById('onevr-prev').onclick = function() { changeDate(-1); };
    document.getElementById('onevr-next').onclick = function() { changeDate(1); };
    document.getElementById('onevr-date-picker').onchange = function() { goToDate(this.value); };

    // Search
    var searchEl = document.getElementById('onevr-search');
    var clearEl = document.getElementById('onevr-search-clear');
    var vakansBtn = document.getElementById('onevr-vakanser-btn');

    function updateVakansButtonVisibility() {
      if (!vakansBtn) return;
      var searchMatch = filterState.searchQ === 'vakanser';
      var isFutureDate = !isToday();
      vakansBtn.style.display = (searchMatch && isFutureDate) ? '' : 'none';
    }

    searchEl.oninput = function() {
      filterState.searchQ = this.value.toLowerCase();
      clearEl.classList.toggle('show', this.value.length > 0);
      updateVakansButtonVisibility();
      filterList();
    };

    clearEl.onclick = function() {
      searchEl.value = '';
      filterState.searchQ = '';
      clearEl.classList.remove('show');
      updateVakansButtonVisibility();
      filterList();
      searchEl.focus();
    };

    // Dropdown toggle handlers
    document.querySelectorAll('.onevr-filter-trigger').forEach(function(trigger) {
      trigger.onclick = function(e) {
        e.stopPropagation();
        var dropdown = this.closest('.onevr-filter-dropdown');
        var wasOpen = dropdown.classList.contains('open');

        // Close all dropdowns first
        document.querySelectorAll('.onevr-filter-dropdown').forEach(function(d) {
          d.classList.remove('open');
        });

        // Toggle the clicked one
        if (!wasOpen) {
          dropdown.classList.add('open');
        }
      };
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.onevr-filter-dropdown')) {
        document.querySelectorAll('.onevr-filter-dropdown').forEach(function(d) {
          d.classList.remove('open');
        });
      }
    });

    // Role dropdown items
    var roleMenu = document.getElementById('onevr-role-menu');
    if (roleMenu) {
      roleMenu.onclick = function(e) {
        var item = e.target.closest('.onevr-dropdown-item');
        if (item) {
          this.querySelectorAll('.onevr-dropdown-item').forEach(function(i) { i.classList.remove('active'); });
          item.classList.add('active');
          filterState.activeRole = item.getAttribute('data-val');
          this.closest('.onevr-filter-dropdown').classList.remove('open');
          filterList();
        }
      };
    }

    // Location dropdown items
    var locMenu = document.getElementById('onevr-loc-menu');
    if (locMenu) {
      locMenu.onclick = function(e) {
        var item = e.target.closest('.onevr-dropdown-item');
        if (item) {
          this.querySelectorAll('.onevr-dropdown-item').forEach(function(i) { i.classList.remove('active'); });
          item.classList.add('active');
          filterState.activeLoc = item.getAttribute('data-val');
          this.closest('.onevr-filter-dropdown').classList.remove('open');
          filterList();
        }
      };
    }

    // Quick filter dropdown items (toggle behavior)
    var quickMenu = document.getElementById('onevr-quick-menu');
    if (quickMenu) {
      quickMenu.onclick = function(e) {
        var item = e.target.closest('.onevr-dropdown-item');
        if (item) {
          var val = item.getAttribute('data-val');

          // Handle exclusive filters (SE/DK)
          if (val === 'se' && filterState.filters.dk) {
            filterState.filters.dk = false;
            this.querySelector('[data-val="dk"]').classList.remove('active');
          } else if (val === 'dk' && filterState.filters.se) {
            filterState.filters.se = false;
            this.querySelector('[data-val="se"]').classList.remove('active');
          }

          filterState.filters[val] = !filterState.filters[val];
          item.classList.toggle('active', filterState.filters[val]);
          filterList();
        }
      };
    }

    // Active filter chips - remove on click
    document.getElementById('onevr-active-filters').onclick = function(e) {
      var removeBtn = e.target.closest('.onevr-chip-remove');
      if (removeBtn) {
        var chip = removeBtn.closest('.onevr-chip');
        var type = chip.getAttribute('data-type');
        var val = chip.getAttribute('data-val');

        if (type === 'role') {
          filterState.activeRole = 'all';
          var roleMenu = document.getElementById('onevr-role-menu');
          if (roleMenu) {
            roleMenu.querySelectorAll('.onevr-dropdown-item').forEach(function(i) { i.classList.remove('active'); });
            roleMenu.querySelector('[data-val="all"]').classList.add('active');
          }
        } else if (type === 'loc') {
          filterState.activeLoc = 'all';
          var locMenu = document.getElementById('onevr-loc-menu');
          if (locMenu) {
            locMenu.querySelectorAll('.onevr-dropdown-item').forEach(function(i) { i.classList.remove('active'); });
            locMenu.querySelector('[data-val="all"]').classList.add('active');
          }
        } else if (type === 'quick') {
          filterState.filters[val] = false;
          var quickMenu = document.getElementById('onevr-quick-menu');
          if (quickMenu) {
            var item = quickMenu.querySelector('[data-val="' + val + '"]');
            if (item) item.classList.remove('active');
          }
        }

        filterList();
      }
    };

    // Click on turnr to scroll to element
    document.getElementById('onevr-list').onclick = function(e) {
      var tE = e.target.closest('.onevr-turnr');
      if (tE) {
        var eI = +tE.getAttribute('data-elidx');
        var oE = currentData.elements[eI];
        if (oE) {
          var cT = findTurnLabel(oE) || oE;
          overlay.style.display = 'none';
          oE.scrollIntoView({ behavior: 'instant', block: 'center' });
          setTimeout(function() {
            cT.click();
            (function wC() {
              var pn = document.querySelector('.cdk-overlay-pane');
              if (pn) setTimeout(wC, 200);
              else overlay.style.display = '';
            })();
          }, 300);
        }
      }
    };

    // Load times
    setupLoadTimes();

    // Vakanser button click handler (vakansBtn already defined above)
    if (vakansBtn) {
      vakansBtn.onclick = function() {
        showVacancies();
      };
    }

    // Export button (skip PIN if already unlocked)
    var exportBtn = document.getElementById('onevr-export-btn');
    if (exportBtn) {
      exportBtn.onclick = function() {
        if (window.OneVR.pinUnlocked) {
          showExportMenu();
        } else {
          showPinDialog();
        }
      };
    }

    // Initial status bar update
    updateStatusBar();
  }

  /**
   * Open dagvy: click on person element, wait for popup, scrape, show modal
   */
  function openDagvy(person, overlay) {
    var el = currentData.elements[person.elIdx];
    if (!el) return;

    var cdkC = document.querySelector('.cdk-overlay-container');
    if (cdkC) {
      cdkC.style.opacity = '0';
      cdkC.style.pointerEvents = 'none';
    }

    // Show loading indicator
    var loadingModal = document.createElement('div');
    loadingModal.className = 'onevr-dagvy-modal';
    loadingModal.innerHTML =
      '<div class="onevr-dagvy-content">' +
        '<div class="onevr-dagvy-header">' +
          '<span>📋 Laddar dagvy...</span>' +
          '<button class="onevr-dagvy-close">✕</button>' +
        '</div>' +
        '<div class="onevr-dagvy-loading">' +
          '<div class="onevr-spinner"></div>' +
          '<div style="margin-top:12px;color:rgba(60,60,67,.6);">Hämtar ' + person.name.split(' ')[0] + 's schema</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(loadingModal);

    loadingModal.querySelector('.onevr-dagvy-close').onclick = function() {
      loadingModal.remove();
      if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }
    };
    loadingModal.onclick = function(e) {
      if (e.target === loadingModal) {
        loadingModal.remove();
        if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }
      }
    };

    overlay.style.display = 'none';
    var tE = findTurnLabel(el) || el;
    el.scrollIntoView({ behavior: 'instant', block: 'center' });

    waitClose(function() {
      setTimeout(function() {
        tE.click();
        var firstName = person.name.split(' ')[0];
        waitModal(firstName, function(pane, txt) {
          // Scrape the dagvy data
          var segments = [];
          if (pane) {
            segments = scraper.scrapeDagvy(pane);
          }

          // Close the system popup
          var bd = document.querySelector('.cdk-overlay-backdrop');
          if (bd) bd.click();
          var cb = document.querySelector('.icon-close');
          if (cb) cb.click();

          if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }
          overlay.style.display = '';

          // Remove loading and show dagvy
          loadingModal.remove();
          showDagvyModal(person, [{ date: currentData.isoDate || window.OneVR.state.navDate, segments: segments, turnr: person.turnr, start: person.start, end: person.end, crews: {} }]);
        }, 6000);
      }, 200);
    });
  }

  /**
   * Open multi-day dagvy: scrape today + 2 days ahead, including train crew
   * Flow per day: scrape dagvy → for each train → re-open dagvy → click trainNr → scrape crew → close
   */
  function openMultiDagvy(person, overlay) {
    var startDate = currentData.isoDate || window.OneVR.state.navDate;
    var personName = person.name;
    var firstName = personName.split(' ')[0];
    var totalDays = window.OneVR.exportDays || 3;
    var daysCollected = [];

    var cdkC = document.querySelector('.cdk-overlay-container');
    if (cdkC) { cdkC.style.opacity = '0'; cdkC.style.pointerEvents = 'none'; }

    // Show loading modal with progress
    var loadingModal = document.createElement('div');
    loadingModal.className = 'onevr-dagvy-modal';
    loadingModal.innerHTML =
      '<div class="onevr-dagvy-content">' +
        '<div class="onevr-dagvy-header">' +
          '<span>📋 Hämtar 3 dagar + besättning...</span>' +
          '<button class="onevr-dagvy-close">✕</button>' +
        '</div>' +
        '<div class="onevr-dagvy-loading">' +
          '<div class="onevr-spinner"></div>' +
          '<div class="onevr-multi-progress" id="onevr-multi-progress">Dag 1 av 3 – ' + firstName + '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(loadingModal);

    var cancelled = false;
    var cleanUp = function() {
      cancelled = true;
      loadingModal.remove();
      if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }
      if (overlay) overlay.style.display = '';
    };
    loadingModal.querySelector('.onevr-dagvy-close').onclick = cleanUp;
    loadingModal.onclick = function(e) { if (e.target === loadingModal) cleanUp(); };

    overlay.style.display = 'none';

    var progressEl = document.getElementById('onevr-multi-progress');

    function updateProgress(text) {
      if (progressEl) progressEl.textContent = text;
    }

    // ─── Close all open popups ───
    function closeAllPopups(cb) {
      var bds = document.querySelectorAll('.cdk-overlay-backdrop');
      bds.forEach(function(b) { b.click(); });
      var closeIcons = document.querySelectorAll('.close-icon, .icon-close');
      closeIcons.forEach(function(c) { c.click(); });
      setTimeout(cb, 300);
    }

    // ─── Scrape crew for one train by opening dagvy popup → clicking train nr ───
    function scrapeCrewForTrain(personEl, trainNr, cb) {
      if (cancelled) { cb(null); return; }

      var tE = findTurnLabel(personEl) || personEl;
      personEl.scrollIntoView({ behavior: 'instant', block: 'center' });

      waitClose(function() {
        if (cancelled) { cb(null); return; }
        setTimeout(function() {
          tE.click();
          waitModal(firstName, function(pane) {
            if (!pane || cancelled) {
              closeAllPopups(function() { cb(null); });
              return;
            }

            // Find train number element in the dagvy popup
            var trainEl = null;
            var trainLabels = pane.querySelectorAll('.storybook-label');
            trainLabels.forEach(function(lbl) {
              var lt = (lbl.innerText || '').trim();
              if (lt === trainNr) trainEl = lbl;
            });
            if (!trainEl) {
              pane.querySelectorAll('.trip-number .storybook-label').forEach(function(lbl) {
                var lt = (lbl.innerText || '').trim();
                if (lt === trainNr) trainEl = lbl;
              });
            }

            if (!trainEl) {
              closeAllPopups(function() { cb(null); });
              return;
            }

            // Click train number to open crew popup
            trainEl.click();

            // Wait for staff dialog
            var waitTime = 0;
            (function checkCrew() {
              if (cancelled) { closeAllPopups(function() { cb(null); }); return; }

              var crewPane = document.querySelector('.cdk-overlay-pane app-staff-onboard-dialog');
              if (!crewPane) crewPane = document.querySelector('.cdk-overlay-pane .staff__list');
              if (!crewPane) {
                document.querySelectorAll('.cdk-overlay-pane').forEach(function(p) {
                  if (p.querySelector('.staff__card')) crewPane = p;
                });
              }

              if (crewPane) {
                var actualPane = crewPane.closest('.cdk-overlay-pane') || crewPane;
                var crewData = scraper.scrapeTrainCrew(actualPane);
                closeAllPopups(function() { cb(crewData); });
              } else {
                waitTime += 300;
                if (waitTime < 8000) {
                  setTimeout(checkCrew, 300);
                } else {
                  closeAllPopups(function() { cb(null); });
                }
              }
            })();
          }, 6000);
        }, 200);
      });
    }

    // ─── Scrape all crews for one day's trains (sequential) ───
    function scrapeAllCrews(dayData, personEl, cb) {
      if (cancelled) { cb(); return; }

      var trainSegs = dayData.segments.filter(function(s) { return !!s.trainNr; });
      if (trainSegs.length === 0) { cb(); return; }

      dayData.crews = {};
      var idx = 0;

      function nextTrain() {
        if (cancelled || idx >= trainSegs.length) { cb(); return; }

        var trainNr = trainSegs[idx].trainNr;
        // Skip if already scraped (same train can appear on different days)
        if (dayData.crews[trainNr]) { idx++; nextTrain(); return; }

        updateProgress('Dag ' + (daysCollected.length) + ' av ' + totalDays + ' – 🚆 Tåg ' + trainNr + ' (' + (idx + 1) + '/' + trainSegs.length + ')');

        scrapeCrewForTrain(personEl, trainNr, function(crewData) {
          if (crewData) {
            crewData.date = dayData.date; // Override popup date with calculated date
            dayData.crews[trainNr] = crewData;
          }
          idx++;
          nextTrain();
        });
      }

      nextTrain();
    }

    // ─── Scrape a single day: dagvy + all train crews ───
    function scrapeOneDay(dayNum, personEl, foundPerson, targetDate, cb) {
      if (cancelled) { cb(); return; }
      updateProgress('Dag ' + dayNum + ' av ' + totalDays + ' – Skrapar dagvy...');

      var tE = findTurnLabel(personEl) || personEl;
      personEl.scrollIntoView({ behavior: 'instant', block: 'center' });

      waitClose(function() {
        if (cancelled) { cb(); return; }
        setTimeout(function() {
          tE.click();
          waitModal(firstName, function(pane) {
            var segments = pane ? scraper.scrapeDagvy(pane) : [];
            // Close dagvy popup
            closeAllPopups(function() {
              var dayData = {
                date: targetDate,
                segments: segments,
                turnr: foundPerson.turnr,
                start: foundPerson.start,
                end: foundPerson.end,
                notFound: false,
                crews: {}
              };
              daysCollected.push(dayData);

              // Now scrape crews for all trains on this day
              scrapeAllCrews(dayData, personEl, cb);
            });
          }, 6000);
        }, 200);
      });
    }

    // ─── Process days sequentially ───
    function processDay(dayOffset) {
      if (cancelled) return;
      if (dayOffset >= totalDays) {
        navigateBack();
        return;
      }

      if (dayOffset === 0) {
        // Day 0: use current page data
        var el0 = currentData.elements[person.elIdx];
        if (!el0) {
          daysCollected.push({ date: startDate, segments: [], turnr: person.turnr, start: person.start, end: person.end, notFound: true, crews: {} });
          processDay(1);
          return;
        }

        scrapeOneDay(1, el0, person, startDate, function() {
          processDay(1);
        });
      } else {
        // Navigate forward
        updateProgress('Dag ' + (dayOffset + 1) + ' av ' + totalDays + ' – Navigerar...');

        var nextBtn = document.querySelector('.icon-next');
        if (!nextBtn) {
          for (var i = dayOffset; i < totalDays; i++) {
            daysCollected.push({ date: utils.addDays(startDate, i), segments: [], notFound: true, turnr: '', start: '-', end: '-', crews: {} });
          }
          navigateBack();
          return;
        }

        nextBtn.click();
        var targetDate = utils.addDays(startDate, dayOffset);

        setTimeout(function() {
          if (cancelled) return;
          updateProgress('Dag ' + (dayOffset + 1) + ' av ' + totalDays + ' – Söker ' + firstName + '...');

          var dayScraped = scraper.scrapePersonnel();
          var dayPeople = dayScraped.people;
          var dayElements = dayScraped.elements;

          var foundPerson = null;
          var foundEl = null;
          for (var i = 0; i < dayPeople.length; i++) {
            if (dayPeople[i].name === personName) {
              foundPerson = dayPeople[i];
              foundEl = dayElements[dayPeople[i].elIdx];
              break;
            }
          }

          if (!foundPerson || !foundEl) {
            daysCollected.push({ date: targetDate, segments: [], notFound: true, turnr: '', start: '-', end: '-', crews: {} });
            processDay(dayOffset + 1);
            return;
          }

          scrapeOneDay(dayOffset + 1, foundEl, foundPerson, targetDate, function() {
            processDay(dayOffset + 1);
          });
        }, CFG.ui.dateNavDelay);
      }
    }

    // ─── Navigate back to start date ───
    function navigateBack() {
      if (cancelled) return;
      updateProgress('Navigerar tillbaka...');

      var stepsBack = totalDays - 1;
      var step = 0;

      function doStep() {
        if (cancelled) return;
        if (step < stepsBack) {
          var prevBtn = document.querySelector('.icon-prev');
          if (prevBtn) prevBtn.click();
          step++;
          setTimeout(doStep, CFG.ui.loadTimeDelay);
        } else {
          window.OneVR.state.navDate = startDate;
          setTimeout(function() {
            if (cancelled) return;
            if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }
            overlay.style.display = '';
            loadingModal.remove();

            // Store in local cache
            window.OneVR.dagvyStore[personName] = {
              scrapedAt: new Date().toISOString(),
              days: daysCollected
            };
            console.log('[OneVR] Dagvy+crew stored for ' + personName + ':', JSON.stringify(daysCollected.map(function(d) {
              return { date: d.date, segs: d.segments.length, crews: Object.keys(d.crews || {}).length, notFound: d.notFound };
            })));

            showDagvyModal(person, daysCollected);
          }, 1000);
        }
      }

      doStep();
    }

    // Start
    processDay(0);
  }

  /**
   * Build crew HTML for inline display under a train segment
   */
  function buildInlineCrewHTML(crewData, originName) {
    if (!crewData || !crewData.crew || crewData.crew.length === 0) return '';

    var html = '<div class="onevr-inline-crew">';

    // Vehicles
    if (crewData.vehicles && crewData.vehicles.length) {
      html += '<div class="onevr-inline-crew-vehicles">';
      var seenV = {};
      crewData.vehicles.forEach(function(v) {
        if (!seenV[v]) {
          seenV[v] = true;
          html += '<span class="onevr-crew-vehicle-badge">' + v + '</span>';
        }
      });
      html += '</div>';
    }

    // Crew members
    crewData.crew.forEach(function(m) {
      var isSelf = originName && m.name === originName;
      var routeStr = '';
      if (m.fromStation && m.toStation) {
        routeStr = m.fromStation + ' → ' + m.toStation;
      } else if (m.fromStation) {
        routeStr = m.fromStation;
      }
      var timeStr = '';
      if (m.timeStart && m.timeEnd) {
        timeStr = m.timeStart + ' – ' + m.timeEnd;
      }
      html += '<div class="onevr-inline-crew-member' + (isSelf ? ' onevr-inline-crew-self' : '') + '">' +
        '<div class="onevr-inline-crew-info">' +
          '<span class="onevr-inline-crew-name">' + m.name + '</span>' +
          '<span class="onevr-inline-crew-role">' + m.role + (m.location ? ' · ' + m.location : '') + '</span>' +
          (routeStr || timeStr
            ? '<span class="onevr-inline-crew-route">' + (timeStr ? timeStr + ' ' : '') + routeStr + '</span>'
            : '') +
        '</div>' +
        (m.phone ? '<span class="onevr-inline-crew-phone">' + m.phone + '</span>' : '') +
      '</div>';
    });

    html += '</div>';
    return html;
  }

  /**
   * Build segments HTML for a single day's dagvy data
   * @param {Array} segments - dagvy segments
   * @param {object} crews - { trainNr: crewData } map (optional)
   * @param {string} originName - person name for self-highlight
   */
  function buildSegmentsHTML(segments, crews, originName) {
    if (!segments || segments.length === 0) {
      return '<div class="onevr-dagvy-empty">Kunde inte hämta dagvy</div>';
    }

    var html = '';
    segments.forEach(function(seg) {
      var isTrain = !!seg.trainNr;
      var timeStr = seg.timeStart && seg.timeEnd ? seg.timeStart + ' – ' + seg.timeEnd : '';
      var routeStr = '';
      if (seg.fromStation && seg.toStation) {
        routeStr = seg.fromStation + ' → ' + seg.toStation;
      } else if (seg.fromStation) {
        routeStr = seg.fromStation;
      }

      if (isTrain) {
        var vehicleStr = seg.vehicles.length ? seg.vehicles.join(', ') : '';
        var crewData = crews && crews[seg.trainNr] ? crews[seg.trainNr] : null;
        var hasCrew = crewData && crewData.crew && crewData.crew.length > 0;
        var crewCount = hasCrew ? crewData.crew.length : 0;

        html += '<div class="onevr-dagvy-seg onevr-dagvy-train' + (hasCrew ? ' onevr-dagvy-has-crew' : '') + '">' +
          '<div class="onevr-dagvy-seg-left">' +
            '<span class="onevr-dagvy-seg-time">' + timeStr + '</span>' +
            '<span class="onevr-dagvy-seg-route">' + routeStr + '</span>' +
          '</div>' +
          '<div class="onevr-dagvy-seg-right">' +
            '<span class="onevr-dagvy-train-nr' + (hasCrew ? ' onevr-dagvy-crew-toggle' : ' onevr-dagvy-train-link') + '" data-train="' + seg.trainNr + '">🚆 ' + seg.trainNr + (hasCrew ? ' 👥' + crewCount : ' ›') + '</span>' +
            '<span class="onevr-dagvy-train-type">' + seg.trainType + '</span>' +
            (vehicleStr ? '<span class="onevr-dagvy-vehicle">' + vehicleStr + '</span>' : '') +
          '</div>' +
          (hasCrew ? buildInlineCrewHTML(crewData, originName) : '') +
        '</div>';
      } else {
        var actName = seg.activity || 'Aktivitet';
        var icon = '📍';
        if (actName.match(/gångtid/i)) icon = '🚶';
        else if (actName.match(/orderläsning/i)) icon = '📖';
        else if (actName.match(/plattform/i)) icon = '🏗️';
        else if (actName.match(/tågpassning/i)) icon = '👀';
        else if (actName.match(/rast/i)) icon = '☕';
        else if (actName.match(/utcheckning/i)) icon = '🏁';
        else if (actName.match(/incheckning/i)) icon = '✅';

        html += '<div class="onevr-dagvy-seg onevr-dagvy-activity">' +
          '<div class="onevr-dagvy-seg-left">' +
            '<span class="onevr-dagvy-seg-time">' + timeStr + '</span>' +
            '<span class="onevr-dagvy-seg-route">' + routeStr + '</span>' +
          '</div>' +
          '<div class="onevr-dagvy-seg-right">' +
            '<span class="onevr-dagvy-act-name">' + icon + ' ' + actName + '</span>' +
          '</div>' +
        '</div>';
      }
    });
    return html;
  }

  /**
   * Show dagvy modal with scraped data
   * @param {object} person - Person object
   * @param {Array} days - Array of { date, segments, turnr, start, end, notFound }
   */
  function showDagvyModal(person, days) {
    var weekdays = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
    var weekdaysFull = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
    var isMultiDay = days.length > 1;

    // Build day sections
    var allDaysHTML = '';
    var totalTrains = 0;
    var totalActs = 0;

    days.forEach(function(day, dayIdx) {
      var dateObj = new Date(day.date);
      var weekday = isMultiDay ? weekdays[dateObj.getDay()] : weekdaysFull[dateObj.getDay()];
      var dateStr = day.date.substring(5); // MM-DD

      var trainCount = day.segments.filter(function(s) { return !!s.trainNr; }).length;
      var actCount = day.segments.filter(function(s) { return !s.trainNr; }).length;
      totalTrains += trainCount;
      totalActs += actCount;

      var timeStr = day.start && day.start !== '-' ? day.start + ' – ' + day.end : '—';

      if (isMultiDay) {
        // Multi-day: each day gets a collapsible section
        var dayClass = day.notFound ? 'onevr-day-section onevr-day-notfound' : 'onevr-day-section';
        var defaultOpen = dayIdx === 0 ? ' onevr-day-open' : '';

        allDaysHTML += '<div class="' + dayClass + defaultOpen + '">' +
          '<div class="onevr-day-header" data-day-idx="' + dayIdx + '">' +
            '<div class="onevr-day-header-left">' +
              '<span class="onevr-day-weekday">' + weekday + '</span>' +
              '<span class="onevr-day-date">' + dateStr + '</span>' +
            '</div>' +
            '<div class="onevr-day-header-right">' +
              (day.notFound
                ? '<span class="onevr-day-off">Ej schemalagd</span>'
                : '<span class="onevr-day-turnr">' + day.turnr + '</span>' +
                  '<span class="onevr-day-time">' + timeStr + '</span>' +
                  '<span class="onevr-day-count">🚆 ' + trainCount + '</span>'
              ) +
              '<span class="onevr-day-arrow">▾</span>' +
            '</div>' +
          '</div>' +
          '<div class="onevr-day-content">' +
            (day.notFound
              ? '<div class="onevr-dagvy-empty">Ej schemalagd denna dag</div>'
              : buildSegmentsHTML(day.segments, day.crews, person.name)
            ) +
          '</div>' +
        '</div>';
      } else {
        // Single-day: flat list like before
        allDaysHTML += '<div class="onevr-dagvy-info">' +
          '<div class="onevr-dagvy-info-row">' +
            '<span class="onevr-dagvy-badge onevr-badge-' + person.badgeColor + '">' + person.badge + '</span>' +
            '<span class="onevr-dagvy-turnr">' + day.turnr + '</span>' +
            '<span class="onevr-dagvy-date">' + weekday + ' ' + day.date + '</span>' +
          '</div>' +
          '<div class="onevr-dagvy-info-row">' +
            '<span class="onevr-dagvy-time">🕐 ' + timeStr + '</span>' +
            '<span class="onevr-dagvy-stats">🚆 ' + trainCount + ' tåg · 📍 ' + actCount + ' aktiviteter</span>' +
          '</div>' +
          (person.phone ? '<div class="onevr-dagvy-info-row"><span class="onevr-dagvy-contact">📞 ' + person.phone + '</span></div>' : '') +
          (person.trains && person.trains.length ? '<div class="onevr-dagvy-info-row"><span class="onevr-dagvy-trains">🚆 Tåg: ' + person.trains.join(', ') + '</span></div>' : '') +
        '</div>' +
        '<div class="onevr-dagvy-list">' + buildSegmentsHTML(day.segments, day.crews, person.name) + '</div>';
      }
    });

    // Count total crews scraped
    var totalCrews = 0;
    days.forEach(function(d) {
      if (d.crews) totalCrews += Object.keys(d.crews).length;
    });

    // Build header subtitle
    var headerSubtitle = isMultiDay
      ? days.length + ' dagar · 🚆 ' + totalTrains + ' tåg' + (totalCrews > 0 ? ' · 👥 ' + totalCrews + ' besättningar' : '')
      : '';

    // Check if data is in store (for export buttons)
    var hasStoreData = window.OneVR.dagvyStore && window.OneVR.dagvyStore[person.name];
    var footerHTML = hasStoreData
      ? '<div class="onevr-dagvy-footer">' +
          '<div class="onevr-dagvy-footer-row">' +
            '<button class="onevr-firebase-btn" id="onevr-firebase-upload">☁️ Firebase</button>' +
            '<button class="onevr-download-btn" id="onevr-json-download">📥 JSON</button>' +
          '</div>' +
        '</div>'
      : '';

    var modal = document.createElement('div');
    modal.className = 'onevr-dagvy-modal';
    modal.innerHTML =
      '<div class="onevr-dagvy-content">' +
        '<div class="onevr-dagvy-header">' +
          '<div>' +
            '<span>📋 ' + person.name + '</span>' +
            (headerSubtitle ? '<div class="onevr-dagvy-header-sub">' + headerSubtitle + '</div>' : '') +
          '</div>' +
          '<button class="onevr-dagvy-close">✕</button>' +
        '</div>' +
        (isMultiDay
          ? '<div class="onevr-multi-days">' + allDaysHTML + '</div>'
          : allDaysHTML
        ) +
        footerHTML +
      '</div>';

    document.body.appendChild(modal);

    modal.querySelector('.onevr-dagvy-close').onclick = function() { modal.remove(); };
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    // Firebase upload handler
    var fbBtn = modal.querySelector('#onevr-firebase-upload');
    if (fbBtn) {
      fbBtn.onclick = function() {
        fbBtn.disabled = true;
        fbBtn.textContent = '☁️ Skickar...';
        fbBtn.classList.add('onevr-firebase-sending');

        uploadToFirebase(person.name, window.OneVR.dagvyStore[person.name], function(ok, errMsg) {
          if (ok) {
            fbBtn.textContent = '✅ Skickat!';
            fbBtn.classList.remove('onevr-firebase-sending');
            fbBtn.classList.add('onevr-firebase-done');
          } else {
            fbBtn.textContent = '❌ Fel: ' + (errMsg || 'Okänt');
            fbBtn.classList.remove('onevr-firebase-sending');
            fbBtn.classList.add('onevr-firebase-error');
            fbBtn.disabled = false;
            setTimeout(function() {
              fbBtn.textContent = '☁️ Försök igen';
              fbBtn.classList.remove('onevr-firebase-error');
            }, 3000);
          }
        });
      };
    }

    // JSON download handler
    var dlBtn = modal.querySelector('#onevr-json-download');
    if (dlBtn) {
      dlBtn.onclick = function() {
        var store = window.OneVR.dagvyStore[person.name];
        if (!store) return;

        // Build clean JSON (same structure as Firebase)
        var exportData = {
          personName: person.name,
          scrapedAt: store.scrapedAt || new Date().toISOString(),
          daysCount: store.days.length,
          days: store.days.map(function(day) {
            var crewsList = [];
            if (day.crews) {
              Object.keys(day.crews).forEach(function(trainNr) {
                var c = day.crews[trainNr];
                if (c) crewsList.push(c);
              });
            }
            return {
              date: day.date,
              turnr: day.turnr || '',
              start: day.start || '',
              end: day.end || '',
              notFound: !!day.notFound,
              segments: day.segments,
              crews: crewsList
            };
          })
        };

        var json = JSON.stringify(exportData, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'dagvy-' + person.name.replace(/\s+/g, '-') + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        dlBtn.textContent = '✅ Nedladdad!';
        dlBtn.classList.add('onevr-download-done');
        setTimeout(function() {
          dlBtn.textContent = '📥 JSON';
          dlBtn.classList.remove('onevr-download-done');
        }, 2000);
      };
    }

    // Multi-day: toggle day sections
    if (isMultiDay) {
      modal.querySelectorAll('.onevr-day-header').forEach(function(header) {
        header.onclick = function() {
          header.parentElement.classList.toggle('onevr-day-open');
        };
      });
    }

    // Toggle inline crew on trains that have crew data
    modal.querySelectorAll('.onevr-dagvy-crew-toggle').forEach(function(toggle) {
      toggle.onclick = function() {
        var seg = toggle.closest('.onevr-dagvy-seg');
        if (seg) seg.classList.toggle('onevr-crew-expanded');
      };
    });

    // Click on train number to show crew (live scrape, for trains without cached crew)
    modal.querySelectorAll('.onevr-dagvy-train-link').forEach(function(link) {
      link.onclick = function() {
        var trainNr = link.getAttribute('data-train');
        if (trainNr) {
          modal.remove();
          openTrainCrew(person, trainNr);
        }
      };
    });
  }

  /**
   * Open train crew: click person → open dagvy popup → find train nr → click → scrape crew
   */
  function openTrainCrew(person, trainNr) {
    var el = currentData.elements[person.elIdx];
    if (!el) return;

    var overlay = document.querySelector('.onevr-overlay');
    var cdkC = document.querySelector('.cdk-overlay-container');
    if (cdkC) { cdkC.style.opacity = '0'; cdkC.style.pointerEvents = 'none'; }

    // Show loading
    var loadingModal = document.createElement('div');
    loadingModal.className = 'onevr-dagvy-modal';
    loadingModal.innerHTML =
      '<div class="onevr-dagvy-content">' +
        '<div class="onevr-dagvy-header" style="background:linear-gradient(135deg,#009041,#30d158);">' +
          '<span>🚆 Hämtar besättning...</span>' +
          '<button class="onevr-dagvy-close">✕</button>' +
        '</div>' +
        '<div class="onevr-dagvy-loading">' +
          '<div class="onevr-spinner"></div>' +
          '<div style="margin-top:12px;color:rgba(60,60,67,.6);">Tåg ' + trainNr + '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(loadingModal);

    var cleanUp = function() {
      if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }
      if (overlay) overlay.style.display = '';
    };

    loadingModal.querySelector('.onevr-dagvy-close').onclick = function() { loadingModal.remove(); cleanUp(); };
    loadingModal.onclick = function(e) { if (e.target === loadingModal) { loadingModal.remove(); cleanUp(); } };

    if (overlay) overlay.style.display = 'none';
    var tE = findTurnLabel(el) || el;
    el.scrollIntoView({ behavior: 'instant', block: 'center' });

    // Step 1: Open person's dagvy popup
    waitClose(function() {
      setTimeout(function() {
        tE.click();
        var firstName = person.name.split(' ')[0];
        waitModal(firstName, function(pane) {
          if (!pane) {
            loadingModal.remove(); cleanUp();
            return;
          }

          // Step 2: Find the train number in H-section and click it
          var trainLabels = pane.querySelectorAll('.storybook-label');
          var trainEl = null;
          trainLabels.forEach(function(lbl) {
            var lt = (lbl.innerText || '').trim();
            if (lt === trainNr) trainEl = lbl;
          });

          if (!trainEl) {
            // Try trip-number elements inside piece-containers
            pane.querySelectorAll('.trip-number .storybook-label').forEach(function(lbl) {
              var lt = (lbl.innerText || '').trim();
              if (lt === trainNr) trainEl = lbl;
            });
          }

          if (!trainEl) {
            // Close dagvy popup and bail
            var bd = document.querySelector('.cdk-overlay-backdrop');
            if (bd) bd.click();
            loadingModal.remove(); cleanUp();
            return;
          }

          // Step 3: Click train number to open crew popup
          trainEl.click();

          // Step 4: Wait for new dialog (staff-onboard-dialog)
          var waitCrew = 0;
          (function checkCrew() {
            var crewPane = document.querySelector('.cdk-overlay-pane app-staff-onboard-dialog');
            if (!crewPane) crewPane = document.querySelector('.cdk-overlay-pane .staff__list');
            // Also check by text content - the crew dialog should NOT contain the person's first name as primary content
            if (!crewPane) {
              var allPanes = document.querySelectorAll('.cdk-overlay-pane');
              allPanes.forEach(function(p) {
                var pt = (p.innerText || '');
                if (pt.includes('staff__card') || pt.includes(trainNr)) {
                  // Check for staff cards
                  if (p.querySelector('.staff__card')) crewPane = p;
                }
              });
            }

            if (crewPane) {
              // Find the actual overlay pane containing the crew
              var actualPane = crewPane.closest('.cdk-overlay-pane') || crewPane;
              var crewData = scraper.scrapeTrainCrew(actualPane);

              // Close all popups
              var bds = document.querySelectorAll('.cdk-overlay-backdrop');
              bds.forEach(function(b) { b.click(); });
              var closeIcons = document.querySelectorAll('.close-icon, .icon-close');
              closeIcons.forEach(function(c) { c.click(); });

              loadingModal.remove(); cleanUp();
              if (crewData) {
                showCrewModal(crewData, person);
              }
            } else {
              waitCrew += 300;
              if (waitCrew < 8000) {
                setTimeout(checkCrew, 300);
              } else {
                // Timeout - close everything
                var bd2 = document.querySelector('.cdk-overlay-backdrop');
                if (bd2) bd2.click();
                loadingModal.remove(); cleanUp();
              }
            }
          })();
        }, 6000);
      }, 200);
    });
  }

  /**
   * Show crew modal
   */
  function showCrewModal(crewData, originPerson) {
    var uniqueVehicles = [];
    var seenV = {};
    crewData.vehicles.forEach(function(v) {
      if (!seenV[v]) { seenV[v] = true; uniqueVehicles.push(v); }
    });

    // Group crew by segment (unique time ranges)
    var crewHTML = '';
    if (!crewData.crew.length) {
      crewHTML = '<div class="onevr-dagvy-empty">Ingen besättning hittades</div>';
    } else {
      // Deduplicate crew by name+time (same person appears for each segment)
      var segments = {};
      crewData.crew.forEach(function(m) {
        var key = m.timeStart + '-' + m.timeEnd + '_' + m.fromStation + '-' + m.toStation;
        if (!segments[key]) {
          segments[key] = {
            timeStart: m.timeStart,
            timeEnd: m.timeEnd,
            fromStation: m.fromStation,
            toStation: m.toStation,
            members: []
          };
        }
        // Avoid duplicate names in same segment
        var exists = false;
        segments[key].members.forEach(function(em) { if (em.name === m.name) exists = true; });
        if (!exists) segments[key].members.push(m);
      });

      Object.keys(segments).forEach(function(key) {
        var seg = segments[key];
        var routeStr = seg.fromStation + ' → ' + seg.toStation;
        var timeStr = seg.timeStart + ' – ' + seg.timeEnd;

        crewHTML += '<div class="onevr-crew-segment">' +
          '<div class="onevr-crew-seg-header">' +
            '<span class="onevr-crew-seg-time">' + timeStr + '</span>' +
            '<span class="onevr-crew-seg-route">' + routeStr + '</span>' +
          '</div>';

        seg.members.forEach(function(m) {
          var isOrigin = originPerson && m.name === originPerson.name;
          crewHTML += '<div class="onevr-crew-member' + (isOrigin ? ' onevr-crew-member-self' : '') + '">' +
            '<div class="onevr-crew-member-info">' +
              '<span class="onevr-crew-member-name">' + m.name + '</span>' +
              '<span class="onevr-crew-member-role">' + m.role + (m.location ? ' · ' + m.location : '') + '</span>' +
            '</div>' +
            (m.phone ? '<span class="onevr-crew-member-phone">' + m.phone + '</span>' : '') +
          '</div>';
        });

        crewHTML += '</div>';
      });
    }

    var modal = document.createElement('div');
    modal.className = 'onevr-dagvy-modal';
    modal.innerHTML =
      '<div class="onevr-dagvy-content">' +
        '<div class="onevr-dagvy-header" style="background:linear-gradient(135deg,#009041,#30d158);">' +
          '<span>🚆 Tåg ' + crewData.trainNr + '</span>' +
          '<button class="onevr-dagvy-close">✕</button>' +
        '</div>' +
        '<div class="onevr-crew-info">' +
          (uniqueVehicles.length ? '<div class="onevr-crew-vehicles">' + uniqueVehicles.map(function(v) { return '<span class="onevr-crew-vehicle-badge">' + v + '</span>'; }).join('') + '</div>' : '') +
          (crewData.date ? '<div class="onevr-crew-date">📅 ' + crewData.date + '</div>' : '') +
        '</div>' +
        '<div class="onevr-dagvy-list">' + crewHTML + '</div>' +
      '</div>';

    document.body.appendChild(modal);

    modal.querySelector('.onevr-dagvy-close').onclick = function() { modal.remove(); };
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  }

  /**
   * Show PIN dialog for export
   */
  function showPinDialog() {
    var modal = document.createElement('div');
    modal.className = 'onevr-pin-modal';
    modal.innerHTML =
      '<div class="onevr-pin-content">' +
        '<div class="onevr-pin-header">' +
          '<span>🔒 Ange PIN</span>' +
          '<button class="onevr-pin-close">✕</button>' +
        '</div>' +
        '<div class="onevr-pin-body">' +
          '<div class="onevr-pin-dots">' +
            '<span class="onevr-pin-dot"></span>' +
            '<span class="onevr-pin-dot"></span>' +
            '<span class="onevr-pin-dot"></span>' +
            '<span class="onevr-pin-dot"></span>' +
          '</div>' +
          '<div class="onevr-pin-error" id="onevr-pin-error"></div>' +
          '<div class="onevr-pin-pad">' +
            '<button class="onevr-pin-key" data-key="1">1</button>' +
            '<button class="onevr-pin-key" data-key="2">2</button>' +
            '<button class="onevr-pin-key" data-key="3">3</button>' +
            '<button class="onevr-pin-key" data-key="4">4</button>' +
            '<button class="onevr-pin-key" data-key="5">5</button>' +
            '<button class="onevr-pin-key" data-key="6">6</button>' +
            '<button class="onevr-pin-key" data-key="7">7</button>' +
            '<button class="onevr-pin-key" data-key="8">8</button>' +
            '<button class="onevr-pin-key" data-key="9">9</button>' +
            '<button class="onevr-pin-key onevr-pin-key-empty"></button>' +
            '<button class="onevr-pin-key" data-key="0">0</button>' +
            '<button class="onevr-pin-key onevr-pin-key-del" data-key="del">⌫</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    var pin = '';
    var dots = modal.querySelectorAll('.onevr-pin-dot');
    var errorEl = modal.querySelector('#onevr-pin-error');
    var correctPin = '8612';

    function updateDots() {
      dots.forEach(function(dot, i) {
        dot.classList.toggle('filled', i < pin.length);
      });
    }

    function checkPin() {
      if (pin === correctPin) {
        window.OneVR.pinUnlocked = true;
        // Update button text to show unlocked
        var btn = document.getElementById('onevr-export-btn');
        if (btn) btn.textContent = '🔓 Exportera';
        modal.remove();
        showExportMenu();
      } else {
        errorEl.textContent = 'Fel PIN';
        pin = '';
        updateDots();
        dots.forEach(function(d) { d.classList.add('onevr-pin-shake'); });
        setTimeout(function() {
          dots.forEach(function(d) { d.classList.remove('onevr-pin-shake'); });
          errorEl.textContent = '';
        }, 800);
      }
    }

    // Key pad clicks
    modal.querySelector('.onevr-pin-pad').onclick = function(e) {
      var key = e.target.closest('.onevr-pin-key');
      if (!key) return;
      var val = key.getAttribute('data-key');

      if (val === 'del') {
        pin = pin.slice(0, -1);
        updateDots();
      } else if (val && pin.length < 4) {
        pin += val;
        updateDots();
        if (pin.length === 4) {
          setTimeout(checkPin, 200);
        }
      }
    };

    // Close handlers
    modal.querySelector('.onevr-pin-close').onclick = function() {
      modal.remove();
    };
    modal.onclick = function(e) {
      if (e.target === modal) modal.remove();
    };
  }

  /**
   * Show export menu (after PIN verified)
   */

  /**
   * Fetch all PDFs from a document category in OneVR, package as ZIP.
   * Navigates: Positionlista → Hem → Dokument → category → collect PDFs → ZIP → Positionlista
   * @param {Element} overlay - the main overlay element
   * @param {string} categoryName - e.g. "TA - Danmark" or "Driftmeddelande"
   */
  function fetchDocumentCategory(overlay, categoryName) {
    var NAV_DELAY = 2500;
    var PDF_WAIT_DELAY = 3000;
    var PDF_WAIT_MAX = 20000;
    var collected = [];   // {filename, data} — PDF ArrayBuffers
    var failed = [];
    var parsedDocs = []; // Strukturerad data extraherad från PDFs

    // ─── Load JSZip library dynamically ───
    function loadJSZip(cb) {
      if (window.JSZip) { cb(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = function() { cb(); };
      s.onerror = function() { cb('Kunde inte ladda JSZip-biblioteket'); };
      document.head.appendChild(s);
    }

    // Hide overlay, show loading modal
    if (overlay) overlay.style.display = 'none';

    var cdkC = document.querySelector('.cdk-overlay-container');
    if (cdkC) { cdkC.style.opacity = '0'; cdkC.style.pointerEvents = 'none'; }

    var loadingModal = document.createElement('div');
    loadingModal.className = 'onevr-dagvy-modal';
    loadingModal.innerHTML =
      '<div class="onevr-dagvy-content">' +
        '<div class="onevr-dagvy-header" style="background:linear-gradient(135deg,#d63027,#ff6b6b);">' +
          '<span>📄 Hämtar ' + categoryName + '</span>' +
          '<button class="onevr-dagvy-close">✕</button>' +
        '</div>' +
        '<div class="onevr-dagvy-loading">' +
          '<div class="onevr-spinner"></div>' +
          '<div class="onevr-multi-progress" id="onevr-doc-progress" style="color:inherit;opacity:1;">Laddar JSZip...</div>' +
          '<div class="onevr-batch-detail" id="onevr-doc-detail" style="color:inherit;opacity:1;"></div>' +
          '<div class="onevr-progress-bar-wrap"><div class="onevr-progress-bar onevr-progress-bar-doc" id="onevr-doc-bar" style="width:0%"></div></div>' +
          '<div class="onevr-progress-pct onevr-progress-pct-doc" id="onevr-doc-pct">0%</div>' +
          '<div class="onevr-elapsed" id="onevr-doc-elapsed" style="opacity:1;">⏱ 0:00</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(loadingModal);

    var cancelled = false;
    var elapsedSec = 0;
    var elapsedEl = document.getElementById('onevr-doc-elapsed');
    var elapsedTimer = setInterval(function() {
      elapsedSec++;
      var m = Math.floor(elapsedSec / 60);
      var s = elapsedSec % 60;
      if (elapsedEl) elapsedEl.textContent = '⏱ ' + m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);

    function cleanUp() {
      cancelled = true;
      clearInterval(elapsedTimer);
      loadingModal.remove();
      if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }
      if (overlay) overlay.style.display = '';
    }
    loadingModal.querySelector('.onevr-dagvy-close').onclick = cleanUp;
    loadingModal.onclick = function(e) { if (e.target === loadingModal) cleanUp(); };

    var progressEl = document.getElementById('onevr-doc-progress');
    var detailEl = document.getElementById('onevr-doc-detail');
    var barEl = document.getElementById('onevr-doc-bar');
    var pctEl = document.getElementById('onevr-doc-pct');

    function setProgress(main, detail, pct) {
      if (progressEl) progressEl.textContent = main;
      if (detailEl) detailEl.textContent = detail || '';
      if (typeof pct === 'number') {
        var p = Math.round(pct);
        if (barEl) barEl.style.width = p + '%';
        if (pctEl) pctEl.textContent = p + '%';
      }
    }

    // Helper: click a storybook-label by its text
    function clickLabel(text, cb) {
      var found = false;
      document.querySelectorAll('.storybook-label').forEach(function(el) {
        if (!found && el.innerText.trim() === text) {
          found = true;
          el.click();
          if (el.parentElement) el.parentElement.click();
        }
      });
      if (!found) {
        document.querySelectorAll('[class*="BottomMenu"], [class*="bottom"]').forEach(function(el) {
          if (!found && el.innerText.trim() === text) {
            found = true;
            el.click();
            if (el.parentElement) el.parentElement.click();
          }
        });
      }
      setTimeout(cb, NAV_DELAY);
      return found;
    }

    // Helper: extract text from all pages of a PDF document
    function extractPdfText(pdfDoc, cb) {
      var numPages = pdfDoc.numPages;
      var allText = '';
      var pageIdx = 0;
      function doPage() {
        pageIdx++;
        if (pageIdx > numPages) { cb(allText); return; }
        pdfDoc.getPage(pageIdx).then(function(page) {
          page.getTextContent().then(function(tc) {
            var lines = {};
            tc.items.forEach(function(item) {
              var y = Math.round(item.transform[5]);
              if (!lines[y]) lines[y] = [];
              lines[y].push({ x: item.transform[4], str: item.str });
            });
            var sortedYs = Object.keys(lines).sort(function(a, b) { return b - a; });
            sortedYs.forEach(function(y) {
              var lineItems = lines[y].sort(function(a, b) { return a.x - b.x; });
              allText += lineItems.map(function(i) { return i.str; }).join(' ') + '\n';
            });
            doPage();
          }).catch(function() { doPage(); });
        }).catch(function() { doPage(); });
      }
      doPage();
    }

    // Helper: parse PDF text into structured data
    function parsePdfDocument(text, filename) {
      var doc = {
        filename: filename,
        taNumber: null,
        week: null,
        period: null,
        trainNumbers: [],
        dates: [],
        times: []
      };

      // TA number from "Toganmeldelse nr. XXX"
      var taM = text.match(/Toganmeldels\w*\s+nr\.?\s*(\d+)/i);
      if (taM) {
        doc.taNumber = parseInt(taM[1]);
      } else {
        // Try from filename: "V2608 TA 670.pdf" → 670
        var fnM = filename.match(/TA\s*(\d+)/i);
        if (fnM) doc.taNumber = parseInt(fnM[1]);
      }

      // Week from filename: "V2608" → vecka 8, 2026
      var weekM = filename.match(/V(\d{2})(\d{2})/);
      if (weekM) doc.week = 'v' + parseInt(weekM[2]) + ' 20' + weekM[1];

      // Period (first date range)
      var rangeM = text.match(/(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/);
      if (rangeM) doc.period = rangeM[1] + ' - ' + rangeM[2];

      // All unique dates (DD.MM.YYYY)
      var dateSet = {};
      var dateRegex = /\b(\d{2}\.\d{2}\.\d{4})\b/g;
      var m;
      while ((m = dateRegex.exec(text)) !== null) {
        dateSet[m[1]] = true;
      }
      doc.dates = Object.keys(dateSet).sort();

      // All unique train numbers (ØP XXXX or IC XXXX etc.)
      var trainSet = {};
      var trainRegex = /\b([ØO]P\s*\d+|IC\s*\d+|RE\s*\d+|L\s*\d+)\b/g;
      while ((m = trainRegex.exec(text)) !== null) {
        var nr = m[1].replace(/\s+/g, ' ').trim();
        trainSet[nr] = true;
      }
      doc.trainNumbers = Object.keys(trainSet);

      // Times (H:MM or HH:MM)
      var timeSet = {};
      var timeRegex = /\b(\d{1,2}:\d{2})\b/g;
      while ((m = timeRegex.exec(text)) !== null) {
        timeSet[m[1]] = true;
      }
      doc.times = Object.keys(timeSet).sort();

      return doc;
    }

    // Helper: wait for PDF viewer, collect data + extract text
    function waitForPdfAndCollect(filename, cb) {
      var elapsed = 0;
      function poll() {
        if (cancelled) { cb(null, null); return; }
        if (window.PDFViewerApplication && window.PDFViewerApplication.pdfDocument) {
          var pdfDoc = window.PDFViewerApplication.pdfDocument;
          // Get binary data first
          pdfDoc.getData().then(function(data) {
            console.log('[OneVR] Collected: ' + filename + ' (' + data.byteLength + ' bytes)');
            // Then extract text for parsing
            extractPdfText(pdfDoc, function(text) {
              var parsed = parsePdfDocument(text, filename);
              console.log('[OneVR] Parsed: ' + filename + ' → TA ' + (parsed.taNumber || '?') + ', ' + parsed.trainNumbers.length + ' tåg, ' + parsed.dates.length + ' datum');
              cb(data, parsed);
            });
          }).catch(function(err) {
            console.error('[OneVR] getData failed for ' + filename, err);
            cb(null, null);
          });
        } else {
          elapsed += 500;
          if (elapsed < PDF_WAIT_MAX) {
            setTimeout(poll, 500);
          } else {
            console.error('[OneVR] PDF viewer timeout for ' + filename);
            cb(null, null);
          }
        }
      }
      setTimeout(poll, PDF_WAIT_DELAY);
    }

    // ─── Start: load JSZip first, then navigate ───
    loadJSZip(function(err) {
      if (err) {
        setProgress('Fel: ' + err, '', 0);
        setTimeout(cleanUp, 3000);
        return;
      }
      if (cancelled) return;

      // Step 1: Navigate to Hem
      setProgress('Navigerar till Hem...', '', 5);
      clickLabel('Hem', function() {
        if (cancelled) return;

        // Step 2: Click Dokument
        setProgress('Öppnar Dokument...', '', 15);
        clickLabel('Dokument', function() {
          if (cancelled) return;

          // Step 3: Click category (TA - Danmark / Driftmeddelande)
          setProgress('Öppnar ' + categoryName + '...', '', 25);
          clickLabel(categoryName, function() {
            if (cancelled) return;

            // Step 4: Find all PDF elements
            var pdfNames = [];
            document.querySelectorAll('.storybook-label').forEach(function(el) {
              var txt = el.innerText.trim();
              if (txt.toLowerCase().indexOf('.pdf') !== -1) {
                pdfNames.push(txt);
              }
            });

            if (pdfNames.length === 0) {
              setProgress('Inga PDF-filer hittades', categoryName, 100);
              setTimeout(function() { goBack(); }, 2000);
              return;
            }

            setProgress('Hittade ' + pdfNames.length + ' dokument', '', 30);

            // Step 5: Collect each PDF sequentially into memory
            var idx = 0;
            function nextPdf() {
              if (cancelled) return;
              if (idx >= pdfNames.length) {
                buildZip();
                return;
              }

              var filename = pdfNames[idx];
              var pct = 30 + ((idx / pdfNames.length) * 55);
              setProgress('Hämtar ' + (idx + 1) + '/' + pdfNames.length, filename, pct);

              // Reset PDF viewer state before opening next PDF
              if (window.PDFViewerApplication && window.PDFViewerApplication.pdfDocument) {
                try { window.PDFViewerApplication.pdfDocument.destroy(); } catch(e) { /* ignore */ }
                window.PDFViewerApplication.pdfDocument = null;
              }

              // Click the PDF label
              var clicked = false;
              document.querySelectorAll('.storybook-label').forEach(function(el) {
                if (!clicked && el.innerText.trim() === filename) {
                  clicked = true;
                  el.click();
                  el.parentElement.click();
                  if (el.parentElement.parentElement) el.parentElement.parentElement.click();
                }
              });

              if (!clicked) {
                failed.push(filename);
                idx++;
                nextPdf();
                return;
              }

              waitForPdfAndCollect(filename, function(data, parsed) {
                if (data) {
                  collected.push({ filename: filename, data: data });
                  if (parsed) parsedDocs.push(parsed);
                } else {
                  failed.push(filename);
                }

                // Go back to document list
                history.back();
                setTimeout(function() {
                  idx++;
                  nextPdf();
                }, NAV_DELAY);
              });
            }

            nextPdf();
          });
        });
      });
    });

    // Step 6: Build ZIP from collected PDFs
    var uploadStatus = '';  // '', 'uploading', 'ok', 'fail', 'skip'
    var zipName = '';

    function buildZip() {
      if (cancelled) return;
      setProgress('Skapar ZIP-fil...', collected.length + ' dokument', 85);

      try {
        var zip = new window.JSZip();
        collected.forEach(function(item) {
          zip.file(item.filename, item.data, { binary: true });
        });

        // Inkludera parsed JSON i ZIP:en
        if (parsedDocs.length > 0) {
          zip.file('ta_data.json', JSON.stringify(parsedDocs, null, 2));
        }

        zip.generateAsync({ type: 'blob' }).then(function(blob) {
          window.OneVR._lastDocZip = { blob: blob, categoryName: categoryName };
          var safeCat = categoryName.replace(/[^a-zA-Z0-9åäöÅÄÖ\-_ ]/g, '').replace(/\s+/g, '_');
          zipName = safeCat + '_' + new Date().toISOString().slice(0, 10) + '.zip';
          console.log('[OneVR] ZIP created: ' + (blob.size / 1024).toFixed(1) + ' KB, ' + collected.length + ' files');

          // Upload ZIP + parsed data to Firebase via Worker
          uploadToDocs(blob, safeCat + '/' + zipName, function() {
            // Also upload parsed JSON data
            uploadParsedData(safeCat, function() {
              goBack();
            });
          });
        }).catch(function(err) {
          console.error('[OneVR] ZIP generation failed:', err);
          setProgress('ZIP-skapande misslyckades', '', 90);
          setTimeout(function() { goBack(); }, 2000);
        });
      } catch(e) {
        console.error('[OneVR] ZIP error:', e);
        setProgress('ZIP-fel: ' + e.message, '', 90);
        setTimeout(function() { goBack(); }, 2000);
      }
    }

    // Step 6b: Upload ZIP to Firebase via Cloudflare Worker
    function uploadToDocs(blob, docKey, cb) {
      var workerUrl = CFG.firebase && CFG.firebase.workerUrl;
      var docsCfg = CFG.docs;
      if (!workerUrl || !docsCfg || !docsCfg.apiKey || docsCfg.apiKey === 'BYTA-TILL-DIN-DOCS-API-NYCKEL') {
        console.log('[OneVR] Docs ej konfigurerad, hoppar uppladdning');
        uploadStatus = 'skip';
        cb();
        return;
      }

      uploadStatus = 'uploading';
      setProgress('Sparar till Firebase...', (blob.size / 1024).toFixed(0) + ' KB', 90);

      fetch(workerUrl + '/docs/' + encodeURIComponent(docKey), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/zip',
          'X-API-Key': docsCfg.apiKey
        },
        body: blob
      })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(e) { throw new Error(e.error || 'HTTP ' + res.status); });
        return res.json();
      })
      .then(function(data) {
        if (data.success) {
          uploadStatus = 'ok';
          console.log('[OneVR] Firebase upload OK: ' + docKey);
        } else {
          uploadStatus = 'fail';
          console.error('[OneVR] Firebase upload failed:', data);
        }
        cb();
      })
      .catch(function(err) {
        uploadStatus = 'fail';
        console.error('[OneVR] Firebase upload error:', err);
        cb();
      });
    }

    // Step 6c: Upload parsed JSON data to Firebase
    function uploadParsedData(safeCat, cb) {
      if (parsedDocs.length === 0) { cb(); return; }
      var workerUrl = CFG.firebase && CFG.firebase.workerUrl;
      var docsCfg = CFG.docs;
      if (!workerUrl || !docsCfg || !docsCfg.apiKey || docsCfg.apiKey === 'BYTA-TILL-DIN-DOCS-API-NYCKEL') {
        cb();
        return;
      }

      setProgress('Sparar parsed data...', parsedDocs.length + ' dokument', 92);

      fetch(workerUrl + '/docs/' + encodeURIComponent(safeCat) + '/parsed', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': docsCfg.apiKey
        },
        body: JSON.stringify(parsedDocs)
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          console.log('[OneVR] Parsed data uploaded: ' + safeCat + ' (' + parsedDocs.length + ' docs)');
        } else {
          console.error('[OneVR] Parsed upload failed:', data);
        }
        cb();
      })
      .catch(function(err) {
        console.error('[OneVR] Parsed upload error:', err);
        cb();
      });
    }

    // Step 7: Navigate back to Positionlista and show result with download
    function goBack() {
      if (cancelled) return;
      clearInterval(elapsedTimer);
      setProgress('Navigerar tillbaka...', '', 95);

      clickLabel('Positionlista', function() {
        if (cancelled) return;
        setProgress('Klar!', '', 100);

        if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }

        // Format elapsed time
        var em = Math.floor(elapsedSec / 60);
        var es = elapsedSec % 60;
        var elapsed = em + ':' + (es < 10 ? '0' : '') + es;

        // Upload status badge
        var statusBadge = '';
        if (uploadStatus === 'ok') statusBadge = '<div style="margin-top:8px;font-size:13px;color:#34c759;font-weight:600;">☁️ Sparad i Firebase</div>';
        else if (uploadStatus === 'fail') statusBadge = '<div style="margin-top:8px;font-size:13px;color:#ff453a;font-weight:600;">⚠️ Firebase-uppladdning misslyckades</div>';
        else if (uploadStatus === 'skip') statusBadge = '<div style="margin-top:8px;font-size:12px;color:#8e8e93;">☁️ Firebase docs ej konfigurerad</div>';

        // Show result modal with ZIP download button
        setTimeout(function() {
          var hasZip = window.OneVR._lastDocZip && window.OneVR._lastDocZip.blob;
          var zipSize = hasZip ? (window.OneVR._lastDocZip.blob.size / 1024).toFixed(0) : 0;

          loadingModal.querySelector('.onevr-dagvy-loading').innerHTML =
            '<div style="text-align:center;padding:20px 16px;">' +
              '<div class="onevr-turns-result-big">' + collected.length + '</div>' +
              '<div class="onevr-turns-result-label">dokument insamlade</div>' +
              (failed.length > 0 ? '<div style="color:#ff453a;margin-top:8px;font-size:13px;">' + failed.length + ' misslyckades</div>' : '') +
              '<div style="font-size:12px;color:#8e8e93;margin-top:4px;">⏱ ' + elapsed + ' • ' + zipSize + ' KB</div>' +
              statusBadge +
              (hasZip ?
                '<button id="onevr-doc-zip-dl" style="margin-top:14px;width:100%;padding:14px;border:none;border-radius:12px;' +
                'font-size:15px;font-weight:700;cursor:pointer;color:#fff;' +
                'background:linear-gradient(135deg,#d63027,#ff6b6b);">' +
                '📦 Ladda ner ' + zipName + '</button>' : '') +
              '<div style="margin-top:14px;max-height:30vh;overflow-y:auto;">' +
                collected.map(function(item) {
                  return '<div style="font-size:12px;color:rgba(60,60,67,.6);padding:2px 0;">✅ ' + item.filename + '</div>';
                }).join('') +
                failed.map(function(f) {
                  return '<div style="font-size:12px;color:#ff453a;padding:2px 0;">❌ ' + f + '</div>';
                }).join('') +
              '</div>' +
              '<button class="onevr-turns-back-btn" style="margin-top:16px;width:100%;padding:12px;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;" id="onevr-doc-done">Tillbaka</button>' +
            '</div>';

          // ZIP download handler
          var zipBtn = document.getElementById('onevr-doc-zip-dl');
          if (zipBtn && hasZip) {
            zipBtn.onclick = function() {
              var url = URL.createObjectURL(window.OneVR._lastDocZip.blob);
              var a = document.createElement('a');
              a.href = url;
              a.download = zipName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
              zipBtn.textContent = '✅ Nedladdad!';
              zipBtn.style.opacity = '0.7';
            };
          }

          var doneBtn = document.getElementById('onevr-doc-done');
          if (doneBtn) {
            doneBtn.onclick = function() {
              window.OneVR._lastDocZip = null;
              loadingModal.remove();
              if (overlay) overlay.style.display = '';
              showExportMenu();
            };
          }
        }, 500);
      });
    }
  }

  /**
   * Scrape weekly turns (Malmö) — navigates 7 days from current,
   * reads all personnel each day, deduplicates by turnr,
   * and downloads a JSON file with weekday/turnr/start/end.
   */
  function scrapeWeeklyTurns(overlay, numDays) {
    var startDate = currentData.isoDate || window.OneVR.state.navDate;
    var totalDays = numDays || window.OneVR.turnsDays || 5;
    var WEEKDAYS_SV = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
    var allTurns = [];

    var cdkC = document.querySelector('.cdk-overlay-container');
    if (cdkC) { cdkC.style.opacity = '0'; cdkC.style.pointerEvents = 'none'; }

    var loadingModal = document.createElement('div');
    loadingModal.className = 'onevr-dagvy-modal';
    loadingModal.innerHTML =
      '<div class="onevr-dagvy-content">' +
        '<div class="onevr-dagvy-header" style="background:linear-gradient(135deg,#009041,#00b359);">' +
          '<span>📋 Veckans turer</span>' +
          '<button class="onevr-dagvy-close">✕</button>' +
        '</div>' +
        '<div class="onevr-dagvy-loading">' +
          '<div class="onevr-spinner"></div>' +
          '<div class="onevr-multi-progress" id="onevr-turns-progress" style="color:inherit;opacity:1;">Förbereder...</div>' +
          '<div class="onevr-batch-detail" id="onevr-turns-detail" style="color:inherit;opacity:1;"></div>' +
          '<div class="onevr-progress-bar-wrap">' +
            '<div class="onevr-progress-bar" id="onevr-turns-bar" style="width:0%"></div>' +
          '</div>' +
          '<div class="onevr-progress-pct" id="onevr-turns-pct">0%</div>' +
          '<div class="onevr-elapsed" id="onevr-turns-elapsed" style="opacity:1;">⏱ 0:00</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(loadingModal);

    var cancelled = false;
    var elapsedSec = 0;
    var elapsedEl = document.getElementById('onevr-turns-elapsed');
    var elapsedTimer = setInterval(function() {
      elapsedSec++;
      var m = Math.floor(elapsedSec / 60);
      var s = elapsedSec % 60;
      if (elapsedEl) elapsedEl.textContent = '⏱ ' + m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);

    var cleanUp = function() {
      cancelled = true;
      clearInterval(elapsedTimer);
      loadingModal.remove();
      if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }
      if (overlay) overlay.style.display = '';
    };
    loadingModal.querySelector('.onevr-dagvy-close').onclick = cleanUp;
    loadingModal.onclick = function(e) { if (e.target === loadingModal) cleanUp(); };

    overlay.style.display = 'none';

    var progressEl = document.getElementById('onevr-turns-progress');
    var detailEl = document.getElementById('onevr-turns-detail');
    var barEl = document.getElementById('onevr-turns-bar');
    var pctEl = document.getElementById('onevr-turns-pct');

    function setProgress(main, detail, pct) {
      if (progressEl) progressEl.textContent = main;
      if (detailEl) detailEl.textContent = detail || '';
      if (typeof pct === 'number') {
        var p = Math.round(pct);
        if (barEl) barEl.style.width = p + '%';
        if (pctEl) pctEl.textContent = p + '%';
      }
    }

    // --- Process one day ---
    function processDay(dayOffset) {
      if (cancelled) return;
      if (dayOffset >= totalDays) { navigateBack(); return; }

      var targetDate = utils.addDays(startDate, dayOffset);
      var dp = targetDate.split('-');
      var dateObj = new Date(+dp[0], +dp[1] - 1, +dp[2]);
      var weekday = WEEKDAYS_SV[dateObj.getDay()];

      var pctStart = (dayOffset / totalDays) * 100;
      setProgress('Dag ' + (dayOffset + 1) + ' av ' + totalDays + ' — ' + weekday + ' ' + targetDate, 'Läser turer...', pctStart);

      function startScraping() {
        if (cancelled) return;
        var dayScraped = scraper.scrapePersonnel();
        var dayPeople = dayScraped.people;

        // Collect unique turns for Malmö (turnr starts with "1")
        var seenTurns = {};
        var dayTurnCount = 0;
        dayPeople.forEach(function(p) {
          if (!p.turnr) return;
          // Check if Malmö turn (first digit = 1)
          var firstDigit = p.turnr.match(/^(\d)/);
          if (!firstDigit || firstDigit[1] !== '1') return;
          // Strip TP suffix for dedup key
          var cleanTurnr = p.turnr.replace(/TP$/i, '');
          if (seenTurns[cleanTurnr]) return;
          seenTurns[cleanTurnr] = true;
          dayTurnCount++;
          allTurns.push({
            dag: weekday,
            datum: targetDate,
            turnr: p.turnr,
            start: p.start,
            slut: p.end
          });
        });

        var pctDone = ((dayOffset + 1) / totalDays) * 100;
        setProgress('Dag ' + (dayOffset + 1) + ' av ' + totalDays + ' — ' + weekday, dayTurnCount + ' turer hittade', pctDone);

        // Navigate to next day
        setTimeout(function() {
          if (cancelled) return;
          if (dayOffset + 1 < totalDays) {
            var nextBtn = document.querySelector('.icon-next');
            if (nextBtn) {
              nextBtn.click();
              setTimeout(function() { processDay(dayOffset + 1); }, CFG.ui.dateNavDelay);
            } else {
              navigateBack();
            }
          } else {
            navigateBack();
          }
        }, 500);
      }

      if (dayOffset === 0) {
        startScraping();
      } else {
        startScraping();
      }
    }

    // --- Navigate back to start date ---
    function navigateBack() {
      if (cancelled) return;
      clearInterval(elapsedTimer);
      setProgress('Navigerar tillbaka...', '', 100);

      var stepsBack = totalDays - 1;
      var step = 0;
      function doStep() {
        if (cancelled) return;
        if (step < stepsBack) {
          var prevBtn = document.querySelector('.icon-prev');
          if (prevBtn) prevBtn.click();
          step++;
          setTimeout(doStep, CFG.ui.loadTimeDelay);
        } else {
          window.OneVR.state.navDate = startDate;
          setTimeout(function() {
            if (cancelled) return;
            if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }
            overlay.style.display = '';

            // Calculate ISO week number
            var sp = startDate.split('-');
            var d = new Date(+sp[0], +sp[1] - 1, +sp[2]);
            d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
            var week1 = new Date(d.getFullYear(), 0, 4);
            var weekNr = 1 + Math.round(((d - week1) / 864e5 - 3 + (week1.getDay() + 6) % 7) / 7);
            var weekStr = sp[0] + '-W' + String(weekNr).padStart(2, '0');

            // Sort by date then start time
            allTurns.sort(function(a, b) {
              if (a.datum !== b.datum) return a.datum.localeCompare(b.datum);
              return a.start.localeCompare(b.start);
            });

            var result = {
              vecka: weekStr,
              skrapadFrån: startDate,
              skrapadTill: utils.addDays(startDate, totalDays - 1),
              antalTurer: allTurns.length,
              turer: allTurns
            };

            // Store in window for reuse
            window.OneVR.weeklyTurns = result;

            console.log('[OneVR] Weekly turns done: ' + allTurns.length + ' unique turns across ' + totalDays + ' days');

            // Build result summary per day
            var dayCounts = {};
            allTurns.forEach(function(t) {
              var key = t.dag + ' ' + t.datum;
              dayCounts[key] = (dayCounts[key] || 0) + 1;
            });
            var summaryRows = '';
            Object.keys(dayCounts).forEach(function(key) {
              summaryRows += '<div class="onevr-turns-summary-row">' +
                '<span class="onevr-turns-summary-day">' + key + '</span>' +
                '<span class="onevr-turns-summary-count">' + dayCounts[key] + ' turer</span>' +
              '</div>';
            });

            var fileName = 'turer-malmo-' + weekStr + '.json';
            var json = JSON.stringify(result, null, 2);
            var blob = new Blob([json], { type: 'application/json' });
            var blobUrl = URL.createObjectURL(blob);

            // Replace loading modal content with result
            loadingModal.innerHTML =
              '<div class="onevr-dagvy-content onevr-export-modal">' +
                '<div class="onevr-dagvy-header" style="background:linear-gradient(135deg,#009041,#00b359);">' +
                  '<span>✅ Veckans turer klar!</span>' +
                  '<button class="onevr-dagvy-close">✕</button>' +
                '</div>' +
                '<div style="padding:20px;">' +
                  '<div class="onevr-turns-result-stats">' +
                    '<div class="onevr-turns-result-big">' + allTurns.length + '</div>' +
                    '<div class="onevr-turns-result-label">unika Malmö-turer</div>' +
                    '<div class="onevr-turns-result-period">' + startDate + ' → ' + utils.addDays(startDate, totalDays - 1) + '</div>' +
                  '</div>' +
                  '<div class="onevr-turns-summary">' + summaryRows + '</div>' +
                  '<a href="' + blobUrl + '" download="' + fileName + '" class="onevr-turns-download-btn" id="onevr-turns-dl">' +
                    '📥 Ladda ner JSON (' + fileName + ')' +
                  '</a>' +
                  '<button class="onevr-turns-back-btn" id="onevr-turns-back">← Tillbaka till Exportera</button>' +
                '</div>' +
              '</div>';

            loadingModal.querySelector('.onevr-dagvy-close').onclick = function() {
              URL.revokeObjectURL(blobUrl);
              loadingModal.remove();
            };
            loadingModal.onclick = function(e) {
              if (e.target === loadingModal) {
                URL.revokeObjectURL(blobUrl);
                loadingModal.remove();
              }
            };
            var dlBtn = loadingModal.querySelector('#onevr-turns-dl');
            dlBtn.onclick = function() {
              setTimeout(function() {
                dlBtn.textContent = '✅ Nedladdad!';
                dlBtn.style.background = 'linear-gradient(135deg, #34c759, #30d158)';
              }, 500);
            };
            loadingModal.querySelector('#onevr-turns-back').onclick = function() {
              URL.revokeObjectURL(blobUrl);
              loadingModal.remove();
              showExportMenu();
            };
          }, 1000);
        }
      }
      doStep();
    }

    processDay(0);
  }

  /**
   * Batch scrape all tracked people across 3 days
   * Smart: navigates 3 days ONCE and scrapes everyone per day
   */
  function scrapeAllTracked(overlay, numDays) {
    var startDate = currentData.isoDate || window.OneVR.state.navDate;
    var totalDays = numDays || window.OneVR.exportDays || 5;
    var trackedNames = scraper.DAGVY_NAMES.slice();

    // Per-person store: { name: { days: [] } }
    var allStore = {};
    trackedNames.forEach(function(n) { allStore[n] = { days: [] }; });

    var cdkC = document.querySelector('.cdk-overlay-container');
    if (cdkC) { cdkC.style.opacity = '0'; cdkC.style.pointerEvents = 'none'; }

    var loadingModal = document.createElement('div');
    loadingModal.className = 'onevr-dagvy-modal';
    loadingModal.innerHTML =
      '<div class="onevr-dagvy-content">' +
        '<div class="onevr-dagvy-header" style="background:linear-gradient(135deg,#5856d6,#7d7aff);">' +
          '<span>🔄 Skrapar alla...</span>' +
          '<button class="onevr-dagvy-close">✕</button>' +
        '</div>' +
        '<div class="onevr-dagvy-loading">' +
          '<div class="onevr-spinner"></div>' +
          '<div class="onevr-multi-progress" id="onevr-batch-progress" style="color:inherit;opacity:1;">Förbereder...</div>' +
          '<div class="onevr-batch-detail" id="onevr-batch-detail" style="color:inherit;opacity:1;"></div>' +
          '<div class="onevr-progress-bar-wrap"><div class="onevr-progress-bar" id="onevr-batch-bar" style="width:0%"></div></div>' +
          '<div class="onevr-progress-pct" id="onevr-batch-pct">0%</div>' +
          '<div class="onevr-elapsed" id="onevr-batch-elapsed" style="opacity:1;">⏱ 0:00</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(loadingModal);

    var cancelled = false;
    // Elapsed timer
    var elapsedSec = 0;
    var elapsedEl = document.getElementById('onevr-batch-elapsed');
    var elapsedTimer = setInterval(function() {
      elapsedSec++;
      var m = Math.floor(elapsedSec / 60);
      var s = elapsedSec % 60;
      if (elapsedEl) elapsedEl.textContent = '⏱ ' + m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);

    var cleanUp = function() {
      cancelled = true;
      clearInterval(elapsedTimer);
      loadingModal.remove();
      if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }
      if (overlay) overlay.style.display = '';
    };
    loadingModal.querySelector('.onevr-dagvy-close').onclick = cleanUp;
    loadingModal.onclick = function(e) { if (e.target === loadingModal) cleanUp(); };

    overlay.style.display = 'none';

    var progressEl = document.getElementById('onevr-batch-progress');
    var detailEl = document.getElementById('onevr-batch-detail');
    var barEl = document.getElementById('onevr-batch-bar');
    var pctEl = document.getElementById('onevr-batch-pct');

    function setProgress(main, detail, pct) {
      if (progressEl) progressEl.textContent = main;
      if (detailEl) detailEl.textContent = detail || '';
      if (typeof pct === 'number') {
        var p = Math.round(pct);
        if (barEl) barEl.style.width = p + '%';
        if (pctEl) pctEl.textContent = p + '%';
      }
    }

    function closeAllPopups(cb) {
      var bds = document.querySelectorAll('.cdk-overlay-backdrop');
      bds.forEach(function(b) { b.click(); });
      var icons = document.querySelectorAll('.close-icon, .icon-close');
      icons.forEach(function(c) { c.click(); });
      setTimeout(cb, 300);
    }

    // ─── Scrape crew for one train ───
    function batchScrapeCrewForTrain(personEl, firstName, trainNr, cb) {
      if (cancelled) { cb(null); return; }

      var tE = findTurnLabel(personEl) || personEl;
      personEl.scrollIntoView({ behavior: 'instant', block: 'center' });

      waitClose(function() {
        if (cancelled) { cb(null); return; }
        setTimeout(function() {
          tE.click();
          waitModal(firstName, function(pane) {
            if (!pane || cancelled) { closeAllPopups(function() { cb(null); }); return; }

            var trainEl = null;
            pane.querySelectorAll('.storybook-label').forEach(function(lbl) {
              if ((lbl.innerText || '').trim() === trainNr) trainEl = lbl;
            });
            if (!trainEl) {
              pane.querySelectorAll('.trip-number .storybook-label').forEach(function(lbl) {
                if ((lbl.innerText || '').trim() === trainNr) trainEl = lbl;
              });
            }
            if (!trainEl) { closeAllPopups(function() { cb(null); }); return; }

            trainEl.click();
            var wt = 0;
            (function chk() {
              if (cancelled) { closeAllPopups(function() { cb(null); }); return; }
              var cp = null;
              document.querySelectorAll('.cdk-overlay-pane').forEach(function(p) {
                if (p.querySelector('.staff__card')) cp = p;
              });
              if (cp) {
                var crewData = scraper.scrapeTrainCrew(cp);
                closeAllPopups(function() { cb(crewData); });
              } else {
                wt += 300;
                if (wt < 8000) setTimeout(chk, 300);
                else closeAllPopups(function() { cb(null); });
              }
            })();
          }, 6000);
        }, 200);
      });
    }

    // ─── Scrape one person on current page ───
    function scrapeOnePerson(personName, dayPeople, dayElements, targetDate, cb) {
      if (cancelled) { cb(); return; }
      var firstName = personName.split(' ')[0];

      // Find person
      var foundP = null;
      var foundEl = null;
      for (var i = 0; i < dayPeople.length; i++) {
        if (dayPeople[i].name === personName) {
          foundP = dayPeople[i];
          foundEl = dayElements[dayPeople[i].elIdx];
          break;
        }
      }

      if (!foundP || !foundEl) {
        allStore[personName].days.push({ date: targetDate, segments: [], turnr: '', start: '-', end: '-', notFound: true, crews: {} });
        cb();
        return;
      }

      setProgress(progressEl.textContent, firstName + ' – dagvy...');

      var tE = findTurnLabel(foundEl) || foundEl;
      foundEl.scrollIntoView({ behavior: 'instant', block: 'center' });

      waitClose(function() {
        if (cancelled) { cb(); return; }
        setTimeout(function() {
          tE.click();
          waitModal(firstName, function(pane) {
            var segments = pane ? scraper.scrapeDagvy(pane) : [];
            closeAllPopups(function() {
              var dayData = { date: targetDate, segments: segments, turnr: foundP.turnr, start: foundP.start, end: foundP.end, notFound: false, crews: {} };
              allStore[personName].days.push(dayData);

              // Scrape crew for each train
              var trainSegs = segments.filter(function(s) { return !!s.trainNr; });
              var ti = 0;

              function nextTrain() {
                if (cancelled || ti >= trainSegs.length) { cb(); return; }
                var tn = trainSegs[ti].trainNr;
                if (dayData.crews[tn]) { ti++; nextTrain(); return; }

                setProgress(progressEl.textContent, firstName + ' – 🚆 ' + tn + ' (' + (ti + 1) + '/' + trainSegs.length + ')');

                batchScrapeCrewForTrain(foundEl, firstName, tn, function(crewData) {
                  if (crewData) {
                    crewData.date = dayData.date; // Override popup date with calculated date
                    dayData.crews[tn] = crewData;
                  }
                  ti++;
                  nextTrain();
                });
              }

              nextTrain();
            });
          }, 6000);
        }, 200);
      });
    }

    // ─── Process one day: scrape all tracked people ───
    function processDay(dayOffset) {
      if (cancelled) return;
      if (dayOffset >= totalDays) { navigateBack(); return; }

      var targetDate = utils.addDays(startDate, dayOffset);
      var dayPct = (dayOffset / totalDays) * 100;
      setProgress('Dag ' + (dayOffset + 1) + ' av ' + totalDays + ' (' + targetDate + ')', 'Läser in personal...', dayPct);

      function startScraping() {
        if (cancelled) return;
        var dayScraped = scraper.scrapePersonnel();
        var dayPeople = dayScraped.people;
        var dayElements = dayScraped.elements;

        // Find which tracked names exist today
        var foundNames = [];
        trackedNames.forEach(function(name) {
          var exists = dayPeople.some(function(p) { return p.name === name; });
          if (exists) foundNames.push(name);
          else allStore[name].days.push({ date: targetDate, segments: [], turnr: '', start: '-', end: '-', notFound: true, crews: {} });
        });

        setProgress('Dag ' + (dayOffset + 1) + ' av ' + totalDays + ' – ' + foundNames.length + '/' + trackedNames.length + ' hittade', '', dayPct);

        // Scrape each found person sequentially
        var pi = 0;
        function nextPerson() {
          if (cancelled || pi >= foundNames.length) {
            // Done with this day → navigate forward
            if (dayOffset + 1 < totalDays) {
              var nextBtn = document.querySelector('.icon-next');
              if (nextBtn) {
                nextBtn.click();
                setTimeout(function() { processDay(dayOffset + 1); }, CFG.ui.dateNavDelay);
              } else {
                // Can't navigate, fill remaining days
                for (var d = dayOffset + 1; d < totalDays; d++) {
                  var dt = utils.addDays(startDate, d);
                  trackedNames.forEach(function(n) {
                    allStore[n].days.push({ date: dt, segments: [], turnr: '', start: '-', end: '-', notFound: true, crews: {} });
                  });
                }
                navigateBack();
              }
            } else {
              navigateBack();
            }
            return;
          }

          var name = foundNames[pi];
          var personPct = dayPct + ((pi / Math.max(foundNames.length, 1)) * (100 / totalDays));
          setProgress('Dag ' + (dayOffset + 1) + ' av ' + totalDays + ' – ' + name.split(' ')[0] + ' (' + (pi + 1) + '/' + foundNames.length + ')', '', personPct);

          scrapeOnePerson(name, dayPeople, dayElements, targetDate, function() {
            pi++;
            nextPerson();
          });
        }

        nextPerson();
      }

      if (dayOffset === 0) {
        // Day 0: use current page
        startScraping();
      } else {
        // Already navigated — just scrape
        startScraping();
      }
    }

    // ─── Navigate back ───
    function navigateBack() {
      if (cancelled) return;
      clearInterval(elapsedTimer);
      setProgress('Navigerar tillbaka...', '', 100);

      var stepsBack = totalDays - 1;
      var step = 0;
      function doStep() {
        if (cancelled) return;
        if (step < stepsBack) {
          var prevBtn = document.querySelector('.icon-prev');
          if (prevBtn) prevBtn.click();
          step++;
          setTimeout(doStep, CFG.ui.loadTimeDelay);
        } else {
          window.OneVR.state.navDate = startDate;
          setTimeout(function() {
            if (cancelled) return;
            if (cdkC) { cdkC.style.opacity = ''; cdkC.style.pointerEvents = ''; }
            overlay.style.display = '';
            loadingModal.remove();

            // Store all in dagvyStore
            var storedCount = 0;
            trackedNames.forEach(function(name) {
              var data = allStore[name];
              var hasData = data.days.some(function(d) { return !d.notFound; });
              if (hasData) {
                window.OneVR.dagvyStore[name] = { scrapedAt: new Date().toISOString(), days: data.days };
                storedCount++;
              }
            });

            console.log('[OneVR] Batch scrape done: ' + storedCount + '/' + trackedNames.length + ' stored');
            showExportMenu();
          }, 1000);
        }
      }
      doStep();
    }

    processDay(0);
  }

  /**
   * Upload ALL stored dagvy data to Firebase
   */
  function uploadAllToFirebase(cb) {
    var names = Object.keys(window.OneVR.dagvyStore);
    if (names.length === 0) { cb(0, 0); return; }

    var ok = 0;
    var fail = 0;
    var idx = 0;

    function next() {
      if (idx >= names.length) { cb(ok, fail); return; }
      var name = names[idx];
      uploadToFirebase(name, window.OneVR.dagvyStore[name], function(success) {
        if (success) ok++;
        else fail++;
        idx++;
        next();
      });
    }

    next();
  }

  function showExportMenu() {
    console.log('[OneVR] Export unlocked');

    // Find tracked colleagues in current data
    var tracked = [];
    if (currentData && currentData.people) {
      currentData.people.forEach(function(p, idx) {
        if (scraper.isDagvyTracked(p.name)) {
          tracked.push({ person: p, idx: idx });
        }
      });
    }

    // Count stored data
    var storedNames = Object.keys(window.OneVR.dagvyStore || {});
    var storedCount = storedNames.length;

    // Build colleague list
    var listHTML = '';
    if (tracked.length === 0) {
      listHTML = '<div class="onevr-export-empty">Inga bevakade kollegor hittades i listan</div>';
    } else {
      tracked.forEach(function(t) {
        var p = t.person;
        var timeStr = p.start !== '-' ? p.start + ' – ' + p.end : '—';
        var trainsStr = p.trains && p.trains.length ? p.trains.join(', ') : '';
        var hasStore = window.OneVR.dagvyStore && window.OneVR.dagvyStore[p.name];
        var statusBadge = hasStore
          ? '<span class="onevr-export-status onevr-export-status-ok">✅</span>'
          : '<span class="onevr-export-status onevr-export-status-pending">⏳</span>';
        listHTML += '<div class="onevr-export-person" data-pidx="' + t.idx + '">' +
          '<div class="onevr-export-person-top">' +
            statusBadge +
            '<span class="onevr-badge onevr-badge-' + p.badgeColor + '">' + p.badge + '</span>' +
            '<span class="onevr-export-name">' + p.name + '</span>' +
            '<span class="onevr-export-turnr">' + p.turnr + '</span>' +
          '</div>' +
          '<div class="onevr-export-person-bottom">' +
            '<span class="onevr-export-time">🕐 ' + timeStr + '</span>' +
            (trainsStr ? '<span class="onevr-export-trains">🚆 ' + trainsStr + '</span>' : '') +
            (p.phone ? '<span class="onevr-export-phone">📞 ' + p.phone + '</span>' : '') +
          '</div>' +
          '<div class="onevr-export-person-action">📋 Visa dagvy (' + selectedDays + ' dag' + (selectedDays > 1 ? 'ar' : '') + ') ›</div>' +
        '</div>';
      });
    }

    // All tracked names for reference
    var allNames = scraper.DAGVY_NAMES.join(', ');

    // Day count (default 3, stored in state)
    var selectedDays = window.OneVR.exportDays || 5;

    // Build day selector (1-7)
    var dayBtns = '';
    for (var d = 1; d <= 7; d++) {
      dayBtns += '<button class="onevr-day-sel-btn' + (selectedDays === d ? ' onevr-day-sel-active' : '') + '" data-days="' + d + '">' + d + '</button>';
    }
    var daySelHTML =
      '<div class="onevr-day-selector">' +
        '<span class="onevr-day-selector-label">Dagar:</span>' +
        '<div class="onevr-day-selector-btns">' + dayBtns + '</div>' +
      '</div>';

    // Build compact batch actions
    var storedLabel = storedCount > 0 ? ' (' + storedCount + ')' : '';
    var disabledCls = storedCount === 0 ? ' onevr-batch-disabled' : '';
    var disabledAttr = storedCount === 0 ? ' disabled' : '';

    var batchHTML =
      '<div class="onevr-batch-section onevr-batch-compact">' +
        daySelHTML +
        '<div class="onevr-btn-row">' +
          '<button class="onevr-mini-btn onevr-batch-scrape" id="onevr-batch-scrape">' +
            '<span class="onevr-mini-icon">🔄</span>' +
            '<span class="onevr-mini-label">Skrapa (' + selectedDays + 'd)</span>' +
          '</button>' +
          '<button class="onevr-mini-btn onevr-batch-upload' + disabledCls + '" id="onevr-batch-upload"' + disabledAttr + '>' +
            '<span class="onevr-mini-icon">☁️</span>' +
            '<span class="onevr-mini-label">Firebase' + storedLabel + '</span>' +
          '</button>' +
          '<button class="onevr-mini-btn onevr-batch-json' + disabledCls + '" id="onevr-batch-json"' + disabledAttr + '>' +
            '<span class="onevr-mini-icon">📥</span>' +
            '<span class="onevr-mini-label">JSON' + storedLabel + '</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="onevr-batch-section onevr-batch-compact">' +
        '<div class="onevr-btn-row">' +
          '<button class="onevr-mini-btn onevr-mini-wide onevr-batch-turns" id="onevr-batch-turns">' +
            '<span class="onevr-mini-icon">📋</span>' +
            '<span class="onevr-mini-label">Malmö-turer (7 dagar)</span>' +
          '</button>' +
        '</div>' +
        '<div class="onevr-btn-row">' +
          '<button class="onevr-mini-btn onevr-batch-doc-ta" id="onevr-doc-ta">' +
            '<span class="onevr-mini-icon">📄</span>' +
            '<span class="onevr-mini-label">Hämta TA</span>' +
          '</button>' +
          '<button class="onevr-mini-btn onevr-batch-doc-drift" id="onevr-doc-drift">' +
            '<span class="onevr-mini-icon">📄</span>' +
            '<span class="onevr-mini-label">Driftmeddelande</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    var modal = document.createElement('div');
    modal.className = 'onevr-dagvy-modal';
    modal.innerHTML =
      '<div class="onevr-dagvy-content onevr-export-modal">' +
        '<div class="onevr-dagvy-header" style="background:linear-gradient(135deg,#5856d6,#7d7aff);">' +
          '<span>🔓 Exportera</span>' +
          '<button class="onevr-dagvy-close">✕</button>' +
        '</div>' +
        batchHTML +
        '<div class="onevr-export-list-wrap">' +
          '<div class="onevr-export-section">' +
            '<div class="onevr-export-section-title">📋 Bevakade kollegor (' + tracked.length + '/' + scraper.DAGVY_NAMES.length + ' online)</div>' +
            '<div class="onevr-export-section-sub">Tryck för att hämta dagvy per person</div>' +
            listHTML +
          '</div>' +
        '</div>' +
        '<div class="onevr-export-names">' +
          '<span class="onevr-export-names-label">Bevakar:</span> ' + allNames +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.onevr-dagvy-close').onclick = function() { modal.remove(); };
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    // Day selector buttons
    modal.querySelectorAll('.onevr-day-sel-btn').forEach(function(btn) {
      btn.onclick = function() {
        selectedDays = +btn.getAttribute('data-days');
        window.OneVR.exportDays = selectedDays;
        modal.querySelectorAll('.onevr-day-sel-btn').forEach(function(b) { b.classList.remove('onevr-day-sel-active'); });
        btn.classList.add('onevr-day-sel-active');
        // Update scrape button text
        var scrapeLabel = modal.querySelector('#onevr-batch-scrape .onevr-mini-label');
        if (scrapeLabel) scrapeLabel.textContent = 'Skrapa (' + selectedDays + 'd)';
      };
    });

    // Batch scrape button
    var scrapeBtn = modal.querySelector('#onevr-batch-scrape');
    scrapeBtn.onclick = function() {
      modal.remove();
      var overlay = document.querySelector('.onevr-overlay');
      scrapeAllTracked(overlay, selectedDays);
    };

    // Batch upload button
    var uploadBtn = modal.querySelector('#onevr-batch-upload');
    uploadBtn.onclick = function() {
      if (storedCount === 0) return;
      uploadBtn.disabled = true;
      var uploadLabel = uploadBtn.querySelector('.onevr-mini-label');
      uploadLabel.textContent = '0/' + storedCount;
      uploadBtn.classList.add('onevr-batch-sending');

      var names = Object.keys(window.OneVR.dagvyStore);
      var ok = 0;
      var fail = 0;
      var idx = 0;

      function nextUpload() {
        if (idx >= names.length) {
          uploadBtn.classList.remove('onevr-batch-sending');
          if (fail === 0) {
            uploadBtn.classList.add('onevr-batch-done');
            uploadLabel.textContent = '✅ ' + ok;
          } else {
            uploadBtn.classList.add('onevr-batch-error');
            uploadLabel.textContent = '⚠️ ' + ok + '/' + fail;
          }
          return;
        }
        var name = names[idx];
        uploadToFirebase(name, window.OneVR.dagvyStore[name], function(success) {
          if (success) ok++;
          else fail++;
          idx++;
          uploadLabel.textContent = idx + '/' + names.length;
          nextUpload();
        });
      }

      nextUpload();
    };

    // Batch JSON download button
    var jsonBtn = modal.querySelector('#onevr-batch-json');
    jsonBtn.onclick = function() {
      if (storedCount === 0) return;
      var allData = {};
      Object.keys(window.OneVR.dagvyStore).forEach(function(name) {
        allData[name] = window.OneVR.dagvyStore[name];
      });
      var json = JSON.stringify(allData, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'dagvy-alla-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      jsonBtn.classList.add('onevr-batch-done');
      jsonBtn.querySelector('.onevr-mini-label').textContent = '✅ Klar';
    };

    // Weekly turns button (fixed 7 days)
    var turnsBtn = modal.querySelector('#onevr-batch-turns');
    turnsBtn.onclick = function() {
      modal.remove();
      var overlay = document.querySelector('.onevr-overlay');
      scrapeWeeklyTurns(overlay, 7);
    };

    // Document download buttons
    var taBtn = modal.querySelector('#onevr-doc-ta');
    taBtn.onclick = function() {
      modal.remove();
      var overlay = document.querySelector('.onevr-overlay');
      fetchDocumentCategory(overlay, 'TA - Danmark');
    };

    var driftBtn = modal.querySelector('#onevr-doc-drift');
    driftBtn.onclick = function() {
      modal.remove();
      var overlay = document.querySelector('.onevr-overlay');
      fetchDocumentCategory(overlay, 'Driftmeddelande');
    };

    // Click on person to open multi-day dagvy
    var personEls = modal.querySelectorAll('.onevr-export-person');
    personEls.forEach(function(el) {
      el.onclick = function() {
        var pIdx = +el.getAttribute('data-pidx');
        var person = currentData.people[pIdx];
        if (person) {
          modal.remove();
          var overlay = document.querySelector('.onevr-overlay');
          openMultiDagvy(person, overlay);
        }
      };
    });
  }

  /**
   * Check if turnr is a reserve turn (ends with 81, 82, 91, 92, 93)
   */
  function isReserveTurn(turnr) {
    if (!turnr) return false;
    var num = turnr.replace(/[A-Z]+$/i, ''); // Remove letter suffix
    return /(?:81|82|91|92|93)$/.test(num);
  }

  /**
   * Show vacancies modal for LKF Malmö
   */
  function showVacancies() {
    if (!currentData) return;

    var vacancies = window.OneVR.vacancies;
    if (!vacancies) {
      console.error('[OneVR] Vacancies module not loaded');
      return;
    }

    var isoDate = currentData.isoDate || window.OneVR.state.navDate;
    var result = vacancies.findVacancies(currentData.people, isoDate, 'LKF', 'Malmö');

    // Get weekday
    var weekdays = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
    var dateObj = new Date(isoDate);
    var weekday = weekdays[dateObj.getDay()];

    // Split vacancies into reserve turns and other turns
    var reserveTurns = [];
    var otherTurns = [];
    result.vacancies.forEach(function(t) {
      if (isReserveTurn(t)) {
        reserveTurns.push(t);
      } else {
        otherTurns.push(t);
      }
    });

    // Build vacancy sections HTML
    var vacancyHTML = '';
    if (result.vacancies.length === 0) {
      vacancyHTML = '<div class="onevr-vacancy-empty">✓ Inga vakanser!</div>';
    } else {
      // Reserve turns section (red)
      if (reserveTurns.length > 0) {
        vacancyHTML += '<div class="onevr-vacancy-section">' +
          '<div class="onevr-vacancy-section-title onevr-vacancy-section-reserve">⚠️ Reservturer (' + reserveTurns.length + ')</div>' +
          '<div class="onevr-vacancy-grid">';
        reserveTurns.forEach(function(t) {
          vacancyHTML += '<div class="onevr-vacancy-item onevr-vacancy-reserve">' + t + '</div>';
        });
        vacancyHTML += '</div></div>';
      }

      // Other turns section (gray)
      if (otherTurns.length > 0) {
        vacancyHTML += '<div class="onevr-vacancy-section">' +
          '<div class="onevr-vacancy-section-title onevr-vacancy-section-other">📋 Övriga turer (' + otherTurns.length + ')</div>' +
          '<div class="onevr-vacancy-grid">';
        otherTurns.forEach(function(t) {
          vacancyHTML += '<div class="onevr-vacancy-item onevr-vacancy-other">' + t + '</div>';
        });
        vacancyHTML += '</div></div>';
      }
    }

    // Build modal
    var modal = document.createElement('div');
    modal.className = 'onevr-vacancy-modal';
    modal.innerHTML =
      '<div class="onevr-vacancy-content">' +
        '<div class="onevr-vacancy-header">' +
          '<span>Vakanser - LKF Malmö</span>' +
          '<button class="onevr-vacancy-close">✕</button>' +
        '</div>' +
        '<div class="onevr-vacancy-date">' + weekday + ' <strong>' + isoDate + '</strong></div>' +
        '<div class="onevr-vacancy-list">' + vacancyHTML + '</div>' +
      '</div>';

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.onevr-vacancy-close').onclick = function() {
      modal.remove();
    };
    modal.onclick = function(e) {
      if (e.target === modal) modal.remove();
    };
  }

  /**
   * Reset filter state
   */
  function resetFilters() {
    filterState = {
      activeRole: 'all',
      activeLoc: 'all',
      searchQ: '',
      filters: {
        res: false,
        changed: false,
        se: false,
        dk: false,
        utb: false,
        insutb: false,
        adm: false,
        jobbar: false
      }
    };
  }

  // Export to global namespace
  window.OneVR.events = {
    bindEvents: bindEvents,
    filterList: filterList,
    changeDate: changeDate,
    goToDate: goToDate,
    resetFilters: resetFilters
  };

  console.log('[OneVR] Events loaded');

  // ============================================================
  // MAIN INIT FUNCTION
  // ============================================================
  window.OneVR.init = function() {
    var utils = window.OneVR.utils;
    var scraper = window.OneVR.scraper;
    var ui = window.OneVR.ui;
    var events = window.OneVR.events;

    // Reset filters
    events.resetFilters();

    // Check if cache needs building
    if (!window.OneVR.cache.built) {
      scraper.buildCache(function() {
        window.OneVR.init();
      });
      return;
    }

    // Update nav date
    var currentDateText = utils.getCurrentDateText();
    if (!window.OneVR.state.navDate) {
      window.OneVR.state.navDate = utils.parseSwedishDate(currentDateText);
    }

    // Scrape data
    var scraped = scraper.scrapePersonnel();
    var stats = scraper.calculateStats(scraped.people);

    var data = {
      people: scraped.people,
      elements: scraped.elements,
      dateText: scraped.dateText,
      stats: stats,
      isoDate: window.OneVR.state.navDate
    };

    // Show UI
    ui.showOverlay(data);
    events.bindEvents(data);

    console.log('[OneVR] Initialized with', data.people.length, 'people');
  };

  console.log('[OneVR] Ready!');
})();
