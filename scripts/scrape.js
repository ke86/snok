/**
 * OneVR Automated Scraper — Playwright script for GitHub Actions
 * Runs "Kör allt" automatically: Dagvy 7d → Positionslista 20d → TA → Driftmeddelande → Firebase
 */
const { chromium } = require('playwright');

const EMAIL = process.env.ONEVR_EMAIL;
const PASSWORD = process.env.ONEVR_PASSWORD;
const PIN = process.env.ONEVR_PIN || '8612';
const BASE_URL = 'https://onevr.arriva.guru';
const LOADER_URL = 'https://ke86.github.io/snok/modules/loader.js';

// Timeout settings (ms)
const LOGIN_TIMEOUT = 30000;
const NAV_TIMEOUT = 20000;
const INIT_TIMEOUT = 30000;
const RUN_ALL_TIMEOUT = 600000; // 10 minutes max for full run

(async () => {
  if (!EMAIL || !PASSWORD) {
    console.error('ERROR: ONEVR_EMAIL and ONEVR_PASSWORD must be set as environment variables');
    process.exit(1);
  }

  console.log('[Scraper] Starting at', new Date().toISOString());
  console.log('[Scraper] Email:', EMAIL.substring(0, 3) + '***');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'sv-SE',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Forward ALL console logs from the page for debugging
  page.on('console', msg => {
    console.log('[Page]', msg.text());
  });

  try {
    // ══════════════════════════════════════════
    // STEP 1: Login
    // ══════════════════════════════════════════
    console.log('[Scraper] Step 1: Logging in...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle', timeout: LOGIN_TIMEOUT });

    // Wait for the login form to be fully visible
    await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000); // Extra delay for Angular to fully init

    await page.screenshot({ path: 'login-page.png' });
    console.log('[Scraper] Login page loaded, filling credentials...');

    // Fill email — use type() to trigger Angular form validation
    let emailInput = null;
    for (const sel of ['input.input-mobile', 'input.input.with-icon', 'input[type="text"]', 'input[type="email"]']) {
      emailInput = await page.$(sel);
      if (emailInput) {
        console.log('[Scraper] Found email input with selector:', sel);
        break;
      }
    }
    if (!emailInput) throw new Error('Could not find email input');

    await emailInput.click({ clickCount: 3 });
    await page.waitForTimeout(100);
    await emailInput.type(EMAIL, { delay: 50 });

    // Fill password
    const passInput = await page.$('input[type="password"]');
    if (!passInput) throw new Error('Could not find password input');
    await passInput.click({ clickCount: 3 });
    await page.waitForTimeout(100);
    await passInput.type(PASSWORD, { delay: 50 });

    // Wait for Angular to process and enable button
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'login-filled.png' });

    // Submit login — Enter key works best with this Angular app
    console.log('[Scraper] Pressing Enter to submit...');
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: LOGIN_TIMEOUT }),
      page.press('input[type="password"]', 'Enter')
    ]);

    console.log('[Scraper] Login successful! URL:', page.url());

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
    const startTime = Date.now();

    // Poll for completion
    await page.waitForFunction(() => {
      const doneBtn = document.getElementById('onevr-runall-done');
      if (doneBtn) return true;
      const banner = document.querySelector('.onevr-runall-banner');
      const summaryModal = document.querySelector('.onevr-dagvy-modal');
      if (!banner && summaryModal) return true;
      return false;
    }, { timeout: RUN_ALL_TIMEOUT, polling: 5000 });

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log('[Scraper] "Kör allt" completed in ' + elapsed + 's');

    // Grab summary
    const stats = await page.evaluate(() => {
      const el = document.querySelector('.onevr-dagvy-modal');
      return el ? el.innerText : 'No summary found';
    });
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
