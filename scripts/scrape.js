+   1 /**
+   2  * OneVR Automated Scraper — Playwright script for GitHub Actions
+   3  * Runs "Kör allt" automatically: Dagvy 7d → Positionslista 20d → TA → Driftmeddelande → Firebase
+   4  *
+   5  * Authentication modes:
+   6  * 1. Cookie-based (preferred): Uses saved session cookies from setup-cookies.js
+   7  * 2. Fallback: Manual credentials if cookies missing/expired
+   8  */
+   9 const { chromium } = require('playwright');
+  10 const fs = require('fs');
+  11 const path = require('path');
+  12 
+  13 const EMAIL = process.env.ONEVR_EMAIL;
+  14 const PASSWORD = process.env.ONEVR_PASSWORD;
+  15 const PIN = process.env.ONEVR_PIN || '8612';
+  16 const BASE_URL = 'http://launcher.onevr.vrse.cloud';
+  17 const LOADER_URL = 'https://ke86.github.io/snok/modules/loader.js';
+  18 const COOKIES_FILE = path.join(__dirname, 'cookies.json');
+  19 const LOCALSTORAGE_FILE = path.join(__dirname, 'localStorage.js');
+  20 
+  21 // Timeout settings (ms)
+  22 const LOGIN_TIMEOUT = 60000;      // 60s — increased for GitHub Actions network latency
+  23 const NAV_TIMEOUT = 30000;        // 30s — increased for position list navigation
+  24 const INIT_TIMEOUT = 45000;       // 45s — increased for bookmarklet initialization
+  25 const RUN_ALL_TIMEOUT = 1200000;  // 20 minutes max for full run
+  26 
+  27 // Load localStorage if it exists
+  28 function loadLocalStorage() {
+  29   try {
+  30     if (fs.existsSync(LOCALSTORAGE_FILE)) {
+  31       const localStorage = JSON.parse(fs.readFileSync(LOCALSTORAGE_FILE, 'utf8'));
+  32       console.log('[Scraper] Found saved localStorage (' + Object.keys(localStorage).length + ' items)');
+  33       return localStorage;
+  34     }
+  35   } catch (e) {
+  36     console.log('[Scraper] Could not load localStorage:', e.message);
+  37   }
+  38   return null;
+  39 }
+  40 
+  41 // Load cookies if they exist (legacy)
+  42 function loadCookies() {
+  43   try {
+  44     if (fs.existsSync(COOKIES_FILE)) {
+  45       const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
+  46       console.log('[Scraper] Found saved cookies (' + cookies.length + ' cookies)');
+  47       return cookies;
+  48     }
+  49   } catch (e) {
+  50     console.log('[Scraper] Could not load cookies:', e.message);
+  51   }
+  52   return null;
+  53 }
+  54 
+  55 // Save cookies for future runs
+  56 function saveCookies(cookies) {
+  57   try {
+  58     fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
+  59     console.log('[Scraper] Cookies saved for next run');
+  60   } catch (e) {
+  61     console.error('[Scraper] WARNING: Could not save cookies:', e.message);
+  62   }
+  63 }
+  64 
+  65 (async () => {
+  66   const savedLocalStorage = loadLocalStorage();
+  67   const savedCookies = loadCookies();
+  68   const useLocalStorage = savedLocalStorage !== null;
+  69   const useCookies = !useLocalStorage && savedCookies !== null;
+  70 
+  71   console.log('[Scraper] Starting at', new Date().toISOString());
+  72   console.log('[Scraper] Auth mode:', useLocalStorage ? 'localStorage-based' : useCookies ? 'Cookie-based' : 'Credentials-based');
+  73 
+  74   if (!useLocalStorage && !useCookies && (!EMAIL || !PASSWORD)) {
+  75     console.error('ERROR: No saved localStorage/cookies and ONEVR_EMAIL/ONEVR_PASSWORD not set');
+  76     console.error('Run setup-cookies.js first or upload localStorage.json');
+  77     process.exit(1);
+  78   }
+  79 
+  80   if (!useLocalStorage && !useCookies) {
+  81     console.log('[Scraper] Email:', EMAIL.substring(0, 3) + '***');
+  82   }
+  83 
+  84   const browser = await chromium.launch({
+  85     headless: true,
+  86     args: ['--no-sandbox', '--disable-setuid-sandbox']
+  87   });
+  88 
+  89   const context = await browser.newContext({
+  90     viewport: { width: 1280, height: 800 },
+  91     locale: 'sv-SE',
+  92     userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
+  93     ...(useCookies ? { storageState: { cookies: savedCookies } } : {})
+  94   });
+  95 
+  96   // Load localStorage if available
+  97   if (useLocalStorage) {
+  98     const page = await context.newPage();
+  99     await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
+ 100 
+ 101     // Set localStorage items
+ 102     await page.evaluate((data) => {
+ 103       Object.entries(data).forEach(([key, value]) => {
+ 104         localStorage.setItem(key, value);
+ 105       });
+ 106       console.log('[Page] localStorage restored: ' + Object.keys(data).length + ' items');
+ 107     }, savedLocalStorage);
+ 108 
+ 109     await page.close();
+ 110   }
+ 111 
+ 112   const page = await context.newPage();
+ 113 
+ 114   // Forward ALL console logs from the page for debugging
+ 115   page.on('console', msg => {
+ 116     console.log('[Page]', msg.text());
+ 117   });
+ 118 
+ 119   try {
+ 120     // ══════════════════════════════════════════
+ 121     // STEP 1: Login (or use saved auth)
+ 122     // ══════════════════════════════════════════
+ 123     console.log('[Scraper] Step 1: Checking authentication...');
+ 124 
+ 125     if (useLocalStorage) {
+ 126       // localStorage already loaded — navigate directly to navigation
+ 127       console.log('[Scraper] ✅ Authenticated with localStorage');
+ 128       await page.goto(BASE_URL + '/navigation', { waitUntil: 'domcontentloaded', timeout: LOGIN_TIMEOUT });
+ 129     } else if (useCookies) {
+ 130       // Try to navigate with saved cookies
+ 131       console.log('[Scraper] Attempting to access OneVR with saved cookies...');
+ 132       await page.goto(BASE_URL + '/navigation', { waitUntil: 'networkidle', timeout: LOGIN_TIMEOUT });
+ 133 
+ 134       // Check if we're still authenticated
+ 135       const url = page.url();
+ 136       if (url.includes('/login')) {
+ 137         console.log('[Scraper] ⚠️  Cookies expired, falling back to manual login...');
+ 138         // Cookies expired, fall back to credentials
+ 139         await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle', timeout: LOGIN_TIMEOUT });
+ 140         await performManualLogin(page);
+ 141         // Save new cookies
+ 142         saveCookies(await context.cookies());
+ 143       } else {
+ 144         console.log('[Scraper] ✅ Authenticated with saved cookies');
+ 145       }
+ 146     } else {
+ 147       // Manual login with credentials
+ 148       await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle', timeout: LOGIN_TIMEOUT });
+ 149       await performManualLogin(page);
+ 150       // Save cookies for future use
+ 151       saveCookies(await context.cookies());
+ 152     }
+ 153 
+ 154     console.log('[Scraper] Authentication successful! URL:', page.url());
+ 155 
+ 156     // ══════════════════════════════════════════
+ 157     // STEP 2: Navigate directly to Positionslista
+ 158     // ══════════════════════════════════════════
+ 159     console.log('[Scraper] Step 2: Navigating to Positionslista...');
+ 160 
+ 161     // Navigate directly to positions page (we know the URL)
+ 162     await page.goto(BASE_URL + '/positions', { waitUntil: 'domcontentloaded', timeout: LOGIN_TIMEOUT });
+ 163 
+ 164     console.log('[Scraper] Navigated to:', page.url());
+ 165 
+ 166     // Wait for position list to load
+ 167     console.log('[Scraper] Waiting for position list content to load...');
+ 168     await page.waitForTimeout(2000);
+ 169 
+ 170     // Wait for content to appear
+ 171     try {
+ 172       await page.waitForSelector('.item-wrapper, app-duty-positions-list-element, .duty-name, .personnel-list', {
+ 173         timeout: 45000
+ 174       });
+ 175       console.log('[Scraper] ✅ Position list content loaded');
+ 176     } catch (e) {
+ 177       console.log('[Scraper] ⚠️ Position list selector timeout, but continuing...');
+ 178       const currentState = await page.evaluate(() => {
+ 179         return JSON.stringify({
+ 180           url: window.location.href,
+ 181           title: document.title
+ 182         });
+ 183       });
+ 184       console.log('[Scraper] Current page state:', currentState);
+ 185     }
+ 186 
+ 187     await page.screenshot({ path: 'position-list.png' });
+ 188 
+ 189     // ══════════════════════════════════════════
+ 190     // STEP 3: Inject bookmarklet
+ 191     // ══════════════════════════════════════════
+ 192     console.log('[Scraper] Step 3: Injecting bookmarklet...');
+ 193 
+ 194     await page.evaluate((loaderUrl) => {
+ 195       return new Promise((resolve, reject) => {
+ 196         const script = document.createElement('script');
+ 197         script.src = loaderUrl + '?v=' + Date.now();
+ 198         script.onload = () => resolve();
+ 199         script.onerror = () => reject(new Error('Failed to load loader.js'));
+ 200         document.head.appendChild(script);
+ 201       });
+ 202     }, LOADER_URL);
+ 203 
+ 204     console.log('[Scraper] Loader script injected');
+ 205 
+ 206     // ══════════════════════════════════════════
+ 207     // STEP 4: Wait for OneVR to initialize
+ 208     // ══════════════════════════════════════════
+ 209     console.log('[Scraper] Step 4: Waiting for OneVR init...');
+ 210 
+ 211     await page.waitForFunction(() => {
+ 212       return window.OneVR && window.OneVR._initialized;
+ 213     }, { timeout: INIT_TIMEOUT });
+ 214 
+ 215     console.log('[Scraper] OneVR initialized');
+ 216     await page.screenshot({ path: 'onevr-initialized.png' });
+ 217 
+ 218     // ══════════════════════════════════════════
+ 219     // STEP 5: Enter PIN
+ 220     // ══════════════════════════════════════════
+ 221     console.log('[Scraper] Step 5: Entering PIN...');
+ 222 
+ 223     // Wait for PIN dialog
+ 224     await page.waitForSelector('.onevr-pin-modal', { timeout: 10000 });
+ 225 
+ 226     // Click each digit
+ 227     for (const digit of PIN.split('')) {
+ 228       await page.click(`.onevr-pin-key[data-key="${digit}"]`);
+ 229       await page.waitForTimeout(100);
+ 230     }
+ 231 
+ 232     // Wait for PIN dialog to close
+ 233     await page.waitForSelector('.onevr-pin-modal', { state: 'detached', timeout: 5000 });
+ 234     console.log('[Scraper] PIN accepted');
+ 235     await page.screenshot({ path: 'pin-accepted.png' });
+ 236 
+ 237     // ══════════════════════════════════════════
+ 238     // STEP 6: Click "Kör allt"
+ 239     // ══════════════════════════════════════════
+ 240     console.log('[Scraper] Step 6: Starting "Kör allt"...');
+ 241 
+ 242     await page.waitForSelector('#onevr-run-all', { timeout: 5000 });
+ 243     await page.click('#onevr-run-all');
+ 244 
+ 245     console.log('[Scraper] "Kör allt" clicked, waiting for completion...');
+ 246     await page.screenshot({ path: 'run-all-started.png' });
+ 247 
+ 248     // ══════════════════════════════════════════
+ 249     // STEP 7: Wait for completion
+ 250     // ══════════════════════════════════════════
+ 251     // Use manual polling loop instead of waitForFunction because the bookmarklet
+ 252     // navigates within the SPA (dagvy days, positionslista days, modals) which
+ 253     // destroys Playwright's evaluation context and crashes waitForFunction.
+ 254     const startTime = Date.now();
+ 255     let completed = false;
+ 256     let lastProgress = '';
+ 257 
+ 258     while (Date.now() - startTime < RUN_ALL_TIMEOUT) {
+ 259       try {
+ 260         const status = await page.evaluate(() => {
+ 261           // Check for summary "Klar" button (run-all finished)
+ 262           const doneBtn = document.getElementById('onevr-runall-done');
+ 263           if (doneBtn) return { done: true };
+ 264 
+ 265           // Check for summary modal without banner (all steps completed)
+ 266           const banner = document.querySelector('.onevr-runall-banner');
+ 267           const summaryModal = document.querySelector('.onevr-dagvy-modal');
+ 268           if (!banner && summaryModal) return { done: true };
+ 269 
+ 270        // Get current progress for logging
+ 271           const progressEl = document.querySelector('.onevr-runall-banner') ||
+ 272                              document.querySelector('.onevr-dagvy-modal');
+ 273           const progressText = progressEl ? progressEl.innerText.substring(0, 100) : '';
+ 274           return { done: false, progress: progressText };
+ 275         });
+ 276 
+ 277         if (status.done) {
+ 278           completed = true;
+ 279           break;
+ 280         }
+ 281 
+ 282         // Log progress every 30 seconds (every 6th poll)
+ 283         if (status.progress && status.progress !== lastProgress) {
+ 284           const elapsed = Math.round((Date.now() - startTime) / 1000);
+ 285           console.log('[Scraper] Progress (' + elapsed + 's):', status.progress.replace(/\n/g, ' | '));
+ 286           lastProgress = status.progress;
+ 287         }
+ 288       } catch (evalErr) {
+ 289         // Evaluation context destroyed by SPA navigation — this is expected
+ 290         // Just retry on next poll cycle
+ 291         const elapsed = Math.round((Date.now() - startTime) / 1000);
+ 292         console.log('[Scraper] Poll context lost (' + elapsed + 's) — SPA navigating, retrying...');
+ 293       }
+ 294 
+ 295       await page.waitForTimeout(5000);
+ 296     }
+ 297 
+ 298     const totalElapsed = Math.round((Date.now() - startTime) / 1000);
+ 299 
+ 300     if (!completed) {
+ 301       // Take screenshot of where it got stuck
+ 302       await page.screenshot({ path: 'timeout-screenshot.png' });
+ 303       throw new Error('Kör allt timed out after ' + totalElapsed + 's');
+ 304     }
+ 305 
+ 306     console.log('[Scraper] "Kör allt" completed in ' + totalElapsed + 's');
+ 307 
+ 308     // Grab summary
+ 309     let stats = 'No summary found';
+ 310     try {
+ 311       stats = await page.evaluate(() => {
+ 312         const el = document.querySelector('.onevr-dagvy-modal');
+ 313         return el ? el.innerText : 'No summary found';
+ 314       });
+ 315     } catch (e) {
+ 316       console.log('[Scraper] Could not read summary:', e.message);
+ 317     }
+ 318     console.log('[Scraper] Summary:\n' + stats);
+ 319     await page.screenshot({ path: 'completed.png' });
+ 320 
+ 321     // ══════════════════════════════════════════
+ 322     // DONE
+ 323     // ══════════════════════════════════════════
+ 324     console.log('[Scraper] All done! Finished at', new Date().toISOString());
+ 325 
+ 326   } catch (error) {
+ 327     console.error('[Scraper] ERROR:', error.message);
+ 328 
+ 329     try {
+ 330       await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
+ 331       console.log('[Scraper] Error screenshot saved');
+ 332 
+ 333       // Dump page info for debugging
+ 334       const debugInfo = await page.evaluate(() => {
+ 335         return JSON.stringify({
+ 336           url: window.location.href,
+ 337           title: document.title,
+ 338           bodyLength: document.body.innerHTML.length,
+ 339           bodySnippet: document.body.innerText.substring(0, 500)
+ 340         });
+ 341       });
+ 342       console.log('[Scraper] Debug info:', debugInfo);
+ 343     } catch (e) {
+ 344       // ignore screenshot errors
+ 345     }
+ 346 
+ 347     process.exit(1);
+ 348   } finally {
+ 349     await browser.close();
+ 350   }
+ 351 })();
+ 352 
+ 353 /**
+ 354  * Fallback: Perform manual login with email and password
+ 355  * (Requires Microsoft Authenticator approval on phone)
+ 356  */
+ 357 async function performManualLogin(page) {
+ 358   console.log('[Scraper] Using email/password with Microsoft SSO...');
+ 359 
+ 360   // Step 1: Click "Logga in med ditt företags-id"
+ 361   console.log('[Scraper] Step 1: Clicking "Logga in med ditt företags-id"...');
+ 362   await page.getByRole('button', { name: /företags-id/i }).click();
+ 363   await page.waitForTimeout(1000);
+ 364 
+ 365   // Step 2: Enter email/organizational ID
+ 366   console.log('[Scraper] Step 2: Entering email...');
+ 367   const emailField = await page.$('input[type="email"], input[type="text"]');
+ 368   if (emailField) {
+ 369     await emailField.fill(EMAIL);
+ 370     await page.waitForTimeout(500);
+ 371   }
+ 372 
+ 373   // Click "Nästa" button
+ 374   const nextBtn = await page.getByRole('button', { name: /nästa|next/i });
+ 375   if (nextBtn) {
+ 376     await nextBtn.click();
+ 377     await page.waitForTimeout(1000);
+ 378   }
+ 379 
+ 380   // Step 3: Enter password
+ 381   console.log('[Scraper] Step 3: Entering password...');
+ 382   const passwordField = await page.$('input[type="password"]');
+ 383   if (passwordField) {
+ 384     await passwordField.fill(PASSWORD);
+ 385     await page.waitForTimeout(500);
+ 386   }
+ 387 
+ 388   // Click "Logga in" button
+ 389   const loginBtn = await page.getByRole('button', { name: /logga in|sign in/i });
+ 390   if (loginBtn) {
+ 391     await loginBtn.click();
+ 392     await page.waitForTimeout(1000);
+ 393   }
+ 394 
+ 395   // Step 4: Wait for Microsoft Authenticator approval
+ 396   console.log('[Scraper] Step 4: Waiting for Microsoft Authenticator approval...');
+ 397   await page.waitForURL(
+ 398     (url) => !url.pathname.includes('/login') && url.href.includes(BASE_URL),
+ 399     { timeout: LOGIN_TIMEOUT + 300000 } // 5+ minutes for Authenticator approval
+ 400   );
+ 401 
+ 402   console.log('[Scraper] Login successful! URL:', page.url());
+ 403 }
