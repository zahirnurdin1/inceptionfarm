const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const CDP_URL = 'http://127.0.0.1:9222';

const RANDOM_WORDS = [
  'mercury', 'apollo', 'falcon', 'orion', 'aurora',
  'nexus', 'hyper', 'vortex', 'zenith', 'astra',
  'pulse', 'titan', 'comet', 'vector', 'stellar',
  'nova', 'quasar', 'atlas', 'phoenix', 'eclipse'
];

function getRandomWord() {
  return RANDOM_WORDS[Math.floor(Math.random() * RANDOM_WORDS.length)];
}

function loadAccounts(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const [email, password] = line.split('|');
      return { email: email.trim(), password: (password || '').trim() };
    });
}

function removeAccountFromFile(filePath, emailToRemove) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const remaining = lines.filter(line => {
      const email = line.split('|')[0].trim();
      return email.toLowerCase() !== emailToRemove.toLowerCase() && line.trim().length > 0;
    });
    fs.writeFileSync(filePath, remaining.join('\n') + (remaining.length > 0 ? '\n' : ''), 'utf-8');
    console.log(`[${emailToRemove}] Removed from akun.txt`);
  } catch (err) {
    console.error(`Failed removing ${emailToRemove} from akun.txt:`, err.message);
  }
}

function randomDelay(min, max) {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
}

async function clearBrowserData(page) {
  try {
    const cdp = await page.target().createCDPSession();
    await cdp.send('Network.clearBrowserCookies');
    await cdp.send('Network.clearBrowserCache');
    await cdp.send('Storage.clearDataForOrigin', {
      origin: 'https://platform.inceptionlabs.ai',
      storageTypes: 'all'
    }).catch(() => {});
    await cdp.detach().catch(() => {});

    await page.evaluate(() => {
      try { localStorage.clear(); } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}
    }).catch(() => {});
  } catch (err) {
    console.warn('Failed clearing data:', err.message);
  }
}

async function waitForPageReadyAndVerified(page, email, timeoutMs = 60000) {
  console.log(`[${email}] Checking browser verification & page load...`);

  try {
    await page.waitForFunction(
      () => {
        const bodyText = (document.body ? document.body.innerText : '').toLowerCase();
        const isChallenge = bodyText.includes('verifying you are human') ||
                            bodyText.includes('checking your browser') ||
                            bodyText.includes('security checkpoint') ||
                            document.title.toLowerCase().includes('just a moment');

        if (isChallenge) return false;

        const buttons = Array.from(document.querySelectorAll('button'));
        const hasGoogleBtn = buttons.some(b => (b.innerText || '').toLowerCase().includes('google'));
        return hasGoogleBtn && document.readyState === 'complete';
      },
      { timeout: timeoutMs, polling: 1000 }
    );
    console.log(`[${email}] Verification SUCCESS, register page fully loaded!`);
    return true;
  } catch (err) {
    console.warn(`[${email}] Verification timed out or failed:`, err.message);
    return false;
  }
}

