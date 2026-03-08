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
const NAV_TIMEOUT = 15000;
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

    // Screenshot login page for debugging
    await page.screenshot({ path: 'login-page.png' });
    console.log('[Scraper] Login page loaded, filling credentials...');

    // Fill email — use type() to trigger Angular form validation
    // Try multiple selectors for the email field
    let emailInput = null;
    for (const sel of ['input.input-mobile', 'input.input.with-icon', 'input[type="text"]', 'input[type="email"]']) {
      emailInput = await page.$(sel);
      if (emailInput) {
        console.log('[Scraper] Found email input with selector:', sel);
        break;
      }
    }
    if (!emailInput) throw new Error('Could not find email input');

    // Click, select all, then type (in case there's placeholder text)
    await emailInput.click({ clickCount: 3 });
    await page.waitForTimeout(100);
    await emailInput.type(EMAIL, { delay: 50 });

    // Fill password — type() triggers Angular change detection
    const passInput = await page.$('input[type="password"]');
    if (!passInput) throw new Error('Could not find password input');
    await passInput.click({ clickCount: 3 });
    await page.waitForTimeout(100);
    await passInput.type(PASSWORD, { delay: 50 });

    // Wait for Angular to process and enable button
    await page.waitForTimeout(1000);

    // Debug: log button state
    const btnState = await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (!btn) return 'BUTTON NOT FOUND';
      return JSON.stringify({
        text: btn.textContent.trim(),
        disabled: btn.disabled,
        hasDisabledClass: btn.classList.contains('disabled'),
        classes: btn.className,
        type: btn.type,
        tagName: btn.tagName
      });
    });
    console.log('[Scraper] Submit button state:', btnState);

    // Debug: log what's in the input fields
    const fieldValues = await page.evaluate(() => {
      const emailEl = document.querySelector('input.input-mobile') ||
                      document.querySelector('input.input.with-icon') ||
                      document.querySelector('input[type="text"]');
      const passEl = document.querySelector('input[type="password"]');
      return JSON.stringify({
        email: emailEl ? emailEl.value : 'NOT FOUND',
        emailLength: emailEl ? emailEl.value.length : 0,
        passLength: passEl ? passEl.value.length : 0
      });
    });
    console.log('[Scraper] Field values:', fieldValues);

    await page.screenshot({ path: 'login-filled.png' });

    // Click login button — try normal click first (button should be enabled now)
    console.log('[Scraper] Clicking submit button...');

    // Method 1: Normal Playwright click + wait for navigation
    try {
      await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 }),
        page.click('button[type="submit"]')
      ]);
      console.log('[Scraper] Login successful via normal click');
    } catch (clickErr) {
      console.log('[Scraper] Normal click did not navigate:', clickErr.message);

      // Take debug screenshot after failed click
      await page.screenshot({ path: 'after-click-1.png' });

      // Check for error messages on the page
      const pageErrors = await page.evaluate(() => {
        const body = document.body.innerText;
        return JSON.stringify({
          url: window.location.href,
          bodySnippet: body.substring(0, 300),
          // Look for common error patterns
          hasError: body.includes('fel') || body.includes('error') || body.includes('Error') || body.includes('Fel'),
          // Look for Angular error elements
          errorElements: Array.from(document.querySelectorAll('.error, .alert, [class*="error"], [class*="invalid"], mat-error, .mat-error'))
            .map(el => el.textContent.trim())
            .filter(t => t.length > 0)
        });
      });
      console.log('[Scraper] Page state after click 1:', pageErrors);

      // Method 2: Try dispatching events manually on the form
      console.log('[Scraper] Trying Angular ngSubmit approach...');
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          // Dispatch submit event (Angular listens for this)
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
        // Also try clicking the button via JS
        const btn = document.querySelector('button[type="submit"]');
        if (btn) {
          btn.disabled = false;
          btn.removeAttribute('disabled');
          btn.click();
        }
      });

      // Wait for navigation after JS submit
      try {
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
        console.log('[Scraper] Login successful via JS submit');
      } catch (jsErr) {
        console.log('[Scraper] JS submit also failed:', jsErr.message);
        await page.screenshot({ path: 'after-click-2.png' });

        // Method 3: Try keyboard Enter
        console.log('[Scraper] Trying Enter key...');
        await page.press('input[type="password"]', 'Enter');

        try {
          await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
          console.log('[Scraper] Login successful via Enter key');
        } catch (enterErr) {
          console.log('[Scraper] Enter key also failed:', enterErr.message);
          await page.screenshot({ path: 'after-click-3.png' });

          // Final check: maybe we need to look at what Angular thinks
          const finalState = await page.evaluate(() => {
            return JSON.stringify({
              url: window.location.href,
              forms: document.querySelectorAll('form').length,
              buttons: Array.from(document.querySelectorAll('button')).map(b => ({
                text: b.textContent.trim(),
                type: b.type,
                disabled: b.disabled,
                classes: b.className
              })),
              inputs: Array.from(document.querySelectorAll('input')).map(i => ({
                type: i.type,
                value: i.type === 'password' ? '***' : i.value,
                classes: i.className
              }))
            });
          });
          console.log('[Scraper] Final page state:', finalState);

          throw new Error('All login methods failed - could not navigate away from login page');
        }
      }
    }

    console.log('[Scraper] Login successful, current URL:', page.url());

    // ══════════════════════════════════════════
    // STEP 2: Navigate to Positionlista
    // ══════════════════════════════════════════
    console.log('[Scraper] Step 2: Navigating to Positionlista...');

    // Wait for the navigation page to load
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'navigation-page.png' });

    // Click "Positionlista" in the bottom navigation bar
    // It's a storybook-label element with text "Positionlista"
    await page.waitForSelector('.storybook-label', { timeout: NAV_TIMEOUT });
    const clickedNav = await page.evaluate(() => {
      const labels = document.querySelectorAll('.storybook-label');
      for (const el of labels) {
        if (el.innerText.trim() === 'Positionlista') {
          el.closest('[class*="pointer"]') ? el.closest('[class*="pointer"]').click() : el.click();
          return true;
        }
      }
      // Fallback: try direct navigation
      return false;
    });
    console.log('[Scraper] Clicked Positionlista:', clickedNav);

    // Wait for the position list to load (personnel items)
    await page.waitForSelector('.item-wrapper, app-duty-positions-list-element', { timeout: NAV_TIMEOUT });
    console.log('[Scraper] Position list loaded');

    // Small delay to ensure everything is rendered
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

    // Wait for PIN dialog to close and export menu to appear
    await page.waitForSelector('.onevr-pin-modal', { state: 'detached', timeout: 5000 });
    console.log('[Scraper] PIN accepted, export menu visible');

    // ══════════════════════════════════════════
    // STEP 6: Click "Kör allt"
    // ══════════════════════════════════════════
    console.log('[Scraper] Step 6: Starting "Kör allt"...');

    // Wait for the export menu and find "Kör allt" button
    await page.waitForSelector('#onevr-run-all', { timeout: 5000 });
    await page.click('#onevr-run-all');

    console.log('[Scraper] "Kör allt" clicked, waiting for completion...');

    // ══════════════════════════════════════════
    // STEP 7: Wait for completion
    // ══════════════════════════════════════════
    // The run-all process ends with a summary modal containing "onevr-runall-done" button
    // or we can watch for the console log "[OneVR] Pass 2 complete" or firebase uploads

    const startTime = Date.now();

    // Poll for completion: either the summary modal appears or timeout
    await page.waitForFunction(() => {
      // Check for summary "Klar" button
      const doneBtn = document.getElementById('onevr-runall-done');
      if (doneBtn) return true;

      // Also check if runall banner is gone (all steps completed)
      const banner = document.querySelector('.onevr-runall-banner');
      const summaryModal = document.querySelector('.onevr-dagvy-modal');
      if (!banner && summaryModal) return true;

      return false;
    }, { timeout: RUN_ALL_TIMEOUT, polling: 5000 });

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log('[Scraper] "Kör allt" completed in ' + elapsed + 's');

    // Grab any final stats from the page
    const stats = await page.evaluate(() => {
      const el = document.querySelector('.onevr-dagvy-modal');
      return el ? el.innerText : 'No summary found';
    });

    console.log('[Scraper] Summary:\n' + stats);

    // ══════════════════════════════════════════
    // DONE
    // ══════════════════════════════════════════
    console.log('[Scraper] All done! Finished at', new Date().toISOString());

  } catch (error) {
    console.error('[Scraper] ERROR:', error.message);

    // Take screenshot on failure for debugging
    try {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('[Scraper] Error screenshot saved to error-screenshot.png');
    } catch (e) {
      // ignore screenshot errors
    }

    process.exit(1);
  } finally {
    await browser.close();
  }
})();
