/**
 * OneVR Loader
 * Loads all modules in correct order
 */
(function() {
  'use strict';

  // Initialize global namespace
  window.OneVR = window.OneVR || { cache: {}, state: {} };

  var BASE_URL = 'https://ke86.github.io/snok/modules/';
  var VERSION = '28';

  // Modules to load in order
  var modules = [
    'styles',
    'utils',
    'scraper',
    'ui',
    'vacancies',
    'events'
  ];

  var index = 0;

  function loadNext() {
    if (index >= modules.length) {
      console.log('[OneVR] All modules loaded');
      return;
    }

    var name = modules[index];
    var script = document.createElement('script');
    script.src = BASE_URL + name + '.js?v=' + VERSION + '.' + Date.now();

    script.onload = function() {
      console.log('[OneVR] Loaded: ' + name);
      index++;
      loadNext();
    };

    script.onerror = function() {
      console.error('[OneVR] Failed to load: ' + name);
      index++;
      loadNext();
    };

    document.head.appendChild(script);
  }

  loadNext();
})();
