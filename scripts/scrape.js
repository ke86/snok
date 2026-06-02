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

// Timeout settings (ms)
const LOGIN_TIMEOUT = 30000;
const NAV_TIMEOUT = 20000;
const INIT_TIMEOUT = 30000;
const RUN_ALL_TIMEOUT = 1200000; // 20 minutes max for full run

// Load localStorage if it exists
function loadLocalStorage() {
  try {
    if (fs.existsSync(LOCALSTORAGE_FILE)) {
      const localStorage = JSON.parse(fs.readFileSync(LOCALSTORAGE_FILE, 'utf8'));
      console.log('[Scraper] Found saved localStorage (' + Object.keys(localStorage).length + ' items)');
      return localStorage;
    }
  } catch (e) {
    console.log('[Scraper] Could not load localStorage:', e.message);
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
  const savedLocalStorage = loadLocalStorage();
  const savedCookies = loadCookies();
  const useLocalStorage = savedLocalStorage !== null;
  const useCookies = !useLocalStorage && savedCookies !== null;

  console.log('[Scraper] Starting at', new Date().toISOString());
  console.log('[Scraper] Auth mode:', useLocalStorage ? 'localStorage-based' : useCookies ? 'Cookie-based' : 'Credentials-based');

  if (!useLocalStorage && !useCookies && (!EMAIL || !PASSWORD)) {
    console.error('ERROR: No saved localStorage/cookies and ONEVR_EMAIL/ONEVR_PASSWORD not set');
    console.error('Run setup-cookies.js first or upload localStorage.json');
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
      await page.goto(BASE_URL + '/navigation', { waitUntil: 'networkidle', timeout: LOGIN_TIMEOUT });
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
    // STEP 2: Navigate to Positionlista
    // ══════════════════════════════════════════
    console.log('[Scraper] Step 2: Navigating to Positionlista...');

    // Wait for the home page to fully render
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'home-page.png' });

    // Debug: log ALL elements in the bottom nav area
    const navDebug = await page.evaluate(() => {
      // Find all text content that contains "Position" anywhere on the page
      const allElements = document.querySelectorAll('*');
      const matches = [];
      for (const el of allElements) {
        const text = el.textContent.trim();
        if (text === 'Positionlista' && el.children.length === 0) {
          matches.push({
            tag: el.tagName,
            classes: el.className,
            id: el.id,
            parentTag: el.parentElement ? el.parentElement.tagName : null,
            parentClasses: el.parentElement ? el.parentElement.className : null,
            grandParentTag: el.parentElement && el.parentElement.parentElement ? el.parentElement.parentElement.tagName : null,
            grandParentClasses: el.parentElement && el.parentElement.parentElement ? el.parentElement.parentElement.className : null
          });
        }
      }
      // Also check for storybook-label elements
      const labels = document.querySelectorAll('storybook-label, .storybook-label, [class*="storybook"]');
      const labelInfo = [];
      for (const l of labels) {
        labelInfo.push({
          tag: l.tagName,
          text: l.textContent.trim().substring(0, 30),
          classes: l.className
        });
      }
      return JSON.stringify({ positionlistaElements: matches, storybookLabels: labelInfo.slice(0, 10) });
    });
    console.log('[Scraper] Nav debug:', navDebug);

    // Try multiple approaches to click Positionlista
    let navClicked = false;

    // Approach 1: storybook-label with exact text
    if (!navClicked) {
      navClicked = await page.evaluate(() => {
        const labels = document.querySelectorAll('storybook-label, .storybook-label');
        for (const el of labels) {
          if (el.textContent.trim() === 'Positionlista') {
            el.click();
            return true;
          }
        }
        return false;
      });
      if (navClicked) console.log('[Scraper] Clicked via storybook-label');
    }

    // Approach 2: Any element with exact text "Positionlista" — click it or its parent
    if (!navClicked) {
      navClicked = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        while (walker.nextNode()) {
          if (walker.currentNode.textContent.trim() === 'Positionlista') {
            const el = walker.currentNode.parentElement;
            // Try clicking parent chain up to find a clickable container
            let target = el;
            for (let i = 0; i < 5; i++) {
              if (!target) break;
              const style = window.getComputedStyle(target);
              if (style.cursor === 'pointer' || target.onclick || target.hasAttribute('routerlink') ||
                  target.tagName === 'A' || target.tagName === 'BUTTON' ||
                  target.classList.contains('pointer') || target.getAttribute('role') === 'button') {
                target.click();
                return true;
              }
              target = target.parentElement;
            }
            // Fallback: just click the text element itself
            el.click();
            return true;
          }
        }
        return false;
      });
      if (navClicked) console.log('[Scraper] Clicked via text walker');
    }

    // Approach 3: Try getByText (Playwright built-in)
    if (!navClicked) {
      try {
        await page.getByText('Positionlista', { exact: true }).click({ timeout: 5000 });
        navClicked = true;
        console.log('[Scraper] Clicked via getByText');
      } catch (e) {
        console.log('[Scraper] getByText failed:', e.message);
      }
    }

    if (!navClicked) {
      await page.screenshot({ path: 'nav-click-failed.png' });
      throw new Error('Could not click Positionlista navigation');
    }

    // Wait for position list to load — try multiple selectors
    console.log('[Scraper] Waiting for position list to load...');
    await page.waitForTimeout(3000);

    // Debug: check what's on the page now
    const pageCheck = await page.evaluate(() => {
      return JSON.stringify({
        url: window.location.href,
        title: document.title,
        hasItemWrapper: !!document.querySelector('.item-wrapper'),
        hasDutyElement: !!document.querySelector('app-duty-positions-list-element'),
        bodySnippet: document.body.innerText.substring(0, 200)
      });
    });
    console.log('[Scraper] After nav click:', pageCheck);

    await page.screenshot({ path: 'position-list.png' });

    // Wait for content to appear — try various selectors that might be on the position list page
    try {
      await page.waitForSelector('.item-wrapper, app-duty-positions-list-element, .duty-name, .personnel-list', {
        timeout: NAV_TIMEOUT
      });
      console.log('[Scraper] Position list content loaded');
    } catch (e) {
      console.log('[Scraper] Position list selector timeout, checking page state...');
      const currentState = await page.evaluate(() => {
        return JSON.stringify({
          url: window.location.href,
          allClasses: Array.from(new Set(
            Array.from(document.querySelectorAll('[class]'))
              .flatMap(el => Array.from(el.classList))
          )).filter(c => c.includes('duty') || c.includes('position') || c.includes('item') || c.includes('list') || c.includes('person')).slice(0, 20)
        });
      });
      console.log('[Scraper] Page classes:', currentState);
      // Continue anyway — maybe the content is there with different selectors
    }

    await page.waitForTimeout(2000);

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
