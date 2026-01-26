// ============================================================
// MINIMAL BOOKMARKLET LOADER
// ============================================================
//
// Instruktioner:
// 1. Byt ut YOUR_USERNAME och YOUR_REPO nedan mot dina värden
// 2. Minifiera koden (ta bort kommentarer och whitespace)
// 3. Skapa ett nytt bokmärke i webbläsaren
// 4. Klistra in den minifierade koden som URL
//
// ============================================================

// FULL VERSION (för utveckling):
javascript:(function(){
  var s = document.createElement('script');
  s.src = 'https://YOUR_USERNAME.github.io/YOUR_REPO/onevr.js?v=' + Date.now();
  document.body.appendChild(s);
})();

// ============================================================
// MINIFIERAD VERSION (kopiera denna till bokmärket):
// ============================================================
//
// javascript:(function(){var s=document.createElement('script');s.src='https://YOUR_USERNAME.github.io/YOUR_REPO/onevr.js?v='+Date.now();document.body.appendChild(s);})();
//
// ============================================================

// ============================================================
// ALTERNATIV: Med cache-busting endast vid uppdateringar
// ============================================================
//
// Om du vill använda browserens cache (snabbare laddning) men
// kunna tvinga uppdatering, ändra versionsnumret manuellt:
//
// javascript:(function(){var s=document.createElement('script');s.src='https://YOUR_USERNAME.github.io/YOUR_REPO/onevr.js?v=1.0.0';document.body.appendChild(s);})();
//
// ============================================================
