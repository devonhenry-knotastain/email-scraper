import fs from 'fs';
import puppeteer from 'puppeteer';

const links = JSON.parse(fs.readFileSync('links.json', 'utf-8'));
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;

const results = [];

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

for (const url of links) {
  try {
    console.log(`Checking: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Optional: close popups if they exist
    try {
      const closeButton = await page.$('div[aria-label="Close"], div[aria-label="close"], [aria-label="Dismiss"]');
      if (closeButton) {
        await closeButton.click();
        await page.waitForTimeout(2000);
      }
    } catch {}

    const content = await page.content();
    const emails = content.match(emailRegex) || [];
    results.push({ url, emails });

  } catch (err) {
    console.log(`Error on: ${url}`, err);
    results.push({ url, emails: [] });
  }
}

await browser.close();

// Save results locally
fs.writeFileSync('emails.json', JSON.stringify(results, null, 2));
console.log('Finished scraping:', results);