async function createAndExtractApiKey(page, email) {
  console.log(`[${email}] Opening API Keys section...`);

  const navigatedViaClick = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('a, button, [role="button"]'));
    const target = items.find(item => {
      const text = (item.innerText || '').toLowerCase();
      const href = (item.getAttribute('href') || '').toLowerCase();
      return text.includes('api key') || text.includes('keys') || href.includes('/keys') || href.includes('/api-keys');
    });
    if (target) {
      target.click();
      return true;
    }
    return false;
  });

  if (!navigatedViaClick) {
    console.log(`[${email}] Navigating directly to /dashboard/api-keys...`);
    await page.goto('https://platform.inceptionlabs.ai/dashboard/api-keys', {
      waitUntil: 'networkidle2',
      timeout: 30000
    }).catch(() => {});
  }

  await randomDelay(2500, 3500);

  console.log(`[${email}] Searching for Create API Key button...`);
  const createBtnFound = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
    const btn = buttons.find(b => {
      const t = (b.innerText || '').toLowerCase();
      return (t.includes('create') && (t.includes('key') || t.includes('api'))) ||
             (t.includes('new') && (t.includes('key') || t.includes('api'))) ||
             t.includes('generate key') ||
             t.includes('create api key');
    });
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (!createBtnFound) {
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => {
        const t = (b.innerText || '').trim().toLowerCase();
        return t === 'create' || t === 'create key' || t === 'new key' || t === '+';
      });
      if (btn) btn.click();
    });
  }

  await randomDelay(1500, 2500);

  const keyName = getRandomWord();
  console.log(`[${email}] Inputting key name: ${keyName}`);

  const nameInput = await page.waitForSelector(
    'input[name="name"], input[placeholder*="name" i], input[placeholder*="key" i], div[role="dialog"] input, .modal input, input[type="text"]',
    { timeout: 10000 }
  ).catch(() => null);

  if (nameInput) {
    await nameInput.click({ clickCount: 3 });
    await nameInput.type(keyName, { delay: 40 + Math.random() * 40 });
    await randomDelay(800, 1200);

    console.log(`[${email}] Submitting key creation (click button + Enter)...`);
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"], .modal, div[data-state="open"]') || document;
      const btns = Array.from(dialog.querySelectorAll('button, input[type="submit"]'));
      const confirmBtn = btns.find(b => {
        const t = (b.innerText || b.value || '').toLowerCase();
        return t.includes('create key') || t.includes('create') || t.includes('generate') || t.includes('submit');
      });
      if (confirmBtn) confirmBtn.click();
    });

    await page.keyboard.press('Enter');
    await randomDelay(2000, 3000);
  }

  console.log(`[${email}] Waiting for API key result dialog...`);
  await page.waitForFunction(
    () => {
      const code = document.querySelector('[role="dialog"] code, .modal code, code');
      if (code && code.innerText.trim().startsWith('sk_')) return true;
      const copyBtn = document.querySelector('button[aria-label="Copy API key"]');
      return !!copyBtn;
    },
    { timeout: 30000, polling: 500 }
  ).catch(() => {});

  await randomDelay(1000, 1500);

  console.log(`[${email}] Extracting API Key...`);

  let apiKey = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"], .modal');
    if (dialog) {
      const codeEl = dialog.querySelector('code');
      if (codeEl) {
        const txt = codeEl.innerText.trim();
        if (/^sk_[a-zA-Z0-9]{20,}$/.test(txt)) return txt;
      }
    }

    const allCodes = Array.from(document.querySelectorAll('code'));
    for (const c of allCodes) {
      const txt = c.innerText.trim();
      if (/^sk_[a-zA-Z0-9]{20,}$/.test(txt)) return txt;
    }
    return null;
  });

  if (!apiKey) {
    const context = page.browserContext();
    await context.overridePermissions('https://platform.inceptionlabs.ai', [
      'clipboard-read',
      'clipboard-write'
    ]).catch(() => {});

    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Copy API key"]');
      if (btn) btn.click();
    });

    await randomDelay(500, 1000);

    const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
    if (clip) {
      const match = clip.match(/sk_[a-zA-Z0-9]{20,}/);
      if (match) apiKey = match[0];
    }
  }

  await page.evaluate(() => {
    const doneBtn = Array.from(document.querySelectorAll('[role="dialog"] button, .modal button')).find(b =>
      b.innerText.trim().toLowerCase() === 'done'
    );
    if (doneBtn) doneBtn.click();
  });
  await randomDelay(1000, 1500);

  const apikeyFile = path.join(__dirname, 'apikey.txt');
  if (apiKey) {
    console.log(`[${email}] SUCCESS! Extracted API Key: ${apiKey}`);
    fs.appendFileSync(apikeyFile, `${apiKey}\n`);
    console.log(`[${email}] Key saved to apikey.txt`);
  } else {
    console.warn(`[${email}] Could not auto-detect API Key.`);
  }

  return apiKey;
}

