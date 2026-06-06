/**
 * OneVR Automated Scraper — Playwright script for GitHub Actions
 * Runs "Kör allt" automatically: Dagvy 7d → Positionslista 20d → TA → Driftmeddelande → Firebase
 *
 * Authentication modes:
 * 1. Cookie-based (preferred): Uses saved session cookies from setup-cookies.js
 * 2. Fallback: Manual credentials if cookies missing/expired
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EMAIL = process.env.ONEVR_EMAIL;
const PASSWORD = process.env.ONEVR_PASSWORD;
const PIN = process.env.ONEVR_PIN || '8612';
const BASE_URL = 'http://launcher.onevr.vrse.cloud';
const LOADER_URL = 'https://ke86.github.io/snok/modules/loader.js';
const COOKIES_FILE = path.join(__dirname, 'cookies.json');
const LOCALSTORAGE_FILE = path.join(__dirname, 'localStorage.js');

// Firebase config
const FIREBASE_PROJECT_ID = 'vemjobbaridag';
const FIREBASE_WORKER_URL = 'https://onevr-auth.kenny-eriksson1986.workers.dev';

// Timeout settings (ms)
const LOGIN_TIMEOUT = 60000;      // 60s — increased for GitHub Actions network latency
const NAV_TIMEOUT = 30000;        // 30s — increased for position list navigation
const INIT_TIMEOUT = 45000;       // 45s — increased for bookmarklet initialization
const RUN_ALL_TIMEOUT = 1200000;  // 20 minutes max for full run

// Load localStorage from Firebase (primary) or local file (fallback)
async function loadLocalStorage() {
  // Try Firebase first
  const firebaseData = await loadLocalStorageFromFirebase();
  if (firebaseData) return firebaseData;

  // Fallback to local file
  console.log('[Scraper] Firebase failed, trying local file...');
  return loadLocalStorageFromFile();
}

// Fetch localStorage from Firestore via Cloudflare Worker auth
async function loadLocalStorageFromFirebase() {
  try {
    console.log('[Scraper] Fetching localStorage from Firebase...');

    // Step 1: Get auth token from Cloudflare Worker
    const authResponse = await fetch(FIREBASE_WORKER_URL + '/auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!authResponse.ok) throw new Error('Worker auth failed: HTTP ' + authResponse.status);
    const authData = await authResponse.json();
    if (!authData.idToken) throw new Error('No idToken received from Worker');

    // Step 2: Fetch localStorage document from Firestore
    const url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID +
                '/databases/(default)/documents/config/localStorage';
    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + authData.idToken }
    });
    if (!response.ok) throw new Error('Firestore fetch failed: HTTP ' + response.status);
    const doc = await response.json();

    // Step 3: Parse Firestore document
    if (!doc.fields || !doc.fields.data || !doc.fields.data.stringValue) {
      throw new Error('No data field in Firestore document');
    }

    const localStorage = JSON.parse(doc.fields.data.stringValue);
    const updatedAt = doc.fields.updatedAt ? doc.fields.updatedAt.stringValue : 'unknown';
    console.log('[Scraper] ✅ Loaded localStorage from Firebase (' + Object.keys(localStorage).length + ' items, updated: ' + updatedAt + ')');
    return localStorage;
  } catch (e) {
    console.log('[Scraper] ⚠️ Could not load from Firebase:', e.message);
    return null;
  }
}

// Load localStorage from local file (legacy fallback)
function loadLocalStorageFromFile() {
  try {
    if (fs.existsSync(LOCALSTORAGE_FILE)) {
      const localStorage = JSON.parse(fs.readFileSync(LOCALSTORAGE_FILE, 'utf8'));
      console.log('[Scraper] Found saved localStorage file (' + Object.keys(localStorage).length + ' items)');
      return localStorage;
    }
  } catch (e) {
    console.log('[Scraper] Could not load localStorage file:', e.message);
  }
  return null;
}

// Load cookies if they exist (legacy)
function loadCookies() {
  try {
    if (fs.existsSync(COOKIES_FILE)) {
      const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
      console.log('[Scraper] Found saved cookies (' + cookies.length + ' cookies)');
      return cookies;
    }
  } catch (e) {
    console.log('[Scraper] Could not load cookies:', e.message);
  }
  return null;
}

// Save cookies for future runs
function saveCookies(cookies) {
  try {
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    console.log('[Scraper] Cookies saved for next run');
  } catch (e) {
    console.error('[Scraper] WARNING: Could not save cookies:', e.message);
  }
}

(async () => {
  const savedLocalStorage = await loadLocalStorage();
  const savedCookies = loadCookies();
  const useLocalStorage = savedLocalStorage !== null;
  const useCookies = !useLocalStorage && savedCookies !== null;

  console.log('[Scraper] Starting at', new Date().toISOString());
  console.log('[Scraper] Auth mode:', useLocalStorage ? 'localStorage-based' : useCookies ? 'Cookie-based' : 'Credentials-based');

  if (!useLocalStorage && !useCookies && (!EMAIL || !PASSWORD)) {
    console.error('ERROR: No saved localStorage/cookies and ONEVR_EMAIL/ONEVR_PASSWORD not set');
    console.error('Upload localStorage via Firebase or update localStorage.js');
    process.exit(1);
  }

  if (!useLocalStorage && !useCookies) {
    console.log('[Scraper] Email:', EMAIL.substring(0, 3) + '***');
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'sv-SE',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ...(useCookies ? { storageState: { cookies: savedCookies } } : {})
  });

  // Load localStorage if available
  if (useLocalStorage) {
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Set localStorage items
    await page.evaluate((data) => {
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      console.log('[Page] localStorage restored: ' + Object.keys(data).length + ' items');
    }, savedLocalStorage);

    await page.close();
  }

  const page = await context.newPage();

  // Forward ALL console logs from the page for debugging
  page.on('console', msg => {
    console.log('[Page]', msg.text());
  });

  try {
    // ══════════════════════════════════════════
    // STEP 1: Login (or use saved auth)
    // ══════════════════════════════════════════
    console.log('[Scraper] Step 1: Checking authentication...');

    if (useLocalStorage) {
      // localStorage already loaded — navigate directly to navigation
      console.log('[Scraper] ✅ Authenticated with localStorage');
      await page.goto(BASE_URL + '/navigation', { waitUntil: 'domcontentloaded', timeout: LOGIN_TIMEOUT });
    } else if (useCookies) {
      // Try to navigate with saved cookies
      console.log('[Scraper] Attempting to access OneVR with saved cookies...');
      await page.goto(BASE_URL + '/navigation', { waitUntil: 'networkidle', timeout: LOGIN_TIMEOUT });

      // Check if we're still authenticated
      const url = page.url();
      if (url.includes('/login')) {
        console.log('[Scraper] ⚠️  Cookies expired, falling back to manual login...');
        // Cookies expired, fall back to credentials
        await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle', timeout: LOGIN_TIMEOUT });
        await performManualLogin(page);
        // Save new cookies
        saveCookies(await context.cookies());
      } else {
        console.log('[Scraper] ✅ Authenticated with saved cookies');
      }
    } else {
      // Manual login with credentials
      await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle', timeout: LOGIN_TIMEOUT });
      await performManualLogin(page);
      // Save cookies for future use
      saveCookies(await context.cookies());
    }

    console.log('[Scraper] Authentication successful! URL:', page.url());

    // ══════════════════════════════════════════
    // STEP 2: Navigate directly to Positionslista
    // ══════════════════════════════════════════
    console.log('[Scraper] Step 2: Navigating to Positionslista...');

    // Navigate directly to positions page (we know the URL)
    await page.goto(BASE_URL + '/positions', { waitUntil: 'domcontentloaded', timeout: LOGIN_TIMEOUT });

    console.log('[Scraper] Navigated to:', page.url());

    // Wait for position list to load
    console.log('[Scraper] Waiting for position list content to load...');
    await page.waitForTimeout(2000);

    // Wait for content to appear
    try {
      await page.waitForSelector('.item-wrapper, app-duty-positions-list-element, .duty-name, .personnel-list', {
        timeout: 45000
      });
      console.log('[Scraper] ✅ Position list content loaded');
    } catch (e) {
      console.log('[Scraper] ⚠️ Position list selector timeout, but continuing...');
      const currentState = await page.evaluate(() => {
        return JSON.stringify({
          url: window.location.href,
          title: document.title
        });
      });
      console.log('[Scraper] Current page state:', currentState);
    }

    await page.screenshot({ path: 'position-list.png' });

    // ══════════════════════════════════════════
    // STEP 3: Inject bookmarklet
    // ══════════════════════════════════════════
    console.log('[Scraper] Step 3: Injecting bookmarklet...');

    await page.evaluate((loaderUrl) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = loaderUrl + '?v=' + Date.now();
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load loader.js'));
        document.head.appendChild(script);
      });
    }, LOADER_URL);

    console.log('[Scraper] Loader script injected');

    // ══════════════════════════════════════════
    // STEP 4: Wait for OneVR to initialize
    // ══════════════════════════════════════════
    console.log('[Scraper] Step 4: Waiting for OneVR init...');

    await page.waitForFunction(() => {
      return window.OneVR && window.OneVR._initialized;
    }, { timeout: INIT_TIMEOUT });

    console.log('[Scraper] OneVR initialized');
    await page.screenshot({ path: 'onevr-initialized.png' });

    // ══════════════════════════════════════════
    // STEP 5: Enter PIN
    // ══════════════════════════════════════════
    console.log('[Scraper] Step 5: Entering PIN...');

    // Wait for PIN dialog
    await page.waitForSelector('.onevr-pin-modal', { timeout: 10000 });

    // Click each digit
    for (const digit of PIN.split('')) {
      await page.click(`.onevr-pin-key[data-key="${digit}"]`);
      await page.waitForTimeout(100);
    }

    // Wait for PIN dialog to close
    await page.waitForSelector('.onevr-pin-modal', { state: 'detached', timeout: 5000 });
    console.log('[Scraper] PIN accepted');
    await page.screenshot({ path: 'pin-accepted.png' });

    // ══════════════════════════════════════════
    // STEP 6: Click "Kör allt"
    // ══════════════════════════════════════════
    console.log('[Scraper] Step 6: Starting "Kör allt"...');

    await page.waitForSelector('#onevr-run-all', { timeout: 5000 });
    await page.click('#onevr-run-all');

    console.log('[Scraper] "Kör allt" clicked, waiting for completion...');
    await page.screenshot({ path: 'run-all-started.png' });

    // ══════════════════════════════════════════
    // STEP 7: Wait for completion
    // ══════════════════════════════════════════
    // Use manual polling loop instead of waitForFunction because the bookmarklet
    // navigates within the SPA (dagvy days, positionslista days, modals) which
    // destroys Playwright's evaluation context and crashes waitForFunction.
    const startTime = Date.now();
    let completed = false;
    let lastProgress = '';

    while (Date.now() - startTime < RUN_ALL_TIMEOUT) {
      try {
        const status = await page.evaluate(() => {
          // Check for summary "Klar" button (run-all finished)
          const doneBtn = document.getElementById('onevr-runall-done');
          if (doneBtn) return { done: true };

          // Check for summary modal without banner (all steps completed)
          const banner = document.querySelector('.onevr-runall-banner');
          const summaryModal = document.querySelector('.onevr-dagvy-modal');
          if (!banner && summaryModal) return { done: true };

          // Get current progress for logging
          const progressEl = document.querySelector('.onevr-runall-banner') ||
                             document.querySelector('.onevr-dagvy-modal');
          const progressText = progressEl ? progressEl.innerText.substring(0, 100) : '';
          return { done: false, progress: progressText };
        });

        if (status.done) {
          completed = true;
          break;
        }

        // Log progress every 30 seconds (every 6th poll)
        if (status.progress && status.progress !== lastProgress) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log('[Scraper] Progress (' + elapsed + 's):', status.progress.replace(/\n/g, ' | '));
          lastProgress = status.progress;
        }
      } catch (evalErr) {
        // Evaluation context destroyed by SPA navigation — this is expected
        // Just retry on next poll cycle
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log('[Scraper] Poll context lost (' + elapsed + 's) — SPA navigating, retrying...');
      }

      await page.waitForTimeout(5000);
    }

    const totalElapsed = Math.round((Date.now() - startTime) / 1000);

    if (!completed) {
      // Take screenshot of where it got stuck
      await page.screenshot({ path: 'timeout-screenshot.png' });
      throw new Error('Kör allt timed out after ' + totalElapsed + 's');
    }

    console.log('[Scraper] "Kör allt" completed in ' + totalElapsed + 's');

    // Grab summary
    let stats = 'No summary found';
    try {
      stats = await page.evaluate(() => {
        const el = document.querySelector('.onevr-dagvy-modal');
        return el ? el.innerText : 'No summary found';
      });
    } catch (e) {
      console.log('[Scraper] Could not read summary:', e.message);
    }
    console.log('[Scraper] Summary:\n' + stats);
    await page.screenshot({ path: 'completed.png' });

    // ══════════════════════════════════════════
    // DONE
    // ══════════════════════════════════════════
    console.log('[Scraper] All done! Finished at', new Date().toISOString());

  } catch (error) {
    console.error('[Scraper] ERROR:', error.message);

    try {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('[Scraper] Error screenshot saved');

      // Dump page info for debugging
      const debugInfo = await page.evaluate(() => {
        return JSON.stringify({
          url: window.location.href,
          title: document.title,
          bodyLength: document.body.innerHTML.length,
          bodySnippet: document.body.innerText.substring(0, 500)
        });
      });
      console.log('[Scraper] Debug info:', debugInfo);
    } catch (e) {
      // ignore screenshot errors
    }

    process.exit(1);
  } finally {
    await browser.close();
  }
})();

/**
 * Fallback: Perform manual login with email and password
 * (Requires Microsoft Authenticator approval on phone)
 */
