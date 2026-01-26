/**
 * OneVR - Personal Overview Tool
 * Version 1.0.0
 *
 * Laddar konfiguration från config.json och bygger UI overlay
 * för att visa och filtrera personal.
 *
 * Användning: Lägg till som bookmarklet eller inkludera via script-tag
 */

(function OneVR() {
  'use strict';

  // ============================================================
  // CONFIGURATION - Ändra denna URL till din GitHub Pages URL
  // ============================================================
  var CONFIG_URL = 'https://YOUR_USERNAME.github.io/YOUR_REPO/config.json';

  // Om config redan är laddad, använd den direkt
  if (window.__onevrConfig) {
    initWithConfig(window.__onevrConfig);
    return;
  }

  // Visa laddningsindikator
  var loader = document.createElement('div');
  loader.className = 'onevr-loading-overlay';
  loader.innerHTML = '<div class="onevr-spinner"></div><div class="onevr-loading-text">Laddar konfiguration...</div>';
  injectStyles();
  document.body.appendChild(loader);

  // Ladda konfiguration
  fetch(CONFIG_URL)
    .then(function(response) {
      if (!response.ok) throw new Error('Kunde inte ladda config');
      return response.json();
    })
    .then(function(config) {
      window.__onevrConfig = config;
      loader.remove();
      initWithConfig(config);
    })
    .catch(function(err) {
      loader.querySelector('.onevr-loading-text').textContent = 'Fel: ' + err.message;
      loader.querySelector('.onevr-loading-text').style.color = '#ff3b30';
      console.error('OneVR config error:', err);
    });

  // ============================================================
  // STYLES
  // ============================================================
  function injectStyles() {
    if (document.getElementById('onevr-styles')) return;

    var s = document.createElement('style');
    s.id = 'onevr-styles';
    s.textContent = `
      *{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}
      .onevr-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);-webkit-backdrop-filter:blur(25px);backdrop-filter:blur(25px);z-index:99999;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
      .onevr-modal{max-width:420px;margin:0 auto;min-height:100dvh;background:linear-gradient(180deg,#f2f2f7,#e5e5ea)}
      .onevr-header{padding:12px 16px;padding-top:max(12px,env(safe-area-inset-top));background:rgba(255,255,255,.72);-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);display:flex;flex-direction:column;gap:10px;position:sticky;top:0;z-index:10;border-bottom:.5px solid rgba(0,0,0,.1)}
      .onevr-search{width:100%;padding:10px 14px;background:rgba(118,118,128,.12);border:none;border-radius:12px;color:#000;font-size:17px;text-align:center;transition:all .2s}
      .onevr-search:focus{outline:none;background:rgba(118,118,128,.18)}
      .onevr-search::placeholder{color:rgba(60,60,67,.6)}
      .onevr-search-wrap{position:relative}
      .onevr-search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:20px;height:20px;border:none;background:rgba(60,60,67,.3);color:#fff;border-radius:50%;font-size:12px;cursor:pointer;display:none;align-items:center;justify-content:center}
      .onevr-search-clear.show{display:flex}
      .onevr-date-nav{display:flex;align-items:center;gap:8px}
      .onevr-date-btn{width:44px;height:44px;border:none;background:rgba(0,122,255,.1);color:#007aff;border-radius:12px;cursor:pointer;font-size:20px;font-weight:500;display:flex;align-items:center;justify-content:center;transition:all .15s}
      .onevr-date-btn:active{transform:scale(.92);background:rgba(0,122,255,.2)}
      .onevr-date-picker{flex:1;background:rgba(0,122,255,.1);border:none;color:#007aff;font-weight:600;font-size:17px;padding:12px 16px;border-radius:12px;cursor:pointer;font-family:inherit;text-align:center}
      .onevr-date-picker:active{background:rgba(0,122,255,.18)}
      .onevr-date-picker::-webkit-calendar-picker-indicator{filter:invert(37%) sepia(74%) saturate(1507%) hue-rotate(200deg);cursor:pointer;padding:4px}
      .onevr-content{padding:16px;padding-bottom:max(24px,env(safe-area-inset-bottom))}
      .onevr-section{background:#fff;border-radius:14px;margin-bottom:12px;overflow:hidden;box-shadow:0 .5px 0 rgba(0,0,0,.04)}
      .onevr-section-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;user-select:none;-webkit-user-select:none}
      .onevr-section-header:active{background:rgba(0,0,0,.03)}
      .onevr-section-title{font-size:13px;font-weight:600;color:rgba(60,60,67,.6);text-transform:uppercase;letter-spacing:.5px}
      .onevr-section-arrow{color:#c7c7cc;font-size:13px;transition:transform .25s}
      .onevr-section.open .onevr-section-arrow{transform:rotate(180deg)}
      .onevr-section-content{display:none;padding:0 16px 14px}
      .onevr-section.open .onevr-section-content{display:block}
      .onevr-settings-grid{display:flex;flex-direction:column;gap:8px}
      .onevr-btn{width:100%;padding:12px 16px;background:rgba(118,118,128,.08);border:none;border-radius:12px;color:rgba(60,60,67,.9);cursor:pointer;font-size:15px;font-weight:500;text-align:left;transition:all .2s;display:flex;align-items:center;gap:10px}
      .onevr-btn:active{transform:scale(.98);background:rgba(118,118,128,.15)}
      .onevr-btn.active{background:linear-gradient(135deg,#34c759,#30d158);color:#fff;box-shadow:0 2px 8px rgba(52,199,89,.3)}
      .onevr-btn-close{background:rgba(255,59,48,.1);color:#ff3b30}
      .onevr-btn-close:active{background:rgba(255,59,48,.2)}
      .onevr-filters{display:flex;gap:6px;flex-wrap:wrap}
      .onevr-filter{padding:8px 14px;background:rgba(118,118,128,.08);border:none;border-radius:20px;color:rgba(60,60,67,.9);cursor:pointer;font-size:14px;font-weight:500;transition:all .2s}
      .onevr-filter:active{transform:scale(.95)}
      .onevr-filter.active{background:linear-gradient(135deg,#007aff,#0a84ff);color:#fff;box-shadow:0 2px 8px rgba(0,122,255,.3)}
      .onevr-filter-label{font-size:12px;color:rgba(60,60,67,.6);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;margin-top:14px}
      .onevr-filter-label:first-child{margin-top:0}
      .onevr-card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 .5px 0 rgba(0,0,0,.04)}
      .onevr-person{display:flex;align-items:center;padding:14px 16px;border-bottom:.5px solid rgba(60,60,67,.1)}
      .onevr-person:active{background:rgba(0,0,0,.03)}
      .onevr-person:last-child{border-bottom:none}
      .onevr-badge{font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;text-align:center;min-width:36px;margin-right:12px;letter-spacing:.3px;flex-shrink:0}
      .onevr-badge-lkf{background:linear-gradient(135deg,#007aff,#0a84ff);color:#fff}
      .onevr-badge-tv{background:linear-gradient(135deg,#af52de,#bf5af2);color:#fff}
      .onevr-badge-til,.onevr-badge-tif{background:linear-gradient(135deg,#ff9500,#ff9f0a);color:#fff}
      .onevr-badge-res{background:linear-gradient(135deg,#8e8e93,#98989f);color:#fff}
      .onevr-badge-adm{background:linear-gradient(135deg,#ff2d55,#ff375f);color:#fff}
      .onevr-badge-ovr{background:linear-gradient(135deg,#636366,#6e6e73);color:#fff}
      .onevr-main{flex:1;min-width:0}
      .onevr-name-row{display:flex;align-items:center;gap:8px}
      .onevr-name{color:#000;font-weight:500;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .onevr-loc-badge{font-size:11px;font-weight:600;padding:3px 8px;border-radius:10px;background:rgba(0,122,255,.1);color:#007aff;white-space:nowrap;flex-shrink:0}
      .onevr-sub{display:flex;align-items:center;gap:8px;margin-top:4px}
      .onevr-time{font-size:14px;color:#007aff;font-weight:600;font-variant-numeric:tabular-nums}
      .onevr-time-none{color:#c7c7cc}
      .onevr-turnr{font-size:13px;color:rgba(60,60,67,.6);font-weight:500;cursor:pointer;padding:4px 10px;border-radius:8px;background:rgba(0,122,255,.08)}
      .onevr-turnr:active{transform:scale(.95);background:rgba(0,122,255,.18)}
      .onevr-til-label{font-size:11px;color:#ff9500;font-weight:600;margin-left:4px}
      .onevr-tags{display:flex;gap:4px;margin-left:auto;padding-left:8px;flex-shrink:0}
      .onevr-tag{font-size:10px;font-weight:700;padding:3px 6px;border-radius:5px;letter-spacing:.3px}
      .onevr-tag-se{background:#007aff;color:#fff}
      .onevr-tag-dk{background:#ff3b30;color:#fff}
      .onevr-tag-ol{background:#ff9500;color:#fff}
      .onevr-tag-res{background:#8e8e93;color:#fff}
      .onevr-tag-tp{background:#5856d6;color:#fff}
      .onevr-list{max-height:calc(100dvh - 240px);overflow-y:auto;-webkit-overflow-scrolling:touch;border-radius:14px}
      .onevr-empty{text-align:center;padding:48px 24px;color:rgba(60,60,67,.6);background:#fff;border-radius:14px;font-size:16px}
      .onevr-loading-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(242,242,247,.95);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center}
      .onevr-spinner{width:44px;height:44px;border:3px solid rgba(0,0,0,.08);border-top-color:#007aff;border-radius:50%;animation:spin .8s linear infinite}
      .onevr-loading-text{color:#000;margin-top:16px;font-size:17px;font-weight:500}
      @keyframes spin{to{transform:rotate(360deg)}}
      @media(prefers-color-scheme:dark){
        .onevr-modal{background:linear-gradient(180deg,#000,#1c1c1e)}
        .onevr-header{background:rgba(28,28,30,.72);border-bottom-color:rgba(255,255,255,.1)}
        .onevr-search{background:rgba(118,118,128,.24);color:#fff}
        .onevr-search::placeholder{color:rgba(235,235,245,.6)}
        .onevr-section,.onevr-card,.onevr-empty{background:#1c1c1e}
        .onevr-section-header:active{background:rgba(255,255,255,.05)}
        .onevr-btn{background:rgba(118,118,128,.2);color:rgba(235,235,245,.9)}
        .onevr-btn:active{background:rgba(118,118,128,.3)}
        .onevr-btn.active{background:linear-gradient(135deg,#30d158,#34c759)}
        .onevr-btn-close{background:rgba(255,69,58,.2);color:#ff453a}
        .onevr-filter{background:rgba(118,118,128,.2);color:rgba(235,235,245,.9)}
        .onevr-date-btn,.onevr-date-picker{background:rgba(10,132,255,.2);color:#0a84ff}
        .onevr-name{color:#fff}
        .onevr-loc-badge{background:rgba(10,132,255,.2);color:#0a84ff}
        .onevr-person{border-bottom-color:rgba(84,84,88,.6)}
        .onevr-person:active{background:rgba(255,255,255,.05)}
        .onevr-turnr{color:rgba(235,235,245,.6);background:rgba(10,132,255,.15)}
        .onevr-filter-label,.onevr-section-title{color:rgba(235,235,245,.6)}
        .onevr-empty{color:rgba(235,235,245,.6)}
        .onevr-loading-overlay{background:rgba(0,0,0,.9)}
        .onevr-spinner{border-color:rgba(255,255,255,.15);border-top-color:#0a84ff}
        .onevr-loading-text{color:#fff}
      }
    `;
    document.head.appendChild(s);
  }

  // ============================================================
  // MAIN INITIALIZATION
  // ============================================================
  function initWithConfig(CFG) {
    var W = window,
        D = document;

    // Bygg regex från config
    var patterns = {
      tilShift: new RegExp(CFG.patterns.tilShift, 'i'),
      tdsShift: new RegExp(CFG.patterns.tdsShift, 'i'),
      tpSuffix: new RegExp(CFG.patterns.tpSuffix),
      flShift: new RegExp(CFG.patterns.flShift),
      turnNumber: new RegExp(CFG.patterns.turnNumber),
      reserve: new RegExp(CFG.patterns.reserve, 'i')
    };

    var Q = CFG.ui.labelSelector;

    // Initiera caches
    W.__onevrNavDate = W.__onevrNavDate || null;
    W.__onevrLocCache = W.__onevrLocCache || {};
    W.__onevrTimeCache = W.__onevrTimeCache || {};
    W.__onevrCacheBuilt = W.__onevrCacheBuilt || false;

    // Inject styles om de inte finns
    injectStyles();

    // Hjälpfunktioner
    function getTil(turnr, obj) {
      if (!turnr) return null;
      var c = turnr.replace(/^ÖVN/i, '').trim();
      if (obj[c]) return obj[c];
      var m = turnr.match(/^(PL|FL|IL|SL|DK|TDS)(\d)$/i);
      return m && obj[m[1].toUpperCase() + m[2]] ? obj[m[1].toUpperCase() + m[2]] : null;
    }

    function chkTurn(t) {
      return t.match(patterns.flShift) ||
             t === 'ADM' ||
             t.match(patterns.turnNumber) ||
             t.match(patterns.reserve) ||
             t.match(patterns.tilShift) ||
             t.match(patterns.tdsShift) ||
             t.match(patterns.tpSuffix);
    }

    function getCurrentDateText() {
      var el = D.querySelector('.date-label');
      return el ? el.innerText.trim() : new Date().toLocaleDateString('sv-SE');
    }

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

    function scrapeLocations() {
      var els = D.querySelectorAll('.item-wrapper, app-duty-positions-list-element');
      els.forEach(function(item) {
        var lines = (item.innerText || '').split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
        var name = lines[0] || '';
        var turnr = '';

        for (var i = 0; i < lines.length; i++) {
          if (lines[i] === 'C' && lines[i + 1]) {
            turnr = lines[i + 1];
            break;
          }
        }

        if (!turnr) {
          for (var j = 0; j < lines.length; j++) {
            if (lines[j].match(/^\d{5,6}[A-Z]?$/)) {
              turnr = lines[j];
              break;
            }
          }
        }

        if (name && name.length > 3 && name.match(/^[A-ZÅÄÖÉÈÜ]/) && turnr) {
          var m = turnr.match(/^(\d)/);
          if (m && CFG.locations[m[1]]) {
            W.__onevrLocCache[name] = { loc: m[1], locName: CFG.locations[m[1]] };
          }
        }
      });
    }

    // Navigation buttons
    var prevBtn = D.querySelector('.icon-prev');
    var nextBtn = D.querySelector('.icon-next');

    // Bygg cache om det behövs
    if (!W.__onevrCacheBuilt && prevBtn && nextBtn) {
      var startDate = parseSwedishDate(getCurrentDateText());
      W.__onevrNavDate = startDate;

      var loader = D.createElement('div');
      loader.className = 'onevr-loading-overlay';
      loader.innerHTML = '<div class="onevr-spinner"></div><div class="onevr-loading-text">Bygger cache...</div>';
      D.body.appendChild(loader);

      var txt = loader.querySelector('.onevr-loading-text');
      var steps = [
        { btn: prevBtn }, { btn: prevBtn },
        { btn: nextBtn }, { btn: nextBtn }, { btn: nextBtn }, { btn: nextBtn },
        { btn: prevBtn }, { btn: prevBtn }
      ];
      var step = 0;

      function doStep() {
        if (step < steps.length) {
          txt.textContent = 'Bygger cache... ' + Math.round(((step + 1) / steps.length) * 100) + '%';
          steps[step].btn.click();
          step++;
          setTimeout(function() {
            scrapeLocations();
            doStep();
          }, 2000);
        } else {
          W.__onevrCacheBuilt = true;
          W.__onevrNavDate = startDate;
          txt.textContent = 'Klar!';
          setTimeout(function() {
            loader.remove();
            initWithConfig(CFG);
          }, 400);
        }
      }

      scrapeLocations();
      doStep();
      return;
    }

    var currentDateText = getCurrentDateText();
    var isoDate = W.__onevrNavDate || parseSwedishDate(currentDateText);
    W.__onevrNavDate = isoDate;

    // Samla personal
    var people = [];
    var elements = [];
    var timeRegex = /(\d{1,2}:\d{2})\s[-–]\s(\d{1,2}:\d{2})/;
    var seen = {};

    D.querySelectorAll('.item-wrapper, app-duty-positions-list-element').forEach(function(item) {
      var text = item.innerText || '';
      var timeMatch = text.match(timeRegex);
      var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
      var name = lines[0] || '';
      var role = 'Övrig';
      var turnr = '';

      // Hitta roll
      for (var ri = 0; ri < lines.length; ri++) {
        for (var r = 0; r < CFG.roles.length; r++) {
          if (lines[ri].includes(CFG.roles[r])) {
            role = CFG.roles[r];
            break;
          }
        }
        if (role !== 'Övrig') break;
      }

      // Hitta turnummer
      for (var i = 0; i < lines.length; i++) {
        if (lines[i] === 'C' && lines[i + 1]) {
          turnr = lines[i + 1];
          break;
        }
      }

      if (!turnr) {
        for (var j = 0; j < lines.length; j++) {
          var ln = lines[j];
          if (ln.match(/^[A-Z]{2,}[A-Z0-9]+$/) || chkTurn(ln) || ln.toLowerCase().startsWith('reserv')) {
            turnr = ln;
            break;
          }
        }
      }

      var startTime = timeMatch ? timeMatch[1] : '-';
      var endTime = timeMatch ? timeMatch[2] : '-';

      if (startTime === '-' && turnr) {
        var tt = getTil(turnr, CFG.tilTimes);
        if (tt) {
          startTime = tt[0];
          endTime = tt[1];
        }
      }

      if (startTime === '-' && name) {
        var ct = W.__onevrTimeCache[name + '_' + currentDateText];
        if (ct) {
          startTime = ct.start;
          endTime = ct.end;
        }
      }

      var turnInfo = parseTurnr(turnr);

      if (name && name.length > 3 && name.match(/^[A-ZÅÄÖÉÈÜ]/) && !seen[name + startTime]) {
        seen[name + startTime] = true;

        var badge = CFG.roleBadges[role] || 'ÖVR';
        if (getTil(turnr, CFG.tilLabels)) badge = 'TIL';

        var bc = CFG.badgeColors[badge] || 'ovr';

        elements.push(item);

        var fL = turnInfo.loc;
        var fN = turnInfo.locName;

        if (fN) {
          W.__onevrLocCache[name] = { loc: fL, locName: fN };
        } else if (W.__onevrLocCache[name]) {
          fL = W.__onevrLocCache[name].loc;
          fN = W.__onevrLocCache[name].locName;
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

    // Sortera efter starttid
    people.sort(function(a, b) {
      if (a.start === '-' && b.start !== '-') return 1;
      if (a.start !== '-' && b.start === '-') return -1;
      return a.start.localeCompare(b.start);
    });

    // Bygg UI
    buildUI(CFG, people, elements, isoDate, currentDateText, prevBtn, nextBtn, getTil, chkTurn);
  }

  // ============================================================
  // BUILD UI
  // ============================================================
  function buildUI(CFG, people, elements, isoDate, currentDateText, prevBtn, nextBtn, getTil, chkTurn) {
    var D = document;
    var W = window;
    var Q = CFG.ui.labelSelector;

    var overlay = D.createElement('div');
    overlay.className = 'onevr-overlay';

    // Bygg personlista HTML
    var listHTML = '<div class="onevr-card">';
    people.forEach(function(p, idx) {
      var timeStr = p.start === '-' ? '—' : p.start + ' – ' + p.end;
      var tags = '';

      if (p.country) tags += '<span class="onevr-tag onevr-tag-' + p.country.toLowerCase() + '">' + p.country + '</span>';
      if (p.overnight) tags += '<span class="onevr-tag onevr-tag-ol">' + p.overnight + '</span>';
      if (p.isRes) tags += '<span class="onevr-tag onevr-tag-res">RES</span>';
      if (p.isChanged) tags += '<span class="onevr-tag onevr-tag-tp">TP</span>';

      var locB = p.locName ? '<span class="onevr-loc-badge">' + p.locName + '</span>' : '';
      var tilL = getTil(p.turnr, CFG.tilLabels);
      var tilH = tilL ? '<span class="onevr-til-label">(' + tilL + ')</span>' : '';

      listHTML += '<div class="onevr-person" data-role="' + p.role + '" data-loc="' + p.loc + '" data-idx="' + idx + '">' +
        '<span class="onevr-badge onevr-badge-' + p.badgeColor + '">' + p.badge + '</span>' +
        '<div class="onevr-main">' +
          '<div class="onevr-name-row">' +
            '<span class="onevr-name">' + p.name + '</span>' + locB +
          '</div>' +
          '<div class="onevr-sub">' +
            '<span class="onevr-time' + (p.start === '-' ? ' onevr-time-none' : '') + '">' + timeStr + '</span>' +
            '<span class="onevr-turnr" data-elidx="' + p.elIdx + '">' + p.turnr + tilH + ' ›</span>' +
          '</div>' +
        '</div>' +
        '<div class="onevr-tags">' + tags + '</div>' +
      '</div>';
    });
    listHTML += '</div>';

    // Räkna statistik
    var stats = {
      res: people.filter(function(p) { return p.isRes || p.role === 'Reserv'; }).length,
      changed: people.filter(function(p) { return p.isChanged; }).length,
      noTime: people.filter(function(p) { return p.start === '-'; }).length,
      se: people.filter(function(p) { return p.country === 'SE'; }).length,
      dk: people.filter(function(p) { return p.country === 'DK'; }).length,
      utb: people.filter(function(p) { return p.turnr && /UTB/i.test(p.turnr) && !/INSUTB/i.test(p.turnr); }).length,
      insutb: people.filter(function(p) { return p.turnr && /INSUTB/i.test(p.turnr); }).length,
      adm: people.filter(function(p) { return p.badge === 'ADM'; }).length
    };

    // Bygg rollfilter
    var roleFilters = '<button class="onevr-filter active" data-filter="role" data-val="all">Alla</button>';
    var seenB = {};
    people.forEach(function(p) { seenB[p.badge] = 1; });
    Object.keys(seenB).forEach(function(b) {
      roleFilters += '<button class="onevr-filter" data-filter="role" data-val="' + b + '">' + b + '</button>';
    });

    // Bygg ortfilter
    var locCounts = {};
    people.forEach(function(p) {
      if (p.locName) locCounts[p.locName] = (locCounts[p.locName] || 0) + 1;
    });
    var locFilters = '<button class="onevr-filter active" data-filter="loc" data-val="all">Alla</button>';
    Object.keys(locCounts).sort().forEach(function(loc) {
      locFilters += '<button class="onevr-filter" data-filter="loc" data-val="' + loc + '">' + loc + ' (' + locCounts[loc] + ')</button>';
    });

    // Extra knappar
    var loadTimesBtn = stats.noTime > 0 ? '<button class="onevr-btn" id="onevr-load-times">⏱ Ladda tider (' + stats.noTime + ' utan tid)</button>' : '';
    var changedBtn = stats.changed > 0 ? '<button class="onevr-btn" id="onevr-changed-btn">📝 Ändrade turer (' + stats.changed + ')</button>' : '';

    overlay.innerHTML = `
      <div class="onevr-modal">
        <div class="onevr-header">
          <div class="onevr-search-wrap">
            <input type="text" class="onevr-search" id="onevr-search" placeholder="Sök personal...">
            <button class="onevr-search-clear" id="onevr-search-clear">✕</button>
          </div>
          <div class="onevr-date-nav">
            <button class="onevr-date-btn" id="onevr-prev">‹</button>
            <input type="date" class="onevr-date-picker" id="onevr-date-picker" value="${isoDate}">
            <button class="onevr-date-btn" id="onevr-next">›</button>
          </div>
        </div>
        <div class="onevr-content">
          <div class="onevr-section" id="onevr-settings-section">
            <div class="onevr-section-header">
              <span class="onevr-section-title">Inställningar</span>
              <span class="onevr-section-arrow">▾</span>
            </div>
            <div class="onevr-section-content">
              <div class="onevr-settings-grid">
                ${changedBtn}
                ${loadTimesBtn}
                <button class="onevr-btn onevr-btn-close" id="onevr-close-btn">✕ Stäng appen</button>
              </div>
            </div>
          </div>
          <div class="onevr-section" id="onevr-sort-section">
            <div class="onevr-section-header">
              <span class="onevr-section-title">Filtrera</span>
              <span class="onevr-section-arrow">▾</span>
            </div>
            <div class="onevr-section-content">
              <div class="onevr-filter-label">Roll</div>
              <div class="onevr-filters" id="onevr-role-filters">${roleFilters}</div>
              <div class="onevr-filter-label">Ort</div>
              <div class="onevr-filters" id="onevr-loc-filters">${locFilters}</div>
              <div class="onevr-filter-label">Snabbfilter</div>
              <div class="onevr-filters">
                <button class="onevr-filter" id="onevr-se-btn">🇸🇪 Sverige (${stats.se})</button>
                <button class="onevr-filter" id="onevr-dk-btn">🇩🇰 Danmark (${stats.dk})</button>
                <button class="onevr-filter" id="onevr-res-btn">🔄 Reserver (${stats.res})</button>
                <button class="onevr-filter" id="onevr-utb-btn">📚 Utb (${stats.utb})</button>
                <button class="onevr-filter" id="onevr-insutb-btn">👨‍🏫 INSUTB (${stats.insutb})</button>
                <button class="onevr-filter" id="onevr-adm-btn">🏢 ADM (${stats.adm})</button>
              </div>
            </div>
          </div>
          <div class="onevr-list" id="onevr-list">
            ${people.length ? listHTML : '<div class="onevr-empty">Ingen personal hittades</div>'}
          </div>
        </div>
      </div>
    `;

    D.body.appendChild(overlay);

    // ============================================================
    // EVENT HANDLERS
    // ============================================================

    // Accordion sections
    D.querySelectorAll('.onevr-section-header').forEach(function(h) {
      h.onclick = function() {
        this.parentElement.classList.toggle('open');
      };
    });

    // Date navigation
    function changeDate(dir) {
      var btn = dir < 0 ? prevBtn : nextBtn;
      if (!btn) return;

      var p = isoDate.split('-');
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      d.setDate(d.getDate() + dir);
      W.__onevrNavDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

      var ld = D.createElement('div');
      ld.className = 'onevr-loading-overlay';
      ld.innerHTML = '<div class="onevr-spinner"></div><div class="onevr-loading-text">Laddar...</div>';
      D.body.appendChild(ld);
      overlay.remove();
      btn.click();

      setTimeout(function() {
        ld.remove();
        initWithConfig(CFG);
      }, CFG.ui.dateNavDelay);
    }

    function goToDate(targetDate) {
      if (!prevBtn || !nextBtn) return;

      var ld = D.createElement('div');
      ld.className = 'onevr-loading-overlay';
      ld.innerHTML = '<div class="onevr-spinner"></div><div class="onevr-loading-text">Navigerar...</div>';
      D.body.appendChild(ld);
      overlay.remove();

      var cp = isoDate.split('-');
      var tp = targetDate.split('-');
      var diff = Math.round((new Date(+tp[0], +tp[1] - 1, +tp[2]) - new Date(+cp[0], +cp[1] - 1, +cp[2])) / 864e5);
      var clicks = Math.abs(diff);
      var btn = diff > 0 ? nextBtn : prevBtn;
      var i = 0;

      function doClick() {
        if (i < clicks) {
          btn.click();
          i++;
          setTimeout(doClick, CFG.ui.loadTimeDelay);
        } else {
          W.__onevrNavDate = targetDate;
          setTimeout(function() {
            ld.remove();
            initWithConfig(CFG);
          }, 1500);
        }
      }

      clicks ? doClick() : (ld.remove(), initWithConfig(CFG));
    }

    D.getElementById('onevr-close-btn').onclick = function() { overlay.remove(); };
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    D.getElementById('onevr-prev').onclick = function() { changeDate(-1); };
    D.getElementById('onevr-next').onclick = function() { changeDate(1); };
    D.getElementById('onevr-date-picker').onchange = function() { goToDate(this.value); };

    // Filtering
    var activeRole = 'all';
    var activeLoc = 'all';
    var searchQ = '';
    var filters = { res: false, changed: false, se: false, dk: false, utb: false, insutb: false, adm: false };

    function filterList() {
      D.querySelectorAll('.onevr-person').forEach(function(el) {
        var show = true;
        var p = people[+el.getAttribute('data-idx')];

        if (filters.res && !p.isRes && p.role !== 'Reserv') show = false;
        if (filters.changed && !p.isChanged) show = false;
        if (filters.se && p.country !== 'SE') show = false;
        if (filters.dk && p.country !== 'DK') show = false;
        if (filters.utb && !(p.turnr && /UTB/i.test(p.turnr) && !/INSUTB/i.test(p.turnr))) show = false;
        if (filters.insutb && !(p.turnr && /INSUTB/i.test(p.turnr))) show = false;
        if (filters.adm && p.badge !== 'ADM') show = false;
        if (activeRole !== 'all' && p.badge !== activeRole) show = false;
        if (activeLoc !== 'all' && p.locName !== activeLoc) show = false;
        if (searchQ && !el.textContent.toLowerCase().includes(searchQ)) show = false;

        el.style.display = show ? 'flex' : 'none';
      });
    }

    // Quick filter buttons
    var quickFilters = [
      { id: 'onevr-se-btn', key: 'se', icon: '🇸🇪', label: 'Sverige', count: stats.se, exclusive: 'dk' },
      { id: 'onevr-dk-btn', key: 'dk', icon: '🇩🇰', label: 'Danmark', count: stats.dk, exclusive: 'se' },
      { id: 'onevr-res-btn', key: 'res', icon: '🔄', label: 'Reserver', count: stats.res },
      { id: 'onevr-utb-btn', key: 'utb', icon: '📚', label: 'Utb', count: stats.utb },
      { id: 'onevr-insutb-btn', key: 'insutb', icon: '👨‍🏫', label: 'INSUTB', count: stats.insutb },
      { id: 'onevr-adm-btn', key: 'adm', icon: '🏢', label: 'ADM', count: stats.adm }
    ];

    quickFilters.forEach(function(qf) {
      var el = D.getElementById(qf.id);
      if (el) {
        el.onclick = function() {
          filters[qf.key] = !filters[qf.key];
          if (qf.exclusive && filters[qf.key]) {
            filters[qf.exclusive] = false;
            var exEl = D.getElementById('onevr-' + qf.exclusive + '-btn');
            if (exEl) {
              exEl.classList.remove('active');
              var exQf = quickFilters.find(function(q) { return q.key === qf.exclusive; });
              if (exQf) exEl.textContent = exQf.icon + ' ' + exQf.label + ' (' + exQf.count + ')';
            }
          }
          this.classList.toggle('active', filters[qf.key]);
          this.textContent = (filters[qf.key] ? '✓' : qf.icon) + ' ' + qf.label + ' (' + qf.count + ')';
          filterList();
        };
      }
    });

    var changedBtnEl = D.getElementById('onevr-changed-btn');
    if (changedBtnEl) {
      changedBtnEl.onclick = function() {
        filters.changed = !filters.changed;
        this.classList.toggle('active', filters.changed);
        this.textContent = filters.changed ? '✓ Visar ändrade (' + stats.changed + ')' : '📝 Ändrade turer (' + stats.changed + ')';
        filterList();
      };
    }

    // Search
    var searchEl = D.getElementById('onevr-search');
    var clearEl = D.getElementById('onevr-search-clear');
    searchEl.oninput = function() {
      searchQ = this.value.toLowerCase();
      clearEl.classList.toggle('show', this.value.length > 0);
      filterList();
    };
    clearEl.onclick = function() {
      searchEl.value = '';
      searchQ = '';
      clearEl.classList.remove('show');
      filterList();
      searchEl.focus();
    };

    // Role filters
    D.getElementById('onevr-role-filters').onclick = function(e) {
      if (e.target.classList.contains('onevr-filter')) {
        this.querySelectorAll('.onevr-filter').forEach(function(f) { f.classList.remove('active'); });
        e.target.classList.add('active');
        activeRole = e.target.getAttribute('data-val');
        filterList();
      }
    };

    // Location filters
    D.getElementById('onevr-loc-filters').onclick = function(e) {
      if (e.target.classList.contains('onevr-filter')) {
        this.querySelectorAll('.onevr-filter').forEach(function(f) { f.classList.remove('active'); });
        e.target.classList.add('active');
        activeLoc = e.target.getAttribute('data-val');
        filterList();
      }
    };

    // Click on turnr to scroll to element
    function findTL(el) {
      var labels = el.querySelectorAll(Q);
      for (var li = 0; li < labels.length; li++) {
        var t = (labels[li].innerText || '').trim();
        if (chkTurn(t)) return labels[li];
      }
      return null;
    }

    D.getElementById('onevr-list').onclick = function(e) {
      var tE = e.target.closest('.onevr-turnr');
      if (tE) {
        var eI = +tE.getAttribute('data-elidx');
        var oE = elements[eI];
        if (oE) {
          var cT = findTL(oE) || oE;
          overlay.style.display = 'none';
          oE.scrollIntoView({ behavior: 'instant', block: 'center' });
          setTimeout(function() {
            cT.click();
            (function wC() {
              var pn = D.querySelector('.cdk-overlay-pane');
              if (pn) setTimeout(wC, 200);
              else overlay.style.display = '';
            })();
          }, 300);
        }
      }
    };

    // Load times functionality
    var loadTimesEl = D.getElementById('onevr-load-times');
    var isLoadingTimes = false;
    var loadTimesMenu = null;

    if (loadTimesEl) {
      loadTimesEl.onclick = function() {
        if (isLoadingTimes) return;

        if (loadTimesEl.classList.contains('done')) {
          overlay.remove();
          initWithConfig(CFG);
          return;
        }

        if (loadTimesMenu) {
          loadTimesMenu.remove();
          loadTimesMenu = null;
          return;
        }

        var noTimePeople = people.filter(function(p) { return p.start === '-'; });
        if (!noTimePeople.length) return;

        var roleCounts = {};
        noTimePeople.forEach(function(p) {
          roleCounts[p.badge || 'ÖVR'] = (roleCounts[p.badge || 'ÖVR'] || 0) + 1;
        });

        loadTimesMenu = D.createElement('div');
        loadTimesMenu.style.cssText = 'background:#fff;border-radius:14px;padding:16px;margin-top:8px;box-shadow:0 4px 24px rgba(0,0,0,.12)';

        var resNoTimeCount = noTimePeople.filter(function(p) { return p.isRes || p.role === 'Reserv'; }).length;
        var tpNoTimeCount = noTimePeople.filter(function(p) { return p.isChanged; }).length;

        loadTimesMenu.innerHTML = '<div style="font-weight:600;margin-bottom:12px;color:#000;font-size:15px">Välj roller att ladda:</div>' +
          '<div id="onevr-role-checks" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px"></div>' +
          '<div style="font-weight:600;margin-bottom:8px;margin-top:4px;color:#000;font-size:15px">Specialfilter:</div>' +
          '<div id="onevr-special-checks" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px"></div>' +
          '<div style="display:flex;gap:8px">' +
            '<button id="onevr-load-start" style="flex:1;padding:14px;background:linear-gradient(135deg,#007aff,#0a84ff);color:#fff;border:none;border-radius:12px;font-weight:600;font-size:15px;cursor:pointer">Starta</button>' +
            '<button id="onevr-load-cancel" style="padding:14px 20px;background:rgba(118,118,128,.12);color:#666;border:none;border-radius:12px;font-size:15px;cursor:pointer">Avbryt</button>' +
          '</div>';

        var checksDiv = loadTimesMenu.querySelector('#onevr-role-checks');
        Object.keys(roleCounts).forEach(function(role) {
          var label = D.createElement('label');
          label.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(118,118,128,.08);border-radius:10px;cursor:pointer;color:#000;font-size:15px';
          label.innerHTML = '<input type="checkbox" checked data-type="role" value="' + role + '" style="width:20px;height:20px;accent-color:#007aff"> ' + role + ' <span style="color:#666">(' + roleCounts[role] + ')</span>';
          checksDiv.appendChild(label);
        });

        var specialDiv = loadTimesMenu.querySelector('#onevr-special-checks');
        var resLabel = D.createElement('label');
        var tpLabel = D.createElement('label');
        resLabel.style.cssText = tpLabel.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(142,142,147,.15);border-radius:10px;cursor:pointer;color:#000;font-size:15px';
        resLabel.innerHTML = '<input type="checkbox" checked data-type="special" value="res" style="width:20px;height:20px;accent-color:#8e8e93"> 🔄 Reserver <span style="color:#666">(' + resNoTimeCount + ')</span>';
        tpLabel.style.background = 'rgba(88,86,214,.15)';
        tpLabel.innerHTML = '<input type="checkbox" checked data-type="special" value="tp" style="width:20px;height:20px;accent-color:#5856d6"> 📝 Ändrade turer <span style="color:#666">(' + tpNoTimeCount + ')</span>';
        specialDiv.appendChild(resLabel);
        specialDiv.appendChild(tpLabel);

        loadTimesEl.parentNode.insertBefore(loadTimesMenu, loadTimesEl.nextSibling);

        loadTimesMenu.querySelector('#onevr-load-cancel').onclick = function(e) {
          e.stopPropagation();
          loadTimesMenu.remove();
          loadTimesMenu = null;
        };

        loadTimesMenu.querySelector('#onevr-load-start').onclick = function(e) {
          e.stopPropagation();

          var selectedRoles = [];
          var includeRes = false;
          var includeTp = false;

          loadTimesMenu.querySelectorAll('input[data-type="role"]:checked').forEach(function(cb) {
            selectedRoles.push(cb.value);
          });
          loadTimesMenu.querySelectorAll('input[data-type="special"]:checked').forEach(function(cb) {
            if (cb.value === 'res') includeRes = true;
            if (cb.value === 'tp') includeTp = true;
          });

          loadTimesMenu.remove();
          loadTimesMenu = null;

          if (!selectedRoles.length && !includeRes && !includeTp) return;

          var hasR = selectedRoles.length > 0;
          var hasS = includeRes || includeTp;

          var filteredPeople = noTimePeople.filter(function(p) {
            var mR = selectedRoles.indexOf(p.badge) !== -1;
            var mS = (includeRes && (p.isRes || p.role === 'Reserv')) || (includeTp && p.isChanged);
            return hasR && hasS ? mR && mS : hasR ? mR : hasS ? mS : false;
          });

          if (!filteredPeople.length) return;

          isLoadingTimes = true;
          loadTimesEl.style.background = 'linear-gradient(135deg,#007aff,#0a84ff)';
          loadTimesEl.style.color = '#fff';
          loadTimesEl.textContent = '⏳ 0/' + filteredPeople.length;

          var idx = 0;
          var successCount = 0;

          function findTE(el) {
            var labels = el.querySelectorAll(Q);
            for (var li = 0; li < labels.length; li++) {
              var t = (labels[li].innerText || '').trim();
              if (chkTurn(t)) return labels[li];
            }
            return el;
          }

          var cdkC = D.querySelector('.cdk-overlay-container');
          if (cdkC) {
            cdkC.style.opacity = '0';
            cdkC.style.pointerEvents = 'none';
          }

          function waitClose(cb) {
            var w = 0;
            (function ck() {
              var pn = D.querySelector('.cdk-overlay-pane');
              if (!pn) cb();
              else if (w < 2000) { w += 100; setTimeout(ck, 100); }
              else cb();
            })();
          }

          function waitModal(nm, cb, mx) {
            var w = 0;
            (function ck() {
              var pn = D.querySelector('.cdk-overlay-pane');
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

          function loadNext() {
            if (idx < filteredPeople.length) {
              var p = filteredPeople[idx];
              var el = elements[p.elIdx];
              var fn = p.name.split(' ')[0];

              loadTimesEl.textContent = '⏳ ' + idx + '/' + filteredPeople.length;

              if (el) {
                var tE = findTE(el);
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
                          W.__onevrTimeCache[p.name + '_' + currentDateText] = { start: st, end: en };
                          successCount++;
                        }
                      }
                      var bd = D.querySelector('.cdk-overlay-backdrop');
                      if (bd) bd.click();
                      var cb = D.querySelector('.icon-close');
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
              isLoadingTimes = false;
              if (cdkC) {
                cdkC.style.opacity = '';
                cdkC.style.pointerEvents = '';
              }
              loadTimesEl.style.background = 'linear-gradient(135deg,#34c759,#30d158)';
              loadTimesEl.textContent = '✓ ' + successCount + ' tider laddade';
              loadTimesEl.classList.add('done');
            }
          }

          loadNext();
        };
      };
    }

    // Store reference for re-init
    W.__onevrFn = function() { initWithConfig(CFG); };
  }
})();
