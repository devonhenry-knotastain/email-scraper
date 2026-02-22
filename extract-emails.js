// extract-emails.js
import fs from 'fs';
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

// -------- CONFIG --------
const linksFile = 'links.json';
const payloadFile = 'payload.json';
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;

// -------- READ INPUT FILES --------
const links = JSON.parse(fs.readFileSync(linksFile, 'utf-8'));
const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf-8'));

const webhookUrl = payload.client_payload.callback_url;

console.log('Links to scrape:', links);
console.log('Callback URL:', webhookUrl);

const results = [];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  for (const url of links) {
    try {
      console.log(`Checking: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Try closing popup overlays
      try {
        const closeButton = await page.$(
          'div[aria-label="Close"], div[aria-label="close"], [aria-label="Dismiss"]'
        );
        if (closeButton) {
          await closeButton.click();
          await page.waitForTimeout(2000);
        }
      } catch {}

      const content = await page.content();
      const emails = content.match(emailRegex) || [];

      results.push({ url, emails });

      console.log(`Found ${emails.length} emails at ${url}`);

    } catch (err) {
      console.log(`Error on: ${url}`, err.message);
      results.push({ url, emails: [] });
    }
  }

  await browser.close();

  // Save locally (optional)
  fs.writeFileSync('emails.json', JSON.stringify(results, null, 2));
  console.log('Scraping complete.');

  // -------- SEND RESULTS TO N8N WAIT NODE --------
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: results })
    });

    if (response.ok) {
      console.log('Results successfully sent to n8n Wait node.');
    } else {
      console.log('Failed to send results. Status:', response.status);
    }

  } catch (err) {
    console.log('Error sending results to n8n:', err.message);
  }

})();
