import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
async function prep(url) {
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2000);
  for (const sel of ['button[aria-label*="lose" i]', 'button:has-text("×")', 'button:has-text("✕")']) {
    const el = p.locator(sel).first(); if (await el.count()) { try { await el.click({ timeout: 1500 }); } catch {} }
  }
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 250) { await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(140); }
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1500);
}
// hide floating/fixed widgets (keep the header only when asked)
async function hideFixed(keepHeader) {
  await p.evaluate((keep) => {
    for (const e of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(e);
      if (cs.position === 'fixed' || cs.position === 'sticky') {
        const isHeader = e.tagName === 'HEADER' || e.tagName === 'NAV' || (e.getBoundingClientRect().top <= 2 && e.getBoundingClientRect().height < 120 && e.getBoundingClientRect().width > 400);
        if (!(keep && isHeader)) e.style.setProperty('opacity', '0', 'important');
      }
    }
  }, keepHeader);
}
async function yOf(text, off) {
  return p.evaluate(([t, o]) => { const e = [...document.querySelectorAll('h1,h2,h3')].find(e => e.innerText.trim().startsWith(t)); return e ? Math.round(e.getBoundingClientRect().top + scrollY + o) : 0; }, [text, off]);
}
async function strip(name, y, h) {
  await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(1500);
  await hideFixed(false);
  await p.screenshot({ path: `strips/${name}.png`, fullPage: true, clip: { x: 0, y, width: 430, height: h } });
  console.log('strip', name, y, h);
}
await prep('https://www.convart.in');
await hideFixed(true);
await p.evaluate(() => { for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if ((cs.position === 'fixed' || cs.position === 'absolute') && r.width < 90 && r.height < 90 && r.left < 60 && r.top > 300) e.style.setProperty('opacity','0','important'); } });
await p.screenshot({ path: 'strips/hero.png' });
await p.screenshot({ path: 'strips/header.png', clip: { x: 0, y: 0, width: 430, height: 66 } });
await strip('browse', await yOf('Browse All Art', -40), 2300);
await strip('custom', await yOf('How Customisation Works', -40), 1500);
await prep('https://www.convart.in/wall-visualization-calculator');
await strip('visualizer', 60, 1300);
await prep('https://www.convart.in/services');
await strip('services', 60, 1800);
await b.close();
