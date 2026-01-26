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
      padding: 14px 16px;
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
      font-size: 13px;
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
       FILTERS
       ============================================ */
    .onevr-filters {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .onevr-filter {
      padding: 8px 14px;
      background: rgba(118,118,128,.08);
      border: none;
      border-radius: 20px;
      color: rgba(60,60,67,.9);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all .2s;
    }

    .onevr-filter:active { transform: scale(.95); }

    .onevr-filter.active {
      background: linear-gradient(135deg, #007aff, #0a84ff);
      color: #fff;
      box-shadow: 0 2px 8px rgba(0,122,255,.3);
    }

    .onevr-filter-label {
      font-size: 12px;
      color: rgba(60,60,67,.6);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .5px;
      margin-bottom: 8px;
      margin-top: 14px;
    }

    .onevr-filter-label:first-child { margin-top: 0; }

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

      .onevr-filter {
        background: rgba(118,118,128,.2);
        color: rgba(235,235,245,.9);
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

      .onevr-loading-overlay { background: rgba(0,0,0,.9); }

      .onevr-spinner {
        border-color: rgba(255,255,255,.15);
        border-top-color: #0a84ff;
      }

      .onevr-loading-text { color: #fff; }
    }
  `;

  var style = document.createElement('style');
  style.id = 'onevr-styles';
  style.textContent = css.replace(/\s+/g, ' ').trim();
  document.head.appendChild(style);

  console.log('[OneVR] Styles loaded');
})();
