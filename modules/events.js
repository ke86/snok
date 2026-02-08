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
   * Upload dagvy data to Firestore
   * Collection: dagvy, Document: personName
   */
  function uploadToFirebase(personName, storeData, cb) {
    var projectId = CFG.firebase && CFG.firebase.projectId;
    if (!projectId) { cb(false, 'Firebase ej konfigurerat'); return; }

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
              date: c.date || day.date,
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
      headers: { 'Content-Type': 'application/json' },
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

    // Export button
    var exportBtn = document.getElementById('onevr-export-btn');
    if (exportBtn) {
      exportBtn.onclick = function() {
        showPinDialog();
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
    var totalDays = 3;
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
          if (crewData) dayData.crews[trainNr] = crewData;
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

    // Build colleague list
    var listHTML = '';
    if (tracked.length === 0) {
      listHTML = '<div class="onevr-export-empty">Inga bevakade kollegor hittades i listan</div>';
    } else {
      tracked.forEach(function(t) {
        var p = t.person;
        var timeStr = p.start !== '-' ? p.start + ' – ' + p.end : '—';
        var trainsStr = p.trains && p.trains.length ? p.trains.join(', ') : '';
        listHTML += '<div class="onevr-export-person" data-pidx="' + t.idx + '">' +
          '<div class="onevr-export-person-top">' +
            '<span class="onevr-badge onevr-badge-' + p.badgeColor + '">' + p.badge + '</span>' +
            '<span class="onevr-export-name">' + p.name + '</span>' +
            '<span class="onevr-export-turnr">' + p.turnr + '</span>' +
          '</div>' +
          '<div class="onevr-export-person-bottom">' +
            '<span class="onevr-export-time">🕐 ' + timeStr + '</span>' +
            (trainsStr ? '<span class="onevr-export-trains">🚆 ' + trainsStr + '</span>' : '') +
            (p.phone ? '<span class="onevr-export-phone">📞 ' + p.phone + '</span>' : '') +
          '</div>' +
          '<div class="onevr-export-person-action">📋 Visa dagvy (3 dagar) ›</div>' +
        '</div>';
      });
    }

    // All tracked names for reference
    var allNames = scraper.DAGVY_NAMES.join(', ');

    var modal = document.createElement('div');
    modal.className = 'onevr-dagvy-modal';
    modal.innerHTML =
      '<div class="onevr-dagvy-content" style="max-width:440px;">' +
        '<div class="onevr-dagvy-header" style="background:linear-gradient(135deg,#5856d6,#7d7aff);">' +
          '<span>🔓 Exportera</span>' +
          '<button class="onevr-dagvy-close">✕</button>' +
        '</div>' +
        '<div class="onevr-export-section">' +
          '<div class="onevr-export-section-title">📋 Bevakade kollegor</div>' +
          '<div class="onevr-export-section-sub">Tryck för att hämta dagvy</div>' +
          listHTML +
        '</div>' +
        '<div class="onevr-export-names">' +
          '<span class="onevr-export-names-label">Bevakar:</span> ' + allNames +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.onevr-dagvy-close').onclick = function() { modal.remove(); };
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

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
