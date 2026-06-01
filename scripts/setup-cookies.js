/**
 * OneVR Cookie Setup — Manual login to save session cookies
 * Run this script locally to set up authenticated cookies for automated scraping
 *
 * Usage: node setup-cookies.js
 *
 * Steps:
 * 1. Opens OneVR login page
 * 2. Enter email + password automatically
 * 3. Approve Microsoft Authenticator on phone (manual step)
 * 4. Script saves cookies to cookies.json for use by scrape.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BASE_URL = 'http://launcher.onevr.vrse.cloud';
const COOKIES_FILE = path.join(__dirname, 'cookies.json');

// Prompt user for email and password
async function getUserCredentials() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('📧 Enter your OneVR email: ', (email) => {
      rl.question('🔐 Enter your password: ', (password) => {
        rl.close();
        resolve({ email, password });
      });
    });
  });
}

(async () => {
  console.log('[Setup] Starting cookie capture...');
  console.log('');

  // Get credentials
  const { email, password } = await getUserCredentials();

  if (!email || !password) {
    console.error('❌ Email and password are required');
    process.exit(1);
  }

  console.log('');
  console.log('[Setup] Launching browser...');
  console.log('[Setup] A browser window will open. You will need to:');
  console.log('  1. Script will enter email and password automatically');
  console.log('  2. 👉 Approve the login in Microsoft Authenticator on your phone');
  console.log('  3. Wait for the script to save cookies');
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'sv-SE',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    console.log('[Setup] Opening OneVR login page...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle', timeout: 30000 });

    // Step 1: Click "Logga in med ditt företags-id"
    console.log('[Setup] Step 1: Clicking "Logga in med ditt företags-id"...');
    await page.getByRole('button', { name: /företags-id/i }).click();
    await page.waitForTimeout(1000);

    // Step 2: Enter email/organizational ID
    console.log('[Setup] Step 2: Entering email...');
    const emailField = await page.$('input[type="email"], input[type="text"]');
    if (emailField) {
      await emailField.fill(email);
      await page.waitForTimeout(500);
    }

    // Look for and click "Nästa" or similar button
    const nextBtn = await page.getByRole('button', { name: /nästa|next/i });
    if (nextBtn) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }

    // Step 3: Enter password
    console.log('[Setup] Step 3: Entering password...');
    const passwordField = await page.$('input[type="password"]');
    if (passwordField) {
      await passwordField.fill(password);
      await page.waitForTimeout(500);
    }

    // Look for and click "Logga in" button
    const loginBtn = await page.getByRole('button', { name: /logga in|sign in/i });
    if (loginBtn) {
      await loginBtn.click();
      await page.waitForTimeout(1000);
    }

    // Step 4: Wait for Microsoft Authenticator approval
    console.log('[Setup] ⏳ Waiting for Microsoft Authenticator approval on your phone...');
    console.log('[Setup] (This can take a few minutes)');

    // Wait for user to complete Authenticator approval (max 10 minutes)
    await page.waitForURL(
      (url) => !url.pathname.includes('/login') && url.href.includes(BASE_URL),
      { timeout: 600000 }
    );

    console.log('[Setup] ✅ Authentication successful! Waiting for page to settle...');
    await page.waitForTimeout(3000);

    // Get all cookies
    const cookies = await context.cookies();

    if (cookies.length === 0) {
      throw new Error('No cookies found! Login may have failed.');
    }

    // Save cookies to file
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));

    const cookieCount = cookies.length;
    const savedTime = new Date().toISOString();
    const expiryDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // Assume 60 days

    console.log('');
    console.log('✅ SUCCESS! Cookies saved to cookies.json');
    console.log('');
    console.log(`  📊 Cookies saved: ${cookieCount}`);
    console.log(`  ⏰ Saved at: ${savedTime}`);
    console.log(`  📅 Expected expiry: ${expiryDate.toISOString().split('T')[0]}`);
    console.log('');
    console.log('ℹ️  These cookies will be used by scrape.js for automated logins.');
    console.log('⚠️  Update cookies every ~60 days by running this script again.');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  • Make sure you approve the login in Microsoft Authenticator');
    console.error('  • Check that your email and password are correct');
    console.error('  • If login times out, try running the script again');
    console.error('');
    process.exit(1);

  } finally {
    await browser.close();
  }
})();
