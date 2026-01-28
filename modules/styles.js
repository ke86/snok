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

    .onevr-btn-vakans {
      background: linear-gradient(135deg, #ff3b30, #ff6b6b);
      color: #fff;
      box-shadow: 0 2px 8px rgba(255,59,48,.3);
    }

    .onevr-btn-vakans:active {
      transform: scale(.98);
      background: linear-gradient(135deg, #d63027, #ff3b30);
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
      background: #fff;
      border-radius: 14px;
      padding: 14px;
      margin-top: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,.1);
    }

    .onevr-load-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }

    .onevr-load-pill {
      padding: 8px 14px;
      background: rgba(118,118,128,.1);
      border: none;
      border-radius: 18px;
      color: rgba(60,60,67,.9);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
    }

    .onevr-load-pill:active {
      transform: scale(.95);
    }

    .onevr-load-pill.active {
      background: linear-gradient(135deg, #007aff, #0a84ff);
      color: #fff;
      box-shadow: 0 2px 8px rgba(0,122,255,.3);
    }

    .onevr-load-actions {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }

    .onevr-load-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
    }

    .onevr-load-btn-start {
      flex: 1;
      background: linear-gradient(135deg, #007aff, #0a84ff);
      color: #fff;
    }

    .onevr-load-btn-start:active {
      transform: scale(.98);
    }

    .onevr-load-btn-cancel {
      background: rgba(118,118,128,.12);
      color: rgba(60,60,67,.6);
    }

    .onevr-load-btn-cancel:active {
      background: rgba(118,118,128,.2);
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
       EXPORT MODAL
       ============================================ */
    .onevr-export-modal {
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

    .onevr-export-content {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 380px;
      max-height: 80vh;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,.25);
      display: flex;
      flex-direction: column;
    }

    .onevr-export-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: .5px solid rgba(0,0,0,.1);
      font-weight: 600;
      font-size: 17px;
      color: #000;
    }

    .onevr-export-close {
      background: none;
      border: none;
      font-size: 20px;
      color: rgba(60,60,67,.6);
      cursor: pointer;
      padding: 4px;
    }

    .onevr-export-close:hover { color: #000; }

    .onevr-export-info {
      padding: 12px 20px;
      background: rgba(0,122,255,.08);
      color: rgba(60,60,67,.8);
      font-size: 14px;
    }

    .onevr-export-info strong {
      color: #007aff;
    }

    .onevr-export-textarea {
      flex: 1;
      min-height: 200px;
      max-height: 300px;
      margin: 16px 20px;
      padding: 12px;
      background: rgba(118,118,128,.08);
      border: none;
      border-radius: 10px;
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 12px;
      color: #000;
      resize: none;
    }

    .onevr-export-textarea:focus {
      outline: none;
      background: rgba(118,118,128,.12);
    }

    .onevr-export-actions {
      padding: 0 20px 20px;
    }

    .onevr-export-copy {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #007aff, #0a84ff);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
    }

    .onevr-export-copy:active {
      transform: scale(.98);
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

    .onevr-vacancy-close:active {
      background: rgba(255,255,255,.3);
    }

    .onevr-vacancy-date {
      padding: 14px 20px;
      background: rgba(0,122,255,.08);
      color: rgba(60,60,67,.9);
      font-size: 15px;
      text-align: center;
    }

    .onevr-vacancy-date strong {
      color: #007aff;
    }

    .onevr-vacancy-stats {
      display: flex;
      padding: 16px;
      gap: 12px;
      border-bottom: .5px solid rgba(0,0,0,.1);
    }

    .onevr-vacancy-stat {
      flex: 1;
      text-align: center;
      padding: 12px 8px;
      background: rgba(118,118,128,.06);
      border-radius: 12px;
    }

    .onevr-vacancy-stat-num {
      display: block;
      font-size: 28px;
      font-weight: 700;
      line-height: 1;
    }

    .onevr-vacancy-stat-label {
      display: block;
      font-size: 11px;
      color: rgba(60,60,67,.6);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    .onevr-stat-expected { color: #007aff; }
    .onevr-stat-current { color: #34c759; }
    .onevr-stat-vacancy { color: #ff3b30; }

    .onevr-vacancy-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      max-height: 300px;
    }

    .onevr-vacancy-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .onevr-vacancy-item {
      padding: 10px 8px;
      background: linear-gradient(135deg, #ff3b30, #ff6b6b);
      color: #fff;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .onevr-vacancy-empty {
      text-align: center;
      padding: 40px 20px;
      color: #34c759;
      font-size: 18px;
      font-weight: 600;
    }

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

      .onevr-load-menu {
        background: #2c2c2e;
        box-shadow: 0 4px 20px rgba(0,0,0,.4);
      }

      .onevr-load-pill {
        background: rgba(118,118,128,.24);
        color: rgba(235,235,245,.9);
      }

      .onevr-load-pill.active {
        background: linear-gradient(135deg, #0a84ff, #007aff);
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

      .onevr-export-content {
        background: #2c2c2e;
      }

      .onevr-export-header {
        color: #fff;
        border-bottom-color: rgba(255,255,255,.1);
      }

      .onevr-export-close { color: rgba(235,235,245,.6); }
      .onevr-export-close:hover { color: #fff; }

      .onevr-export-info {
        background: rgba(10,132,255,.15);
        color: rgba(235,235,245,.8);
      }

      .onevr-export-info strong { color: #0a84ff; }

      .onevr-export-textarea {
        background: rgba(118,118,128,.24);
        color: #fff;
      }

      .onevr-export-textarea:focus {
        background: rgba(118,118,128,.3);
      }

      .onevr-export-copy {
        background: linear-gradient(135deg, #0a84ff, #007aff);
      }

      .onevr-vacancy-content {
        background: #1c1c1e;
      }

      .onevr-vacancy-date {
        background: rgba(10,132,255,.15);
        color: rgba(235,235,245,.9);
      }

      .onevr-vacancy-date strong { color: #0a84ff; }

      .onevr-vacancy-stats {
        border-bottom-color: rgba(255,255,255,.1);
      }

      .onevr-vacancy-stat {
        background: rgba(118,118,128,.2);
      }

      .onevr-vacancy-stat-label {
        color: rgba(235,235,245,.6);
      }

      .onevr-stat-expected { color: #0a84ff; }
      .onevr-stat-current { color: #30d158; }
      .onevr-stat-vacancy { color: #ff453a; }

      .onevr-vacancy-empty { color: #30d158; }
    }
  `;

  var style = document.createElement('style');
  style.id = 'onevr-styles';
  style.textContent = css.replace(/\s+/g, ' ').trim();
  document.head.appendChild(style);

  console.log('[OneVR] Styles loaded');
})();