async function processAccount(page, account, accountFile) {
  const { email, password } = account;
  let success = false;
  let attempt = 0;

  while (!success) {
    attempt++;
    console.log(`\n========================================`);
    console.log(`[${email}] Attempt #${attempt}`);
    console.log(`========================================`);

    try {
      console.log(`[${email}] Clearing browser cache and cookies...`);
      await clearBrowserData(page);
      await randomDelay(1000, 1500);

      console.log(`[${email}] Navigating to register page...`);
      await page.goto('https://platform.inceptionlabs.ai/auth/register', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      const verified = await waitForPageReadyAndVerified(page, email, 60000);
      if (!verified) {
        console.warn(`[${email}] Verification failed/timed out. Clearing data & retrying...`);
        continue;
      }

      await randomDelay(1500, 2500);

      console.log(`[${email}] Finding 'Continue with Google' button...`);
      const googleBtnFound = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b =>
          b.innerText && b.innerText.toLowerCase().includes('google')
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (!googleBtnFound) {
        console.warn(`[${email}] Google button not found, retrying...`);
        continue;
      }

      console.log(`[${email}] Clicked Google button, waiting for redirect...`);
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});

      await randomDelay(2000, 3000);

      const hasAccountChooser = await page.evaluate((targetEmail) => {
        const items = Array.from(document.querySelectorAll('[data-identifier], [data-email]'));
        const target = items.find(el => {
          const id = el.getAttribute('data-identifier') || el.getAttribute('data-email') || '';
          return id.toLowerCase() === targetEmail.toLowerCase();
        });
        if (target) {
          target.click();
          return true;
        }
        return false;
      }, email);

      if (hasAccountChooser) {
        console.log(`[${email}] Selected existing account from chooser.`);
      } else {
        const emailInput = await page.waitForSelector(
          'input#identifierId, input[type="email"], input[name="identifier"]',
          { timeout: 15000 }
        ).catch(() => null);

        if (emailInput) {
          console.log(`[${email}] Entering email...`);
          await emailInput.click({ clickCount: 3 });
          await emailInput.type(email, { delay: 40 + Math.random() * 40 });
          await randomDelay(800, 1500);

          console.log(`[${email}] Clicking Next...`);
          await page.evaluate(() => {
            const btn = document.querySelector('#identifierNext button') || document.querySelector('#identifierNext');
            if (btn) btn.click();
          });
          await page.keyboard.press('Enter');
          await randomDelay(2500, 4000);
        }

        if (password) {
          console.log(`[${email}] Waiting for password field...`);
          const pwdInput = await page.waitForSelector(
            'input[name="Passwd"], input[name="password"], input[type="password"]',
            { timeout: 15000 }
          ).catch(() => null);

          if (pwdInput) {
            console.log(`[${email}] Entering password...`);
            await randomDelay(500, 1000);
            await pwdInput.type(password, { delay: 40 + Math.random() * 40 });
            await randomDelay(800, 1500);

            console.log(`[${email}] Submitting password...`);
            await page.evaluate(() => {
              const btn = document.querySelector('#passwordNext button') || document.querySelector('#passwordNext');
              if (btn) btn.click();
            });
            await page.keyboard.press('Enter');
            await randomDelay(3000, 5000);
          }
        }
      }

      if (page.url().includes('accounts.google.com')) {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
          const btn = buttons.find(b => {
            const t = (b.innerText || '').toLowerCase();
            return t.includes('continue') || t.includes('allow') || t.includes('lanjutkan') || t.includes('izinkan');
          });
          if (btn) btn.click();
        });
      }

      console.log(`[${email}] Waiting for login confirmation on platform.inceptionlabs.ai...`);
      await page.waitForFunction(
        () => {
          const u = window.location.href;
          return u.includes('inceptionlabs.ai') &&
                 !u.includes('/auth/register') &&
                 !u.includes('/auth/login') &&
                 !u.includes('/api/auth');
        },
        { timeout: 90000 }
      );

      console.log(`[${email}] Login SUCCESS! URL: ${page.url()}`);
      await randomDelay(2000, 3000);

      const apiKey = await createAndExtractApiKey(page, email);
      if (apiKey) {
        removeAccountFromFile(accountFile, email);
        success = true;
      } else {
        console.warn(`[${email}] API Key extraction failed. Retrying account...`);
      }

    } catch (error) {
      console.error(`[${email}] Error on attempt #${attempt}:`, error.message);
      console.log(`[${email}] Retrying with fresh data & cache...`);
      await randomDelay(3000, 5000);
    }
  }
}

async function main() {
  const accountFile = path.join(__dirname, 'akun.txt');

  let accounts = loadAccounts(accountFile);
  console.log(`Found ${accounts.length} account(s) to process`);

  if (accounts.length === 0) {
    console.log('No accounts in akun.txt');
    return;
  }

  console.log(`Connecting to Chrome at ${CDP_URL}...`);
  const browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  while (true) {
    accounts = loadAccounts(accountFile);
    if (accounts.length === 0) break;

    const currentAccount = accounts[0];
    await processAccount(page, currentAccount, accountFile);

    console.log('\nWaiting 5 seconds before next account...\n');
    await randomDelay(5000, 6000);
  }

  console.log('\nAll accounts processed successfully!');
  await browser.disconnect();
}

main();