async function performManualLogin(page) {
  console.log('[Scraper] Using email/password with Microsoft SSO...');

  // Step 1: Click "Logga in med ditt företags-id"
  console.log('[Scraper] Step 1: Clicking "Logga in med ditt företags-id"...');
  await page.getByRole('button', { name: /företags-id/i }).click();
  await page.waitForTimeout(1000);

  // Step 2: Enter email/organizational ID
  console.log('[Scraper] Step 2: Entering email...');
  const emailField = await page.$('input[type="email"], input[type="text"]');
  if (emailField) {
    await emailField.fill(EMAIL);
    await page.waitForTimeout(500);
  }

  // Click "Nästa" button
  const nextBtn = await page.getByRole('button', { name: /nästa|next/i });
  if (nextBtn) {
    await nextBtn.click();
    await page.waitForTimeout(1000);
  }

  // Step 3: Enter password
  console.log('[Scraper] Step 3: Entering password...');
  const passwordField = await page.$('input[type="password"]');
  if (passwordField) {
    await passwordField.fill(PASSWORD);
    await page.waitForTimeout(500);
  }

  // Click "Logga in" button
  const loginBtn = await page.getByRole('button', { name: /logga in|sign in/i });
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForTimeout(1000);
  }

  // Step 4: Wait for Microsoft Authenticator approval
  console.log('[Scraper] Step 4: Waiting for Microsoft Authenticator approval...');
  await page.waitForURL(
    (url) => !url.pathname.includes('/login') && url.href.includes(BASE_URL),
    { timeout: LOGIN_TIMEOUT + 300000 } // 5+ minutes for Authenticator approval
  );

  console.log('[Scraper] Login successful! URL:', page.url());
}
