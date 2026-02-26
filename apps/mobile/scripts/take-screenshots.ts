import { chromium } from 'playwright';
import path from 'path';

const BASE_URL = 'http://localhost:8081';
const OUT_DIR = path.resolve(__dirname, '../assets/play-store');

// Google Play screenshot specs
const PHONE = { width: 1080 / 3, height: 1920 / 3, scale: 3 }; // 9:16 at 1080x1920
const TABLET_7 = { width: 1200 / 2, height: 1920 / 2, scale: 2 }; // 9:16 at 1200x1920
const TABLET_10 = { width: 1200 / 2, height: 1920 / 2, scale: 2 }; // same ratio, larger

const ROUTES = [
  { name: 'dashboard', path: '/store-img/dashboard' },
  { name: 'payment', path: '/store-img/payment' },
  { name: 'charge', path: '/store-img/charge' },
  { name: 'store-detail', path: '/store-img/store-detail' },
  { name: 'success', path: '/store-img/success' },
];

async function takeScreenshots() {
  const browser = await chromium.launch();

  // Phone screenshots (1080x1920 via 360x640 @3x)
  console.log('--- Phone screenshots (1080x1920) ---');
  for (const route of ROUTES) {
    const context = await browser.newContext({
      viewport: { width: PHONE.width, height: PHONE.height },
      deviceScaleFactor: PHONE.scale,
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Let images load
    const file = path.join(OUT_DIR, `phone-${route.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  ${file}`);
    await context.close();
  }

  // 7-inch tablet screenshots (1200x1920 via 600x960 @2x)
  console.log('--- 7-inch tablet screenshots (1200x1920) ---');
  for (const route of ROUTES) {
    const context = await browser.newContext({
      viewport: { width: TABLET_7.width, height: TABLET_7.height },
      deviceScaleFactor: TABLET_7.scale,
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const file = path.join(OUT_DIR, `tablet7-${route.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  ${file}`);
    await context.close();
  }

  // 10-inch tablet screenshots (1600x2560 via 800x1280 @2x)
  console.log('--- 10-inch tablet screenshots (1600x2560) ---');
  for (const route of ROUTES) {
    const context = await browser.newContext({
      viewport: { width: 800, height: 1280 },
      deviceScaleFactor: 2,
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const file = path.join(OUT_DIR, `tablet10-${route.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  ${file}`);
    await context.close();
  }

  await browser.close();
  console.log('\n--- Done! All screenshots saved to assets/play-store/ ---');
}

takeScreenshots().catch(console.error);
