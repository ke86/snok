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
      adm: false
    }
  };

  // Current data
  var currentData = null;

  /**
   * Check if a person is currently working based on their shift times
   */
  function isWorkingNow(person) {
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
   * Filter the person list based on current filter state
   */
  function filterList() {
    if (!currentData) return;

    document.querySelectorAll('.onevr-person').forEach(function(el) {
      var show = true;
      var p = currentData.people[+el.getAttribute('data-idx')];
      var f = filterState.filters;

      if (f.res && !p.isRes && p.role !== 'Reserv') show = false;
      if (f.changed && !p.isChanged) show = false;
      if (f.se && p.country !== 'SE') show = false;
      if (f.dk && p.country !== 'DK') show = false;
      if (f.utb && !(p.turnr && /UTB/i.test(p.turnr) && !/INSUTB/i.test(p.turnr))) show = false;
      if (f.insutb && !(p.turnr && /INSUTB/i.test(p.turnr))) show = false;
      if (f.adm && p.badge !== 'ADM') show = false;
      if (filterState.activeRole !== 'all' && p.badge !== filterState.activeRole) show = false;
      if (filterState.activeLoc !== 'all' && p.locName !== filterState.activeLoc) show = false;
      if (filterState.searchQ && !el.textContent.toLowerCase().includes(filterState.searchQ)) show = false;

      el.style.display = show ? 'flex' : 'none';
    });

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
      menu.style.cssText = 'background:#fff;border-radius:14px;padding:16px;margin-top:8px;box-shadow:0 4px 24px rgba(0,0,0,.12)';
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
      roleChecks += '<label style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(118,118,128,.08);border-radius:10px;cursor:pointer;color:#000;font-size:15px">' +
        '<input type="checkbox" data-type="role" value="' + role + '" style="width:20px;height:20px;accent-color:#007aff"> ' +
        role + ' <span style="color:#666">(' + roleCounts[role] + ')</span></label>';
    });

    return '<div style="font-weight:600;margin-bottom:12px;color:#000;font-size:15px">Välj roller att ladda:</div>' +
      '<div id="onevr-role-checks" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">' + roleChecks + '</div>' +
      '<div style="font-weight:600;margin-bottom:8px;margin-top:4px;color:#000;font-size:15px">Specialfilter:</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">' +
        '<label style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(142,142,147,.15);border-radius:10px;cursor:pointer;color:#000;font-size:15px">' +
          '<input type="checkbox" data-type="special" value="res" style="width:20px;height:20px;accent-color:#8e8e93"> 🔄 Reserver <span style="color:#666">(' + resNoTime + ')</span></label>' +
        '<label style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(88,86,214,.15);border-radius:10px;cursor:pointer;color:#000;font-size:15px">' +
          '<input type="checkbox" data-type="special" value="tp" style="width:20px;height:20px;accent-color:#5856d6"> 📝 Ändrade turer <span style="color:#666">(' + tpNoTime + ')</span></label>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button id="onevr-load-start" style="flex:1;padding:14px;background:linear-gradient(135deg,#007aff,#0a84ff);color:#fff;border:none;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer">Starta</button>' +
        '<button id="onevr-load-cancel" style="padding:14px 20px;background:rgba(118,118,128,.12);color:#666;border:none;border-radius:12px;font-size:15px;cursor:pointer">Avbryt</button>' +
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

    searchEl.oninput = function() {
      filterState.searchQ = this.value.toLowerCase();
      clearEl.classList.toggle('show', this.value.length > 0);
      filterList();
    };

    clearEl.onclick = function() {
      searchEl.value = '';
      filterState.searchQ = '';
      clearEl.classList.remove('show');
      filterList();
      searchEl.focus();
    };

    // Quick filters
    var quickFilters = [
      { id: 'onevr-se-btn', key: 'se', icon: '🇸🇪', label: 'Sverige', count: data.stats.se, exclusive: 'dk' },
      { id: 'onevr-dk-btn', key: 'dk', icon: '🇩🇰', label: 'Danmark', count: data.stats.dk, exclusive: 'se' },
      { id: 'onevr-res-btn', key: 'res', icon: '🔄', label: 'Reserver', count: data.stats.res },
      { id: 'onevr-utb-btn', key: 'utb', icon: '📚', label: 'Utb', count: data.stats.utb },
      { id: 'onevr-insutb-btn', key: 'insutb', icon: '👨‍🏫', label: 'INSUTB', count: data.stats.insutb },
      { id: 'onevr-adm-btn', key: 'adm', icon: '🏢', label: 'ADM', count: data.stats.adm }
    ];

    quickFilters.forEach(function(qf) {
      var el = document.getElementById(qf.id);
      if (el) {
        el.onclick = function() {
          filterState.filters[qf.key] = !filterState.filters[qf.key];

          if (qf.exclusive && filterState.filters[qf.key]) {
            filterState.filters[qf.exclusive] = false;
            var exEl = document.getElementById('onevr-' + qf.exclusive + '-btn');
            if (exEl) {
              exEl.classList.remove('active');
              var exQf = quickFilters.find(function(q) { return q.key === qf.exclusive; });
              if (exQf) exEl.textContent = exQf.icon + ' ' + exQf.label + ' (' + exQf.count + ')';
            }
          }

          this.classList.toggle('active', filterState.filters[qf.key]);
          this.textContent = (filterState.filters[qf.key] ? '✓' : qf.icon) + ' ' + qf.label + ' (' + qf.count + ')';
          filterList();
        };
      }
    });

    // Changed filter
    var changedBtn = document.getElementById('onevr-changed-btn');
    if (changedBtn) {
      changedBtn.onclick = function() {
        filterState.filters.changed = !filterState.filters.changed;
        this.classList.toggle('active', filterState.filters.changed);
        this.textContent = filterState.filters.changed
          ? '✓ Visar ändrade (' + data.stats.changed + ')'
          : '📝 Ändrade turer (' + data.stats.changed + ')';
        filterList();
      };
    }

    // Role filters
    document.getElementById('onevr-role-filters').onclick = function(e) {
      if (e.target.classList.contains('onevr-filter')) {
        this.querySelectorAll('.onevr-filter').forEach(function(f) { f.classList.remove('active'); });
        e.target.classList.add('active');
        filterState.activeRole = e.target.getAttribute('data-val');
        filterList();
      }
    };

    // Location filters
    document.getElementById('onevr-loc-filters').onclick = function(e) {
      if (e.target.classList.contains('onevr-filter')) {
        this.querySelectorAll('.onevr-filter').forEach(function(f) { f.classList.remove('active'); });
        e.target.classList.add('active');
        filterState.activeLoc = e.target.getAttribute('data-val');
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

    // Initial status bar update
    updateStatusBar();
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
        adm: false
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
