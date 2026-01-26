/**
 * OneVR Loader
 * Minimal entry point that loads all modules in correct order
 */
(function() {
  'use strict';

  // ============================================================
  // CONFIGURATION - Ändra till din GitHub Pages URL
  // ============================================================
  var BASE_URL = 'https://YOUR_USERNAME.github.io/YOUR_REPO';

  // Modules to load (in order)
  var modules = [
    '/modules/styles.js',
    '/modules/utils.js',
    '/modules/scraper.js',
    '/modules/ui.js',
    '/modules/events.js'
  ];

  var loaded = 0;
  var cache = '?v=' + Date.now();

  // Show loading indicator
  var loader = document.createElement('div');
  loader.id = 'onevr-loader';
  loader.innerHTML = '<div class="onevr-loading-overlay">' +
    '<div class="onevr-spinner"></div>' +
    '<div class="onevr-loading-text">Laddar OneVR...</div>' +
    '</div>';

  // Inject minimal loader styles
  var style = document.createElement('style');
  style.textContent = '.onevr-loading-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif}.onevr-spinner{width:44px;height:44px;border:3px solid rgba(255,255,255,.2);border-top-color:#007aff;border-radius:50%;animation:onevr-spin .8s linear infinite}.onevr-loading-text{color:#fff;margin-top:16px;font-size:17px}@keyframes onevr-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);
  document.body.appendChild(loader);

  // Initialize global namespace
  window.OneVR = window.OneVR || {
    config: null,
    cache: {},
    state: {}
  };

  // Load config first
  fetch(BASE_URL + '/config.json' + cache)
    .then(function(r) { return r.json(); })
    .then(function(cfg) {
      window.OneVR.config = cfg;
      window.OneVR.baseUrl = BASE_URL;
      loadNextModule();
    })
    .catch(function(err) {
      showError('Kunde inte ladda config: ' + err.message);
    });

  function loadNextModule() {
    if (loaded >= modules.length) {
      // All loaded - start app
      loader.remove();
      if (window.OneVR.init) {
        window.OneVR.init();
      }
      return;
    }

    var script = document.createElement('script');
    script.src = BASE_URL + modules[loaded] + cache;
    script.onload = function() {
      loaded++;
      updateProgress();
      loadNextModule();
    };
    script.onerror = function() {
      showError('Kunde inte ladda: ' + modules[loaded]);
    };
    document.body.appendChild(script);
  }

  function updateProgress() {
    var text = loader.querySelector('.onevr-loading-text');
    if (text) {
      text.textContent = 'Laddar... ' + Math.round((loaded / modules.length) * 100) + '%';
    }
  }

  function showError(msg) {
    var text = loader.querySelector('.onevr-loading-text');
    if (text) {
      text.textContent = msg;
      text.style.color = '#ff3b30';
    }
  }
})();
