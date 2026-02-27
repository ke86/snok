/**
 * OneVR Styles Module
 * All CSS styles for the overlay UI
 */
(function() {
  'use strict';

  if (document.getElementById('onevr-styles')) return;

  var css = `
    /* ============================================
       BASE
       ============================================ */
    * { -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; }

    /* ============================================
       OVERLAY & MODAL
       ============================================ */
    .onevr-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.4);
      -webkit-backdrop-filter: blur(25px);
      backdrop-filter: blur(25px);
      z-index: 99999;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .onevr-modal {
      max-width: 420px;
      margin: 0 auto;
      min-height: 100dvh;
      background: linear-gradient(180deg, #f2f2f7, #e5e5ea);
    }

    /* ============================================
       HEADER
       ============================================ */
    .onevr-header {
      padding: 12px 16px;
      padding-top: max(12px, env(safe-area-inset-top));
      background: rgba(255,255,255,.72);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      backdrop-filter: saturate(180%) blur(20px);
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: .5px solid rgba(0,0,0,.1);
    }

    /* ============================================
       SEARCH
       ============================================ */
    .onevr-search-wrap { position: relative; }

    .onevr-search {
      width: 100%;
      padding: 10px 14px;
      background: rgba(118,118,128,.12);
      border: none;
      border-radius: 12px;
      color: #000;
      font-size: 17px;
      text-align: center;
      transition: all .2s;
      box-sizing: border-box;
    }

    .onevr-search:focus {
      outline: none;
      background: rgba(118,118,128,.18);
    }

    .onevr-search::placeholder { color: rgba(60,60,67,.6); }

    .onevr-search-clear {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      border: none;
      background: rgba(60,60,67,.3);
      color: #fff;
      border-radius: 50%;
      font-size: 12px;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
    }

    .onevr-search-clear.show { display: flex; }

    /* ============================================
       DATE NAVIGATION
       ============================================ */
    .onevr-date-nav {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .onevr-date-btn {
      width: 44px;
      height: 44px;
      border: none;
      background: rgba(0,122,255,.1);
      color: #007aff;
      border-radius: 12px;
      cursor: pointer;
      font-size: 20px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all .15s;
    }

    .onevr-date-btn:active {
      transform: scale(.92);
      background: rgba(0,122,255,.2);
    }

    .onevr-date-picker {
      flex: 1;
      background: rgba(0,122,255,.1);
      border: none;
      color: #007aff;
      font-weight: 600;
      font-size: 17px;
      padding: 12px 16px;
      border-radius: 12px;
      cursor: pointer;
      font-family: inherit;
      text-align: center;
    }

    .onevr-date-picker:active { background: rgba(0,122,255,.18); }

    .onevr-date-picker::-webkit-calendar-picker-indicator {
      filter: invert(37%) sepia(74%) saturate(1507%) hue-rotate(200deg);
      cursor: pointer;
      padding: 4px;
    }

    /* ============================================
       CONTENT & SECTIONS
       ============================================ */
    .onevr-content {
      padding: 16px;
      padding-bottom: max(24px, env(safe-area-inset-bottom));
    }

    .onevr-section {
      background: #fff;
      border-radius: 14px;
      margin-bottom: 12px;
      overflow: hidden;
      box-shadow: 0 .5px 0 rgba(0,0,0,.04);
    }

    .onevr-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 16px;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
    }

    .onevr-section-header:active { background: rgba(0,0,0,.03); }

    .onevr-section-title {
      font-size: 13px;
      font-weight: 600;
      color: rgba(60,60,67,.6);
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    .onevr-section-arrow {
      color: #c7c7cc;
      font-size: 26px;
      transition: transform .25s;
    }

    .onevr-section.open .onevr-section-arrow { transform: rotate(180deg); }

    .onevr-section-content {
      display: none;
      padding: 0 16px 14px;
    }

    .onevr-section.open .onevr-section-content { display: block; }

    /* ============================================
       BUTTONS
       ============================================ */
    .onevr-settings-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .onevr-btn {
      width: 100%;
      padding: 12px 16px;
      background: rgba(118,118,128,.08);
      border: none;
      border-radius: 12px;
      color: rgba(60,60,67,.9);
      cursor: pointer;
      font-size: 15px;
      font-weight: 500;
      text-align: left;
      transition: all .2s;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .onevr-btn:active {
      transform: scale(.98);
      background: rgba(118,118,128,.15);
    }

    .onevr-btn.active {
      background: linear-gradient(135deg, #34c759, #30d158);
      color: #fff;
      box-shadow: 0 2px 8px rgba(52,199,89,.3);
    }

    .onevr-btn.done {
      background: linear-gradient(135deg, #34c759, #30d158);
      color: #fff;
      box-shadow: 0 2px 8px rgba(52,199,89,.3);
      animation: onevr-pulse 1.5s ease-in-out infinite;
    }

    @keyframes onevr-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.02); }
    }

    .onevr-btn-close {
      background: rgba(255,59,48,.1);
      color: #ff3b30;
    }

    .onevr-btn-close:active { background: rgba(255,59,48,.2); }

    /* ============================================
       LOAD TIMES MENU
       ============================================ */
    .onevr-load-menu {
      background: linear-gradient(180deg, rgba(44,44,46,.98), rgba(28,28,30,.98));
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      backdrop-filter: saturate(180%) blur(20px);
      border-radius: 16px;
      padding: 16px;
      margin-top: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,.4);
      border: 1px solid rgba(255,255,255,.1);
    }

    .onevr-load-title {
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .onevr-load-title::before {
      content: '⏱';
    }

    .onevr-load-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 14px;
    }

    .onevr-load-check {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      color: rgba(255,255,255,.9);
      font-size: 14px;
      font-weight: 500;
      padding: 8px 12px;
      background: rgba(118,118,128,.3);
      border-radius: 10px;
      transition: all .2s;
    }

    .onevr-load-check:hover {
      background: rgba(118,118,128,.4);
    }

    .onevr-load-check.checked {
      background: linear-gradient(135deg, #007aff, #0a84ff);
      box-shadow: 0 2px 8px rgba(0,122,255,.3);
    }

    .onevr-load-check input {
      width: 16px;
      height: 16px;
      accent-color: #fff;
    }

    .onevr-load-actions {
      display: flex;
      gap: 10px;
      margin-top: 6px;
    }

    .onevr-load-btn {
      padding: 12px 20px;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
    }

    .onevr-load-btn-start {
      flex: 1;
      background: linear-gradient(135deg, #34c759, #30d158);
      color: #fff;
      box-shadow: 0 4px 12px rgba(52,199,89,.3);
    }

    .onevr-load-btn-start:active {
      transform: scale(.97);
      box-shadow: 0 2px 8px rgba(52,199,89,.4);
    }

    .onevr-load-btn-cancel {
      background: rgba(118,118,128,.3);
      color: rgba(255,255,255,.8);
    }

    .onevr-load-btn-cancel:active {
      background: rgba(118,118,128,.5);
      transform: scale(.97);
    }

    /* ============================================
       FILTER BAR & DROPDOWNS
       ============================================ */
    .onevr-filter-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .onevr-filter-dropdown {
      position: relative;
      flex: 1;
    }

    .onevr-filter-trigger {
      width: 100%;
      padding: 10px 14px;
      background: rgba(118,118,128,.08);
      border: none;
      border-radius: 10px;
      color: rgba(60,60,67,.9);
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all .2s;
    }

    .onevr-filter-trigger:active {
      transform: scale(.97);
      background: rgba(118,118,128,.15);
    }

    .onevr-filter-trigger.has-filter {
      background: linear-gradient(135deg, #007aff, #0a84ff);
      color: #fff;
    }

    .onevr-filter-arrow {
      font-size: 12px;
      transition: transform .2s;
    }

    .onevr-filter-dropdown.open .onevr-filter-arrow {
      transform: rotate(180deg);
    }

    .onevr-dropdown-menu {
      display: none;
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,.15);
      z-index: 100;
      max-height: 240px;
      overflow-y: auto;
      padding: 6px;
    }

    .onevr-filter-dropdown.open .onevr-dropdown-menu {
      display: block;
    }

    .onevr-dropdown-item {
      width: 100%;
      padding: 10px 12px;
      background: none;
      border: none;
      border-radius: 8px;
      color: rgba(60,60,67,.9);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      text-align: left;
      transition: background .15s;
      display: block;
    }

    .onevr-dropdown-item:hover,
    .onevr-dropdown-item:active {
      background: rgba(118,118,128,.1);
    }

    .onevr-dropdown-item.active {
      background: rgba(0,122,255,.1);
      color: #007aff;
      font-weight: 600;
    }

    /* Active filters chips */
    .onevr-active-filters {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      min-height: 0;
    }

    .onevr-active-filters:empty {
      display: none;
    }

    .onevr-active-filters:not(:empty) {
      margin-bottom: 10px;
    }

    .onevr-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: linear-gradient(135deg, #007aff, #0a84ff);
      color: #fff;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 500;
    }

    .onevr-chip-remove {
      background: none;
      border: none;
      color: rgba(255,255,255,.8);
      cursor: pointer;
      font-size: 14px;
      padding: 0;
      line-height: 1;
    }

    .onevr-chip-remove:hover {
      color: #fff;
    }

    /* ============================================
       PERSON CARDS
       ============================================ */
    .onevr-card {
      background: #fff;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 .5px 0 rgba(0,0,0,.04);
    }

    .onevr-person {
      display: flex;
      align-items: center;
      padding: 14px 16px;
      border-bottom: .5px solid rgba(60,60,67,.1);
    }

    .onevr-person:active { background: rgba(0,0,0,.03); }
    .onevr-person:last-child { border-bottom: none; }

    /* ============================================
       BADGES
       ============================================ */
    .onevr-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      text-align: center;
      min-width: 36px;
      margin-right: 12px;
      letter-spacing: .3px;
      flex-shrink: 0;
    }

    .onevr-badge-lkf { background: linear-gradient(135deg, #007aff, #0a84ff); color: #fff; }
    .onevr-badge-tv { background: linear-gradient(135deg, #af52de, #bf5af2); color: #fff; }
    .onevr-badge-til, .onevr-badge-tif { background: linear-gradient(135deg, #ff9500, #ff9f0a); color: #fff; }
    .onevr-badge-res { background: linear-gradient(135deg, #8e8e93, #98989f); color: #fff; }
    .onevr-badge-adm { background: linear-gradient(135deg, #ff2d55, #ff375f); color: #fff; }
    .onevr-badge-ovr { background: linear-gradient(135deg, #636366, #6e6e73); color: #fff; }

    .onevr-badge.onevr-working-now {
      outline: 2px dashed #30d158;
      outline-offset: 2px;
    }

    /* ============================================
       PERSON INFO
       ============================================ */
    .onevr-main { flex: 1; min-width: 0; }

    .onevr-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .onevr-name {
      color: #000;
      font-weight: 500;
      font-size: 16px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .onevr-loc-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 10px;
      background: rgba(0,122,255,.1);
      color: #007aff;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .onevr-sub {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .onevr-time {
      font-size: 14px;
      color: #007aff;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .onevr-time-none { color: #c7c7cc; }

    .onevr-turnr {
      font-size: 13px;
      color: rgba(60,60,67,.6);
      font-weight: 500;
      cursor: pointer;
      padding: 4px 10px;
      border-radius: 8px;
      background: rgba(0,122,255,.08);
    }

    .onevr-turnr:active {
      transform: scale(.95);
      background: rgba(0,122,255,.18);
    }

    .onevr-til-label {
      font-size: 11px;
      color: #ff9500;
      font-weight: 600;
      margin-left: 4px;
    }

    /* ============================================
       TAGS
       ============================================ */
    .onevr-tags {
      display: flex;
      gap: 4px;
      margin-left: auto;
      padding-left: 8px;
      flex-shrink: 0;
    }

    .onevr-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 6px;
      border-radius: 5px;
      letter-spacing: .3px;
    }

    .onevr-tag-se { background: #007aff; color: #fff; }
    .onevr-tag-dk { background: #ff3b30; color: #fff; }
    .onevr-tag-ol { background: #ff9500; color: #fff; }
    .onevr-tag-res { background: #8e8e93; color: #fff; }
    .onevr-tag-tp { background: #5856d6; color: #fff; }

    /* ============================================
       STATUS BAR
       ============================================ */
    .onevr-status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: rgba(0,122,255,.08);
      border-radius: 10px;
      margin-bottom: 12px;
      font-size: 14px;
      color: rgba(60,60,67,.8);
    }

    .onevr-status-working {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .onevr-status-working strong,
    .onevr-status-total strong {
      color: #007aff;
      font-weight: 700;
    }

    /* ============================================
       LIST & EMPTY STATE
       ============================================ */
    .onevr-list {
      max-height: calc(100dvh - 240px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 14px;
    }

    .onevr-empty {
      text-align: center;
      padding: 48px 24px;
      color: rgba(60,60,67,.6);
      background: #fff;
      border-radius: 14px;
      font-size: 16px;
    }

    /* ============================================
       LOADING
       ============================================ */
    .onevr-loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(242,242,247,.95);
      -webkit-backdrop-filter: blur(20px);
      backdrop-filter: blur(20px);
      z-index: 100000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .onevr-spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(0,0,0,.08);
      border-top-color: #007aff;
      border-radius: 50%;
      animation: onevr-spin .8s linear infinite;
    }

    .onevr-loading-text {
      color: #000;
      margin-top: 16px;
      font-size: 17px;
      font-weight: 500;
    }

    @keyframes onevr-spin { to { transform: rotate(360deg); } }

    /* ============================================
       DARK MODE
       ============================================ */
    @media (prefers-color-scheme: dark) {
      .onevr-modal { background: linear-gradient(180deg, #000, #1c1c1e); }

      .onevr-header {
        background: rgba(28,28,30,.72);
        border-bottom-color: rgba(255,255,255,.1);
      }

      .onevr-search {
        background: rgba(118,118,128,.24);
        color: #fff;
      }

      .onevr-search::placeholder { color: rgba(235,235,245,.6); }

      .onevr-section, .onevr-card, .onevr-empty { background: #1c1c1e; }

      .onevr-section-header:active { background: rgba(255,255,255,.05); }

      .onevr-btn {
        background: rgba(118,118,128,.2);
        color: rgba(235,235,245,.9);
      }

      .onevr-btn:active { background: rgba(118,118,128,.3); }
      .onevr-btn.active { background: linear-gradient(135deg, #30d158, #34c759); }

      .onevr-btn-close {
        background: rgba(255,69,58,.2);
        color: #ff453a;
      }

      .onevr-load-check {
        color: rgba(235,235,245,.9);
      }

      .onevr-load-btn-cancel {
        background: rgba(118,118,128,.24);
        color: rgba(235,235,245,.6);
      }

      .onevr-filter-trigger {
        background: rgba(118,118,128,.2);
        color: rgba(235,235,245,.9);
      }

      .onevr-filter-trigger.has-filter {
        background: linear-gradient(135deg, #0a84ff, #007aff);
      }

      .onevr-dropdown-menu {
        background: #2c2c2e;
        box-shadow: 0 4px 20px rgba(0,0,0,.4);
      }

      .onevr-dropdown-item {
        color: rgba(235,235,245,.9);
      }

      .onevr-dropdown-item:hover,
      .onevr-dropdown-item:active {
        background: rgba(118,118,128,.2);
      }

      .onevr-dropdown-item.active {
        background: rgba(10,132,255,.2);
        color: #0a84ff;
      }

      .onevr-chip {
        background: linear-gradient(135deg, #0a84ff, #007aff);
      }

      .onevr-date-btn, .onevr-date-picker {
        background: rgba(10,132,255,.2);
        color: #0a84ff;
      }

      .onevr-name { color: #fff; }

      .onevr-loc-badge {
        background: rgba(10,132,255,.2);
        color: #0a84ff;
      }

      .onevr-person {
        border-bottom-color: rgba(84,84,88,.6);
      }

      .onevr-person:active { background: rgba(255,255,255,.05); }

      .onevr-turnr {
        color: rgba(235,235,245,.6);
        background: rgba(10,132,255,.15);
      }

      .onevr-filter-label, .onevr-section-title { color: rgba(235,235,245,.6); }
      .onevr-empty { color: rgba(235,235,245,.6); }

      .onevr-status-bar {
        background: rgba(10,132,255,.15);
        color: rgba(235,235,245,.8);
      }

      .onevr-status-working strong,
      .onevr-status-total strong {
        color: #0a84ff;
      }

      .onevr-loading-overlay { background: rgba(0,0,0,.9); }

      .onevr-spinner {
        border-color: rgba(255,255,255,.15);
        border-top-color: #0a84ff;
      }

      .onevr-loading-text { color: #fff; }

      .onevr-vacancy-content { background: #1c1c1e; }
      .onevr-vacancy-date { background: rgba(10,132,255,.15); color: rgba(235,235,245,.9); }
      .onevr-vacancy-date strong { color: #0a84ff; }
      .onevr-vacancy-stats { border-bottom-color: rgba(255,255,255,.1); }
      .onevr-vacancy-stat { background: rgba(118,118,128,.2); }
      .onevr-vacancy-stat-label { color: rgba(235,235,245,.6); }
      .onevr-stat-expected { color: #0a84ff; }
      .onevr-stat-current { color: #30d158; }
      .onevr-stat-vacancy { color: #ff453a; }
      .onevr-vacancy-empty { color: #30d158; }

      .onevr-pin-content { background: #1c1c1e; }
      .onevr-pin-body { background: #1c1c1e; }
      .onevr-pin-dot { background: #3a3a3c; border-color: #48484a; }
      .onevr-pin-dot.filled { background: #5e5ce6; border-color: #5e5ce6; }
      .onevr-pin-key { background: #2c2c2e; color: #fff; }
      .onevr-pin-key:active { background: #3a3a3c; }
      .onevr-pin-key-del { color: #ff453a; }
      .onevr-version { color: rgba(235,235,245,.3); }

      .onevr-person-tracked { border-left-color: #0a84ff; }
      .onevr-dagvy-content { background: #1c1c1e; }
      .onevr-dagvy-info { background: rgba(10,132,255,.1); border-bottom-color: rgba(255,255,255,.08); }
      .onevr-dagvy-turnr { color: #0a84ff; }
      .onevr-dagvy-date { color: rgba(235,235,245,.5); }
      .onevr-dagvy-time { color: rgba(235,235,245,.7); }
      .onevr-dagvy-stats { color: rgba(235,235,245,.4); }
      .onevr-dagvy-seg { border-bottom-color: rgba(255,255,255,.06); }
      .onevr-dagvy-seg-time { color: #fff; }
      .onevr-dagvy-seg-route { color: rgba(235,235,245,.4); }
      .onevr-dagvy-train { background: rgba(0,144,65,.08); }
      .onevr-dagvy-train-nr { color: #30d158; }
      .onevr-dagvy-train-type { color: #30d158; }
      .onevr-dagvy-vehicle { background: #30d158; color: #000; }
      .onevr-dagvy-act-name { color: rgba(235,235,245,.7); }
      .onevr-dagvy-contact { color: #0a84ff; }
      .onevr-dagvy-trains { color: rgba(235,235,245,.5); }
      .onevr-dagvy-empty { color: rgba(235,235,245,.4); }
      .onevr-dagvy-loading .onevr-loading-text { color: rgba(235,235,245,.6) !important; opacity: 1 !important; }
      .onevr-dagvy-loading .onevr-multi-progress { color: #fff !important; font-weight: 700 !important; opacity: 1 !important; }
      .onevr-dagvy-loading .onevr-batch-detail { color: rgba(235,235,245,.8) !important; opacity: 1 !important; }
      .onevr-dagvy-loading .onevr-elapsed { color: rgba(235,235,245,.5) !important; opacity: 1 !important; }

      .onevr-export-section-title { color: #fff; }
      .onevr-export-section-sub { color: rgba(235,235,245,.4); }
      .onevr-export-person { background: rgba(10,132,255,.08); border-color: rgba(10,132,255,.15); }
      .onevr-export-person:active { background: rgba(10,132,255,.15); }
      .onevr-export-name { color: #fff; }
      .onevr-export-turnr { color: #0a84ff; }
      .onevr-export-time { color: rgba(235,235,245,.6); }
      .onevr-export-trains { color: rgba(235,235,245,.4); }
      .onevr-export-phone { color: #0a84ff; }
      .onevr-export-person-action { color: #7d7aff; border-top-color: rgba(10,132,255,.15); }
      .onevr-export-empty { color: rgba(235,235,245,.4); }
      .onevr-export-names { color: rgba(235,235,245,.3); border-top-color: rgba(255,255,255,.06); }

      .onevr-crew-info { background: rgba(0,144,65,.1); border-bottom-color: rgba(255,255,255,.06); }
      .onevr-crew-date { color: rgba(235,235,245,.5); }
      .onevr-crew-segment { border-bottom-color: rgba(255,255,255,.06); }
      .onevr-crew-seg-time { color: #30d158; }
      .onevr-crew-seg-route { color: rgba(235,235,245,.4); }
      .onevr-crew-member-self { background: rgba(10,132,255,.1); border-left-color: #0a84ff; }
      .onevr-crew-member-name { color: #fff; }
      .onevr-crew-member-role { color: rgba(235,235,245,.5); }
      .onevr-crew-member-phone { color: #0a84ff; }

      .onevr-day-section { border-bottom-color: rgba(255,255,255,.06); }
      .onevr-day-header:active { background: rgba(255,255,255,.05); }
      .onevr-day-weekday { color: #0a84ff; }
      .onevr-day-date { color: rgba(235,235,245,.5); }
      .onevr-day-turnr { color: #0a84ff; }
      .onevr-day-time { color: rgba(235,235,245,.5); }
      .onevr-day-count { color: #30d158; }
      .onevr-day-off { color: #636366; }
      .onevr-day-arrow { color: #48484a; }
      .onevr-day-content { background: rgba(255,255,255,.03); }
      .onevr-day-notfound .onevr-day-weekday { color: #636366; }

      .onevr-inline-crew { border-top-color: rgba(48,209,88,.15); }
      .onevr-inline-crew-member { border-bottom-color: rgba(255,255,255,.04); }
      .onevr-inline-crew-self { background: rgba(10,132,255,.1); border-left-color: #0a84ff; }
      .onevr-inline-crew-name { color: #fff; }
      .onevr-inline-crew-role { color: rgba(235,235,245,.5); }
      .onevr-inline-crew-route { color: rgba(235,235,245,.4); }
      .onevr-inline-crew-phone { color: #0a84ff; }

      .onevr-dagvy-footer { border-top-color: rgba(255,255,255,.06); }
      .onevr-firebase-btn { background: linear-gradient(135deg, #ff9f0a, #ff6b00); }
      .onevr-download-btn { background: linear-gradient(135deg, #0a84ff, #007aff); }

      .onevr-batch-section { border-bottom-color: rgba(255,255,255,.06); }
      .onevr-batch-scrape { background: linear-gradient(135deg, #5e5ce6, #8884ff); }
      .onevr-batch-upload { background: linear-gradient(135deg, #ff9f0a, #ff7a00); }
      .onevr-batch-json { background: linear-gradient(135deg, #0a84ff, #007aff); }
      .onevr-batch-pos { background: linear-gradient(135deg, #007AFF, #5AC8FA); }
      .onevr-batch-turns { background: linear-gradient(135deg, #00a550, #30d158); }
      .onevr-batch-vak { background: linear-gradient(135deg, #d63027, #ff6b6b); }
      .onevr-batch-doc-ta { background: linear-gradient(135deg, #ff453a, #ff6b6b); }
      .onevr-batch-doc-drift { background: linear-gradient(135deg, #ff9f0a, #ff7a00); }
      .onevr-progress-bar-doc { background: linear-gradient(90deg, #ff453a, #ff6b6b); }
      .onevr-progress-pct-doc { color: #ff453a; }

      .onevr-progress-bar-wrap { background: rgba(118,118,128,.3); }
      .onevr-progress-bar { background: linear-gradient(90deg, #00a550, #30d158); }
      .onevr-progress-pct { color: #30d158; }
      .onevr-turns-day-btn { color: #30d158; border-color: rgba(48,209,88,.3); }
      .onevr-turns-day-btn.onevr-day-sel-active { background: linear-gradient(135deg, #00a550, #30d158); color: #fff; border-color: #00a550; }

      .onevr-turns-result-big { color: #30d158; }
      .onevr-turns-result-label { color: rgba(235,235,245,.8); }
      .onevr-turns-result-period { color: rgba(235,235,245,.5); }
      .onevr-turns-summary { background: rgba(48,209,88,.08); }
      .onevr-turns-summary-row { border-bottom-color: rgba(255,255,255,.06); }
      .onevr-vak-today { background: rgba(10,132,255,.15); }
      .onevr-turns-summary-day { color: #fff; }
      .onevr-turns-summary-count { color: #30d158; }
      .onevr-turns-download-btn { background: linear-gradient(135deg, #00a550, #30d158); }
      .onevr-turns-back-btn { background: rgba(118,118,128,.2); color: rgba(235,235,245,.8); }

      .onevr-day-selector-label { color: #fff; }
      .onevr-day-sel-btn { color: #8884ff; border-color: rgba(125,122,255,.3); }
      .onevr-day-sel-active { background: linear-gradient(135deg, #5e5ce6, #8884ff); color: #fff; border-color: #5e5ce6; }

      .onevr-export-list-wrap::after { background: linear-gradient(transparent, #1c1c1e); }

      .onevr-loading-text { color: #fff; }
    }

    /* ============================================
       LOAD TIMES BUTTON
       ============================================ */
    .onevr-btn-load {
      background: linear-gradient(135deg, #007aff, #0a84ff);
      color: #fff;
      box-shadow: 0 2px 8px rgba(0,122,255,.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .onevr-btn-load:active {
      transform: scale(.98);
      background: linear-gradient(135deg, #0066cc, #007aff);
    }

    .onevr-btn-count {
      background: rgba(255,255,255,.2);
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
    }

    /* ============================================
       VACANCY BUTTON
       ============================================ */
    .onevr-btn-vakans {
      background: linear-gradient(135deg, #ff3b30, #ff6b6b);
      color: #fff;
      box-shadow: 0 2px 8px rgba(255,59,48,.3);
    }

    .onevr-btn-vakans:active {
      transform: scale(.98);
      background: linear-gradient(135deg, #d63027, #ff3b30);
    }

    /* ============================================
       VERSION INFO
       ============================================ */
    .onevr-version {
      text-align: center;
      font-size: 11px;
      color: rgba(60,60,67,.4);
      margin-top: 12px;
      letter-spacing: .5px;
    }

    /* ============================================
       VACANCY MODAL
       ============================================ */
    .onevr-vacancy-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.5);
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      z-index: 100001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .onevr-vacancy-content {
      background: #fff;
      border-radius: 20px;
      width: 100%;
      max-width: 400px;
      max-height: 85vh;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,.25);
      display: flex;
      flex-direction: column;
    }

    .onevr-vacancy-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      background: linear-gradient(135deg, #ff3b30, #ff6b6b);
      color: #fff;
      font-weight: 700;
      font-size: 18px;
    }

    .onevr-vacancy-close {
      background: rgba(255,255,255,.2);
      border: none;
      font-size: 18px;
      color: #fff;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 8px;
    }

    .onevr-vacancy-close:active { background: rgba(255,255,255,.3); }

    .onevr-vacancy-date {
      padding: 14px 20px;
      background: rgba(0,122,255,.08);
      color: rgba(60,60,67,.9);
      font-size: 15px;
      text-align: center;
    }

    .onevr-vacancy-date strong { color: #007aff; }

    .onevr-vacancy-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      max-height: 400px;
    }

    .onevr-vacancy-section {
      margin-bottom: 16px;
    }

    .onevr-vacancy-section:last-child {
      margin-bottom: 0;
    }

    .onevr-vacancy-section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .5px;
      margin-bottom: 10px;
      padding: 8px 12px;
      border-radius: 8px;
    }

    .onevr-vacancy-section-reserve {
      background: rgba(255,59,48,.1);
      color: #ff3b30;
    }

    .onevr-vacancy-section-other {
      background: rgba(142,142,147,.1);
      color: #636366;
    }

    .onevr-vacancy-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .onevr-vacancy-item {
      padding: 10px 8px;
      color: #fff;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .onevr-vacancy-reserve {
      background: linear-gradient(135deg, #ff3b30, #ff6b6b);
      box-shadow: 0 2px 8px rgba(255,59,48,.3);
    }

    .onevr-vacancy-other {
      background: linear-gradient(135deg, #636366, #8e8e93);
      box-shadow: 0 2px 8px rgba(99,99,102,.3);
    }

    .onevr-vacancy-empty {
      text-align: center;
      padding: 40px 20px;
      color: #34c759;
      font-size: 18px;
      font-weight: 600;
    }

    /* ============================================
       EXPORT BUTTON
       ============================================ */
    .onevr-btn-export {
      background: linear-gradient(135deg, #5856d6, #7d7aff);
      color: #fff;
      box-shadow: 0 2px 8px rgba(88,86,214,.3);
    }

    .onevr-btn-export:active {
      transform: scale(.98);
      background: linear-gradient(135deg, #4a48b0, #5856d6);
    }

    /* ============================================
       PIN DIALOG
       ============================================ */
    .onevr-pin-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.5);
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      z-index: 100002;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .onevr-pin-content {
      background: #fff;
      border-radius: 20px;
      width: 100%;
      max-width: 320px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,.25);
    }

    .onevr-pin-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      background: linear-gradient(135deg, #5856d6, #7d7aff);
      color: #fff;
      font-weight: 700;
      font-size: 18px;
    }

    .onevr-pin-close {
      background: rgba(255,255,255,.2);
      border: none;
      font-size: 18px;
      color: #fff;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 8px;
    }

    .onevr-pin-close:active { background: rgba(255,255,255,.3); }

    .onevr-pin-body {
      padding: 24px 20px 20px;
    }

    .onevr-pin-dots {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .onevr-pin-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #e5e5ea;
      border: 2px solid #c7c7cc;
      transition: all .15s ease;
    }

    .onevr-pin-dot.filled {
      background: #5856d6;
      border-color: #5856d6;
      box-shadow: 0 0 8px rgba(88,86,214,.4);
    }

    .onevr-pin-pad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .onevr-pin-key {
      background: #f2f2f7;
      border: none;
      border-radius: 12px;
      font-size: 22px;
      font-weight: 600;
      color: #1c1c1e;
      padding: 16px;
      cursor: pointer;
      transition: all .1s ease;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }

    .onevr-pin-key:active {
      background: #d1d1d6;
      transform: scale(.95);
    }

    .onevr-pin-key-del {
      font-size: 16px;
      color: #ff3b30;
    }

    .onevr-pin-key-empty {
      background: transparent;
      cursor: default;
      pointer-events: none;
    }

    .onevr-pin-key-empty:active {
      transform: none;
      background: transparent;
    }

    .onevr-pin-error {
      text-align: center;
      color: #ff3b30;
      font-size: 14px;
      font-weight: 600;
      margin-top: 14px;
      min-height: 20px;
    }

    @keyframes onevr-shake {
      0%, 100% { transform: translateX(0); }
      10%, 50%, 90% { transform: translateX(-6px); }
      30%, 70% { transform: translateX(6px); }
    }

    .onevr-pin-shake {
      animation: onevr-shake .4s ease;
    }

    /* ============================================
       DAGVY BUTTON (on person card)
       ============================================ */
    .onevr-dagvy-btn {
      background: linear-gradient(135deg, #007aff, #5856d6);
      border: none;
      color: #fff;
      font-size: 14px;
      padding: 2px 8px;
      border-radius: 8px;
      cursor: pointer;
      margin-left: 6px;
      -webkit-tap-highlight-color: transparent;
      transition: transform .1s ease;
    }

    .onevr-dagvy-btn:active {
      transform: scale(.9);
    }

    .onevr-person-tracked {
      border-left: 3px solid #007aff;
    }

    /* ============================================
       DAGVY MODAL
       ============================================ */
    .onevr-dagvy-modal {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.5);
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      z-index: 100001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .onevr-dagvy-content {
      background: #fff;
      border-radius: 20px;
      width: 100%;
      max-width: 420px;
      max-height: 85vh;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,.25);
      display: flex;
      flex-direction: column;
    }

    .onevr-dagvy-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: linear-gradient(135deg, #007aff, #5856d6);
      color: #fff;
      font-weight: 700;
      font-size: 17px;
    }

    .onevr-dagvy-close {
      background: rgba(255,255,255,.2);
      border: none;
      font-size: 18px;
      color: #fff;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 8px;
    }

    .onevr-dagvy-close:active { background: rgba(255,255,255,.3); }

    .onevr-dagvy-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }

    .onevr-dagvy-info {
      padding: 12px 16px;
      background: rgba(0,122,255,.06);
      border-bottom: 1px solid rgba(0,0,0,.06);
    }

    .onevr-dagvy-info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }

    .onevr-dagvy-info-row:last-child { margin-bottom: 0; }

    .onevr-dagvy-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 6px;
      color: #fff;
    }

    .onevr-dagvy-turnr {
      font-weight: 700;
      font-size: 14px;
      color: #007aff;
      font-variant-numeric: tabular-nums;
    }

    .onevr-dagvy-date {
      font-size: 13px;
      color: rgba(60,60,67,.6);
      margin-left: auto;
    }

    .onevr-dagvy-time {
      font-size: 13px;
      font-weight: 600;
      color: rgba(60,60,67,.8);
    }

    .onevr-dagvy-stats {
      font-size: 12px;
      color: rgba(60,60,67,.5);
      margin-left: auto;
    }

    .onevr-dagvy-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
      max-height: 55vh;
    }

    .onevr-dagvy-seg {
      display: flex;
      padding: 10px 16px;
      border-bottom: 1px solid rgba(0,0,0,.05);
      gap: 12px;
    }

    .onevr-dagvy-seg:last-child { border-bottom: none; }

    .onevr-dagvy-seg-left {
      display: flex;
      flex-direction: column;
      min-width: 110px;
    }

    .onevr-dagvy-seg-time {
      font-size: 13px;
      font-weight: 600;
      color: #1c1c1e;
      font-variant-numeric: tabular-nums;
    }

    .onevr-dagvy-seg-route {
      font-size: 11px;
      color: rgba(60,60,67,.5);
      margin-top: 2px;
    }

    .onevr-dagvy-seg-right {
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: center;
    }

    .onevr-dagvy-train {
      background: rgba(0,144,65,.04);
    }

    .onevr-dagvy-train-nr {
      font-size: 15px;
      font-weight: 700;
      color: #009041;
    }

    .onevr-dagvy-train-type {
      font-size: 12px;
      color: #009041;
      opacity: .7;
    }

    .onevr-dagvy-vehicle {
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      background: #009041;
      padding: 2px 8px;
      border-radius: 6px;
      margin-top: 4px;
      display: inline-block;
      width: fit-content;
    }

    .onevr-dagvy-activity {
      background: transparent;
    }

    .onevr-dagvy-act-name {
      font-size: 13px;
      color: rgba(60,60,67,.8);
      font-weight: 500;
    }

    .onevr-dagvy-contact {
      font-size: 13px;
      color: #007aff;
    }

    .onevr-dagvy-trains {
      font-size: 12px;
      color: rgba(60,60,67,.6);
      font-variant-numeric: tabular-nums;
    }

    .onevr-dagvy-empty {
      text-align: center;
      padding: 40px 20px;
      color: rgba(60,60,67,.5);
      font-size: 16px;
    }

    /* ============================================
       EXPORT MENU
       ============================================ */
    .onevr-export-section {
      padding: 16px;
    }

    .onevr-export-section-title {
      font-size: 15px;
      font-weight: 700;
      color: #1c1c1e;
      margin-bottom: 2px;
    }

    .onevr-export-section-sub {
      font-size: 12px;
      color: rgba(60,60,67,.5);
      margin-bottom: 12px;
    }

    .onevr-export-person {
      background: rgba(0,122,255,.04);
      border: 1px solid rgba(0,122,255,.1);
      border-radius: 14px;
      padding: 12px 14px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all .15s ease;
    }

    .onevr-export-person:active {
      transform: scale(.98);
      background: rgba(0,122,255,.1);
    }

    .onevr-export-person:last-child { margin-bottom: 0; }

    .onevr-export-person-top {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .onevr-export-name {
      font-size: 15px;
      font-weight: 600;
      color: #1c1c1e;
    }

    .onevr-export-turnr {
      font-size: 13px;
      font-weight: 700;
      color: #007aff;
      margin-left: auto;
      font-variant-numeric: tabular-nums;
    }

    .onevr-export-person-bottom {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .onevr-export-time {
      font-size: 12px;
      color: rgba(60,60,67,.7);
    }

    .onevr-export-trains {
      font-size: 11px;
      color: rgba(60,60,67,.5);
      font-variant-numeric: tabular-nums;
    }

    .onevr-export-phone {
      font-size: 12px;
      color: #007aff;
    }

    .onevr-export-person-action {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(0,122,255,.1);
      font-size: 13px;
      font-weight: 600;
      color: #5856d6;
      text-align: center;
    }

    .onevr-export-empty {
      text-align: center;
      padding: 30px 16px;
      color: rgba(60,60,67,.5);
      font-size: 14px;
    }

    .onevr-export-names {
      padding: 12px 16px;
      border-top: 1px solid rgba(0,0,0,.06);
      font-size: 11px;
      color: rgba(60,60,67,.4);
    }

    .onevr-export-names-label {
      font-weight: 600;
    }

    /* ============================================
       TRAIN LINK (clickable in dagvy)
       ============================================ */
    .onevr-dagvy-train-link {
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .onevr-dagvy-train-link:active {
      opacity: .6;
    }

    /* ============================================
       CREW MODAL
       ============================================ */
    .onevr-crew-info {
      padding: 12px 16px;
      background: rgba(0,144,65,.06);
      border-bottom: 1px solid rgba(0,0,0,.06);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .onevr-crew-vehicles {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .onevr-crew-vehicle-badge {
      background: #009041;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 8px;
    }

    .onevr-crew-date {
      font-size: 13px;
      color: rgba(60,60,67,.6);
      margin-left: auto;
    }

    .onevr-crew-segment {
      border-bottom: 1px solid rgba(0,0,0,.06);
      padding-bottom: 4px;
      margin-bottom: 4px;
    }

    .onevr-crew-segment:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    .onevr-crew-seg-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px 4px;
    }

    .onevr-crew-seg-time {
      font-size: 12px;
      font-weight: 700;
      color: #009041;
      font-variant-numeric: tabular-nums;
    }

    .onevr-crew-seg-route {
      font-size: 11px;
      color: rgba(60,60,67,.5);
    }

    .onevr-crew-member {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      gap: 10px;
    }

    .onevr-crew-member-self {
      background: rgba(0,122,255,.06);
      border-left: 3px solid #007aff;
    }

    .onevr-crew-member-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .onevr-crew-member-name {
      font-size: 14px;
      font-weight: 600;
      color: #1c1c1e;
    }

    .onevr-crew-member-role {
      font-size: 12px;
      color: rgba(60,60,67,.6);
    }

    .onevr-crew-member-phone {
      font-size: 12px;
      color: #007aff;
      white-space: nowrap;
    }

    /* ============================================
       MULTI-DAY DAGVY
       ============================================ */
    .onevr-dagvy-header-sub {
      font-size: 12px;
      font-weight: 500;
      opacity: .75;
      margin-top: 2px;
    }

    .onevr-multi-days {
      flex: 1;
      overflow-y: auto;
      max-height: calc(85vh - 70px);
    }

    .onevr-multi-progress {
      margin-top: 12px;
      color: #1c1c1e !important;
      font-size: 15px;
      font-weight: 700;
      text-align: center;
      opacity: 1 !important;
    }

    .onevr-day-section {
      border-bottom: 1px solid rgba(0,0,0,.06);
    }

    .onevr-day-section:last-child { border-bottom: none; }

    .onevr-day-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      transition: background .15s;
    }

    .onevr-day-header:active { background: rgba(0,0,0,.03); }

    .onevr-day-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .onevr-day-weekday {
      font-size: 15px;
      font-weight: 700;
      color: #007aff;
      min-width: 32px;
    }

    .onevr-day-date {
      font-size: 14px;
      font-weight: 500;
      color: rgba(60,60,67,.6);
      font-variant-numeric: tabular-nums;
    }

    .onevr-day-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .onevr-day-turnr {
      font-size: 13px;
      font-weight: 700;
      color: #007aff;
      font-variant-numeric: tabular-nums;
    }

    .onevr-day-time {
      font-size: 12px;
      color: rgba(60,60,67,.6);
      font-variant-numeric: tabular-nums;
    }

    .onevr-day-count {
      font-size: 12px;
      color: #009041;
      font-weight: 600;
    }

    .onevr-day-off {
      font-size: 12px;
      color: #8e8e93;
      font-style: italic;
    }

    .onevr-day-arrow {
      color: #c7c7cc;
      font-size: 16px;
      transition: transform .25s;
    }

    .onevr-day-open .onevr-day-arrow { transform: rotate(180deg); }

    .onevr-day-content {
      display: none;
      background: rgba(0,0,0,.02);
    }

    .onevr-day-open .onevr-day-content { display: block; }

    .onevr-day-notfound .onevr-day-weekday {
      color: #8e8e93;
    }

    .onevr-day-notfound .onevr-day-header {
      opacity: .7;
    }

    /* ============================================
       INLINE CREW (inside dagvy train segments)
       ============================================ */
    .onevr-dagvy-crew-toggle {
      cursor: pointer;
      text-decoration: none;
    }

    .onevr-dagvy-crew-toggle:active { opacity: .6; }

    .onevr-dagvy-has-crew {
      cursor: pointer;
      flex-wrap: wrap;
    }

    .onevr-inline-crew {
      display: none;
      width: 100%;
      padding: 8px 0 4px;
      margin-top: 8px;
      border-top: 1px solid rgba(0,144,65,.15);
    }

    .onevr-crew-expanded .onevr-inline-crew {
      display: block;
    }

    .onevr-inline-crew-vehicles {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }

    .onevr-inline-crew-member {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid rgba(0,0,0,.04);
    }

    .onevr-inline-crew-member:last-child { border-bottom: none; }

    .onevr-inline-crew-self {
      background: rgba(0,122,255,.06);
      border-radius: 6px;
      padding: 6px 8px;
      margin: 0 -6px;
      border-left: 2px solid #007aff;
    }

    .onevr-inline-crew-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .onevr-inline-crew-name {
      font-size: 13px;
      font-weight: 600;
      color: #1c1c1e;
    }

    .onevr-inline-crew-role {
      font-size: 11px;
      color: rgba(60,60,67,.6);
    }

    .onevr-inline-crew-route {
      font-size: 11px;
      color: rgba(60,60,67,.5);
      font-variant-numeric: tabular-nums;
      margin-top: 1px;
    }

    .onevr-inline-crew-phone {
      font-size: 11px;
      color: #007aff;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ============================================
       FIREBASE UPLOAD BUTTON
       ============================================ */
    .onevr-dagvy-footer {
      padding: 12px 16px;
      border-top: 1px solid rgba(0,0,0,.06);
    }

    .onevr-dagvy-footer-row {
      display: flex;
      gap: 10px;
    }

    .onevr-firebase-btn {
      flex: 1;
      padding: 14px 16px;
      background: linear-gradient(135deg, #ff9500, #ff6b00);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: all .15s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .onevr-firebase-btn:active {
      transform: scale(.97);
      opacity: .9;
    }

    .onevr-firebase-btn:disabled {
      cursor: default;
    }

    .onevr-firebase-sending {
      background: linear-gradient(135deg, #8e8e93, #a0a0a5);
      animation: onevr-pulse 1.5s ease-in-out infinite;
    }

    .onevr-firebase-done {
      background: linear-gradient(135deg, #34c759, #30d158);
      box-shadow: 0 2px 12px rgba(52,199,89,.3);
    }

    .onevr-firebase-error {
      background: linear-gradient(135deg, #ff3b30, #ff6b6b);
    }

    .onevr-download-btn {
      flex: 1;
      padding: 14px 16px;
      background: linear-gradient(135deg, #007aff, #0a84ff);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: all .15s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .onevr-download-btn:active {
      transform: scale(.97);
      opacity: .9;
    }

    .onevr-download-done {
      background: linear-gradient(135deg, #34c759, #30d158);
    }

    /* ============================================
       BATCH ACTIONS (Export menu)
       ============================================ */
    .onevr-batch-section {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-bottom: 1px solid rgba(0,0,0,.06);
    }

    .onevr-batch-btn {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border: none;
      border-radius: 14px;
      cursor: pointer;
      transition: all .15s ease;
      -webkit-tap-highlight-color: transparent;
      text-align: left;
      width: 100%;
    }

    .onevr-batch-btn:active {
      transform: scale(.98);
      opacity: .9;
    }

    .onevr-batch-btn-icon {
      font-size: 24px;
      flex-shrink: 0;
      width: 36px;
      text-align: center;
    }

    .onevr-batch-btn-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .onevr-batch-btn-title {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }

    .onevr-batch-btn-sub {
      font-size: 12px;
      color: rgba(255,255,255,.7);
    }

    .onevr-batch-scrape {
      background: linear-gradient(135deg, #5856d6, #7d7aff);
      box-shadow: 0 3px 12px rgba(88,86,214,.3);
    }

    .onevr-batch-upload {
      background: linear-gradient(135deg, #ff9500, #ff6b00);
      box-shadow: 0 3px 12px rgba(255,149,0,.3);
    }

    .onevr-batch-json {
      background: linear-gradient(135deg, #007aff, #0a84ff);
      box-shadow: 0 3px 12px rgba(0,122,255,.3);
    }

    .onevr-batch-pos {
      background: linear-gradient(135deg, #0055CC, #007AFF);
      box-shadow: 0 3px 12px rgba(0,122,255,.3);
    }

    .onevr-batch-turns {
      background: linear-gradient(135deg, #009041, #34c759);
      box-shadow: 0 3px 12px rgba(0,144,65,.3);
    }

    .onevr-batch-vak {
      background: linear-gradient(135deg, #b71c1c, #e53935);
      box-shadow: 0 3px 12px rgba(183,28,28,.3);
    }

    .onevr-batch-doc-ta {
      background: linear-gradient(135deg, #d63027, #ff6b6b);
      box-shadow: 0 3px 12px rgba(214,48,39,.3);
    }

    .onevr-batch-doc-drift {
      background: linear-gradient(135deg, #c44900, #ff9500);
      box-shadow: 0 3px 12px rgba(196,73,0,.3);
    }

    .onevr-progress-bar-doc { background: linear-gradient(90deg, #d63027, #ff6b6b); }
    .onevr-progress-pct-doc { color: #d63027; }

    .onevr-batch-disabled {
      opacity: .4;
      cursor: default;
      box-shadow: none;
    }

    .onevr-batch-disabled:active {
      transform: none;
      opacity: .4;
    }

    .onevr-batch-sending {
      animation: onevr-pulse 1.5s ease-in-out infinite;
      background: linear-gradient(135deg, #8e8e93, #a0a0a5);
      box-shadow: none;
    }

    @keyframes onevr-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .6; }
    }

    .onevr-batch-done {
      background: linear-gradient(135deg, #34c759, #30d158) !important;
      box-shadow: 0 3px 12px rgba(52,199,89,.3) !important;
    }

    .onevr-batch-error {
      background: linear-gradient(135deg, #ff3b30, #ff6b6b) !important;
      box-shadow: 0 3px 12px rgba(255,59,48,.3) !important;
    }

    /* Compact button row layout */
    .onevr-batch-compact {
      padding: 10px 12px;
      gap: 8px;
    }

    .onevr-btn-row {
      display: flex;
      gap: 6px;
    }

    .onevr-mini-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 8px 4px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all .15s ease;
      -webkit-tap-highlight-color: transparent;
      text-align: center;
      min-height: 0;
    }

    .onevr-mini-btn:active {
      transform: scale(.96);
      opacity: .9;
    }

    .onevr-mini-icon {
      font-size: 18px;
      line-height: 1;
    }

    .onevr-mini-label {
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .onevr-mini-wide {
      flex: none;
      width: 100%;
      flex-direction: row;
      gap: 8px;
      padding: 8px 12px;
    }

    .onevr-mini-wide .onevr-mini-label {
      font-size: 13px;
    }

    /* Export status badges */
    .onevr-export-status {
      font-size: 14px;
      flex-shrink: 0;
    }

    /* ============================================
       EXPORT MODAL (scrollable)
       ============================================ */
    .onevr-export-modal {
      max-width: 440px;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .onevr-export-list-wrap {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      min-height: 0;
      max-height: 40vh;
      position: relative;
    }

    .onevr-export-list-wrap::after {
      content: '';
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      height: 30px;
      display: block;
      background: linear-gradient(transparent, var(--onevr-card-bg, #fff));
      pointer-events: none;
    }

    /* ============================================
       DAY SELECTOR
       ============================================ */
    .onevr-day-selector {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .onevr-day-selector-label {
      font-size: 14px;
      font-weight: 600;
      color: #1c1c1e;
    }

    .onevr-day-selector-btns {
      display: flex;
      gap: 6px;
    }

    .onevr-day-sel-btn {
      width: 34px;
      height: 30px;
      border: 2px solid rgba(88,86,214,.3);
      border-radius: 8px;
      background: transparent;
      color: #5856d6;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all .15s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .onevr-day-sel-btn:active {
      transform: scale(.92);
    }

    .onevr-day-sel-active {
      background: linear-gradient(135deg, #5856d6, #7d7aff);
      color: #fff;
      border-color: #5856d6;
      box-shadow: 0 2px 8px rgba(88,86,214,.3);
    }

    /* ============================================
       PROGRESS BAR
       ============================================ */
    .onevr-progress-bar-wrap {
      width: 80%;
      max-width: 260px;
      height: 8px;
      background: rgba(118,118,128,.15);
      border-radius: 4px;
      margin-top: 16px;
      overflow: hidden;
    }

    .onevr-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #009041, #34c759);
      border-radius: 4px;
      transition: width .4s ease;
    }

    .onevr-progress-pct {
      margin-top: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #009041;
      font-variant-numeric: tabular-nums;
    }

    .onevr-turns-day-btn {
      width: 36px;
      height: 36px;
      border: 2px solid rgba(0,144,65,.3);
      border-radius: 10px;
      background: transparent;
      color: #009041;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all .15s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .onevr-turns-day-btn:active {
      transform: scale(.92);
    }

    .onevr-turns-day-btn.onevr-day-sel-active {
      background: linear-gradient(135deg, #009041, #34c759);
      color: #fff;
      border-color: #009041;
      box-shadow: 0 2px 8px rgba(0,144,65,.3);
    }

    /* ============================================
       WEEKLY TURNS RESULT
       ============================================ */
    .onevr-turns-result-stats {
      text-align: center;
      margin-bottom: 20px;
    }

    .onevr-turns-result-big {
      font-size: 48px;
      font-weight: 800;
      color: #009041;
      line-height: 1;
      margin-bottom: 4px;
    }

    .onevr-turns-result-label {
      font-size: 15px;
      font-weight: 600;
      color: rgba(60,60,67,.8);
    }

    .onevr-turns-result-period {
      font-size: 13px;
      color: rgba(60,60,67,.5);
      margin-top: 4px;
      font-variant-numeric: tabular-nums;
    }

    .onevr-turns-summary {
      background: rgba(0,144,65,.06);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 16px;
    }

    .onevr-turns-summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 4px;
      border-bottom: 1px solid rgba(0,0,0,.05);
    }

    .onevr-turns-summary-row:last-child { border-bottom: none; }
    .onevr-vak-today { background: rgba(0,122,255,.08); border-radius: 6px; }

    .onevr-turns-summary-day {
      font-size: 14px;
      font-weight: 600;
      color: #1c1c1e;
    }

    .onevr-turns-summary-count {
      font-size: 13px;
      font-weight: 700;
      color: #009041;
      font-variant-numeric: tabular-nums;
    }

    .onevr-turns-download-btn {
      display: block;
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #009041, #34c759);
      border: none;
      border-radius: 14px;
      color: #fff;
      font-size: 16px;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,144,65,.3);
      transition: all .15s ease;
      -webkit-tap-highlight-color: transparent;
      box-sizing: border-box;
      margin-bottom: 10px;
    }

    .onevr-turns-download-btn:active {
      transform: scale(.97);
      opacity: .9;
    }

    .onevr-turns-back-btn {
      display: block;
      width: 100%;
      padding: 14px;
      background: rgba(118,118,128,.08);
      border: none;
      border-radius: 12px;
      color: rgba(60,60,67,.8);
      font-size: 15px;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
      transition: all .15s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .onevr-turns-back-btn:active {
      transform: scale(.97);
      background: rgba(118,118,128,.15);
    }

    /* ============================================
       BATCH DETAIL TEXT
       ============================================ */
    .onevr-batch-detail {
      margin-top: 8px;
      color: #3a3a3c !important;
      font-size: 13px;
      font-weight: 500;
      text-align: center;
      min-height: 18px;
      opacity: 1 !important;
    }

    .onevr-elapsed {
      margin-top: 8px;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      color: #8e8e93;
      font-variant-numeric: tabular-nums;
      opacity: 1 !important;
    }
  `;

  var style = document.createElement('style');
  style.id = 'onevr-styles';
  style.textContent = css.replace(/\s+/g, ' ').trim();
  document.head.appendChild(style);

  console.log('[OneVR] Styles loaded');
})();
