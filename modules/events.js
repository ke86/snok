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
          showDagvyModal(person, segments);
        }, 6000);
      }, 200);
    });
  }

  /**
   * Show dagvy modal with scraped data
   */
  function showDagvyModal(person, segments) {
    var isoDate = currentData.isoDate || window.OneVR.state.navDate;
    var weekdays = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
    var dateObj = new Date(isoDate);
    var weekday = weekdays[dateObj.getDay()];

    // Build segments HTML
    var segHTML = '';
    if (!segments || segments.length === 0) {
      segHTML = '<div class="onevr-dagvy-empty">Kunde inte hämta dagvy</div>';
    } else {
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
          // Train segment
          var vehicleStr = seg.vehicles.length ? seg.vehicles.join(', ') : '';
          segHTML += '<div class="onevr-dagvy-seg onevr-dagvy-train">' +
            '<div class="onevr-dagvy-seg-left">' +
              '<span class="onevr-dagvy-seg-time">' + timeStr + '</span>' +
              '<span class="onevr-dagvy-seg-route">' + routeStr + '</span>' +
            '</div>' +
            '<div class="onevr-dagvy-seg-right">' +
              '<span class="onevr-dagvy-train-nr">🚆 ' + seg.trainNr + '</span>' +
              '<span class="onevr-dagvy-train-type">' + seg.trainType + '</span>' +
              (vehicleStr ? '<span class="onevr-dagvy-vehicle">' + vehicleStr + '</span>' : '') +
            '</div>' +
          '</div>';
        } else {
          // Activity segment
          var actName = seg.activity || 'Aktivitet';
          var icon = '📍';
          if (actName.match(/gångtid/i)) icon = '🚶';
          else if (actName.match(/orderläsning/i)) icon = '📖';
          else if (actName.match(/plattform/i)) icon = '🏗️';
          else if (actName.match(/tågpassning/i)) icon = '👀';
          else if (actName.match(/rast/i)) icon = '☕';
          else if (actName.match(/utcheckning/i)) icon = '🏁';
          else if (actName.match(/incheckning/i)) icon = '✅';

          segHTML += '<div class="onevr-dagvy-seg onevr-dagvy-activity">' +
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
    }

    // Count trains
    var trainCount = segments.filter(function(s) { return !!s.trainNr; }).length;
    var actCount = segments.filter(function(s) { return !s.trainNr; }).length;

    var modal = document.createElement('div');
    modal.className = 'onevr-dagvy-modal';
    modal.innerHTML =
      '<div class="onevr-dagvy-content">' +
        '<div class="onevr-dagvy-header">' +
          '<span>📋 ' + person.name + '</span>' +
          '<button class="onevr-dagvy-close">✕</button>' +
        '</div>' +
        '<div class="onevr-dagvy-info">' +
          '<div class="onevr-dagvy-info-row">' +
            '<span class="onevr-dagvy-badge onevr-badge-' + person.badgeColor + '">' + person.badge + '</span>' +
            '<span class="onevr-dagvy-turnr">' + person.turnr + '</span>' +
            '<span class="onevr-dagvy-date">' + weekday + ' ' + isoDate + '</span>' +
          '</div>' +
          '<div class="onevr-dagvy-info-row">' +
            '<span class="onevr-dagvy-time">🕐 ' + (person.start !== '-' ? person.start + ' – ' + person.end : '—') + '</span>' +
            '<span class="onevr-dagvy-stats">🚆 ' + trainCount + ' tåg · 📍 ' + actCount + ' aktiviteter</span>' +
          '</div>' +
          (person.phone ? '<div class="onevr-dagvy-info-row"><span class="onevr-dagvy-contact">📞 ' + person.phone + '</span></div>' : '') +
          (person.trains && person.trains.length ? '<div class="onevr-dagvy-info-row"><span class="onevr-dagvy-trains">🚆 Tåg: ' + person.trains.join(', ') + '</span></div>' : '') +
        '</div>' +
        '<div class="onevr-dagvy-list">' + segHTML + '</div>' +
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
          '<div class="onevr-export-person-action">📋 Visa dagvy ›</div>' +
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

    // Click on person to open dagvy
    var personEls = modal.querySelectorAll('.onevr-export-person');
    personEls.forEach(function(el) {
      el.onclick = function() {
        var pIdx = +el.getAttribute('data-pidx');
        var person = currentData.people[pIdx];
        if (person) {
          modal.remove();
          var overlay = document.querySelector('.onevr-overlay');
          openDagvy(person, overlay);
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
